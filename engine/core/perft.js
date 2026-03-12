// perft.js
// Perft testing for move generation

// ...existing code...
// ============================================================
//   perft.js  —  engine/core/perft.js
//
//   Perft (performance test, move path enumeration) driver.
//   Counts leaf nodes at a given depth — verifies correctness
//   of movegen + make/unmake before building search on top.
//
//   Exposes global: PERFT
//
//   Depends on (globals):
//     MoveGen   (movegen.js)    — generateMoves, generateLegalMoves
//     MoveList  (movegen.js)
//     Position  (position.js)
//
//   USAGE (browser console):
//     const pos = new Position();
//     pos.loadFEN('startpos');
//     PERFT.run(pos, 5);              // single position, print depth 1..5
//     PERFT.divide(pos, 2);           // show per-move node counts at depth 2
//     PERFT.runSuite();               // run all known test positions (depth 1..4)
// ============================================================

const PERFT = (function () {

    // ──────────────────────────────────────────────────────────
    //   PREALLOCATED MOVE LIST POOL  (one per ply, zero GC)
    //   Supports up to depth 10.
    // ──────────────────────────────────────────────────────────

    const _MAX_DEPTH = 10;
    const _pool = [];
    for (let i = 0; i <= _MAX_DEPTH; i++) _pool.push(new MoveList());

    // ──────────────────────────────────────────────────────────
    //   CORE PERFT  (recursive leaf-node counter)
    // ──────────────────────────────────────────────────────────

    /**
     * Count leaf nodes at exactly `depth` half-moves from `pos`.
     * Uses bulk-counting at depth 1 (count legal moves, no recursion).
     *
     * @param {Position} pos
     * @param {number}   depth   Remaining depth (call with desired depth)
     * @param {number}   ply     Current ply (internal — starts at 0)
     * @returns {number}         Leaf node count
     */
    function perft(pos, depth, ply) {
        ply = ply || 0;

        if (depth === 0) return 1;

        const list = _pool[ply];
        // Use pseudo-legal + legality filter for correctness
        MoveGen.generateMoves(pos, list);

        // Bulk-count at depth 1: count legal moves without recursing
        if (depth === 1) {
            let count = 0;
            for (let i = 0; i < list.count; i++) {
                pos.makeMove(list.moves[i]);
                if (!pos.isInCheck(pos.side ^ 1)) count++;
                pos.unmakeMove();
            }
            return count;
        }

        let nodes = 0;
        for (let i = 0; i < list.count; i++) {
            const move = list.moves[i];
            pos.makeMove(move);
            // Skip moves that leave our king in check (pseudo-legal filter)
            if (!pos.isInCheck(pos.side ^ 1)) {
                nodes += perft(pos, depth - 1, ply + 1);
            }
            pos.unmakeMove();
        }

        return nodes;
    }

    // ──────────────────────────────────────────────────────────
    //   DIVIDE  (root-level per-move breakdown)
    //   Shows how many nodes each root move contributes.
    //   Essential for debugging movegen — compare against reference engines.
    // ──────────────────────────────────────────────────────────

    /**
     * Perft divide: print each root move and its subtree node count.
     * @param {Position} pos
     * @param {number}   depth
     * @returns {{ move: string, nodes: number }[]}  Sorted by move string
     */
    function divide(pos, depth) {
        if (depth < 1) {
            console.log('perft.divide: depth must be >= 1');
            return [];
        }

        const rootList = new MoveList();
        MoveGen.generateMoves(pos, rootList);

        const results = [];
        let total = 0;

        for (let i = 0; i < rootList.count; i++) {
            const move = rootList.moves[i];
            pos.makeMove(move);

            if (!pos.isInCheck(pos.side ^ 1)) {
                const uci   = MoveGen.moveToUCI(move);
                const nodes = depth === 1 ? 1 : perft(pos, depth - 1, 0);
                results.push({ move: uci, nodes });
                total += nodes;
            }

            pos.unmakeMove();
        }

        results.sort((a, b) => a.move.localeCompare(b.move));

        console.group(`Perft divide — depth ${depth}   FEN: ${pos.toFEN()}`);
        results.forEach(r => console.log(`  ${r.move}:  ${r.nodes}`));
        console.log(`  ──────────────────`);
        console.log(`  Total:  ${total}  (${results.length} root moves)`);
        console.groupEnd();

        return results;
    }

    // ──────────────────────────────────────────────────────────
    //   RUN  (single position, depths 1..N)
    // ──────────────────────────────────────────────────────────

    /**
     * Run perft depths 1..maxDepth on a position and print results with timing.
     * @param {Position} pos
     * @param {number}   maxDepth   (default 5)
     * @param {Object}   expected   optional { 1: n, 2: n, ... } for pass/fail
     */
    function run(pos, maxDepth, expected) {
        maxDepth = maxDepth || 5;
        const fen = pos.toFEN();
        console.group(`Perft results — ${fen}`);

        for (let d = 1; d <= maxDepth; d++) {
            const t0    = performance.now();
            const nodes = perft(pos, d, 0);
            const ms    = (performance.now() - t0).toFixed(1);
            const nps   = ms > 0 ? Math.round(nodes / (ms / 1000)).toLocaleString() : '∞';

            let suffix = '';
            if (expected && expected[d] !== undefined) {
                suffix = nodes === expected[d] ? '  ✓ PASS' : `  ✗ FAIL (expected ${expected[d]})`;
            }

            console.log(`  depth ${d}:  ${nodes.toLocaleString().padStart(12)}  |  ${ms.padStart(7)}ms  |  ${nps} nps${suffix}`);
        }

        console.groupEnd();
    }

    // ──────────────────────────────────────────────────────────
    //   KNOWN TEST SUITE
    //
    //   Standard perft positions from https://www.chessprogramming.org/Perft_Results
    //   Depths are kept at 1..4 for browser (depth 5 can take seconds).
    //   Run PERFT.runSuite(5) to go deeper.
    // ──────────────────────────────────────────────────────────

    const SUITE = [
        {
            name: 'Position 1 — Starting position',
            fen:  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            expected: { 1: 20, 2: 400, 3: 8902, 4: 197281, 5: 4865609 },
        },
        {
            name: 'Position 2 — Kiwipete (castling, promotions, en passant)',
            fen:  'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
            expected: { 1: 48, 2: 2039, 3: 97862, 4: 4085603 },
        },
        {
            name: 'Position 3 — En passant, pins',
            fen:  '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
            expected: { 1: 14, 2: 191, 3: 2812, 4: 43238, 5: 674624 },
        },
        {
            name: 'Position 4 — Promotions, captures',
            fen:  'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
            expected: { 1: 6, 2: 264, 3: 9467, 4: 422333 },
        },
        {
            name: 'Position 5 — Promotion, en passant mix',
            fen:  'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
            expected: { 1: 44, 2: 1486, 3: 62379, 4: 2103487 },
        },
        {
            name: 'Position 6 — Complex middlegame',
            fen:  'r4rk1/1pp1qppp/p1np1n2/2b1p1B1/2B1P1b1/P1NP1N2/1PP1QPPP/R4RK1 w - - 0 10',
            expected: { 1: 46, 2: 2079, 3: 89890, 4: 3894594 },
        },
    ];

    /**
     * Run the full test suite.
     * @param {number} maxDepth   Max depth per position (default 4 — safe for browser)
     */
    function runSuite(maxDepth) {
        maxDepth = maxDepth || 4;

        let totalPass = 0, totalFail = 0;
        const pos = new Position();

        console.group(`=== PERFT SUITE  (depth 1..${maxDepth}) ===`);

        SUITE.forEach(function (test) {
            pos.loadFEN(test.fen);
            console.group(test.name);

            let testPass = 0, testFail = 0;

            for (let d = 1; d <= Math.min(maxDepth, Math.max(...Object.keys(test.expected).map(Number))); d++) {
                if (!test.expected[d]) continue;

                const t0    = performance.now();
                const nodes = perft(pos, d, 0);
                const ms    = (performance.now() - t0).toFixed(1);
                const pass  = nodes === test.expected[d];
                const nps   = ms > 0 ? Math.round(nodes / (ms / 1000)).toLocaleString() : '∞';
                const mark  = pass ? '✓' : '✗';
                const info  = pass ? '' : `  expected ${test.expected[d].toLocaleString()}`;

                console.log(`  ${mark}  depth ${d}:  ${nodes.toLocaleString().padStart(12)}  ${ms.padStart(7)}ms  ${nps} nps${info}`);

                if (pass) { testPass++; totalPass++; }
                else       { testFail++; totalFail++; }

                // Don't continue deeper if we've already failed at this depth —
                // errors cascade and higher depths are meaningless.
                if (!pass) break;
            }

            console.groupEnd();
        });

        console.log('');
        console.log(`Suite complete:  ${totalPass} passed,  ${totalFail} failed`);
        console.groupEnd();

        return { pass: totalPass, fail: totalFail };
    }

    // ──────────────────────────────────────────────────────────
    //   QUICK CHECK  (instant sanity test — just depth 1 & 2 on startpos)
    //   Call this after page load to verify the engine is working.
    // ──────────────────────────────────────────────────────────

    function quickCheck() {
        const pos = new Position();
        pos.loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        const d1 = perft(pos, 1, 0);
        const d2 = perft(pos, 2, 0);
        const d3 = perft(pos, 3, 0);
        const ok = d1 === 20 && d2 === 400 && d3 === 8902;
        if (ok) {
            console.log(`perft.js: quickCheck ✓  (depth1=${d1}, depth2=${d2}, depth3=${d3})`);
        } else {
            console.warn(`perft.js: quickCheck ✗  (depth1=${d1} [exp 20], depth2=${d2} [exp 400], depth3=${d3} [exp 8902])`);
        }
        return ok;
    }

    // ──────────────────────────────────────────────────────────
    //   AUTO-RUN quick check when all scripts are loaded
    // ──────────────────────────────────────────────────────────

    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function () {
            // Brief delay to ensure all script globals are settled
            setTimeout(function () {
                if (typeof MoveGen !== 'undefined' && typeof Position !== 'undefined') {
                    quickCheck();
                } else {
                    console.warn('perft.js: MoveGen or Position not found — check script load order');
                }
            }, 100);
        });
    }

    // ──────────────────────────────────────────────────────────
    //   PUBLIC API
    // ──────────────────────────────────────────────────────────

    return {
        // Core
        perft,
        divide,
        run,

        // Test suite
        runSuite,
        quickCheck,

        // Known test positions (useful for external tooling)
        SUITE,
    };

})();

(function (global) {
    global.PERFT = PERFT;
})(typeof self !== 'undefined' ? self : window);

console.log('perft.js: loaded — PERFT.run(pos,depth), PERFT.divide(pos,depth), PERFT.runSuite() available');