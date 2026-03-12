(function (global) {
	function createGameController(deps) {
		const emitter = typeof global.createEventEmitter === 'function'
			? global.createEventEmitter()
			: createFallbackEmitter();

		const config = Object.assign({
			startFEN: '',
			humanColor: 'white',
			engineColor: 'black',
			humanColors: null,
			engineColors: null,
			canHumanMove: null,
		}, deps && deps.config ? deps.config : {});

		const state = {
			currentBoardFEN: config.startFEN,
			currentGameState: deps.parseFEN(config.startFEN),
			selectedSquare: null,
			selectedReservePiece: null,
			legalTargets: [],
			lastMoveSquares: [],
			moveHistory: [],
			currentMoveIndex: -1,
			currentEngineInfo: null,
			engineThinking: false,
			analysis: {
				enabled: false,
				running: false,
				requestId: 0,
			},
		};

		function subscribe(listener) {
			const unsubscribe = emitter.on('change', listener);
			listener(getSnapshot());
			return unsubscribe;
		}

		function getSnapshot() {
			const currentState = state.currentGameState || {};
			return {
				currentBoardFEN: state.currentBoardFEN,
				currentGameState: currentState,
				selectedSquare: state.selectedSquare,
				selectedReservePiece: state.selectedReservePiece,
				legalTargets: state.legalTargets.slice(),
				lastMoveSquares: state.lastMoveSquares.slice(),
				moveHistory: state.moveHistory.slice(),
				currentMoveIndex: state.currentMoveIndex,
				currentEngineInfo: state.currentEngineInfo,
				engineThinking: state.engineThinking,
				analysis: Object.assign({}, state.analysis),
				files: currentState.files || 'abcdefgh',
				ranks: currentState.ranks || '87654321',
				variantId: currentState.variantId || 'standard',
				reserve: {
					white: Object.assign({}, currentState.reserve && currentState.reserve.white ? currentState.reserve.white : {}),
					black: Object.assign({}, currentState.reserve && currentState.reserve.black ? currentState.reserve.black : {}),
				},
				checkSquare: getCheckSquare(),
				isLivePosition: state.currentMoveIndex === state.moveHistory.length - 1,
				opening: getOpeningState(),
				pgnText: exportPGN(),
				uciLine: exportUCILine(),
			};
		}

		function configure(nextConfig) {
			Object.assign(config, nextConfig || {});
			emit();
		}

		function loadFEN(fen, options) {
			const settings = options || {};
			const validation = deps.validateFEN ? deps.validateFEN(fen || config.startFEN) : { valid: true };
			if (!validation.valid) {
				return { ok: false, error: validation.error || 'Invalid FEN.' };
			}
			syncPosition(fen || config.startFEN);
			if (!settings.preserveHistory && !settings.skipHistoryReset) {
				state.moveHistory = [];
				state.currentMoveIndex = -1;
				state.lastMoveSquares = [];
				clearSelection(false);
			}

			state.selectedReservePiece = null;

			if (Object.prototype.hasOwnProperty.call(settings, 'engineInfo')) {
				state.currentEngineInfo = settings.engineInfo;
			}

			emit();
			return { ok: true, snapshot: getSnapshot() };
		}

		function startNewGame() {
			state.currentEngineInfo = null;
			state.engineThinking = false;
			stopAnalysis(false);
			return loadFEN(config.startFEN);
		}

		function undoLastMove() {
			const entry = state.moveHistory.pop();
			if (!entry) {
				emit();
				return getSnapshot();
			}

			syncPosition(entry.previousFen || config.startFEN);
			state.currentEngineInfo = null;
			state.lastMoveSquares = [];
			state.currentMoveIndex = state.moveHistory.length - 1;
			clearSelection(false);
			emit();
			return getSnapshot();
		}

		function navigateToMove(index) {
			state.engineThinking = false;
			state.analysis.running = false;
			clearSelection(false);

			if (!state.moveHistory.length || index < 0) {
				syncPosition(config.startFEN);
				state.currentMoveIndex = -1;
				state.lastMoveSquares = [];
				state.currentEngineInfo = null;
				emit();
				return getSnapshot();
			}

			const safeIndex = Math.max(0, Math.min(index, state.moveHistory.length - 1));
			const entry = state.moveHistory[safeIndex];
			syncPosition(entry.nextFen);
			state.currentMoveIndex = safeIndex;
			state.lastMoveSquares = entry.moveSquares ? entry.moveSquares.slice() : [];
			state.currentEngineInfo = null;
			emit();
			return getSnapshot();
		}

		function selectSquare(squareName) {
			const piece = deps.getPieceAt(state.currentGameState, squareName);
			if (!piece || deps.pieceColor(piece) !== state.currentGameState.activeColor) {
				clearSelection();
				return getSnapshot();
			}

			const moves = deps.generateLegalMovesFrom(state.currentGameState, squareName);
			if (!moves.length) {
				clearSelection();
				return getSnapshot();
			}

			state.selectedSquare = squareName;
			state.selectedReservePiece = null;
			state.legalTargets = moves.map(move => move.to);
			emit();
			return getSnapshot();
		}

		function selectReservePiece(pieceCode) {
			if (typeof deps.generateLegalDropMoves !== 'function') {
				clearSelection();
				return getSnapshot();
			}

			const code = String(pieceCode || '').trim();
			if (!code) {
				clearSelection();
				return getSnapshot();
			}

			const moves = deps.generateLegalDropMoves(state.currentGameState, code);
			if (!moves.length) {
				clearSelection();
				return getSnapshot();
			}

			state.selectedSquare = null;
			state.selectedReservePiece = code;
			state.legalTargets = moves.map(move => move.to);
			emit();
			return getSnapshot();
		}

		async function handleSquareClick(squareName, options) {
			const settings = options || {};
			if (!squareName) return false;
			if (state.currentMoveIndex !== state.moveHistory.length - 1) return false;
			if (state.engineThinking || !canHumanMoveActiveColor()) return false;

			if (state.selectedReservePiece && typeof deps.generateLegalDropMoves === 'function') {
				const matchingDrop = deps.generateLegalDropMoves(state.currentGameState, state.selectedReservePiece)
					.find(move => move.to === squareName);
				if (matchingDrop) {
					commitMove(matchingDrop);
					return true;
				}
				selectSquare(squareName);
				return false;
			}

			if (!state.selectedSquare) {
				selectSquare(squareName);
				return true;
			}

			if (squareName === state.selectedSquare) {
				clearSelection();
				return true;
			}

			const legalMoves = deps.generateLegalMovesFrom(state.currentGameState, state.selectedSquare);
			const matchingMoves = legalMoves.filter(move => move.to === squareName);
			let chosenMove = matchingMoves[0] || null;

			if (matchingMoves.length > 1 && typeof settings.choosePromotion === 'function') {
				const promotion = await settings.choosePromotion(state.currentGameState.activeColor);
				if (!promotion) {
					emit();
					return false;
				}
				chosenMove = matchingMoves.find(move => move.promotion === promotion) || null;
			}

			if (chosenMove) {
				commitMove(chosenMove);
				return true;
			}

			selectSquare(squareName);
			return false;
		}

		function commitMove(move) {
			if (!move) return null;

			if (state.currentMoveIndex < state.moveHistory.length - 1) {
				state.moveHistory = state.moveHistory.slice(0, state.currentMoveIndex + 1);
			}

			const nextState = deps.applyMoveToState(state.currentGameState, move);
			const nextFen = deps.serializeFEN(nextState);
			const moveSquares = [move.from, move.to];
			const notation = deps.notation && typeof deps.notation.formatMoveRecord === 'function'
				? deps.notation.formatMoveRecord(move, state.currentGameState, nextState, { getGameStatus: deps.getGameStatus, moveToUCI: deps.moveToUCI })
				: { uci: deps.moveToUCI(move), lan: deps.moveToUCI(move), san: deps.moveToUCI(move) };

			state.moveHistory.push({
				ply: state.moveHistory.length + 1,
				side: state.currentGameState.activeColor,
				uci: notation.uci,
				lan: notation.lan,
				san: notation.san,
				previousFen: state.currentBoardFEN,
				nextFen,
				moveSquares,
			});

			syncPosition(nextFen);
			state.lastMoveSquares = moveSquares.slice();
			state.currentMoveIndex = state.moveHistory.length - 1;
			state.analysis.running = false;
			state.selectedReservePiece = null;
			clearSelection(false);
			emit();
			return move;
		}

		function findLegalMoveByUCI(uciMove) {
			const needle = String(uciMove || '').trim().toLowerCase();
			return deps.generateAllLegalMoves(state.currentGameState).find(move => deps.moveToUCI(move) === needle) || null;
		}

		function applyMoveFromUCI(uciMove) {
			const move = findLegalMoveByUCI(uciMove);
			if (!move) return null;
			commitMove(move);
			return move;
		}

		function applyEngineMoveFromUCI(uciMove) {
			return applyMoveFromUCI(uciMove);
		}

		function setEngineThinking(isThinking) {
			state.engineThinking = Boolean(isThinking);
			emit();
			return getSnapshot();
		}

		function setEngineInfo(info) {
			state.currentEngineInfo = info || null;
			emit();
			return getSnapshot();
		}

		function startAnalysis() {
			state.analysis.enabled = true;
			state.analysis.running = true;
			state.analysis.requestId += 1;
			emit();
			return Object.assign({}, state.analysis);
		}

		function stopAnalysis(shouldEmit) {
			state.analysis.enabled = false;
			state.analysis.running = false;
			state.analysis.requestId += 1;
			if (shouldEmit !== false) emit();
			return Object.assign({}, state.analysis);
		}

		function setAnalysisRunning(isRunning) {
			state.analysis.running = Boolean(isRunning);
			emit();
			return Object.assign({}, state.analysis);
		}

		function exportFEN() {
			return state.currentBoardFEN;
		}

		function exportPGN() {
			if (!deps.notation || typeof deps.notation.exportPGN !== 'function') return '';
			return deps.notation.exportPGN({
				startFEN: config.startFEN,
				moveHistory: state.moveHistory,
			});
		}

		function exportUCILine() {
			if (!deps.notation || typeof deps.notation.exportUCILine !== 'function') return '';
			return deps.notation.exportUCILine(state.moveHistory);
		}

		function importUCILine(text) {
			if (!deps.notation || typeof deps.notation.importUCILine !== 'function') {
				return { ok: false, error: 'Notation module unavailable.' };
			}

			startNewGame();
			return deps.notation.importUCILine(text, {
				findMove(token) {
					return findLegalMoveByUCI(token);
				},
				applyMove(move) {
					commitMove(move);
				},
			});
		}

		function importPGN(text) {
			if (!deps.notation || typeof deps.notation.importPGN !== 'function') {
				return { ok: false, error: 'Notation module unavailable.' };
			}

			state.currentEngineInfo = null;
			state.engineThinking = false;
			stopAnalysis(false);

			return deps.notation.importPGN(text, {
				startFEN: config.startFEN,
				parseFEN: deps.parseFEN,
				applyMoveToState: deps.applyMoveToState,
				generateAllLegalMoves: deps.generateAllLegalMoves,
				generateLegalMovesFrom: deps.generateLegalMovesFrom,
				moveToUCI: deps.moveToUCI,
				getGameStatus: deps.getGameStatus,
				formatMoveRecord: deps.notation.formatMoveRecord,
				loadStartPosition(fen) {
					return loadFEN(fen || config.startFEN);
				},
				findMoveByUCI(uciMove) {
					return findLegalMoveByUCI(uciMove);
				},
				applyMove(move) {
					commitMove(move);
				},
			});
		}

		function clearSelection(shouldEmit) {
			state.selectedSquare = null;
			state.selectedReservePiece = null;
			state.legalTargets = [];
			if (shouldEmit !== false) {
				emit();
			}
		}

		function canHumanMoveActiveColor() {
			const activeColor = state.currentGameState.activeColor;
			if (typeof config.canHumanMove === 'function') {
				return Boolean(config.canHumanMove(activeColor, getSnapshot(), state.currentGameState));
			}
			if (Array.isArray(config.humanColors)) {
				return config.humanColors.includes(activeColor);
			}
			return activeColor === config.humanColor;
		}

		function canUndo() {
			return state.moveHistory.length > 0 && state.currentMoveIndex === state.moveHistory.length - 1;
		}

		function canGoPrevious() {
			return state.currentMoveIndex >= 0;
		}

		function canGoNext() {
			return state.currentMoveIndex < state.moveHistory.length - 1;
		}

		function emit() {
			emitter.emit('change', getSnapshot());
		}

		function syncPosition(fen) {
			state.currentBoardFEN = fen;
			state.currentGameState = deps.parseFEN(fen);
		}

		function getCheckSquare() {
			const kingSquare = deps.findKingSquare(state.currentGameState, state.currentGameState.activeColor);
			if (!kingSquare) return null;
			return deps.isSquareAttacked(state.currentGameState, kingSquare, deps.oppositeColor(state.currentGameState.activeColor))
				? kingSquare
				: null;
		}

		function getOpeningState() {
			if (!deps.openings || typeof deps.openings.getOpeningState !== 'function') {
				return { line: [], sanLine: [], recognized: null, nextMoves: [] };
			}

			const visibleHistory = state.currentMoveIndex >= 0
				? state.moveHistory.slice(0, state.currentMoveIndex + 1)
				: [];

			return deps.openings.getOpeningState({
				uciLine: visibleHistory.map(entry => entry.uci),
				sanLine: visibleHistory.map(entry => entry.san || entry.uci),
				currentGameState: state.currentGameState,
			});
		}

		return {
			subscribe,
			getSnapshot,
			configure,
			loadFEN,
			startNewGame,
			undoLastMove,
			navigateToMove,
			selectSquare,
			selectReservePiece,
			handleSquareClick,
			commitMove,
			findLegalMoveByUCI,
			applyMoveFromUCI,
			applyEngineMoveFromUCI,
			setEngineThinking,
			setEngineInfo,
			startAnalysis,
			stopAnalysis,
			setAnalysisRunning,
			exportFEN,
			exportPGN,
			exportUCILine,
			importPGN,
			importUCILine,
			clearSelection,
			canUndo,
			canGoPrevious,
			canGoNext,
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

	global.createGameController = createGameController;
})(window);
