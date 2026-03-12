(function (global) {
	const EVENTS = {
		setProfile: 'setProfile',
		profile: 'profile',
		findMatch: 'findMatch',
		cancelMatchmaking: 'cancelMatchmaking',
		resumeSession: 'resumeSession',
		waiting: 'waiting',
		matchFound: 'matchFound',
		matchError: 'matchError',
		sessionExpired: 'sessionExpired',
		matchmakingCancelled: 'matchmakingCancelled',
		createPrivateGame: 'createPrivateGame',
		privateGameCreated: 'privateGameCreated',
		joinPrivateGame: 'joinPrivateGame',
		leaveGame: 'leaveGame',
		move: 'move',
		resign: 'resign',
		drawAction: 'drawAction',
		moveMade: 'moveMade',
		opponentLeft: 'opponentLeft',
		presence: 'presence',
		drawState: 'drawState',
		requestLiveGames: 'requestLiveGames',
		liveGames: 'liveGames',
		spectateGame: 'spectateGame',
		stopSpectating: 'stopSpectating',
		spectateStarted: 'spectateStarted',
		spectateEnded: 'spectateEnded',
		sendChatMessage: 'sendChatMessage',
		chatHistory: 'chatHistory',
		chatMessage: 'chatMessage',
		requestLobbyChat: 'requestLobbyChat',
		lobbyChatHistory: 'lobbyChatHistory',
		sendLobbyChatMessage: 'sendLobbyChatMessage',
		lobbyChatMessage: 'lobbyChatMessage',
		requestLeaderboard: 'requestLeaderboard',
		leaderboard: 'leaderboard',
		requestClubs: 'requestClubs',
		clubsUpdated: 'clubsUpdated',
		createClub: 'createClub',
		joinClub: 'joinClub',
		leaveClub: 'leaveClub',
		requestTournaments: 'requestTournaments',
		tournamentsUpdated: 'tournamentsUpdated',
		createTournament: 'createTournament',
		joinTournament: 'joinTournament',
		leaveTournament: 'leaveTournament',
		startTournament: 'startTournament',
		joinTournamentMatch: 'joinTournamentMatch',
		gameResult: 'gameResult',
	};

	function normalizeUrlValue(value) {
		return typeof value === 'string' && value.trim()
			? value.trim().replace(/\/$/, '')
			: '';
	}

	function decodeValue(value) {
		try {
			return decodeURIComponent(String(value || '').trim());
		} catch (error) {
			return String(value || '').trim();
		}
	}

	function getGithubPagesBasePath(pathname) {
		const parts = String(pathname || '')
			.split('/')
			.filter(Boolean);
		return parts.length ? '/' + parts[0] : '';
	}

	function getDefaultServerUrl() {
		const configuredServerUrl = normalizeUrlValue(global.CHESS2_SOCKET_SERVER_URL);
		if (configuredServerUrl) {
			return configuredServerUrl;
		}

		if (global.localStorage) {
			const stored = global.localStorage.getItem('chess2.socketServerUrl');
			const normalizedStored = normalizeUrlValue(stored);
			if (normalizedStored) {
				return normalizedStored;
			}
		}

		if (global.location && global.location.protocol === 'file:') {
			return 'http://localhost:3000';
		}

		if (global.location && global.location.origin) {
			const hostname = String(global.location.hostname || '').toLowerCase();
			if (hostname.endsWith('github.io')) {
				return '';
			}
			return global.location.origin.replace(/\/$/, '');
		}

		return 'http://localhost:3000';
	}

	function getDefaultPublicBaseUrl() {
		const configuredPublicBaseUrl = normalizeUrlValue(global.CHESS2_PUBLIC_BASE_URL);
		if (configuredPublicBaseUrl) {
			return configuredPublicBaseUrl;
		}

		if (global.location && global.location.origin) {
			const origin = normalizeUrlValue(global.location.origin);
			const hostname = String(global.location.hostname || '').toLowerCase();
			if (hostname.endsWith('github.io')) {
				return origin + getGithubPagesBasePath(global.location.pathname);
			}
			return origin;
		}

		return '';
	}

	function toAbsoluteUrl(serverUrl, targetPath) {
		try {
			return new URL(targetPath, serverUrl).toString();
		} catch (error) {
			return targetPath;
		}
	}

	function buildPublicGameUrl(publicBaseUrl, gameId) {
		const normalizedGameId = decodeValue(gameId);
		if (!normalizedGameId) return '';

		const baseUrl = normalizeUrlValue(publicBaseUrl) || getDefaultPublicBaseUrl();
		const suffix = '/?game=' + encodeURIComponent(normalizedGameId);
		return baseUrl ? baseUrl + suffix : suffix;
	}

	function extractPrivateGameId(pathname) {
		const value = String(pathname || '').trim();
		if (!value) return '';

		const queryMatch = value.match(/[?&]game=([^&#]+)/i);
		if (queryMatch && queryMatch[1]) {
			return decodeValue(queryMatch[1]);
		}

		const pathMatch = value.match(/(?:^|\/)game\/([^/?#]+)/i);
		if (pathMatch && pathMatch[1]) {
			return decodeValue(pathMatch[1]);
		}

		const hashMatch = value.match(/#\/?game\/([^/?#]+)/i);
		if (hashMatch && hashMatch[1]) {
			return decodeValue(hashMatch[1]);
		}

		if (!/[/?#]/.test(value)) {
			return decodeValue(value);
		}

		return '';
	}

	global.Chess2NetworkProtocol = {
		EVENTS,
		getDefaultServerUrl,
		getDefaultPublicBaseUrl,
		toAbsoluteUrl,
		buildPublicGameUrl,
		extractPrivateGameId,
	};
})(window);
