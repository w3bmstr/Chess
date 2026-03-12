(function (global) {
	function create(options) {
		const settings = Object.assign({
			serverUrl: global.Chess2NetworkProtocol && typeof global.Chess2NetworkProtocol.getDefaultServerUrl === 'function'
				? global.Chess2NetworkProtocol.getDefaultServerUrl()
				: 'http://localhost:3000',
			publicBaseUrl: global.Chess2NetworkProtocol && typeof global.Chess2NetworkProtocol.getDefaultPublicBaseUrl === 'function'
				? global.Chess2NetworkProtocol.getDefaultPublicBaseUrl()
				: '',
			onMatchStarted: null,
			onSpectateStarted: null,
			onMove: null,
			onGameResult: null,
			onOpponentLeft: null,
		}, options || {});

		const emitter = typeof global.createEventEmitter === 'function'
			? global.createEventEmitter()
			: createFallbackEmitter();
		const protocol = global.Chess2NetworkProtocol || {};
		const EVENTS = protocol.EVENTS || {};
		const bridge = global.Chess2SocketBridge.create({ serverUrl: settings.serverUrl });
		const sessionStorageKey = 'chess2.multiplayer.session';
		const profileStorageKey = 'chess2.multiplayer.profile';

		const persistedProfile = loadPersistedProfile(profileStorageKey);
		const state = Object.assign(
			createDefaultState(settings.serverUrl, persistedProfile),
			readPersistedState(sessionStorageKey, settings.serverUrl) || {}
		);
		const subscriptions = [];
		let lastSeenRoomChatId = '';
		let lastSeenLobbyChatId = '';

		bindSocketEvents();

		function subscribe(listener) {
			if (typeof listener !== 'function') {
				return function noop() {};
			}
			const unsubscribe = emitter.on('change', listener);
			listener(getState());
			return unsubscribe;
		}

		function getState() {
			return Object.assign({}, state, {
				players: Object.assign({}, state.players),
				roomPlayers: Object.assign({}, state.roomPlayers),
				profile: Object.assign({}, state.profile),
				liveGames: state.liveGames.slice(),
				leaderboard: state.leaderboard.slice(),
				recentResults: state.recentResults.slice(),
				chatMessages: state.chatMessages.slice(),
				lobbyMessages: state.lobbyMessages.slice(),
				drawOffer: state.drawOffer ? Object.assign({}, state.drawOffer) : null,
				clubs: state.clubs.slice(),
				tournaments: state.tournaments.slice(),
				matchContext: state.matchContext ? Object.assign({}, state.matchContext) : null,
				roomUnreadCount: Number(state.roomUnreadCount) || 0,
				lobbyUnreadCount: Number(state.lobbyUnreadCount) || 0,
				currentResult: state.currentResult ? Object.assign({}, state.currentResult) : null,
			});
		}

		function connect() {
			if (state.connected) return Promise.resolve(getState());
			updateState({ connecting: true, available: true, lastError: '', message: 'Connecting to multiplayer server...' });
			return bridge.connect()
				.then(() => {
					updateState({ connecting: false, connected: true, available: true, message: 'Connected to multiplayer server.' });
					return syncProfile().catch(() => null).then(() => {
						requestLiveGamesInternal();
						requestLeaderboardInternal();
						requestClubsInternal();
						requestTournamentsInternal();
						requestLobbyChatInternal();
						resumeSessionIfNeeded();
						return getState();
					});
				})
				.catch(error => {
					updateState({
						connecting: false,
						connected: false,
						available: false,
						lastError: error && error.message ? error.message : String(error),
						message: 'Unable to reach multiplayer server.',
					});
					throw error;
				});
		}

		function setProfile(profileInput) {
			const nextProfile = normalizeProfileInput(profileInput, state.profile);
			updateState({ profile: nextProfile });
			persistProfile();
			if (!state.connected) {
				return Promise.resolve(Object.assign({}, nextProfile));
			}
			return bridge.emit(EVENTS.setProfile, nextProfile).then(() => Object.assign({}, nextProfile));
		}

		function findMatch() {
			return connect().then(() => {
				updateState({ mode: 'queueing', lastError: '', message: 'Looking for an online match...', currentResult: null, spectating: false, spectatingGameId: '' });
				return bridge.emit(EVENTS.findMatch);
			});
		}

		function cancelMatchmaking() {
			updateState({ mode: 'idle', message: 'Matchmaking cancelled.' });
			return bridge.emit(EVENTS.cancelMatchmaking);
		}

		function createPrivateGame() {
			return connect().then(() => {
				updateState({ mode: 'creating-private', lastError: '', message: 'Creating private game...', currentResult: null, spectating: false, spectatingGameId: '' });
				return bridge.emit(EVENTS.createPrivateGame);
			});
		}

		function joinPrivateGame(gameId) {
			const trimmed = String(gameId || '').trim();
			if (!trimmed) {
				const error = new Error('Enter a private game code or link.');
				updateState({ lastError: error.message, message: error.message });
				return Promise.reject(error);
			}

			const normalizedId = protocol.extractPrivateGameId ? (protocol.extractPrivateGameId(trimmed) || trimmed) : trimmed;
			return connect().then(() => {
				updateState({ mode: 'joining-private', lastError: '', message: 'Joining private game ' + normalizedId + '...', currentResult: null, spectating: false, spectatingGameId: '' });
				return bridge.emit(EVENTS.joinPrivateGame, { gameId: normalizedId });
			});
		}

		function resolveJoinUrl(payload) {
			const gameId = payload && payload.gameId
				? String(payload.gameId)
				: (protocol.extractPrivateGameId ? protocol.extractPrivateGameId(payload && payload.joinUrl ? payload.joinUrl : '') : '');
			if (gameId && protocol.buildPublicGameUrl) {
				return protocol.buildPublicGameUrl(settings.publicBaseUrl, gameId);
			}
			return payload && payload.joinUrl
				? (protocol.toAbsoluteUrl ? protocol.toAbsoluteUrl(settings.publicBaseUrl || settings.serverUrl, payload.joinUrl) : payload.joinUrl)
				: '';
		}

		function spectateGame(gameId) {
			const trimmed = String(gameId || '').trim();
			if (!trimmed) {
				const error = new Error('Choose a live game to spectate.');
				updateState({ lastError: error.message, message: error.message });
				return Promise.reject(error);
			}
			return connect().then(() => {
				updateState({ lastError: '', message: 'Opening live game ' + trimmed + '...' });
				return bridge.emit(EVENTS.spectateGame, { gameId: trimmed });
			});
		}

		function stopSpectating() {
			if (!state.spectating && state.mode !== 'spectating') {
				return Promise.resolve(false);
			}
			updateState({
				mode: 'idle',
				gameId: '',
				localColor: '',
				roomMode: '',
				players: { white: false, black: false },
				roomPlayers: { white: null, black: null },
				chatMessages: [],
				drawOffer: null,
				matchContext: null,
				spectating: false,
				spectatingGameId: '',
				spectatorCount: 0,
				message: 'Stopped spectating.',
				currentResult: null,
			});
			return bridge.emit(EVENTS.stopSpectating).then(() => true);
		}

		function leaveGame() {
			const currentMode = state.mode;
			updateState({
				mode: 'idle',
				gameId: '',
				localColor: '',
				roomMode: '',
				joinUrl: '',
				reconnectToken: '',
				players: { white: false, black: false },
				roomPlayers: { white: null, black: null },
				chatMessages: [],
				drawOffer: null,
				matchContext: null,
				spectating: false,
				spectatingGameId: '',
				spectatorCount: 0,
				message: currentMode === 'in-game' ? 'Left online game.' : (currentMode === 'spectating' ? 'Stopped spectating.' : 'Online state cleared.'),
				currentResult: null,
			});
			if (currentMode === 'queueing') {
				return bridge.emit(EVENTS.cancelMatchmaking);
			}
			if (currentMode === 'spectating') {
				return bridge.emit(EVENTS.stopSpectating);
			}
			return bridge.emit(EVENTS.leaveGame);
		}

		function sendMove(move) {
			if (state.mode !== 'in-game' || !state.gameId) {
				return Promise.resolve(false);
			}
			return bridge.emit(EVENTS.move, Object.assign({ gameId: state.gameId }, move || {})).then(() => true);
		}

		function sendChatMessage(text) {
			const message = normalizeChatText(text);
			if (!message) {
				const error = new Error('Enter a chat message.');
				updateState({ lastError: error.message, message: error.message });
				return Promise.reject(error);
			}
			return connect().then(() => bridge.emit(EVENTS.sendChatMessage, { text: message })).then(() => true);
		}

		function sendLobbyChatMessage(text) {
			const message = normalizeChatText(text);
			if (!message) {
				const error = new Error('Enter a chat message.');
				updateState({ lastError: error.message, message: error.message });
				return Promise.reject(error);
			}
			return connect().then(() => bridge.emit(EVENTS.sendLobbyChatMessage, { text: message })).then(() => true);
		}

		function resignGame() {
			if (state.mode !== 'in-game' || !state.gameId) {
				return Promise.resolve(false);
			}
			return bridge.emit(EVENTS.resign).then(() => true);
		}

		function sendDrawAction(action) {
			const normalized = String(action || '').trim().toLowerCase();
			if (!normalized) {
				return Promise.reject(new Error('Choose a draw action.'));
			}
			if (state.mode !== 'in-game' || !state.gameId) {
				return Promise.resolve(false);
			}
			return bridge.emit(EVENTS.drawAction, { action: normalized }).then(() => true);
		}

		function requestLiveGames() {
			return connect().then(() => requestLiveGamesInternal().then(() => true));
		}

		function requestLeaderboard() {
			return connect().then(() => requestLeaderboardInternal().then(() => true));
		}

		function requestClubs() {
			return connect().then(() => requestClubsInternal().then(() => true));
		}

		function requestTournaments() {
			return connect().then(() => requestTournamentsInternal().then(() => true));
		}

		function requestLobbyChat() {
			return connect().then(() => requestLobbyChatInternal().then(() => true));
		}

		function createClub(input) {
			return connect().then(() => bridge.emit(EVENTS.createClub, normalizeNamedEntityInput(input, 40, 240))).then(() => true);
		}

		function joinClub(clubId) {
			return connect().then(() => bridge.emit(EVENTS.joinClub, { clubId: String(clubId || '').trim() })).then(() => true);
		}

		function leaveClub(clubId) {
			return connect().then(() => bridge.emit(EVENTS.leaveClub, { clubId: String(clubId || '').trim() })).then(() => true);
		}

		function createTournament(input) {
			return connect().then(() => bridge.emit(EVENTS.createTournament, normalizeTournamentInput(input))).then(() => true);
		}

		function joinTournament(tournamentId) {
			return connect().then(() => bridge.emit(EVENTS.joinTournament, { tournamentId: String(tournamentId || '').trim() })).then(() => true);
		}

		function leaveTournament(tournamentId) {
			return connect().then(() => bridge.emit(EVENTS.leaveTournament, { tournamentId: String(tournamentId || '').trim() })).then(() => true);
		}

		function startTournament(tournamentId) {
			return connect().then(() => bridge.emit(EVENTS.startTournament, { tournamentId: String(tournamentId || '').trim() })).then(() => true);
		}

		function joinTournamentMatch(tournamentId, pairingId) {
			return connect().then(() => bridge.emit(EVENTS.joinTournamentMatch, {
				tournamentId: String(tournamentId || '').trim(),
				pairingId: String(pairingId || '').trim(),
			})).then(() => true);
		}

		function markRoomChatSeen() {
			if (!state.roomUnreadCount && lastSeenRoomChatId === getLastMessageId(state.chatMessages)) {
				return false;
			}
			lastSeenRoomChatId = getLastMessageId(state.chatMessages);
			updateState({ roomUnreadCount: 0 });
			return true;
		}

		function markLobbyChatSeen() {
			if (!state.lobbyUnreadCount && lastSeenLobbyChatId === getLastMessageId(state.lobbyMessages)) {
				return false;
			}
			lastSeenLobbyChatId = getLastMessageId(state.lobbyMessages);
			updateState({ lobbyUnreadCount: 0 });
			return true;
		}

		function bindSocketEvents() {
			subscriptions.push(bridge.on('connect', () => {
				updateState({ connected: true, connecting: false, available: true, lastError: '', message: 'Connected to multiplayer server.' });
				syncProfile().catch(() => null);
				requestLiveGamesInternal();
				requestLeaderboardInternal();
				requestClubsInternal();
				requestTournamentsInternal();
				requestLobbyChatInternal();
				resumeSessionIfNeeded();
			}));

			subscriptions.push(bridge.on('disconnect', () => {
				const hasSession = Boolean(state.reconnectToken && (state.gameId || state.roomMode === 'private'));
				updateState({
					connected: false,
					connecting: false,
					available: false,
					message: hasSession
						? 'Connection lost. Attempting to reconnect your online session...'
						: 'Disconnected from multiplayer server.',
				});
			}));

			subscriptions.push(bridge.on(EVENTS.profile, payload => {
				const nextProfile = normalizeProfileInput(payload, state.profile);
				updateState({ profile: nextProfile });
				persistProfile();
			}));

			subscriptions.push(bridge.on(EVENTS.waiting, payload => {
				updateState({
					mode: payload && payload.mode === 'private' ? 'waiting-private' : 'queueing',
					message: payload && payload.mode === 'private'
						? 'Private game created. Waiting for opponent to join.'
						: 'Waiting for another player...',
				});
			}));

			subscriptions.push(bridge.on(EVENTS.matchmakingCancelled, () => {
				updateState({ mode: 'idle', message: 'Matchmaking cancelled.' });
			}));

			subscriptions.push(bridge.on(EVENTS.privateGameCreated, payload => {
				const roomMessages = normalizeChatMessages(payload && payload.chatMessages);
				lastSeenRoomChatId = getLastMessageId(roomMessages);
				const joinUrl = resolveJoinUrl(payload);
				updateState({
					mode: 'waiting-private',
					gameId: payload && payload.gameId ? payload.gameId : '',
					localColor: payload && payload.color ? payload.color : 'white',
					roomMode: 'private',
					joinUrl,
					reconnectToken: payload && payload.reconnectToken ? payload.reconnectToken : state.reconnectToken,
					message: 'Private game ready. Share the link with your opponent.',
					players: roomPlayersToPresence(payload && payload.players),
					roomPlayers: normalizeRoomPlayers(payload && payload.players),
					chatMessages: roomMessages,
					drawOffer: normalizeDrawOffer(payload && payload.drawOffer),
					matchContext: normalizeMatchContext(payload && payload.matchContext),
					roomUnreadCount: 0,
					spectating: false,
					spectatingGameId: '',
					spectatorCount: Number(payload && payload.spectatorCount) || 0,
					currentResult: null,
					rated: Boolean(payload && payload.rated),
				});
			}));

			subscriptions.push(bridge.on(EVENTS.matchFound, payload => {
				const roomMessages = normalizeChatMessages(payload && payload.chatMessages);
				lastSeenRoomChatId = getLastMessageId(roomMessages);
				updateState({
					mode: 'in-game',
					gameId: payload && payload.gameId ? payload.gameId : '',
					localColor: payload && payload.color ? payload.color : '',
					roomMode: payload && payload.mode ? payload.mode : '',
					joinUrl: payload && payload.joinUrl ? resolveJoinUrl(payload) : state.joinUrl,
					reconnectToken: payload && payload.reconnectToken ? payload.reconnectToken : state.reconnectToken,
					message: payload && payload.resumed
						? 'Online session resumed as ' + (payload && payload.color ? payload.color : 'player') + '.'
						: 'Online game started as ' + (payload && payload.color ? payload.color : 'player') + '.',
					players: roomPlayersToPresence(payload && payload.players),
					roomPlayers: normalizeRoomPlayers(payload && payload.players),
					chatMessages: roomMessages,
					drawOffer: normalizeDrawOffer(payload && payload.drawOffer),
					matchContext: normalizeMatchContext(payload && payload.matchContext),
					roomUnreadCount: 0,
					spectating: false,
					spectatingGameId: '',
					spectatorCount: Number(payload && payload.spectatorCount) || 0,
					currentResult: null,
					rated: Boolean(payload && payload.rated),
				});
				if (typeof settings.onMatchStarted === 'function') {
					settings.onMatchStarted(payload || {});
				}
			}));

			subscriptions.push(bridge.on(EVENTS.spectateStarted, payload => {
				const roomMessages = normalizeChatMessages(payload && payload.chatMessages);
				lastSeenRoomChatId = getLastMessageId(roomMessages);
				updateState({
					mode: 'spectating',
					gameId: payload && payload.gameId ? payload.gameId : '',
					localColor: 'spectator',
					roomMode: payload && payload.mode ? payload.mode : '',
					joinUrl: '',
					reconnectToken: '',
					message: 'Spectating live game ' + (payload && payload.gameId ? payload.gameId : '') + '.',
					players: roomPlayersToPresence(payload && payload.players),
					roomPlayers: normalizeRoomPlayers(payload && payload.players),
					chatMessages: roomMessages,
					drawOffer: normalizeDrawOffer(payload && payload.drawOffer),
					matchContext: normalizeMatchContext(payload && payload.matchContext),
					roomUnreadCount: 0,
					spectating: true,
					spectatingGameId: payload && payload.gameId ? payload.gameId : '',
					spectatorCount: Number(payload && payload.spectatorCount) || 0,
					currentResult: null,
					rated: Boolean(payload && payload.rated),
				});
				if (typeof settings.onSpectateStarted === 'function') {
					settings.onSpectateStarted(payload || {});
				}
			}));

			subscriptions.push(bridge.on(EVENTS.spectateEnded, () => {
				lastSeenRoomChatId = '';
				updateState({
					mode: 'idle',
					gameId: '',
					localColor: '',
					roomMode: '',
					players: { white: false, black: false },
					roomPlayers: { white: null, black: null },
					chatMessages: [],
					drawOffer: null,
					roomUnreadCount: 0,
					spectating: false,
					spectatingGameId: '',
					spectatorCount: 0,
					message: 'Stopped spectating.',
					currentResult: null,
				});
			}));

			subscriptions.push(bridge.on(EVENTS.moveMade, payload => {
				if (typeof settings.onMove === 'function') {
					settings.onMove(payload || {});
				}
			}));

			subscriptions.push(bridge.on(EVENTS.drawState, payload => {
				const relevant = payload && payload.gameId && (payload.gameId === state.gameId || payload.gameId === state.spectatingGameId);
				if (!relevant) {
					return;
				}
				updateState({ drawOffer: normalizeDrawOffer(payload && payload.offer) });
			}));

			subscriptions.push(bridge.on(EVENTS.gameResult, payload => {
				const relevant = payload && payload.gameId && (payload.gameId === state.gameId || payload.gameId === state.spectatingGameId);
				if (relevant) {
					updateState({
						mode: 'finished',
						reconnectToken: '',
						spectating: false,
						spectatingGameId: '',
						message: payload && payload.summary ? payload.summary : 'Online game finished.',
						drawOffer: null,
						matchContext: normalizeMatchContext(payload && payload.matchContext),
						roomUnreadCount: 0,
						currentResult: payload || null,
						roomPlayers: normalizeRoomPlayers(payload && payload.players),
						players: roomPlayersToPresence(payload && payload.players),
						spectatorCount: Number(payload && payload.spectatorCount) || 0,
					});
				}
				if (typeof settings.onGameResult === 'function') {
					settings.onGameResult(payload || {});
				}
			}));

			subscriptions.push(bridge.on(EVENTS.opponentLeft, payload => {
				lastSeenRoomChatId = '';
				updateState({
					mode: 'idle',
					gameId: '',
					reconnectToken: '',
					message: payload && payload.disconnected ? 'Opponent disconnected.' : 'Opponent left the game.',
					players: { white: false, black: false },
					roomPlayers: { white: null, black: null },
					localColor: '',
					roomMode: '',
					chatMessages: [],
					drawOffer: null,
					matchContext: null,
					roomUnreadCount: 0,
					spectating: false,
					spectatingGameId: '',
					spectatorCount: 0,
					currentResult: null,
				});
				if (typeof settings.onOpponentLeft === 'function') {
					settings.onOpponentLeft(payload || {});
				}
			}));

			subscriptions.push(bridge.on(EVENTS.presence, payload => {
				updateState({
					players: Object.assign({ white: false, black: false }, payload && payload.players ? payload.players : {}),
					roomPlayers: payload && payload.roomPlayers ? normalizeRoomPlayers(payload.roomPlayers) : state.roomPlayers,
					spectatorCount: payload && payload.spectatorCount != null ? Number(payload.spectatorCount) || 0 : state.spectatorCount,
				});
			}));

			subscriptions.push(bridge.on(EVENTS.liveGames, payload => {
				updateState({
					liveGames: Array.isArray(payload && payload.games) ? payload.games.slice() : [],
					recentResults: Array.isArray(payload && payload.recentResults) ? payload.recentResults.slice() : state.recentResults,
					queueSize: Number(payload && payload.queueSize) || 0,
				});
			}));

			subscriptions.push(bridge.on(EVENTS.leaderboard, payload => {
				updateState({
					leaderboard: Array.isArray(payload && payload.entries) ? payload.entries.slice() : [],
					recentResults: Array.isArray(payload && payload.recentResults) ? payload.recentResults.slice() : state.recentResults,
				});
			}));

			subscriptions.push(bridge.on(EVENTS.clubsUpdated, payload => {
				updateState({
					clubs: Array.isArray(payload && payload.clubs) ? payload.clubs.slice() : [],
				});
			}));

			subscriptions.push(bridge.on(EVENTS.tournamentsUpdated, payload => {
				updateState({
					tournaments: Array.isArray(payload && payload.tournaments) ? payload.tournaments.slice() : [],
				});
			}));

			subscriptions.push(bridge.on(EVENTS.chatHistory, payload => {
				const gameId = payload && payload.gameId ? payload.gameId : '';
				if (!gameId || (gameId !== state.gameId && gameId !== state.spectatingGameId)) {
					return;
				}
				const roomMessages = normalizeChatMessages(payload && payload.messages);
				updateState({
					chatMessages: roomMessages,
					roomUnreadCount: computeUnreadCount(roomMessages, lastSeenRoomChatId),
				});
			}));

			subscriptions.push(bridge.on(EVENTS.chatMessage, payload => {
				if (!payload || !payload.gameId || (payload.gameId !== state.gameId && payload.gameId !== state.spectatingGameId)) {
					return;
				}
				const nextMessages = state.chatMessages.slice();
				nextMessages.push(payload);
				if (nextMessages.length > 100) {
					nextMessages.splice(0, nextMessages.length - 100);
				}
				updateState({
					chatMessages: nextMessages,
					roomUnreadCount: computeUnreadCount(nextMessages, lastSeenRoomChatId),
				});
			}));

			subscriptions.push(bridge.on(EVENTS.lobbyChatHistory, payload => {
				const messages = normalizeChatMessages(payload && payload.messages);
				if (!lastSeenLobbyChatId) {
					lastSeenLobbyChatId = getLastMessageId(messages);
				}
				updateState({
					lobbyMessages: messages,
					lobbyUnreadCount: computeUnreadCount(messages, lastSeenLobbyChatId),
				});
			}));

			subscriptions.push(bridge.on(EVENTS.lobbyChatMessage, payload => {
				const nextMessages = state.lobbyMessages.slice();
				nextMessages.push(payload);
				if (nextMessages.length > 100) {
					nextMessages.splice(0, nextMessages.length - 100);
				}
				updateState({
					lobbyMessages: nextMessages,
					lobbyUnreadCount: computeUnreadCount(nextMessages, lastSeenLobbyChatId),
				});
			}));

			subscriptions.push(bridge.on(EVENTS.matchError, payload => {
				const message = payload && payload.message ? payload.message : 'Multiplayer error.';
				updateState({ lastError: message, message });
			}));

			subscriptions.push(bridge.on(EVENTS.sessionExpired, payload => {
				lastSeenRoomChatId = '';
				const message = payload && payload.message ? payload.message : 'This online session expired.';
				updateState({
					mode: 'idle',
					gameId: '',
					localColor: '',
					roomMode: '',
					joinUrl: '',
					reconnectToken: '',
					lastError: message,
					message,
					players: { white: false, black: false },
					roomPlayers: { white: null, black: null },
					chatMessages: [],
					drawOffer: null,
					matchContext: null,
					roomUnreadCount: 0,
					spectating: false,
					spectatingGameId: '',
					spectatorCount: 0,
					currentResult: null,
				});
			}));
		}

		function updateState(patch) {
			Object.assign(state, patch || {});
			persistSession();
			emitter.emit('change', getState());
		}

		function syncProfile() {
			if (!EVENTS.setProfile) return Promise.resolve(false);
			return bridge.emit(EVENTS.setProfile, Object.assign({}, state.profile));
		}

		function requestLiveGamesInternal() {
			if (!EVENTS.requestLiveGames) return Promise.resolve(false);
			return bridge.emit(EVENTS.requestLiveGames);
		}

		function requestLeaderboardInternal() {
			if (!EVENTS.requestLeaderboard) return Promise.resolve(false);
			return bridge.emit(EVENTS.requestLeaderboard);
		}

		function requestClubsInternal() {
			if (!EVENTS.requestClubs) return Promise.resolve(false);
			return bridge.emit(EVENTS.requestClubs);
		}

		function requestTournamentsInternal() {
			if (!EVENTS.requestTournaments) return Promise.resolve(false);
			return bridge.emit(EVENTS.requestTournaments);
		}

		function requestLobbyChatInternal() {
			if (!EVENTS.requestLobbyChat) return Promise.resolve(false);
			return bridge.emit(EVENTS.requestLobbyChat);
		}

		function resumeSessionIfNeeded() {
			if (!state.connected || !state.reconnectToken || state.mode === 'queueing' || state.mode === 'joining-private') {
				return;
			}
			bridge.emit(EVENTS.resumeSession, {
				reconnectToken: state.reconnectToken,
				gameId: state.gameId || '',
			}).catch(() => {
				// Ignore resume transport failures here; regular socket error handling will surface the problem.
			});
		}

		function persistSession() {
			if (!global.sessionStorage) return;
			const snapshot = {
				gameId: state.gameId || '',
				localColor: state.localColor || '',
				roomMode: state.roomMode || '',
				joinUrl: state.joinUrl || '',
				reconnectToken: state.reconnectToken || '',
				serverUrl: state.serverUrl || settings.serverUrl,
			};
			if (!snapshot.reconnectToken) {
				global.sessionStorage.removeItem(sessionStorageKey);
				return;
			}
			global.sessionStorage.setItem(sessionStorageKey, JSON.stringify(snapshot));
		}

		function persistProfile() {
			if (!global.localStorage) return;
			global.localStorage.setItem(profileStorageKey, JSON.stringify(state.profile));
		}

		return {
			subscribe,
			getState,
			connect,
			setProfile,
			findMatch,
			cancelMatchmaking,
			createPrivateGame,
			joinPrivateGame,
			spectateGame,
			stopSpectating,
			leaveGame,
			sendMove,
			sendChatMessage,
			requestLiveGames,
			requestLeaderboard,
			requestClubs,
			requestTournaments,
			requestLobbyChat,
			resignGame,
			sendDrawAction,
			sendLobbyChatMessage,
			createClub,
			joinClub,
			leaveClub,
			createTournament,
			joinTournament,
			leaveTournament,
			startTournament,
			joinTournamentMatch,
			markRoomChatSeen,
			markLobbyChatSeen,
			getServerUrl() {
				return settings.serverUrl;
			},
			dispose() {
				subscriptions.splice(0).forEach(unsubscribe => {
					if (typeof unsubscribe === 'function') unsubscribe();
				});
				bridge.disconnect();
			},
		};
	}

	function createDefaultState(serverUrl, profile) {
		return {
			available: false,
			connected: false,
			connecting: false,
			mode: 'idle',
			message: 'Online play is idle.',
			lastError: '',
			gameId: '',
			localColor: '',
			roomMode: '',
			joinUrl: '',
			reconnectToken: '',
			serverUrl,
			players: {
				white: false,
				black: false,
			},
			roomPlayers: {
				white: null,
				black: null,
			},
			joinInputValue: '',
			profile: normalizeProfileInput(profile),
			liveGames: [],
			leaderboard: [],
			recentResults: [],
			chatMessages: [],
			lobbyMessages: [],
			drawOffer: null,
			clubs: [],
			tournaments: [],
			matchContext: null,
			roomUnreadCount: 0,
			lobbyUnreadCount: 0,
			spectating: false,
			spectatingGameId: '',
			spectatorCount: 0,
			currentResult: null,
			queueSize: 0,
			rated: false,
		};
	}

	function createFallbackEmitter() {
		const listeners = new Set();
		return {
			on(eventName, listener) {
				if (eventName !== 'change' || typeof listener !== 'function') {
					return function noop() {};
				}
				listeners.add(listener);
				return function unsubscribe() {
					listeners.delete(listener);
				};
			},
			emit(eventName, payload) {
				if (eventName !== 'change') return;
				listeners.forEach(listener => listener(payload));
			},
		};
	}

	function readPersistedState(storageKey, serverUrl) {
		if (!global.sessionStorage) return null;
		try {
			const raw = global.sessionStorage.getItem(storageKey);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!parsed || !parsed.reconnectToken) return null;
			return {
				gameId: typeof parsed.gameId === 'string' ? parsed.gameId : '',
				localColor: typeof parsed.localColor === 'string' ? parsed.localColor : '',
				roomMode: typeof parsed.roomMode === 'string' ? parsed.roomMode : '',
				joinUrl: typeof parsed.joinUrl === 'string' ? parsed.joinUrl : '',
				reconnectToken: typeof parsed.reconnectToken === 'string' ? parsed.reconnectToken : '',
				serverUrl: typeof parsed.serverUrl === 'string' ? parsed.serverUrl : serverUrl,
			};
		} catch (error) {
			return null;
		}
	}

	function loadPersistedProfile(storageKey) {
		if (!global.localStorage) return null;
		try {
			const raw = global.localStorage.getItem(storageKey);
			if (!raw) return null;
			return normalizeProfileInput(JSON.parse(raw));
		} catch (error) {
			return null;
		}
	}

	function normalizeProfileInput(value, fallback) {
		const source = typeof value === 'string' ? { displayName: value } : (value || {});
		const nextFallback = fallback && typeof fallback === 'object' ? fallback : {};
		const id = typeof source.id === 'string' && source.id.trim()
			? source.id.trim()
			: (typeof nextFallback.id === 'string' && nextFallback.id.trim() ? nextFallback.id.trim() : createClientProfileId());
		const displayName = sanitizeDisplayName(source.displayName, nextFallback.displayName || ('Guest-' + id.slice(-4)));
		return {
			id,
			displayName,
			rating: Number(source.rating || nextFallback.rating) || 1200,
			games: Number(source.games || nextFallback.games) || 0,
			wins: Number(source.wins || nextFallback.wins) || 0,
			losses: Number(source.losses || nextFallback.losses) || 0,
			draws: Number(source.draws || nextFallback.draws) || 0,
		};
	}

	function sanitizeDisplayName(value, fallback) {
		const text = String(value || '').replace(/\s+/g, ' ').trim().slice(0, 24);
		if (text) return text;
		return String(fallback || 'Guest').replace(/\s+/g, ' ').trim().slice(0, 24) || 'Guest';
	}

	function createClientProfileId() {
		if (global.crypto && typeof global.crypto.randomUUID === 'function') {
			return 'p-' + global.crypto.randomUUID().replace(/-/g, '').slice(0, 12);
		}
		return 'p-' + Math.random().toString(16).slice(2, 14);
	}

	function roomPlayersToPresence(players) {
		return {
			white: Boolean(players && players.white && players.white.connected),
			black: Boolean(players && players.black && players.black.connected),
		};
	}

	function normalizeRoomPlayers(players) {
		return {
			white: players && players.white ? Object.assign({}, players.white) : null,
			black: players && players.black ? Object.assign({}, players.black) : null,
		};
	}

	function normalizeChatMessages(messages) {
		return Array.isArray(messages) ? messages.slice() : [];
	}

	function getLastMessageId(messages) {
		if (!Array.isArray(messages) || !messages.length) return '';
		const last = messages[messages.length - 1];
		return last && typeof last.id === 'string' ? last.id : '';
	}

	function computeUnreadCount(messages, lastSeenId) {
		if (!Array.isArray(messages) || !messages.length || !lastSeenId) return 0;
		const seenIndex = messages.findIndex(message => message && message.id === lastSeenId);
		if (seenIndex < 0) return 0;
		return Math.max(0, messages.length - seenIndex - 1);
	}

	function normalizeChatText(text) {
		return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 300);
	}

	function normalizeDrawOffer(drawOffer) {
		if (!drawOffer || typeof drawOffer !== 'object') return null;
		const from = typeof drawOffer.from === 'string' ? drawOffer.from.trim().toLowerCase() : '';
		if (!from) return null;
		return {
			from,
			createdAt: Number(drawOffer.createdAt) || 0,
		};
	}

	function normalizeMatchContext(matchContext) {
		if (!matchContext || typeof matchContext !== 'object') return null;
		const tournamentId = typeof matchContext.tournamentId === 'string' ? matchContext.tournamentId.trim() : '';
		if (!tournamentId) return null;
		return {
			tournamentId,
			tournamentName: typeof matchContext.tournamentName === 'string' ? matchContext.tournamentName.trim() : '',
			roundNumber: Number(matchContext.roundNumber) || 0,
			pairingId: typeof matchContext.pairingId === 'string' ? matchContext.pairingId.trim() : '',
			clubId: typeof matchContext.clubId === 'string' ? matchContext.clubId.trim() : '',
			clubName: typeof matchContext.clubName === 'string' ? matchContext.clubName.trim() : '',
		};
	}

	function normalizeNamedEntityInput(input, nameLength, descriptionLength) {
		const source = input && typeof input === 'object' ? input : { name: input };
		return {
			name: String(source && source.name || '').replace(/\s+/g, ' ').trim().slice(0, nameLength || 48),
			description: String(source && source.description || '').replace(/\s+/g, ' ').trim().slice(0, descriptionLength || 280),
		};
	}

	function normalizeTournamentInput(input) {
		const normalized = normalizeNamedEntityInput(input, 48, 280);
		const source = input && typeof input === 'object' ? input : {};
		normalized.clubId = String(source && source.clubId || '').trim();
		return normalized;
	}

	global.Chess2MatchmakingClient = { create };
})(window);