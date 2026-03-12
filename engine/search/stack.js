// stack.js
// Search stack for engine

// ...existing code...
// ============================================================
//   stack.js  —  engine/search/stack.js
//   Preallocated search stack — zero heap allocation per node.
//
//   Per the architecture notes:
//   "stack.js should not export a class you instantiate.
//    Instead, it should export a TypedArray-backed pool.
//    When the search starts, it 'resets' a pointer to 0.
//    As it goes deeper (ply 1, ply 2...), it just reads/writes
//    to the next offset in that pre-allocated buffer.
//    No objects created, no objects destroyed, zero GC."
//
//   Contains:
//     STACK       — per-ply search frame (static eval, move, flags)
//     PV_TABLE    — principal variation table (MAX_PLY × MAX_PLY)
//     SEARCH_INFO — shared counters/limits (nodes, time, stop flag)
//
//   Exposes global: STACK
//   Depends on:    nothing (standalone)
// ============================================================

const STACK = (function () {

    // ──────────────────────────────────────────────────────────
    //   DIMENSIONS
    // ──────────────────────────────────────────────────────────

    const MAX_PLY   = 128;
    const MAX_MOVES = 256;

    // ──────────────────────────────────────────────────────────
    //   PER-PLY FRAME  (flat Int32Array layout)
    //
    //   Each ply gets FRAME_SIZE Int32 words.
    //   Access: frame[ply * FRAME_SIZE + FIELD_OFFSET]
    //
    //   Fields:
    //     F_MOVE        — packed move played to reach this ply (0 at root)
    //     F_STATIC_EVAL — static evaluation at this node (before search)
    //     F_PV_MOVE     — best move found during search of this node
    //     F_FLAGS       — bit flags (see below)
    //     F_MOVE_COUNT  — number of moves searched at this node (LMR)
    //     F_EXCLUDED    — singular extension excluded move (0 = none)
    //
    //   Flag bits in F_FLAGS:
    //     BIT_IN_CHECK  (1)  — side to move is in check at this ply
    //     BIT_SKIP_NULL (2)  — null move pruning disabled for this ply
    //     BIT_PV_NODE   (4)  — this node is on the PV (alpha < beta-1)
    // ──────────────────────────────────────────────────────────

    const F_MOVE        = 0;
    const F_STATIC_EVAL = 1;
    const F_PV_MOVE     = 2;
    const F_FLAGS       = 3;
    const F_MOVE_COUNT  = 4;
    const F_EXCLUDED    = 5;
    const FRAME_SIZE    = 6;

    const BIT_IN_CHECK  = 1;
    const BIT_SKIP_NULL = 2;
    const BIT_PV_NODE   = 4;

    // Sentinel: invalid/unknown static eval
    const EVAL_NONE = -32001;

    // The flat buffer
    const _frame = new Int32Array(MAX_PLY * FRAME_SIZE);

    // ── Field accessors ───────────────────────────────────────

    function getMove(ply)        { return _frame[ply * FRAME_SIZE + F_MOVE]; }
    function setMove(ply, v)     { _frame[ply * FRAME_SIZE + F_MOVE]        = v; }

    function getStaticEval(ply)  { return _frame[ply * FRAME_SIZE + F_STATIC_EVAL]; }
    function setStaticEval(ply, v){ _frame[ply * FRAME_SIZE + F_STATIC_EVAL] = v; }

    function getPVMove(ply)      { return _frame[ply * FRAME_SIZE + F_PV_MOVE]; }
    function setPVMove(ply, v)   { _frame[ply * FRAME_SIZE + F_PV_MOVE]      = v; }

    function getFlags(ply)       { return _frame[ply * FRAME_SIZE + F_FLAGS]; }
    function setFlags(ply, v)    { _frame[ply * FRAME_SIZE + F_FLAGS]        = v; }

    function getMoveCount(ply)   { return _frame[ply * FRAME_SIZE + F_MOVE_COUNT]; }
    function setMoveCount(ply, v){ _frame[ply * FRAME_SIZE + F_MOVE_COUNT]   = v; }

    function getExcluded(ply)    { return _frame[ply * FRAME_SIZE + F_EXCLUDED]; }
    function setExcluded(ply, v) { _frame[ply * FRAME_SIZE + F_EXCLUDED]     = v; }

    // ── Flag helpers ──────────────────────────────────────────

    function isInCheck(ply)      { return (_frame[ply * FRAME_SIZE + F_FLAGS] & BIT_IN_CHECK)  !== 0; }
    function setInCheck(ply, v)  {
        const base = ply * FRAME_SIZE + F_FLAGS;
        _frame[base] = v ? _frame[base] | BIT_IN_CHECK : _frame[base] & ~BIT_IN_CHECK;
    }

    function skipNull(ply)       { return (_frame[ply * FRAME_SIZE + F_FLAGS] & BIT_SKIP_NULL) !== 0; }
    function setSkipNull(ply, v) {
        const base = ply * FRAME_SIZE + F_FLAGS;
        _frame[base] = v ? _frame[base] | BIT_SKIP_NULL : _frame[base] & ~BIT_SKIP_NULL;
    }

    function isPVNode(ply)       { return (_frame[ply * FRAME_SIZE + F_FLAGS] & BIT_PV_NODE)   !== 0; }
    function setPVNode(ply, v)   {
        const base = ply * FRAME_SIZE + F_FLAGS;
        _frame[base] = v ? _frame[base] | BIT_PV_NODE : _frame[base] & ~BIT_PV_NODE;
    }

    /** Reset a single ply's frame to defaults. Call at the start of each node. */
    function resetPly(ply) {
        const base = ply * FRAME_SIZE;
        _frame[base + F_MOVE]        = 0;
        _frame[base + F_STATIC_EVAL] = EVAL_NONE;
        _frame[base + F_PV_MOVE]     = 0;
        _frame[base + F_FLAGS]       = 0;
        _frame[base + F_MOVE_COUNT]  = 0;
        _frame[base + F_EXCLUDED]    = 0;
    }

    /** Reset all frames (call at the start of each new search). */
    function resetAll() {
        _frame.fill(0);
        // Set all static evals to EVAL_NONE
        for (let p = 0; p < MAX_PLY; p++) {
            _frame[p * FRAME_SIZE + F_STATIC_EVAL] = EVAL_NONE;
        }
    }

    // ──────────────────────────────────────────────────────────
    //   PV TABLE  (Principal Variation)
    //   A triangular table stored as a flat MAX_PLY × MAX_PLY
    //   Int32Array.  pv[ply][i] is the i-th move in the PV from ply.
    //
    //   Layout: _pv[ply * MAX_PLY + i]
    //
    //   Length of PV line at ply is stored in _pvLen[ply].
    //
    //   Usage in search:
    //     // At the root, after search returns:
    //     const bestMove = pvMove(0);
    //     const pvLine   = getPV();   // full PV array
    //
    //     // Inside search, after a move improves alpha:
    //     updatePV(ply, move);        // copies child PV into parent
    // ──────────────────────────────────────────────────────────

    const _pv    = new Int32Array(MAX_PLY * MAX_PLY);
    const _pvLen = new Uint8Array(MAX_PLY);

    /**
     * Update PV at `ply` with `move` followed by the PV from `ply+1`.
     * Call this whenever a move improves alpha (alpha < score < beta).
     */
    function updatePV(ply, move) {
        _pv[ply * MAX_PLY] = move;
        const childLen = _pvLen[ply + 1];
        for (let i = 0; i < childLen; i++) {
            _pv[ply * MAX_PLY + 1 + i] = _pv[(ply + 1) * MAX_PLY + i];
        }
        _pvLen[ply] = childLen + 1;
    }

    /** Clear the PV from ply onward (call when entering a new node). */
    function clearPV(ply) {
        _pvLen[ply] = 0;
    }

    /** Get the best move at root (index 0 of PV at ply 0). */
    function pvMove(ply) {
        return _pvLen[ply] > 0 ? _pv[ply * MAX_PLY] : 0;
    }

    /**
     * Return the full PV as an array of packed move integers.
     * @param {number} ply  Starting ply (usually 0 for root PV)
     */
    function getPV(ply) {
        ply = ply || 0;
        const len = _pvLen[ply];
        const pv  = [];
        for (let i = 0; i < len; i++) {
            pv.push(_pv[ply * MAX_PLY + i]);
        }
        return pv;
    }

    function clearAllPV() {
        _pv.fill(0);
        _pvLen.fill(0);
    }

    // ──────────────────────────────────────────────────────────
    //   SEARCH INFO  (shared search state — not per-ply)
    //   Accessed by search.js to check time/node limits and
    //   communicate results back to engine.js / worker.js.
    // ──────────────────────────────────────────────────────────

    const INFO = {
        // ── Limits (set before search starts) ────────────────
        maxDepth:   64,      // maximum depth to search
        maxNodes:   0,       // node limit (0 = unlimited)
        startTime:  0,       // Date.now() at search start
        timeLimitMs: 0,      // soft time limit (0 = unlimited)
        hardLimitMs: 0,      // hard time limit (abort if exceeded)

        // ── Running counters (updated during search) ─────────
        nodes:      0,       // total nodes visited (includes qsearch)
        qnodes:     0,       // quiescence nodes
        depth:      0,       // current iterative deepening depth
        seldepth:   0,       // maximum selective depth reached

        // ── Results (populated when search finishes) ─────────
        bestMove:   0,       // packed move integer
        bestScore:  0,       // score in centipawns
        ponderMove: 0,       // ponder move (first move of PV after bestMove)

        // ── Control flags ────────────────────────────────────
        stop:       false,   // set true to abort search immediately
        pondering:  false,   // set true when in ponder mode

        // ── Info callback (called by search on each completed depth) ──
        //   signature: onInfo({ depth, seldepth, score, nodes, time, pv })
        onInfo:     null,
    };

    /**
     * Reset INFO to defaults before starting a new search.
     * @param {Object} options  { depth?, nodes?, movetime?, hardLimit?, onInfo? }
     */
    function initSearch(options) {
        options = options || {};
        INFO.maxDepth    = options.depth      || 64;
        INFO.maxNodes    = options.nodes      || 0;
        INFO.timeLimitMs = options.movetime   || 0;
        INFO.hardLimitMs = options.hardLimit  || 0;
        INFO.startTime   = Date.now();
        INFO.nodes       = 0;
        INFO.qnodes      = 0;
        INFO.depth       = 0;
        INFO.seldepth    = 0;
        INFO.bestMove    = 0;
        INFO.bestScore   = 0;
        INFO.ponderMove  = 0;
        INFO.stop        = false;
        INFO.onInfo      = options.onInfo || null;
    }

    /**
     * Check whether the search should stop now.
     * Call this every ~2048 nodes inside the search loop.
     * Updates INFO.stop if time or node limit is exceeded.
     * @returns {boolean}  true = stop immediately
     */
    function shouldStop() {
        if (INFO.stop) return true;

        if (INFO.maxNodes > 0 && INFO.nodes >= INFO.maxNodes) {
            INFO.stop = true;
            return true;
        }

        if (INFO.hardLimitMs > 0) {
            const elapsed = Date.now() - INFO.startTime;
            if (elapsed >= INFO.hardLimitMs) {
                INFO.stop = true;
                return true;
            }
        }

        return false;
    }

    /**
     * Report a completed depth to the info callback.
     * Called by search.js at the end of each iterative deepening iteration.
     * @param {Position} pos   Current position (for PV extraction)
     * @param {number}   depth
     * @param {number}   score
     */
    function reportDepth(pos, depth, score) {
        const elapsed = Date.now() - INFO.startTime;
        const pv      = getPV(0);

        if (INFO.onInfo) {
            INFO.onInfo({
                depth,
                seldepth: INFO.seldepth,
                score,
                nodes:    INFO.nodes + INFO.qnodes,
                time:     elapsed,
                nps:      elapsed > 0 ? Math.round((INFO.nodes + INFO.qnodes) / (elapsed / 1000)) : 0,
                pv:       pv.map(m => typeof MoveGen !== 'undefined' ? MoveGen.moveToUCI(m) : m),
                hashfull: typeof TT !== 'undefined' ? TT.hashfull() : 0,
            });
        }
    }

    // ──────────────────────────────────────────────────────────
    //   MOVE LISTS  (preallocated — one per ply, zero malloc)
    //   A pool of MAX_PLY MoveList-compatible objects.
    //   Each has .moves (Int32Array) and .count (number).
    //   Do NOT use the same pool slot at two different plies simultaneously.
    // ──────────────────────────────────────────────────────────

    const _movePool = [];
    for (let p = 0; p < MAX_PLY + 4; p++) {
        _movePool.push({
            moves: new Int32Array(MAX_MOVES),
            count: 0,
        });
    }

    // Separate pool for quiescence search capture lists
    const _qMovePool = [];
    for (let p = 0; p < MAX_PLY; p++) {
        _qMovePool.push({
            moves: new Int32Array(MAX_MOVES),
            count: 0,
        });
    }

    function getMoveList(ply)  { return _movePool[ply]; }
    function getQMoveList(ply) { return _qMovePool[ply]; }

    // ──────────────────────────────────────────────────────────
    //   FULL RESET  (call at start of each new search)
    // ──────────────────────────────────────────────────────────

    function reset() {
        resetAll();
        clearAllPV();
        for (const ml of _movePool)  { ml.count = 0; }
        for (const ml of _qMovePool) { ml.count = 0; }
    }

    // ──────────────────────────────────────────────────────────
    //   PUBLIC API
    // ──────────────────────────────────────────────────────────

    return {
        // Per-ply frame accessors
        getMove,        setMove,
        getStaticEval,  setStaticEval,
        getPVMove,      setPVMove,
        getFlags,       setFlags,
        getMoveCount,   setMoveCount,
        getExcluded,    setExcluded,

        // Flag helpers
        isInCheck,   setInCheck,
        skipNull,    setSkipNull,
        isPVNode,    setPVNode,
        resetPly,

        // PV table
        updatePV,
        clearPV,
        clearAllPV,
        pvMove,
        getPV,

        // Move list pool
        getMoveList,
        getQMoveList,

        // Search info
        INFO,
        initSearch,
        shouldStop,
        reportDepth,

        // Full reset
        reset,

        // Constants
        MAX_PLY,
        MAX_MOVES,
        EVAL_NONE,
        BIT_IN_CHECK,
        BIT_SKIP_NULL,
        BIT_PV_NODE,
    };

})();

(function (global) {
    global.STACK = STACK;
})(typeof self !== 'undefined' ? self : window);

console.log('stack.js: loaded — STACK available (frame accessors, PV table, move pool, INFO)');