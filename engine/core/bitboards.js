// bitboards.js
// Bitboard utilities for chess engine

// ...existing code...
// ============================================================
//   bitboards.js  —  engine/core/bitboards.js
//   Precomputed attack tables, ray masks, and bitboard utilities.
//
//   All bitboards are JavaScript BigInt (64-bit, unsigned semantics via BigInt.asUintN).
//   Square indexing: LERF — a1=0, b1=1 … h8=63.
//
//   Exposes global: BB_ATTACKS  (object with all tables + utility functions)
//   Depends on:    nothing (standalone — no imports)
// ============================================================

const BB_ATTACKS = (function () {

    function getMagicAttacks() {
        if (typeof globalThis !== 'undefined' && globalThis.MAGIC_ATTACKS) return globalThis.MAGIC_ATTACKS;
        if (typeof self !== 'undefined' && self.MAGIC_ATTACKS) return self.MAGIC_ATTACKS;
        return null;
    }

    // ──────────────────────────────────────────────────────────
    //   CONSTANTS
    // ──────────────────────────────────────────────────────────

    const ZERO  = 0n;
    const ONE   = 1n;
    const FULL  = 0xFFFFFFFFFFFFFFFFn;  // all 64 bits

    // File masks  (A=0 … H=7)
    const FILE_A = 0x0101010101010101n;
    const FILE_B = FILE_A << 1n;
    const FILE_G = FILE_A << 6n;
    const FILE_H = FILE_A << 7n;
    const NOT_FILE_A = FULL ^ FILE_A;
    const NOT_FILE_H = FULL ^ FILE_H;
    const NOT_FILE_AB = FULL ^ FILE_A ^ FILE_B;
    const NOT_FILE_GH = FULL ^ FILE_G ^ FILE_H;

    // Rank masks  (RANK1=0 … RANK8=7)
    const RANK_1 = 0xFFn;
    const RANK_2 = RANK_1 << 8n;
    const RANK_7 = RANK_1 << 48n;
    const RANK_8 = RANK_1 << 56n;

    // ──────────────────────────────────────────────────────────
    //   CORE UTILITIES
    // ──────────────────────────────────────────────────────────

    /** Single-bit mask for square index 0..63 */
    function bit(sq) { return ONE << BigInt(sq); }

    /** Mask to keep only the low 64 bits (simulate unsigned 64-bit) */
    function u64(x) { return BigInt.asUintN(64, x); }

    // ── popcount ─────────────────────────────────────────────
    /** Count set bits (population count / Hamming weight) */
    function popcount(bb) {
        let n = 0;
        let x = bb;
        while (x) {
            x &= x - ONE;  // clear lowest set bit
            n++;
        }
        return n;
    }

    // ── LSB / MSB ─────────────────────────────────────────────
    /**
     * Index of least-significant set bit.
     * @param {BigInt} bb  Must be non-zero.
     * @returns {number} Square index 0..63
     */
    function lsb(bb) {
        // Isolate lowest bit then compute its log2 via lookup
        const isolated = bb & (-bb);
        return _debruijn64(isolated);
    }

    /**
     * Index of most-significant set bit.
     * @param {BigInt} bb  Must be non-zero.
     * @returns {number}
     */
    function msb(bb) {
        let x = bb;
        // Smear bits downward
        x |= (x >> 1n);
        x |= (x >> 2n);
        x |= (x >> 4n);
        x |= (x >> 8n);
        x |= (x >> 16n);
        x |= (x >> 32n);
        // Now lowest bit of complement is one past MSB
        x = u64(x) ^ (u64(x) >> 1n);
        return _debruijn64(x);
    }

    /**
     * Remove and return the index of the least-significant bit.
     * Mutates `bbRef` in place (use as: let sq = poplsb(ref); ref = ref.rest)
     * Since JS BigInt is immutable we return both.
     * @param {BigInt} bb
     * @returns {{ sq: number, rest: BigInt }}
     */
    function poplsb(bb) {
        const sq = lsb(bb);
        return { sq, rest: bb & (bb - ONE) };
    }

    // De Bruijn sequence multiplication trick (64-bit BigInt version)
    const _DEBRUIJN = 0x03F79D71B4CA8B09n;
    const _DEBRUIJN_TABLE = new Uint8Array(64);
    (function _buildDebruijn() {
        for (let i = 0; i < 64; i++) {
            const idx = Number(u64(_DEBRUIJN << BigInt(i)) >> 58n);
            _DEBRUIJN_TABLE[idx] = i;
        }
    })();

    function _debruijn64(isolatedBit) {
        const idx = Number(u64(isolatedBit * _DEBRUIJN) >> 58n);
        return _DEBRUIJN_TABLE[idx];
    }

    // ──────────────────────────────────────────────────────────
    //   DIRECTION SHIFTS  (classical board compass)
    //
    //   N  = +8   NE = +9   E  = +1   SE = -7
    //   S  = -8   SW = -9   W  = -1   NW = +7
    // ──────────────────────────────────────────────────────────

    function shiftN (bb) { return u64(bb <<  8n); }
    function shiftS (bb) { return u64(bb >>  8n); }
    function shiftE (bb) { return u64(bb <<  1n) & NOT_FILE_A; }
    function shiftW (bb) { return u64(bb >>  1n) & NOT_FILE_H; }
    function shiftNE(bb) { return u64(bb <<  9n) & NOT_FILE_A; }
    function shiftNW(bb) { return u64(bb <<  7n) & NOT_FILE_H; }
    function shiftSE(bb) { return u64(bb >>  7n) & NOT_FILE_A; }
    function shiftSW(bb) { return u64(bb >>  9n) & NOT_FILE_H; }

    // ──────────────────────────────────────────────────────────
    //   PRECOMPUTED KNIGHT ATTACKS  [64]
    // ──────────────────────────────────────────────────────────

    const knightAttacks = new Array(64);
    (function _buildKnightAttacks() {
        for (let sq = 0; sq < 64; sq++) {
            const b = bit(sq);
            let atk = ZERO;
            atk |= u64(b << 17n) & NOT_FILE_A;   // NNE
            atk |= u64(b << 15n) & NOT_FILE_H;   // NNW
            atk |= u64(b << 10n) & NOT_FILE_AB;  // ENE
            atk |= u64(b <<  6n) & NOT_FILE_GH;  // WNW
            atk |= u64(b >> 17n) & NOT_FILE_H;   // SSW
            atk |= u64(b >> 15n) & NOT_FILE_A;   // SSE
            atk |= u64(b >> 10n) & NOT_FILE_GH;  // WSW
            atk |= u64(b >>  6n) & NOT_FILE_AB;  // ESE
            knightAttacks[sq] = u64(atk);
        }
    })();

    // ──────────────────────────────────────────────────────────
    //   PRECOMPUTED KING ATTACKS  [64]
    // ──────────────────────────────────────────────────────────

    const kingAttacks = new Array(64);
    (function _buildKingAttacks() {
        for (let sq = 0; sq < 64; sq++) {
            const b = bit(sq);
            let atk = ZERO;
            atk |= shiftN(b) | shiftS(b) | shiftE(b) | shiftW(b);
            atk |= shiftNE(b) | shiftNW(b) | shiftSE(b) | shiftSW(b);
            kingAttacks[sq] = u64(atk);
        }
    })();

    // ──────────────────────────────────────────────────────────
    //   PRECOMPUTED PAWN ATTACKS  [color][64]
    //   pawnAttacks[0][sq] = white pawn captures from sq
    //   pawnAttacks[1][sq] = black pawn captures from sq
    // ──────────────────────────────────────────────────────────

    const pawnCaptureAttacks = [ new Array(64), new Array(64) ];
    (function _buildPawnAttacks() {
        for (let sq = 0; sq < 64; sq++) {
            const b = bit(sq);
            // White captures NE and NW
            pawnCaptureAttacks[0][sq] = u64(shiftNE(b) | shiftNW(b));
            // Black captures SE and SW
            pawnCaptureAttacks[1][sq] = u64(shiftSE(b) | shiftSW(b));
        }
    })();

    // ──────────────────────────────────────────────────────────
    //   RAY ATTACK TABLES  [8 directions][64]
    //
    //  Direction indices (same as classical compass):
    //    0=N  1=NE  2=E  3=SE  4=S  5=SW  6=W  7=NW
    //
    //  RAY[dir][sq] = all squares in that direction from sq,
    //                 NOT including sq itself.
    //  Used for "classical" (Occluded Fill / Kōketsu) slider attacks.
    // ──────────────────────────────────────────────────────────

    const RAY = [];
    for (let d = 0; d < 8; d++) RAY.push(new Array(64).fill(ZERO));

    (function _buildRays() {
        const DIR_FN = [shiftN, shiftNE, shiftE, shiftSE, shiftS, shiftSW, shiftW, shiftNW];

        for (let dir = 0; dir < 8; dir++) {
            const shift = DIR_FN[dir];
            for (let sq = 0; sq < 64; sq++) {
                let ray  = ZERO;
                let mask = shift(bit(sq));
                while (mask) {
                    ray  |= mask;
                    mask = u64(shift(mask));
                }
                RAY[dir][sq] = u64(ray);
            }
        }
    })();

    // ──────────────────────────────────────────────────────────
    //   BETWEEN MASK  [64][64]
    //   Squares strictly between two squares on the same rank/file/diagonal.
    //   Returns 0n if not on same line.
    //   Used for legality checks (pinned pieces, check interposition).
    // ──────────────────────────────────────────────────────────

    const BETWEEN = [];
    for (let i = 0; i < 64; i++) BETWEEN.push(new Array(64).fill(ZERO));

    (function _buildBetween() {
        for (let sq1 = 0; sq1 < 64; sq1++) {
            for (let dir = 0; dir < 8; dir++) {
                let ray = RAY[dir][sq1];
                let cursor = ray;
                // Walk the ray; for each sq2 on the ray, BETWEEN[sq1][sq2] = all squares before sq2
                let accumulated = ZERO;
                while (cursor) {
                    const sq2 = lsb(cursor);
                    BETWEEN[sq1][sq2] = accumulated;
                    accumulated |= bit(sq2);
                    cursor &= cursor - ONE; // clear lsb
                }
            }
        }
    })();

    // ──────────────────────────────────────────────────────────
    //   LINE MASK  [64][64]
    //   All squares on the same rank/file/diagonal through both squares,
    //   including the squares themselves.
    //   Returns 0n if not aligned.
    //   Used for pin/absolute-pin legality checking.
    // ──────────────────────────────────────────────────────────

    const LINE = [];
    for (let i = 0; i < 64; i++) LINE.push(new Array(64).fill(ZERO));

    (function _buildLine() {
        for (let sq1 = 0; sq1 < 64; sq1++) {
            for (let dir = 0; dir < 8; dir++) {
                const opposite = (dir + 4) % 8;
                const fullLine = u64(RAY[dir][sq1] | RAY[opposite][sq1] | bit(sq1));
                let cursor = RAY[dir][sq1];
                while (cursor) {
                    const sq2 = lsb(cursor);
                    LINE[sq1][sq2] = fullLine;
                    cursor &= cursor - ONE;
                }
            }
        }
    })();

    // ──────────────────────────────────────────────────────────
    //   SLIDER ATTACKS  (classical Kōketsu fill — no magic needed)
    //
    //   These compute exact attacks given an occupancy bitboard.
    //   They use the precomputed rays and are called at runtime
    //   during move generation.  Fast enough for non-NNUE engines.
    // ──────────────────────────────────────────────────────────

    /**
     * Positive ray (N, NE, E, NW): fill from sq toward high squares.
     * Stops at (and includes) first blocker.
     */
    function _positiveRay(dir, sq, occ) {
        let ray = RAY[dir][sq];
        // Find first blocker on the ray
        const blockers = ray & occ;
        if (blockers) {
            const block = lsb(blockers);
            ray ^= RAY[dir][block]; // remove everything beyond blocker
        }
        return ray;
    }

    /**
     * Negative ray (S, SE, SW, W): fill from sq toward low squares.
     */
    function _negativeRay(dir, sq, occ) {
        let ray = RAY[dir][sq];
        const blockers = ray & occ;
        if (blockers) {
            const block = msb(blockers);
            ray ^= RAY[dir][block];
        }
        return ray;
    }

    function _classicalBishopAttacks(sq, occ) {
        return u64(
            _positiveRay(1, sq, occ) |
            _positiveRay(7, sq, occ) |
            _negativeRay(3, sq, occ) |
            _negativeRay(5, sq, occ)
        );
    }

    function _classicalRookAttacks(sq, occ) {
        return u64(
            _positiveRay(0, sq, occ) |
            _positiveRay(2, sq, occ) |
            _negativeRay(4, sq, occ) |
            _negativeRay(6, sq, occ)
        );
    }

    /**
     * Bishop (diagonal) attacks for a single bishop on `sq`.
     * @param {number} sq    0..63
     * @param {BigInt} occ  Occupancy bitboard
     * @returns {BigInt}
     */
    function bishopAttacks(sq, occ) {
        const classical = _classicalBishopAttacks(sq, occ);
        const magic = getMagicAttacks();
        if (magic && magic.ready && typeof magic.getBishopAttacks === 'function') {
            const fromMagic = u64(magic.getBishopAttacks(sq, occ));
            if (fromMagic === classical) return fromMagic;
        }
        return classical;
    }

    /**
     * Rook (orthogonal) attacks for a single rook on `sq`.
     * @param {number} sq
     * @param {BigInt} occ
     * @returns {BigInt}
     */
    function rookAttacks(sq, occ) {
        const classical = _classicalRookAttacks(sq, occ);
        const magic = getMagicAttacks();
        if (magic && magic.ready && typeof magic.getRookAttacks === 'function') {
            const fromMagic = u64(magic.getRookAttacks(sq, occ));
            if (fromMagic === classical) return fromMagic;
        }
        return classical;
    }

    /**
     * Queen attacks — union of bishop + rook.
     * @param {number} sq
     * @param {BigInt} occ
     * @returns {BigInt}
     */
    function queenAttacks(sq, occ) {
        return u64(bishopAttacks(sq, occ) | rookAttacks(sq, occ));
    }

    // ──────────────────────────────────────────────────────────
    //   ATTACKS FROM ENTIRE PIECE SET  (multi-piece fill)
    // ──────────────────────────────────────────────────────────

    /**
     * All squares attacked by ALL pieces of a given type on `pieceBB`.
     * Useful for calculating side-wide attack maps.
     */
    function allKnightAttacks(pieceBB) {
        let atk = ZERO;
        let bb = pieceBB;
        while (bb) { const { sq, rest } = poplsb(bb); atk |= knightAttacks[sq]; bb = rest; }
        return u64(atk);
    }

    function allBishopAttacks(pieceBB, occ) {
        let atk = ZERO;
        let bb = pieceBB;
        while (bb) { const { sq, rest } = poplsb(bb); atk |= bishopAttacks(sq, occ); bb = rest; }
        return u64(atk);
    }

    function allRookAttacks(pieceBB, occ) {
        let atk = ZERO;
        let bb = pieceBB;
        while (bb) { const { sq, rest } = poplsb(bb); atk |= rookAttacks(sq, occ); bb = rest; }
        return u64(atk);
    }

    function allQueenAttacks(pieceBB, occ) {
        return u64(allBishopAttacks(pieceBB, occ) | allRookAttacks(pieceBB, occ));
    }

    // ──────────────────────────────────────────────────────────
    //   PAWN PUSH MASKS  (quiet pawn advance helpers)
    // ──────────────────────────────────────────────────────────

    /**
     * Single-push targets for white/black pawns.
     * @param {BigInt} pawns  Pawn bitboard
     * @param {BigInt} empty  Empty-square bitboard
     * @param {number} color  0=white, 1=black
     */
    function pawnSinglePush(pawns, empty, color) {
        return color === 0
            ? u64(shiftN(pawns) & empty)
            : u64(shiftS(pawns) & empty);
    }

    /**
     * Double-push targets (pawns on starting rank only).
     */
    function pawnDoublePush(pawns, empty, color) {
        if (color === 0) {
            const single = u64(shiftN(pawns) & empty & RANK_2 << 8n); // reached rank 3
            return u64(shiftN(single) & empty);
        } else {
            const single = u64(shiftS(pawns) & empty & RANK_7 >> 8n); // reached rank 6
            return u64(shiftS(single) & empty);
        }
    }

    // ──────────────────────────────────────────────────────────
    //   PASS MASK / OUTPOST HELPERS  (for evaluation later)
    // ──────────────────────────────────────────────────────────

    /** Passed-pawn mask for a single pawn of `color` on `sq` */
    function passedPawnMask(sq, color) {
        const f = sq % 8;
        let frontMask = color === 0 ? RAY[0][sq] : RAY[4][sq]; // N or S rays
        if (f > 0) {
            const adj = sq + (color === 0 ? 0 : 0);  // same-rank reference
            frontMask |= color === 0 ? RAY[0][sq - 1] : RAY[4][sq - 1];
        }
        if (f < 7) {
            frontMask |= color === 0 ? RAY[0][sq + 1] : RAY[4][sq + 1];
        }
        return u64(frontMask);
    }

    // ──────────────────────────────────────────────────────────
    //   DIAGNOSTICS
    // ──────────────────────────────────────────────────────────

    /**
     * Print a bitboard as an 8×8 grid to console (for debugging).
     * @param {BigInt} bb
     * @param {string} [label]
     */
    function printBB(bb, label) {
        if (label) console.log(label);
        let out = '';
        for (let r = 7; r >= 0; r--) {
            out += (r + 1) + ' ';
            for (let f = 0; f < 8; f++) {
                const sq = r * 8 + f;
                out += (bb & bit(sq)) ? '1 ' : '. ';
            }
            out += '\n';
        }
        out += '  a b c d e f g h';
        console.log(out);
    }

    // ──────────────────────────────────────────────────────────
    //   SELF-TEST  (runs once at load, checks a few known values)
    // ──────────────────────────────────────────────────────────

    (function _selfTest() {
        // Knight on e4 (sq=28) should attack d2,f2,c3,g3,c5,g5,d6,f6
        const e4 = 28;
        const expected_e4_knight = [11,13,18,22,34,38,43,45];  // squares
        let atk = knightAttacks[e4];
        let ok = true;
        for (const sq of expected_e4_knight) {
            if (!(atk & bit(sq))) { ok = false; break; }
        }
        if (popcount(atk) !== 8) ok = false;
        if (!ok) console.warn('bitboards.js: knight attack self-test FAILED on e4');

        // King on a1 (sq=0) should have exactly 3 attack squares
        if (popcount(kingAttacks[0]) !== 3)
            console.warn('bitboards.js: king attack self-test FAILED on a1');

        // Rook on d4 with no blockers should attack 14 squares
        const d4_rook = rookAttacks(27, ZERO);
        if (popcount(d4_rook) !== 14)
            console.warn('bitboards.js: rook attack self-test FAILED on d4 (empty board)');

        // Bishop on d4 with no blockers should attack 13 squares
        const d4_bishop = bishopAttacks(27, ZERO);
        if (popcount(d4_bishop) !== 13)
            console.warn('bitboards.js: bishop attack self-test FAILED on d4 (empty board)');

        console.log('bitboards.js: self-test complete');
    })();

    // ──────────────────────────────────────────────────────────
    //   PUBLIC API
    // ──────────────────────────────────────────────────────────

    return {
        // Utilities
        bit,
        u64,
        popcount,
        lsb,
        msb,
        poplsb,

        // Direction shifts (useful in movegen)
        shiftN, shiftS, shiftE, shiftW,
        shiftNE, shiftNW, shiftSE, shiftSW,

        // Precomputed tables
        knight:       knightAttacks,       // [64]  BigInt
        king:         kingAttacks,          // [64]  BigInt
        pawnCapture:  pawnCaptureAttacks,   // [2][64] BigInt
        ray:          RAY,                  // [8][64] BigInt
        between:      BETWEEN,              // [64][64] BigInt
        line:         LINE,                 // [64][64] BigInt

        // Runtime slider attacks
        bishopAttacks,
        rookAttacks,
        queenAttacks,
        magic: getMagicAttacks,

        // Multi-piece attack maps
        allKnightAttacks,
        allBishopAttacks,
        allRookAttacks,
        allQueenAttacks,

        // Pawn helpers
        pawnSinglePush,
        pawnDoublePush,
        passedPawnMask,

        // Constants
        FILE_A, FILE_B, FILE_G, FILE_H,
        NOT_FILE_A, NOT_FILE_H, NOT_FILE_AB, NOT_FILE_GH,
        RANK_1, RANK_2, RANK_7, RANK_8,
        ZERO, FULL,

        // Debug
        printBB,
    };

})();

(function (global) {
    global.BB_ATTACKS = BB_ATTACKS;
})(typeof self !== 'undefined' ? self : window);

console.log('bitboards.js: loaded — BB_ATTACKS available (knight, king, pawn tables + slider functions)');