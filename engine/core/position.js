// position.js
// First real implementation pass for board state, FEN, make/unmake, and attack checks.

(function (global) {
	const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

	const core = global.ChessCore || (global.ChessCore = (function () {
		const FILES = 'abcdefgh';
		const RANKS = '12345678';

		const api = {
			FILES,
			RANKS,
			COLOR_WHITE: 0,
			COLOR_BLACK: 1,
			PIECE_NONE: 0,
			PIECE_PAWN: 1,
			PIECE_KNIGHT: 2,
			PIECE_BISHOP: 3,
			PIECE_ROOK: 4,
			PIECE_QUEEN: 5,
			PIECE_KING: 6,
			FLAG_QUIET: 0,
			FLAG_DOUBLE_PAWN: 1,
			FLAG_KING_CASTLE: 2,
			FLAG_QUEEN_CASTLE: 3,
			FLAG_CAPTURE: 4,
			FLAG_EP_CAPTURE: 5,
			FLAG_PROMO_N: 8,
			FLAG_PROMO_B: 9,
			FLAG_PROMO_R: 10,
			FLAG_PROMO_Q: 11,
			FLAG_PROMO_CAPTURE_N: 12,
			FLAG_PROMO_CAPTURE_B: 13,
			FLAG_PROMO_CAPTURE_R: 14,
			FLAG_PROMO_CAPTURE_Q: 15,
			FROM_SHIFT: 0,
			TO_SHIFT: 6,
			PIECE_SHIFT: 12,
			CAPTURE_SHIFT: 16,
			PROMO_SHIFT: 20,
			FLAGS_SHIFT: 24,
		};

		api.square = function square(file, rank) {
			return rank * 8 + file;
		};

		api.squareToString = function squareToString(square) {
			return FILES[square % 8] + RANKS[Math.floor(square / 8)];
		};

		api.stringToSquare = function stringToSquare(square) {
			if (!square || square.length !== 2) return -1;
			const file = FILES.indexOf(square[0]);
			const rank = RANKS.indexOf(square[1]);
			return file >= 0 && rank >= 0 ? rank * 8 + file : -1;
		};

		api.makePackedMove = function makePackedMove(from, to, piece, captured, promo, flags) {
			return (from << api.FROM_SHIFT)
				| (to << api.TO_SHIFT)
				| (piece << api.PIECE_SHIFT)
				| (captured << api.CAPTURE_SHIFT)
				| (promo << api.PROMO_SHIFT)
				| (flags << api.FLAGS_SHIFT);
		};

		api.moveFrom = function moveFrom(move) { return (move >>> api.FROM_SHIFT) & 0x3F; };
		api.moveTo = function moveTo(move) { return (move >>> api.TO_SHIFT) & 0x3F; };
		api.movePiece = function movePiece(move) { return (move >>> api.PIECE_SHIFT) & 0x0F; };
		api.moveCapture = function moveCapture(move) { return (move >>> api.CAPTURE_SHIFT) & 0x0F; };
		api.movePromo = function movePromo(move) { return (move >>> api.PROMO_SHIFT) & 0x0F; };
		api.moveFlags = function moveFlags(move) { return (move >>> api.FLAGS_SHIFT) & 0x0F; };
		api.isCaptureFlag = function isCaptureFlag(flags) { return (flags & api.FLAG_CAPTURE) !== 0; };
		api.isPromotionFlag = function isPromotionFlag(flags) { return (flags & 8) !== 0; };

		api.pieceCodeFromChar = function pieceCodeFromChar(piece) {
			switch ((piece || '').toLowerCase()) {
				case 'p': return api.PIECE_PAWN;
				case 'n': return api.PIECE_KNIGHT;
				case 'b': return api.PIECE_BISHOP;
				case 'r': return api.PIECE_ROOK;
				case 'q': return api.PIECE_QUEEN;
				case 'k': return api.PIECE_KING;
				default: return api.PIECE_NONE;
			}
		};

		api.pieceColor = function pieceColor(piece) {
			if (!piece) return null;
			return piece === piece.toUpperCase() ? api.COLOR_WHITE : api.COLOR_BLACK;
		};

		api.charFromPieceCode = function charFromPieceCode(code, color) {
			const lower = ['', 'p', 'n', 'b', 'r', 'q', 'k'][code] || '';
			if (!lower) return null;
			return color === api.COLOR_WHITE ? lower.toUpperCase() : lower;
		};

		api.pieceIndexFromChar = function pieceIndexFromChar(piece) {
			const code = api.pieceCodeFromChar(piece);
			if (!code) return -1;
			return (api.pieceColor(piece) === api.COLOR_WHITE ? 0 : 6) + code - 1;
		};

		return api;
	})());

	function Position() {
		this.board = new Array(64).fill(null);
		this.bb = new BigUint64Array(12);
		this.bbWhite = 0n;
		this.bbBlack = 0n;
		this.bbOccupied = 0n;
		this.side = core.COLOR_WHITE;
		this.castling = 'KQkq';
		this.enPassant = -1;
		this.halfmove = 0;
		this.fullmove = 1;
		this.hash = 0n;
		this.history = [];
		this.loadFEN(START_FEN);
	}

	Position.prototype._clear = function _clear() {
		this.board.fill(null);
		this.bb.fill(0n);
		this.bbWhite = 0n;
		this.bbBlack = 0n;
		this.bbOccupied = 0n;
		this.side = core.COLOR_WHITE;
		this.castling = '';
		this.enPassant = -1;
		this.halfmove = 0;
		this.fullmove = 1;
		this.hash = 0n;
		this.history.length = 0;
	};

	Position.prototype._rebuildBitboards = function _rebuildBitboards() {
		this.bb.fill(0n);
		this.bbWhite = 0n;
		this.bbBlack = 0n;
		this.bbOccupied = 0n;

		for (let square = 0; square < 64; square++) {
			const piece = this.board[square];
			if (!piece) continue;

			const mask = 1n << BigInt(square);
			const pieceIndex = core.pieceIndexFromChar(piece);
			if (pieceIndex >= 0) {
				this.bb[pieceIndex] |= mask;
			}

			if (core.pieceColor(piece) === core.COLOR_WHITE) {
				this.bbWhite |= mask;
			} else {
				this.bbBlack |= mask;
			}
		}

		this.bbOccupied = this.bbWhite | this.bbBlack;
		if (global.ZOBRIST && typeof global.ZOBRIST.hashPosition === 'function') {
			this.hash = global.ZOBRIST.hashPosition(this);
		}
	};

	Position.prototype.loadFEN = function loadFEN(fen) {
		const source = fen === 'startpos' ? START_FEN : String(fen || START_FEN).trim();
		const parts = source.split(/\s+/);
		const rows = (parts[0] || START_FEN.split(' ')[0]).split('/');

		this._clear();

		for (let fenRank = 0; fenRank < 8; fenRank++) {
			const row = rows[fenRank] || '8';
			let file = 0;
			for (const ch of row) {
				if (/^[1-8]$/.test(ch)) {
					file += parseInt(ch, 10);
					continue;
				}
				const square = (7 - fenRank) * 8 + file;
				this.board[square] = ch;
				file++;
			}
		}

		this.side = parts[1] === 'b' ? core.COLOR_BLACK : core.COLOR_WHITE;
		this.castling = parts[2] && parts[2] !== '-' ? parts[2] : '';
		this.enPassant = parts[3] && parts[3] !== '-' ? core.stringToSquare(parts[3]) : -1;
		this.halfmove = Number.isFinite(Number(parts[4])) ? parseInt(parts[4], 10) : 0;
		this.fullmove = Number.isFinite(Number(parts[5])) ? parseInt(parts[5], 10) : 1;
		this._rebuildBitboards();
	};

	Position.prototype.toFEN = function toFEN() {
		const rows = [];
		for (let fenRank = 7; fenRank >= 0; fenRank--) {
			let row = '';
			let empty = 0;
			for (let file = 0; file < 8; file++) {
				const piece = this.board[fenRank * 8 + file];
				if (piece) {
					if (empty) {
						row += String(empty);
						empty = 0;
					}
					row += piece;
				} else {
					empty++;
				}
			}
			if (empty) row += String(empty);
			rows.push(row);
		}

		return rows.join('/')
			+ ' ' + (this.side === core.COLOR_BLACK ? 'b' : 'w')
			+ ' ' + (this.castling || '-')
			+ ' ' + (this.enPassant >= 0 ? core.squareToString(this.enPassant) : '-')
			+ ' ' + this.halfmove
			+ ' ' + this.fullmove;
	};

	Position.prototype._findKingSquare = function _findKingSquare(color) {
		const target = color === core.COLOR_WHITE ? 'K' : 'k';
		return this.board.indexOf(target);
	};

	Position.prototype.isSquareAttacked = function isSquareAttacked(square, byColor) {
		if (square < 0 || square > 63) return false;
		const bbAttacks = global.BB_ATTACKS;
		if (bbAttacks && this.bb && typeof this.bbOccupied === 'bigint') {
			const offset = byColor === core.COLOR_WHITE ? 0 : 6;
			const pawns = this.bb[offset + core.PIECE_PAWN - 1] || 0n;
			const knights = this.bb[offset + core.PIECE_KNIGHT - 1] || 0n;
			const bishops = this.bb[offset + core.PIECE_BISHOP - 1] || 0n;
			const rooks = this.bb[offset + core.PIECE_ROOK - 1] || 0n;
			const queens = this.bb[offset + core.PIECE_QUEEN - 1] || 0n;
			const king = this.bb[offset + core.PIECE_KING - 1] || 0n;

			if ((bbAttacks.pawnCapture[byColor ^ 1][square] & pawns) !== 0n) return true;
			if ((bbAttacks.knight[square] & knights) !== 0n) return true;
			if ((bbAttacks.bishopAttacks(square, this.bbOccupied) & (bishops | queens)) !== 0n) return true;
			if ((bbAttacks.rookAttacks(square, this.bbOccupied) & (rooks | queens)) !== 0n) return true;
			if ((bbAttacks.king[square] & king) !== 0n) return true;
			return false;
		}

		const file = square % 8;
		const rank = Math.floor(square / 8);

		const pawnRank = rank + (byColor === core.COLOR_WHITE ? -1 : 1);
		for (const fileOffset of [-1, 1]) {
			const fromFile = file + fileOffset;
			if (fromFile < 0 || fromFile > 7 || pawnRank < 0 || pawnRank > 7) continue;
			const pawnSquare = pawnRank * 8 + fromFile;
			const pawn = this.board[pawnSquare];
			if (pawn && core.pieceColor(pawn) === byColor && pawn.toLowerCase() === 'p') return true;
		}

		const knightOffsets = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
		for (const [df, dr] of knightOffsets) {
			const f = file + df;
			const r = rank + dr;
			if (f < 0 || f > 7 || r < 0 || r > 7) continue;
			const piece = this.board[r * 8 + f];
			if (piece && core.pieceColor(piece) === byColor && piece.toLowerCase() === 'n') return true;
		}

		const bishopDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
		for (const [df, dr] of bishopDirs) {
			let f = file + df;
			let r = rank + dr;
			while (f >= 0 && f < 8 && r >= 0 && r < 8) {
				const piece = this.board[r * 8 + f];
				if (piece) {
					if (core.pieceColor(piece) === byColor && (piece.toLowerCase() === 'b' || piece.toLowerCase() === 'q')) {
						return true;
					}
					break;
				}
				f += df;
				r += dr;
			}
		}

		const rookDirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
		for (const [df, dr] of rookDirs) {
			let f = file + df;
			let r = rank + dr;
			while (f >= 0 && f < 8 && r >= 0 && r < 8) {
				const piece = this.board[r * 8 + f];
				if (piece) {
					if (core.pieceColor(piece) === byColor && (piece.toLowerCase() === 'r' || piece.toLowerCase() === 'q')) {
						return true;
					}
					break;
				}
				f += df;
				r += dr;
			}
		}

		for (let df = -1; df <= 1; df++) {
			for (let dr = -1; dr <= 1; dr++) {
				if (df === 0 && dr === 0) continue;
				const f = file + df;
				const r = rank + dr;
				if (f < 0 || f > 7 || r < 0 || r > 7) continue;
				const piece = this.board[r * 8 + f];
				if (piece && core.pieceColor(piece) === byColor && piece.toLowerCase() === 'k') return true;
			}
		}

		return false;
	};

	Position.prototype.isInCheck = function isInCheck(color) {
		const kingSquare = this._findKingSquare(color);
		if (kingSquare < 0) return false;
		return this.isSquareAttacked(kingSquare, color ^ 1);
	};

	Position.prototype.makeMove = function makeMove(move) {
		const from = core.moveFrom(move);
		const to = core.moveTo(move);
		const flags = core.moveFlags(move);
		const movingPiece = this.board[from];
		const movingColor = this.side;
		const historyEntry = {
			move,
			fromPiece: movingPiece,
			toPiece: this.board[to],
			castling: this.castling,
			enPassant: this.enPassant,
			halfmove: this.halfmove,
			fullmove: this.fullmove,
			side: this.side,
			hash: this.hash,
			rookFrom: -1,
			rookTo: -1,
			rookPiece: null,
			epCapturedSquare: -1,
			epCapturedPiece: null,
		};

		this.history.push(historyEntry);
		this.board[from] = null;

		if (flags === core.FLAG_EP_CAPTURE) {
			const epSquare = movingColor === core.COLOR_WHITE ? to - 8 : to + 8;
			historyEntry.epCapturedSquare = epSquare;
			historyEntry.epCapturedPiece = this.board[epSquare];
			this.board[epSquare] = null;
		}

		if (flags === core.FLAG_KING_CASTLE) {
			historyEntry.rookFrom = movingColor === core.COLOR_WHITE ? 7 : 63;
			historyEntry.rookTo = movingColor === core.COLOR_WHITE ? 5 : 61;
			historyEntry.rookPiece = this.board[historyEntry.rookFrom];
			this.board[historyEntry.rookFrom] = null;
			this.board[historyEntry.rookTo] = historyEntry.rookPiece;
		} else if (flags === core.FLAG_QUEEN_CASTLE) {
			historyEntry.rookFrom = movingColor === core.COLOR_WHITE ? 0 : 56;
			historyEntry.rookTo = movingColor === core.COLOR_WHITE ? 3 : 59;
			historyEntry.rookPiece = this.board[historyEntry.rookFrom];
			this.board[historyEntry.rookFrom] = null;
			this.board[historyEntry.rookTo] = historyEntry.rookPiece;
		}

		const promotedPiece = core.isPromotionFlag(flags)
			? core.charFromPieceCode(core.movePromo(move), movingColor)
			: movingPiece;

		this.board[to] = promotedPiece;

		if (movingPiece === 'K') this.castling = this.castling.replace(/[KQ]/g, '');
		if (movingPiece === 'k') this.castling = this.castling.replace(/[kq]/g, '');
		if (from === 0 || to === 0) this.castling = this.castling.replace('Q', '');
		if (from === 7 || to === 7) this.castling = this.castling.replace('K', '');
		if (from === 56 || to === 56) this.castling = this.castling.replace('q', '');
		if (from === 63 || to === 63) this.castling = this.castling.replace('k', '');

		if (flags === core.FLAG_DOUBLE_PAWN) {
			this.enPassant = movingColor === core.COLOR_WHITE ? to - 8 : to + 8;
		} else {
			this.enPassant = -1;
		}

		this.halfmove = core.movePiece(move) === core.PIECE_PAWN || core.moveCapture(move) !== core.PIECE_NONE || flags === core.FLAG_EP_CAPTURE
			? 0
			: this.halfmove + 1;

		if (movingColor === core.COLOR_BLACK) this.fullmove += 1;
		this.side ^= 1;
		this._rebuildBitboards();
	};

	Position.prototype.unmakeMove = function unmakeMove() {
		const historyEntry = this.history.pop();
		if (!historyEntry) return;

		const move = historyEntry.move;
		const from = core.moveFrom(move);
		const to = core.moveTo(move);

		this.side = historyEntry.side;
		this.castling = historyEntry.castling;
		this.enPassant = historyEntry.enPassant;
		this.halfmove = historyEntry.halfmove;
		this.fullmove = historyEntry.fullmove;
		this.hash = historyEntry.hash;

		this.board[from] = historyEntry.fromPiece;

		if (historyEntry.rookFrom >= 0) {
			this.board[historyEntry.rookFrom] = historyEntry.rookPiece;
			this.board[historyEntry.rookTo] = null;
		}

		if (historyEntry.epCapturedSquare >= 0) {
			this.board[to] = null;
			this.board[historyEntry.epCapturedSquare] = historyEntry.epCapturedPiece;
		} else {
			this.board[to] = historyEntry.toPiece;
		}

		this._rebuildBitboards();
	};

	global.Position = Position;
})(typeof self !== 'undefined' ? self : window);
