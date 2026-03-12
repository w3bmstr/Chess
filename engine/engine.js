// engine.js
// Browser-safe engine API backed by Position and MoveGen.

(function (global) {
	function canUseSearchModules() {
		return typeof global.BB_ATTACKS !== 'undefined'
			&& typeof global.SEARCH !== 'undefined'
			&& typeof global.TT !== 'undefined'
			&& typeof global.ORDER !== 'undefined'
			&& typeof global.EVAL !== 'undefined'
			&& typeof global.ZOBRIST !== 'undefined'
			&& typeof global.STACK !== 'undefined';
	}

	function createEngine() {
		const pos = new global.Position();
		let lastBestMove = null;
		let lastInfo = { depth: 0, score: 0, nodes: 0, pv: [], bestMove: null };
		const stopState = { stop: false };

		function getNNUEStatus() {
			if (global.NNUE && typeof global.NNUE.getStatus === 'function') {
				return global.NNUE.getStatus();
			}
			return { ready: false, source: 'unavailable' };
		}

		return {
			setPosition(fen) {
				pos.loadFEN(fen || 'startpos');
				lastBestMove = null;
				lastInfo = { depth: 0, score: 0, nodes: 0, pv: [], bestMove: null };
			},

			makeMove(uciMove) {
				const move = global.MoveGen.uciToMove(pos, uciMove);
				if (!move) return false;
				pos.makeMove(move);
				lastBestMove = global.MoveGen.moveToUCI(move);
				return true;
			},

			go(options, onInfo) {
				const opts = options || {};
				const depth = Math.max(1, Math.min(4, opts.depth || 2));
				stopState.stop = false;
				if (!canUseSearchModules()) {
					return Promise.reject(new Error('SEARCH stack is not loaded.'));
				}

				return new Promise(resolve => {
					setTimeout(() => {
						const result = global.SEARCH.go(pos, { depth, onInfo });
						lastBestMove = result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;
						lastInfo = Object.assign({}, global.SEARCH.getInfo(), { nnue: getNNUEStatus() });
						if (typeof onInfo === 'function') onInfo(lastInfo);
						resolve({ bestMove: lastBestMove, score: lastInfo.score || result.bestScore || 0 });
					}, 0);
				});
			},

			stop() {
				stopState.stop = true;
				if (canUseSearchModules()) {
					global.SEARCH.stop();
				}
			},

			getBestMove() {
				return lastBestMove;
			},

			getInfo() {
				return Object.assign({}, lastInfo, { nnue: getNNUEStatus() });
			},

			getNNUEStatus() {
				return getNNUEStatus();
			},

			loadNNUE(nextNetwork, options) {
				if (!global.NNUE) {
					throw new Error('NNUE API unavailable.');
				}
				if (typeof global.NNUE.loadNetwork === 'function') {
					return global.NNUE.loadNetwork(nextNetwork, options);
				}
				if (typeof global.NNUE.setNetwork === 'function') {
					global.NNUE.setNetwork(nextNetwork, options);
					return getNNUEStatus();
				}
				throw new Error('NNUE load API unavailable.');
			},

			resetNNUE() {
				if (!global.NNUE || typeof global.NNUE.loadDefaultNetwork !== 'function') {
					throw new Error('NNUE default loader unavailable.');
				}
				return global.NNUE.loadDefaultNetwork();
			},

			getFEN() {
				return pos.toFEN();
			},
		};
	}

	global.createEngine = createEngine;
})(typeof self !== 'undefined' ? self : window);
