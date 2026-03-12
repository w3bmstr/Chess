// threats.js
// Tactical pressure and hanging-piece evaluation.

(function (global) {
	const core = global.ChessCore;
	if (!core) {
		throw new Error('threats.js requires ChessCore from position.js.');
	}

	const TARGET_VALUE = {
		p: 8,
		n: 18,
		b: 18,
		r: 24,
		q: 36,
		k: 0,
	};

	function evaluateForColor(pos, attackerColor) {
		let score = 0;
		for (let square = 0; square < 64; square++) {
			const piece = pos.board[square];
			if (!piece || core.pieceColor(piece) === attackerColor) continue;
			if (!pos.isSquareAttacked(square, attackerColor)) continue;
			const lower = piece.toLowerCase();
			const base = TARGET_VALUE[lower] || 0;
			score += base;
			if (!pos.isSquareAttacked(square, attackerColor ^ 1)) {
				score += Math.floor(base / 2) + 6;
			}
		}
		return score;
	}

	function evaluate(pos) {
		return evaluateForColor(pos, core.COLOR_WHITE) - evaluateForColor(pos, core.COLOR_BLACK);
	}

	global.EVAL_THREATS = {
		evaluate,
		evaluateForColor,
	};
})(typeof self !== 'undefined' ? self : window);
