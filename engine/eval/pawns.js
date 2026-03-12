// pawns.js
// Pawn structure evaluation.

(function (global) {
	const core = global.ChessCore;
	if (!core) {
		throw new Error('pawns.js requires ChessCore from position.js.');
	}

	function evaluateColor(pos, color) {
		const pawns = [];
		const fileCounts = new Int8Array(8);
		for (let square = 0; square < 64; square++) {
			const piece = pos.board[square];
			if (!piece || piece.toLowerCase() !== 'p' || core.pieceColor(piece) !== color) continue;
			pawns.push(square);
			fileCounts[square % 8]++;
		}

		let score = 0;
		for (const square of pawns) {
			const file = square % 8;
			const rank = Math.floor(square / 8);
			const leftCount = file > 0 ? fileCounts[file - 1] : 0;
			const rightCount = file < 7 ? fileCounts[file + 1] : 0;
			const forwardRank = color === core.COLOR_WHITE ? rank + 1 : rank - 1;
			const hasFriendlyPawnAheadSameFile = (() => {
				for (let scanRank = color === core.COLOR_WHITE ? rank + 1 : rank - 1; scanRank >= 0 && scanRank < 8; scanRank += (color === core.COLOR_WHITE ? 1 : -1)) {
					const pieceAhead = pos.board[scanRank * 8 + file];
					if (pieceAhead && pieceAhead.toLowerCase() === 'p' && core.pieceColor(pieceAhead) === color) {
						return true;
					}
				}
				return false;
			})();

			if (fileCounts[file] > 1) score -= 24 * (fileCounts[file] - 1);
			if (!leftCount && !rightCount) score -= 14;
			if (forwardRank >= 0 && forwardRank < 8) {
				const forwardPiece = pos.board[forwardRank * 8 + file];
				if (forwardPiece && forwardPiece.toLowerCase() === 'p' && core.pieceColor(forwardPiece) === color) {
					score -= 32;
				}
			}

			let connected = false;
			for (const neighborFile of [file - 1, file + 1]) {
				if (neighborFile < 0 || neighborFile > 7) continue;
				for (const neighborRank of [rank - 1, rank, rank + 1]) {
					if (neighborRank < 0 || neighborRank > 7) continue;
					const neighbor = pos.board[neighborRank * 8 + neighborFile];
					if (neighbor && neighbor.toLowerCase() === 'p' && core.pieceColor(neighbor) === color) {
						connected = true;
					}
				}
			}
			if (connected) score += 6;

			let passed = true;
			const startRank = color === core.COLOR_WHITE ? rank + 1 : rank - 1;
			for (let scanFile = Math.max(0, file - 1); scanFile <= Math.min(7, file + 1) && passed; scanFile++) {
				for (let scanRank = startRank; scanRank >= 0 && scanRank < 8; scanRank += (color === core.COLOR_WHITE ? 1 : -1)) {
					const target = pos.board[scanRank * 8 + scanFile];
					if (target && target.toLowerCase() === 'p' && core.pieceColor(target) !== color) {
						passed = false;
						break;
					}
				}
			}
			if (passed && !hasFriendlyPawnAheadSameFile) {
				const advance = color === core.COLOR_WHITE ? rank : 7 - rank;
				score += 18 + advance * 10;
			}
		}

		return score;
	}

	function evaluate(pos) {
		return evaluateColor(pos, core.COLOR_WHITE) - evaluateColor(pos, core.COLOR_BLACK);
	}

	global.EVAL_PAWNS = {
		evaluate,
		evaluateColor,
	};
})(typeof self !== 'undefined' ? self : window);
