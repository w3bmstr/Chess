// mobility.js
// Piece mobility evaluation.

(function (global) {
	const core = global.ChessCore;
	const bb = global.BB_ATTACKS;
	if (!core) {
		throw new Error('mobility.js requires ChessCore from position.js.');
	}

	const WEIGHTS = {
		n: 4,
		b: 5,
		r: 3,
		q: 2,
		k: 1,
	};

	function countBits(mask) {
		if (bb && typeof bb.popcount === 'function') return bb.popcount(mask);
		let count = 0;
		let value = mask || 0n;
		while (value) {
			value &= value - 1n;
			count++;
		}
		return count;
	}

	function evaluateColor(pos, color) {
		if (!bb) return 0;
		const own = color === core.COLOR_WHITE ? pos.bbWhite : pos.bbBlack;
		let score = 0;
		for (let square = 0; square < 64; square++) {
			const piece = pos.board[square];
			if (!piece || core.pieceColor(piece) !== color) continue;
			const lower = piece.toLowerCase();
			let attacks = 0n;
			if (lower === 'n') attacks = bb.knight[square];
			else if (lower === 'b') attacks = bb.bishopAttacks(square, pos.bbOccupied);
			else if (lower === 'r') attacks = bb.rookAttacks(square, pos.bbOccupied);
			else if (lower === 'q') attacks = bb.queenAttacks(square, pos.bbOccupied);
			else if (lower === 'k') attacks = bb.king[square];
			else continue;
			score += countBits(bb.u64(attacks & ~own)) * (WEIGHTS[lower] || 0);
		}
		return score;
	}

	function evaluate(pos) {
		return evaluateColor(pos, core.COLOR_WHITE) - evaluateColor(pos, core.COLOR_BLACK);
	}

	global.EVAL_MOBILITY = {
		evaluate,
		evaluateColor,
	};
})(typeof self !== 'undefined' ? self : window);
