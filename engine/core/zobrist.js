// zobrist.js
// Deterministic Zobrist hashing and repetition history.

(function (global) {
	const core = global.ChessCore;
	if (!core) {
		throw new Error('zobrist.js requires ChessCore from position.js to be loaded first.');
	}

	function mix64(seed) {
		let x = BigInt.asUintN(64, BigInt(seed));
		x ^= x >> 30n;
		x = BigInt.asUintN(64, x * 0xbf58476d1ce4e5b9n);
		x ^= x >> 27n;
		x = BigInt.asUintN(64, x * 0x94d049bb133111ebn);
		x ^= x >> 31n;
		return BigInt.asUintN(64, x);
	}

	const pieceKeys = Array.from({ length: 12 }, () => new Array(64).fill(0n));
	const castlingKeys = new Array(16).fill(0n);
	const enPassantKeys = new Array(8).fill(0n);
	const sideKey = mix64(9001);
	const history = [];

	let seed = 1;
	for (let piece = 0; piece < 12; piece++) {
		for (let sq = 0; sq < 64; sq++) {
			pieceKeys[piece][sq] = mix64(seed++);
		}
	}
	for (let i = 0; i < 16; i++) castlingKeys[i] = mix64(seed++);
	for (let i = 0; i < 8; i++) enPassantKeys[i] = mix64(seed++);

	function castlingMask(castling) {
		let mask = 0;
		if (castling.includes('K')) mask |= 1;
		if (castling.includes('Q')) mask |= 2;
		if (castling.includes('k')) mask |= 4;
		if (castling.includes('q')) mask |= 8;
		return mask;
	}

	function hashPosition(pos) {
		let hash = 0n;
		for (let square = 0; square < 64; square++) {
			const piece = pos.board[square];
			if (!piece) continue;
			const pieceIndex = core.pieceIndexFromChar(piece);
			if (pieceIndex >= 0) {
				hash ^= pieceKeys[pieceIndex][square];
			}
		}

		hash ^= castlingKeys[castlingMask(pos.castling || '')];
		if (pos.enPassant >= 0) hash ^= enPassantKeys[pos.enPassant % 8];
		if (pos.side === core.COLOR_BLACK) hash ^= sideKey;
		return BigInt.asUintN(64, hash);
	}

	const ZOBRIST = {
		pieceKeys,
		castlingKeys,
		enPassantKeys,
		hashPosition,
		side() {
			return sideKey;
		},
		clearHistory() {
			history.length = 0;
		},
		pushHash(hash) {
			history.push(BigInt.asUintN(64, hash));
		},
		popHash() {
			return history.pop() || 0n;
		},
		isRepetition(hash, halfmove) {
			const target = BigInt.asUintN(64, hash);
			let count = 0;
			const limit = Math.min(history.length, halfmove);
			for (let i = history.length - 1; i >= 0 && (history.length - 1 - i) < limit; i -= 2) {
				if (history[i] === target) {
					count++;
					if (count >= 2) return true;
				}
			}
			return false;
		},
	};

	global.ZOBRIST = ZOBRIST;
})(typeof self !== 'undefined' ? self : window);
