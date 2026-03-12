// movegen.js
// First real implementation pass for packed move generation and UCI conversion.

(function (global) {
	const core = global.ChessCore;
	const bbAttacks = global.BB_ATTACKS || null;

	if (!core) {
		throw new Error('movegen.js requires ChessCore from position.js to be loaded first.');
	}

	function MoveList(size) {
		this.moves = new Int32Array(size || 256);
		this.count = 0;
	}

	MoveList.prototype.clear = function clear() {
		this.count = 0;
	};

	MoveList.prototype.push = function push(move) {
		this.moves[this.count++] = move;
	};

	function resetList(list) {
		if (list && typeof list.clear === 'function') {
			list.clear();
			return;
		}
		if (list) list.count = 0;
	}

	function pushMove(list, move) {
		if (list && typeof list.push === 'function') {
			list.push(move);
			return;
		}
		list.moves[list.count++] = move;
	}

	function addMove(list, from, to, piece, captured, promo, flags) {
		pushMove(list, core.makePackedMove(from, to, piece, captured, promo, flags));
	}

	function addPromotionMoves(list, from, to, captured, isCapture) {
		const variants = [
			{ promo: core.PIECE_QUEEN, flags: isCapture ? core.FLAG_PROMO_CAPTURE_Q : core.FLAG_PROMO_Q },
			{ promo: core.PIECE_ROOK, flags: isCapture ? core.FLAG_PROMO_CAPTURE_R : core.FLAG_PROMO_R },
			{ promo: core.PIECE_BISHOP, flags: isCapture ? core.FLAG_PROMO_CAPTURE_B : core.FLAG_PROMO_B },
			{ promo: core.PIECE_KNIGHT, flags: isCapture ? core.FLAG_PROMO_CAPTURE_N : core.FLAG_PROMO_N },
		];

		for (const variant of variants) {
			addMove(list, from, to, core.PIECE_PAWN, captured, variant.promo, variant.flags);
		}
	}

	function generatePawnMoves(pos, square, piece, list) {
		const file = square % 8;
		const rank = Math.floor(square / 8);
		const color = core.pieceColor(piece);
		const direction = color === core.COLOR_WHITE ? 1 : -1;
		const startRank = color === core.COLOR_WHITE ? 1 : 6;
		const promotionRank = color === core.COLOR_WHITE ? 7 : 0;
		const pieceCode = core.PIECE_PAWN;
		const oneForward = square + direction * 8;

		if (oneForward >= 0 && oneForward < 64 && !pos.board[oneForward]) {
			if (Math.floor(oneForward / 8) === promotionRank) {
				addPromotionMoves(list, square, oneForward, core.PIECE_NONE, false);
			} else {
				addMove(list, square, oneForward, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_QUIET);
				const twoForward = square + direction * 16;
				if (rank === startRank && !pos.board[twoForward]) {
					addMove(list, square, twoForward, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_DOUBLE_PAWN);
				}
			}
		}

		for (const fileOffset of [-1, 1]) {
			const targetFile = file + fileOffset;
			const targetRank = rank + direction;
			if (targetFile < 0 || targetFile > 7 || targetRank < 0 || targetRank > 7) continue;

			const target = targetRank * 8 + targetFile;
			const targetPiece = pos.board[target];
			if (targetPiece && core.pieceColor(targetPiece) !== color) {
				const capturedCode = core.pieceCodeFromChar(targetPiece);
				if (targetRank === promotionRank) {
					addPromotionMoves(list, square, target, capturedCode, true);
				} else {
					addMove(list, square, target, pieceCode, capturedCode, core.PIECE_NONE, core.FLAG_CAPTURE);
				}
			} else if (pos.enPassant === target) {
				addMove(list, square, target, pieceCode, core.PIECE_PAWN, core.PIECE_NONE, core.FLAG_EP_CAPTURE);
			}
		}
	}

	function generateKnightMoves(pos, square, piece, list) {
		const file = square % 8;
		const rank = Math.floor(square / 8);
		const color = core.pieceColor(piece);
		const pieceCode = core.PIECE_KNIGHT;
		const offsets = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

		for (const [df, dr] of offsets) {
			const targetFile = file + df;
			const targetRank = rank + dr;
			if (targetFile < 0 || targetFile > 7 || targetRank < 0 || targetRank > 7) continue;
			const target = targetRank * 8 + targetFile;
			const targetPiece = pos.board[target];
			if (!targetPiece) {
				addMove(list, square, target, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_QUIET);
			} else if (core.pieceColor(targetPiece) !== color) {
				addMove(list, square, target, pieceCode, core.pieceCodeFromChar(targetPiece), core.PIECE_NONE, core.FLAG_CAPTURE);
			}
		}
	}

	function generateSliderMoves(pos, square, piece, list, directions, pieceCode) {
		const file = square % 8;
		const rank = Math.floor(square / 8);
		const color = core.pieceColor(piece);
		let attackMask = null;

		if (bbAttacks && typeof pos.bbOccupied === 'bigint') {
			if (pieceCode === core.PIECE_BISHOP && typeof bbAttacks.bishopAttacks === 'function') {
				attackMask = bbAttacks.bishopAttacks(square, pos.bbOccupied);
			} else if (pieceCode === core.PIECE_ROOK && typeof bbAttacks.rookAttacks === 'function') {
				attackMask = bbAttacks.rookAttacks(square, pos.bbOccupied);
			} else if (pieceCode === core.PIECE_QUEEN && typeof bbAttacks.queenAttacks === 'function') {
				attackMask = bbAttacks.queenAttacks(square, pos.bbOccupied);
			}

			if (typeof attackMask === 'bigint') {
				const ownOccupancy = color === core.COLOR_WHITE ? pos.bbWhite : pos.bbBlack;
				let targets = bbAttacks.u64(attackMask & ~ownOccupancy);
				while (targets) {
					const popped = bbAttacks.poplsb(targets);
					targets = popped.rest;
					const target = popped.sq;
					const targetPiece = pos.board[target];
					if (!targetPiece) {
						addMove(list, square, target, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_QUIET);
					} else if (core.pieceColor(targetPiece) !== color) {
						addMove(list, square, target, pieceCode, core.pieceCodeFromChar(targetPiece), core.PIECE_NONE, core.FLAG_CAPTURE);
					}
				}
				return;
			}
		}

		for (const [df, dr] of directions) {
			let targetFile = file + df;
			let targetRank = rank + dr;
			while (targetFile >= 0 && targetFile < 8 && targetRank >= 0 && targetRank < 8) {
				const target = targetRank * 8 + targetFile;
				const targetPiece = pos.board[target];
				if (!targetPiece) {
					addMove(list, square, target, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_QUIET);
				} else {
					if (core.pieceColor(targetPiece) !== color) {
						addMove(list, square, target, pieceCode, core.pieceCodeFromChar(targetPiece), core.PIECE_NONE, core.FLAG_CAPTURE);
					}
					break;
				}
				targetFile += df;
				targetRank += dr;
			}
		}
	}

	function generateKingMoves(pos, square, piece, list) {
		const file = square % 8;
		const rank = Math.floor(square / 8);
		const color = core.pieceColor(piece);
		const pieceCode = core.PIECE_KING;

		for (let df = -1; df <= 1; df++) {
			for (let dr = -1; dr <= 1; dr++) {
				if (df === 0 && dr === 0) continue;
				const targetFile = file + df;
				const targetRank = rank + dr;
				if (targetFile < 0 || targetFile > 7 || targetRank < 0 || targetRank > 7) continue;
				const target = targetRank * 8 + targetFile;
				const targetPiece = pos.board[target];
				if (!targetPiece) {
					addMove(list, square, target, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_QUIET);
				} else if (core.pieceColor(targetPiece) !== color) {
					addMove(list, square, target, pieceCode, core.pieceCodeFromChar(targetPiece), core.PIECE_NONE, core.FLAG_CAPTURE);
				}
			}
		}

		if (color === core.COLOR_WHITE && square === 4) {
			if (pos.castling.includes('K') && !pos.board[5] && !pos.board[6] && !pos.isSquareAttacked(4, core.COLOR_BLACK) && !pos.isSquareAttacked(5, core.COLOR_BLACK) && !pos.isSquareAttacked(6, core.COLOR_BLACK)) {
				addMove(list, 4, 6, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_KING_CASTLE);
			}
			if (pos.castling.includes('Q') && !pos.board[1] && !pos.board[2] && !pos.board[3] && !pos.isSquareAttacked(4, core.COLOR_BLACK) && !pos.isSquareAttacked(3, core.COLOR_BLACK) && !pos.isSquareAttacked(2, core.COLOR_BLACK)) {
				addMove(list, 4, 2, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_QUEEN_CASTLE);
			}
		}

		if (color === core.COLOR_BLACK && square === 60) {
			if (pos.castling.includes('k') && !pos.board[61] && !pos.board[62] && !pos.isSquareAttacked(60, core.COLOR_WHITE) && !pos.isSquareAttacked(61, core.COLOR_WHITE) && !pos.isSquareAttacked(62, core.COLOR_WHITE)) {
				addMove(list, 60, 62, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_KING_CASTLE);
			}
			if (pos.castling.includes('q') && !pos.board[57] && !pos.board[58] && !pos.board[59] && !pos.isSquareAttacked(60, core.COLOR_WHITE) && !pos.isSquareAttacked(59, core.COLOR_WHITE) && !pos.isSquareAttacked(58, core.COLOR_WHITE)) {
				addMove(list, 60, 58, pieceCode, core.PIECE_NONE, core.PIECE_NONE, core.FLAG_QUEEN_CASTLE);
			}
		}
	}

	const MoveGen = {
		generateMoves(pos, list) {
			resetList(list);
			for (let square = 0; square < 64; square++) {
				const piece = pos.board[square];
				if (!piece || core.pieceColor(piece) !== pos.side) continue;

				switch (piece.toLowerCase()) {
					case 'p':
						generatePawnMoves(pos, square, piece, list);
						break;
					case 'n':
						generateKnightMoves(pos, square, piece, list);
						break;
					case 'b':
						generateSliderMoves(pos, square, piece, list, [[1, 1], [1, -1], [-1, 1], [-1, -1]], core.PIECE_BISHOP);
						break;
					case 'r':
						generateSliderMoves(pos, square, piece, list, [[1, 0], [-1, 0], [0, 1], [0, -1]], core.PIECE_ROOK);
						break;
					case 'q':
						generateSliderMoves(pos, square, piece, list, [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]], core.PIECE_QUEEN);
						break;
					case 'k':
						generateKingMoves(pos, square, piece, list);
						break;
					default:
						break;
				}
			}
		},

		generateLegalMoves(pos, list) {
			this.generateMoves(pos, list);
			let writeIndex = 0;
			for (let i = 0; i < list.count; i++) {
				const move = list.moves[i];
				pos.makeMove(move);
				if (!pos.isInCheck(pos.side ^ 1)) {
					list.moves[writeIndex++] = move;
				}
				pos.unmakeMove();
			}
			list.count = writeIndex;
		},

		moveToUCI(move) {
			const from = core.squareToString(core.moveFrom(move));
			const to = core.squareToString(core.moveTo(move));
			const promo = core.movePromo(move);
			const suffix = promo ? core.charFromPieceCode(promo, core.COLOR_BLACK) : '';
			return from + to + suffix;
		},

		uciToMove(pos, uciMove) {
			const needle = String(uciMove || '').trim().toLowerCase();
			const list = new MoveList();
			this.generateLegalMoves(pos, list);
			for (let i = 0; i < list.count; i++) {
				if (this.moveToUCI(list.moves[i]) === needle) {
					return list.moves[i];
				}
			}
			return 0;
		},
	};

	global.MoveList = MoveList;
	global.MoveGen = MoveGen;
})(typeof self !== 'undefined' ? self : window);
