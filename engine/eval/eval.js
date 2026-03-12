// eval.js
// Classical evaluation composed from specialist modules.

(function (global) {
	const core = global.ChessCore;
	if (!core) {
		throw new Error('eval.js requires ChessCore from position.js.');
	}
	const pst = global.EVAL_PST;
	const pawns = global.EVAL_PAWNS;
	const mobility = global.EVAL_MOBILITY;
	const kingSafety = global.EVAL_KING_SAFETY;
	const threats = global.EVAL_THREATS;
	const nnue = global.NNUE;

	function evaluate(pos) {
		let score = 0;
		if (pst && typeof pst.evaluate === 'function') score += pst.evaluate(pos);
		if (pawns && typeof pawns.evaluate === 'function') score += pawns.evaluate(pos);
		if (mobility && typeof mobility.evaluate === 'function') score += mobility.evaluate(pos);
		if (kingSafety && typeof kingSafety.evaluate === 'function') score += kingSafety.evaluate(pos);
		if (threats && typeof threats.evaluate === 'function') score += threats.evaluate(pos);
		if (nnue && typeof nnue.evaluate === 'function') {
			const blended = nnue.evaluate(pos, score);
			if (typeof blended === 'number') score = blended;
		}
		return pos.side === core.COLOR_WHITE ? score : -score;
	}

	function isInsufficientMaterial(pos) {
		let whiteMinor = 0;
		let blackMinor = 0;
		let whiteOther = 0;
		let blackOther = 0;

		for (const piece of pos.board) {
			if (!piece) continue;
			const lower = piece.toLowerCase();
			const isWhite = piece === piece.toUpperCase();
			if (lower === 'p' || lower === 'r' || lower === 'q') {
				if (isWhite) whiteOther++; else blackOther++;
			} else if (lower === 'b' || lower === 'n') {
				if (isWhite) whiteMinor++; else blackMinor++;
			}
		}

		if (whiteOther || blackOther) return false;
		return whiteMinor <= 1 && blackMinor <= 1;
	}

	global.EVAL = {
		evaluate,
		isInsufficientMaterial,
	};
})(typeof self !== 'undefined' ? self : window);
