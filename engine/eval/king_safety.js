// king_safety.js
// King shelter and exposure evaluation.

(function (global) {
	const core = global.ChessCore;
	const bb = global.BB_ATTACKS;
	if (!core) {
		throw new Error('king_safety.js requires ChessCore from position.js.');
	}

	function findKingSquare(pos, color) {
		const target = color === core.COLOR_WHITE ? 'K' : 'k';
		return pos.board.indexOf(target);
	}

	function evaluateColor(pos, color) {
		const kingSquare = findKingSquare(pos, color);
		if (kingSquare < 0) return 0;
		const file = kingSquare % 8;
		const rank = Math.floor(kingSquare / 8);
		let score = 0;

		const shieldRanks = color === core.COLOR_WHITE ? [rank + 1, rank + 2] : [rank - 1, rank - 2];
		for (const shieldFile of [file - 1, file, file + 1]) {
			if (shieldFile < 0 || shieldFile > 7) continue;
			let hasShieldPawn = false;
			for (const shieldRank of shieldRanks) {
				if (shieldRank < 0 || shieldRank > 7) continue;
				const piece = pos.board[shieldRank * 8 + shieldFile];
				if (piece && piece.toLowerCase() === 'p' && core.pieceColor(piece) === color) {
					hasShieldPawn = true;
					break;
				}
			}
			score += hasShieldPawn ? 8 : -10;
		}

		let openFilePenalty = 0;
		for (const scanFile of [file - 1, file, file + 1]) {
			if (scanFile < 0 || scanFile > 7) continue;
			let friendlyPawn = false;
			for (let scanRank = 0; scanRank < 8; scanRank++) {
				const piece = pos.board[scanRank * 8 + scanFile];
				if (piece && piece.toLowerCase() === 'p' && core.pieceColor(piece) === color) {
					friendlyPawn = true;
					break;
				}
			}
			if (!friendlyPawn) openFilePenalty += 8;
		}
		score -= openFilePenalty;

		if (bb) {
			const zone = bb.u64(bb.king[kingSquare] | bb.bit(kingSquare));
			const enemy = color ^ 1;
			const enemyOffset = enemy === core.COLOR_WHITE ? 0 : 6;
			const enemyKnights = pos.bb[enemyOffset + core.PIECE_KNIGHT - 1] || 0n;
			const enemyBishops = pos.bb[enemyOffset + core.PIECE_BISHOP - 1] || 0n;
			const enemyRooks = pos.bb[enemyOffset + core.PIECE_ROOK - 1] || 0n;
			const enemyQueens = pos.bb[enemyOffset + core.PIECE_QUEEN - 1] || 0n;
			const enemyKing = pos.bb[enemyOffset + core.PIECE_KING - 1] || 0n;

			let attacks = 0n;
			for (let square = 0; square < 64; square++) {
				const piece = pos.board[square];
				if (!piece || core.pieceColor(piece) !== enemy) continue;
				switch (piece.toLowerCase()) {
					case 'n': attacks |= bb.knight[square]; break;
					case 'b': attacks |= bb.bishopAttacks(square, pos.bbOccupied); break;
					case 'r': attacks |= bb.rookAttacks(square, pos.bbOccupied); break;
					case 'q': attacks |= bb.queenAttacks(square, pos.bbOccupied); break;
					case 'k': attacks |= bb.king[square]; break;
					default: break;
				}
			}
			let attackCount = bb.popcount(attacks & zone);
			score -= attackCount * 6;
			score -= bb.popcount(zone & (enemyKnights | enemyBishops | enemyRooks | enemyQueens | enemyKing));
		}

		return score;
	}

	function evaluate(pos) {
		return evaluateColor(pos, core.COLOR_WHITE) - evaluateColor(pos, core.COLOR_BLACK);
	}

	global.EVAL_KING_SAFETY = {
		evaluate,
		evaluateColor,
	};
})(typeof self !== 'undefined' ? self : window);
