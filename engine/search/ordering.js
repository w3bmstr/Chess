// ordering.js
// First real move ordering pass: TT move, captures, killers, history.

(function (global) {
	const core = global.ChessCore;
	if (!core) {
		throw new Error('ordering.js requires ChessCore from position.js.');
	}

	const MAX_PLY = 128;
	const _scores = new Int32Array(256);
	const _killers = Array.from({ length: MAX_PLY }, () => new Int32Array(2));
	const _history = [new Int32Array(64 * 64), new Int32Array(64 * 64)];
	const _counter = new Map();

	function moveKey(move) {
		return core.moveFrom(move) * 64 + core.moveTo(move);
	}

	function pieceValue(piece) {
		switch (piece) {
			case core.PIECE_PAWN: return 100;
			case core.PIECE_KNIGHT: return 320;
			case core.PIECE_BISHOP: return 330;
			case core.PIECE_ROOK: return 500;
			case core.PIECE_QUEEN: return 900;
			default: return 0;
		}
	}

	function scoreCapture(move) {
		return pieceValue(core.moveCapture(move)) * 16 - pieceValue(core.movePiece(move));
	}

	const ORDER = {
		_scores,

		clearKillers() {
			for (const pair of _killers) pair.fill(0);
			_history[0].fill(0);
			_history[1].fill(0);
			_counter.clear();
		},

		scoreMoves(list, ttMove, ply, prevMove, side) {
			const sideIndex = side === core.COLOR_BLACK ? 1 : 0;
			const counterMove = _counter.get(prevMove || 0) || 0;

			for (let i = 0; i < list.count; i++) {
				const move = list.moves[i];
				const flags = core.moveFlags(move);
				let score = 0;

				if (move === ttMove) score += 1_000_000;
				else if (core.isCaptureFlag(flags)) score += 100_000 + scoreCapture(move);
				else {
					if (_killers[ply][0] === move) score += 90_000;
					else if (_killers[ply][1] === move) score += 80_000;
					if (counterMove === move) score += 70_000;
					score += _history[sideIndex][moveKey(move)];
				}

				_scores[i] = score;
			}
		},

		pickBest(list, scores, startIndex) {
			let bestIndex = startIndex;
			for (let i = startIndex + 1; i < list.count; i++) {
				if (scores[i] > scores[bestIndex]) bestIndex = i;
			}
			if (bestIndex !== startIndex) {
				const move = list.moves[startIndex];
				list.moves[startIndex] = list.moves[bestIndex];
				list.moves[bestIndex] = move;
				const score = scores[startIndex];
				scores[startIndex] = scores[bestIndex];
				scores[bestIndex] = score;
			}
		},

		sortCaptures(list) {
			for (let i = 0; i < list.count; i++) {
				_scores[i] = scoreCapture(list.moves[i]);
			}
			for (let i = 0; i < list.count; i++) {
				ORDER.pickBest(list, _scores, i);
			}
		},

		see(pos, move) {
			return pieceValue(core.moveCapture(move)) - pieceValue(core.movePiece(move));
		},

		storeKiller(ply, move) {
			if (_killers[ply][0] === move) return;
			_killers[ply][1] = _killers[ply][0];
			_killers[ply][0] = move;
		},

		storeCounter(prevMove, move) {
			if (prevMove) _counter.set(prevMove, move);
		},

		updateHistory(side, move, quietsTried, depth) {
			const sideIndex = side === core.COLOR_BLACK ? 1 : 0;
			const bonus = depth * depth;
			_history[sideIndex][moveKey(move)] += bonus;
			for (const quiet of quietsTried || []) {
				if (quiet !== move) _history[sideIndex][moveKey(quiet)] -= bonus;
			}
		},
	};

	global.ORDER = ORDER;
})(typeof self !== 'undefined' ? self : window);
