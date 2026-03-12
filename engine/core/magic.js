(function (global) {
	const ZERO = 0n;
	const ONE = 1n;
	const BISHOP_DIRECTIONS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
	const ROOK_DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

	function bit(square) {
		return ONE << BigInt(square);
	}

	function u64(value) {
		return BigInt.asUintN(64, value);
	}

	function buildRelevantMask(square, directions) {
		const file = square % 8;
		const rank = Math.floor(square / 8);
		let mask = ZERO;
		for (const [df, dr] of directions) {
			let targetFile = file + df;
			let targetRank = rank + dr;
			while (targetFile > 0 && targetFile < 7 && targetRank > 0 && targetRank < 7) {
				mask |= bit(targetRank * 8 + targetFile);
				targetFile += df;
				targetRank += dr;
			}
		}
		return u64(mask);
	}

	function traceAttacks(square, occupancy, directions) {
		const file = square % 8;
		const rank = Math.floor(square / 8);
		let attacks = ZERO;
		for (const [df, dr] of directions) {
			let targetFile = file + df;
			let targetRank = rank + dr;
			while (targetFile >= 0 && targetFile < 8 && targetRank >= 0 && targetRank < 8) {
				const targetSquare = targetRank * 8 + targetFile;
				const targetBit = bit(targetSquare);
				attacks |= targetBit;
				if (occupancy & targetBit) break;
				targetFile += df;
				targetRank += dr;
			}
		}
		return u64(attacks);
	}

	function maskSquares(mask) {
		const squares = [];
		for (let square = 0; square < 64; square++) {
			if (mask & bit(square)) squares.push(square);
		}
		return squares;
	}

	function occupancyFromIndex(index, squares) {
		let occupancy = ZERO;
		for (let bitIndex = 0; bitIndex < squares.length; bitIndex++) {
			if ((index & (1 << bitIndex)) !== 0) {
				occupancy |= bit(squares[bitIndex]);
			}
		}
		return u64(occupancy);
	}

	function buildLookup(square, directions) {
		const mask = buildRelevantMask(square, directions);
		const squares = maskSquares(mask);
		const table = new Map();
		const subsetCount = 1 << squares.length;
		for (let index = 0; index < subsetCount; index++) {
			const occupancy = occupancyFromIndex(index, squares);
			table.set(occupancy, traceAttacks(square, occupancy, directions));
		}
		return { mask, table, bits: squares.length };
	}

	const bishop = new Array(64);
	const rook = new Array(64);
	for (let square = 0; square < 64; square++) {
		bishop[square] = buildLookup(square, BISHOP_DIRECTIONS);
		rook[square] = buildLookup(square, ROOK_DIRECTIONS);
	}

	function getAttacks(lookups, square, occupancy) {
		const entry = lookups[square];
		if (!entry) return ZERO;
		return entry.table.get(u64((occupancy || ZERO) & entry.mask)) || ZERO;
	}

	global.MAGIC_ATTACKS = {
		ready: true,
		version: 'lookup-tables',
		bishopMasks: bishop.map(entry => entry.mask),
		rookMasks: rook.map(entry => entry.mask),
		getBishopAttacks(square, occupancy) {
			return getAttacks(bishop, square, occupancy);
		},
		getRookAttacks(square, occupancy) {
			return getAttacks(rook, square, occupancy);
		},
		getQueenAttacks(square, occupancy) {
			return u64(getAttacks(bishop, square, occupancy) | getAttacks(rook, square, occupancy));
		},
	};
})(typeof self !== 'undefined' ? self : window);