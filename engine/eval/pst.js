// pst.js
// Material and piece-square evaluation tables.

(function (global) {
	const core = global.ChessCore;
	if (!core) {
		throw new Error('pst.js requires ChessCore from position.js.');
	}

	const MATERIAL = {
		p: 100,
		n: 320,
		b: 330,
		r: 500,
		q: 900,
		k: 0,
	};

	const TABLES = {
		p: [0, 5, 5, 0, 5, 10, 50, 0, 0, 10, -5, 0, 5, 10, 50, 0, 0, 10, -10, 0, 10, 20, 50, 0, 0, -20, 0, 20, 25, 30, 50, 0, 0, -20, 0, 20, 25, 30, 50, 0, 0, 10, -10, 0, 10, 20, 50, 0, 0, 10, -5, 0, 5, 10, 50, 0, 0, 5, 5, 0, 5, 10, 50, 0],
		n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 20, 25, 25, 20, 0, -30, -30, 5, 20, 25, 25, 20, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
		b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 10, 0, 0, 0, 0, 10, -10, -10, 15, 15, 15, 15, 15, 15, -10, -10, 0, 15, 15, 15, 15, 0, -10, -10, 5, 10, 15, 15, 10, 5, -10, -10, 0, 10, 15, 15, 10, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20],
		r: [0, 0, 5, 10, 10, 5, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 5, 10, 10, 5, 0, 0],
		q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5, -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
		k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
	};

	function mirrorSquare(square) {
		const file = square % 8;
		const rank = Math.floor(square / 8);
		return (7 - rank) * 8 + file;
	}

	function pieceSquareValue(piece, square) {
		if (!piece) return 0;
		const lower = piece.toLowerCase();
		const table = TABLES[lower] || TABLES.p;
		return core.pieceColor(piece) === core.COLOR_WHITE ? table[square] : table[mirrorSquare(square)];
	}

	function evaluate(pos) {
		let score = 0;
		let whiteBishops = 0;
		let blackBishops = 0;
		for (let square = 0; square < 64; square++) {
			const piece = pos.board[square];
			if (!piece) continue;
			const lower = piece.toLowerCase();
			const value = (MATERIAL[lower] || 0) + pieceSquareValue(piece, square);
			if (lower === 'b') {
				if (core.pieceColor(piece) === core.COLOR_WHITE) whiteBishops++;
				else blackBishops++;
			}
			score += core.pieceColor(piece) === core.COLOR_WHITE ? value : -value;
		}
		if (whiteBishops >= 2) score += 30;
		if (blackBishops >= 2) score -= 30;
		return score;
	}

	global.EVAL_PST = {
		MATERIAL,
		TABLES,
		mirrorSquare,
		pieceSquareValue,
		evaluate,
	};
})(typeof self !== 'undefined' ? self : window);
