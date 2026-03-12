// search.js
// Search algorithms for chess engine

// ...existing code...
// ============================================================
//   search.js  —  engine/search/search.js
//   Main search algorithm.
//
//   Features implemented:
//     • Iterative deepening (ID)
//     • Aspiration windows (shrinking around previous score)
//     • Alpha-beta with fail-soft
//     • Principal Variation Search (PVS / null-window)
//     • Transposition table (TT) — cutoffs and move ordering
//     • Null-move pruning (NMP) with verification search
//     • Late-move reductions (LMR)
//     • Futility pruning (FP) — shallow nodes
//     • Reverse futility pruning (RFP) — static eval margin
//     • Delta pruning in quiescence
//     • Mate distance pruning
//     • Check extensions
//     • Singular extensions
//     • Quiescence search (captures + promotions + checks at ply 0)
//     • Draw detection (50-move, repetition, insufficient material)
//
//   Exposes global: SEARCH
//   Depends on:
//     BB_ATTACKS  (bitboards.js)
//     Position    (position.js)
//     MoveGen     (movegen.js)
//     MoveList    (movegen.js)
//     ZOBRIST     (zobrist.js)
//     TT          (tt.js)
//     ORDER       (ordering.js)
//     STACK       (stack.js)
//     EVAL        (eval.js)
// ============================================================

const SEARCH = (function () {

    // ──────────────────────────────────────────────────────────
    //   CONSTANTS
    // ──────────────────────────────────────────────────────────

    const MATE_SCORE   = 32000;
    const DRAW_SCORE   = 0;
    const MAX_PLY      = 128;
    const INF          = 33000;

    // LMR base reduction table [depth][moveCount]  (precomputed)
    const _LMR = [];
    for (let d = 0; d < 64; d++) {
        _LMR.push(new Float32Array(64));
        for (let m = 0; m < 64; m++) {
            if (d === 0 || m === 0) { _LMR[d][m] = 0; continue; }
            _LMR[d][m] = 0.75 + Math.log(d) * Math.log(m) / 2.25;
        }
    }

    function lmrReduction(depth, moveCount) {
        const d = Math.max(0, Math.min(Math.floor(depth), 63));
        const m = Math.max(0, Math.min(Math.floor(moveCount), 63));
        return Math.floor(_LMR[d][m]);
    }

    // Aspiration window initial delta
    const ASP_DELTA     = 25;
    const ASP_MAX_DELTA = 500;

    // Null-move pruning
    const NMP_MIN_DEPTH = 3;
    const NMP_BASE_R    = 3;   // base reduction
    const NMP_DEPTH_DIV = 4;   // extra reduction for deep searches

    // Futility pruning margins by depth (centipawns)
    //                     d0   d1   d2    d3    d4    d5    d6
    const FUTILITY_MARGIN = [0, 100, 200, 300,  400,  500,  600];

    // Reverse futility pruning margin (per depth)
    const RFP_MARGIN = 80;

    // Delta pruning in qsearch
    const DELTA_MARGIN = 150;

    // ──────────────────────────────────────────────────────────
    //   SHARED STATE
    // ──────────────────────────────────────────────────────────

    // The single game position — must be set before calling go()
    let _pos = null;

    // Reusable probe result object — avoid allocation inside search
    const _ttResult = { hit: false, move: 0, score: 0, bound: 0 };
    let _debugHooks = null;

    function _emitDebug(event, payload) {
        if (!_debugHooks) return;
        const eventPayload = Object.assign({ event }, payload || {});
        try {
            if (typeof _debugHooks[event] === 'function') {
                _debugHooks[event](eventPayload);
            }
            if (typeof _debugHooks.onEvent === 'function') {
                _debugHooks.onEvent(eventPayload);
            }
        } catch (error) {
            console.warn('search.js: debug hook failed for', event, error);
        }
    }

    // ──────────────────────────────────────────────────────────
    //   DRAW DETECTION
    // ──────────────────────────────────────────────────────────

    function _isDraw(pos, ply) {
        // 50-move rule
        if (pos.halfmove >= 100) return true;

        // Insufficient material
        if (EVAL.isInsufficientMaterial(pos)) return true;

        // Repetition — only check if we have a hash
        if (pos.hash && ZOBRIST.isRepetition(pos.hash, pos.halfmove)) return true;

        return false;
    }

    // ──────────────────────────────────────────────────────────
    //   MATE DISTANCE PRUNING
    //   If we already know we can achieve mate in fewer moves,
    //   tighten the window so we don't waste time on longer paths.
    // ──────────────────────────────────────────────────────────

    function _mateDistancePrune(alpha, beta, ply) {
        const mateInPly = MATE_SCORE - ply;
        alpha = Math.max(alpha, -(MATE_SCORE - ply - 1));
        beta  = Math.min(beta,    MATE_SCORE - ply);
        return { alpha, beta, cutoff: alpha >= beta };
    }

    function _sideHasNonPawnMaterial(pos, color) {
        const offset = color === 0 ? 0 : 6;
        return (pos.bb[offset + 1] | pos.bb[offset + 2] | pos.bb[offset + 3] | pos.bb[offset + 4]) !== 0n;
    }

    // ──────────────────────────────────────────────────────────
    //   QUIESCENCE SEARCH
    //   Resolves captures until the position is "quiet".
    //   Also handles checks at depth 0 (check extension).
    // ──────────────────────────────────────────────────────────

    function _qsearch(pos, alpha, beta, ply) {
        ply = Math.max(0, Math.floor(ply));

        if (STACK.shouldStop()) return 0;

        STACK.INFO.qnodes++;

        // Update selective depth
        if (ply > STACK.INFO.seldepth) STACK.INFO.seldepth = ply;

        // Stand-pat score
        const standPat = EVAL.evaluate(pos);
        if (standPat >= beta)  return standPat;  // fail soft
        if (standPat > alpha)  alpha = standPat;

        // Delta pruning — if even the best possible capture can't raise alpha, prune
        if (standPat < alpha - DELTA_MARGIN - 900) return standPat;

        // Generate and sort captures only
        const list = STACK.getQMoveList(Math.min(ply, MAX_PLY - 1));
        list.count = 0;
        MoveGen.generateMoves(pos, list);

        // Filter: only captures, promotions, and (at ply 0) checks
        const captures = STACK.getQMoveList(Math.min(ply + 1, MAX_PLY - 1));
        captures.count = 0;
        for (let i = 0; i < list.count; i++) {
            const m    = list.moves[i];
            const flags = (m >>> 24) & 0xF;
            if ((flags & 4) || (flags & 8)) {
                captures.moves[captures.count++] = m;
            }
        }

        ORDER.sortCaptures(captures);

        for (let i = 0; i < captures.count; i++) {
            const move = captures.moves[i];

            // SEE pruning — skip clearly losing captures
            if (ORDER.see(pos, move) < 0) continue;

            pos.makeMove(move);
            if (pos.isInCheck(pos.side ^ 1)) { pos.unmakeMove(); continue; } // illegal

            if (pos.hash) ZOBRIST.pushHash(pos.hash);
            const score = -_qsearch(pos, -beta, -alpha, ply + 1);
            if (pos.hash) ZOBRIST.popHash();

            pos.unmakeMove();

            if (STACK.shouldStop()) return 0;
            if (score >= beta)  return score;
            if (score > alpha)  alpha = score;
        }

        return alpha;
    }

    // ──────────────────────────────────────────────────────────
    //   ALPHA-BETA  (negamax, fail-soft)
    // ──────────────────────────────────────────────────────────

    function _search(pos, depth, alpha, beta, ply, cutNode) {
        depth = Math.max(0, Math.floor(depth));
        ply = Math.max(0, Math.floor(ply));

        if (STACK.shouldStop()) return 0;

        // ── Draw detection ────────────────────────────────────
        if (ply > 0 && _isDraw(pos, ply)) return DRAW_SCORE;

        // ── Drop into qsearch at horizon ─────────────────────
        if (depth <= 0) return _qsearch(pos, alpha, beta, ply);

        STACK.INFO.nodes++;
        if (ply > STACK.INFO.seldepth) STACK.INFO.seldepth = ply;

        const isPV    = beta > alpha + 1;
        const inCheck = pos.isInCheck(pos.side);

        STACK.setInCheck(ply, inCheck);
        STACK.resetPly(ply);
        STACK.setStaticEval(ply, STACK.EVAL_NONE);
        STACK.clearPV(ply);

        // ── Check extension ───────────────────────────────────
        if (inCheck) depth++;

        // ── Mate distance pruning ─────────────────────────────
        if (!isPV) {
            const mdp = _mateDistancePrune(alpha, beta, ply);
            if (mdp.cutoff) return mdp.alpha;
            alpha = mdp.alpha; beta = mdp.beta;
        }

        // ── TT probe ──────────────────────────────────────────
        const hash   = pos.hash || 0n;
        const ttHit  = TT.probe(hash, depth, alpha, beta, ply, _ttResult);
        const ttMove = _ttResult.hit ? _ttResult.move : 0;

        if (ttHit && !isPV && ply > 0) {
            _emitDebug('ttCutoff', { ply, depth, alpha, beta, score: _ttResult.score, bound: _ttResult.bound, move: _ttResult.move });
            return _ttResult.score;
        }

        // ── Static eval ───────────────────────────────────────
        let staticEval;
        if (inCheck) {
            staticEval = -INF;  // in check: eval is unreliable
        } else if (_ttResult.hit) {
            // Use TT score as better static eval estimate
            staticEval = _ttResult.score;
        } else {
            staticEval = EVAL.evaluate(pos);
        }

        STACK.setStaticEval(ply, staticEval);

        // Improving: are we doing better than 2 plies ago?
        const improving = !inCheck &&
            ply >= 2 &&
            STACK.getStaticEval(ply - 2) !== STACK.EVAL_NONE &&
            staticEval > STACK.getStaticEval(ply - 2);

        // ── Reverse futility pruning (RFP / static null move) ──
        if (!isPV && !inCheck && depth <= 6 && !STACK.skipNull(ply)) {
            if (staticEval - RFP_MARGIN * depth >= beta) {
                return staticEval;
            }
        }

        // ── Null-move pruning ─────────────────────────────────
        if (!isPV && !inCheck && depth >= NMP_MIN_DEPTH &&
            !STACK.skipNull(ply) &&
            staticEval >= beta &&
            // Don't null-move if we only have pawns (zugzwang risk)
            _sideHasNonPawnMaterial(pos, pos.side))
        {
            const R = NMP_BASE_R + Math.floor(depth / NMP_DEPTH_DIV) + Math.floor(Math.min((staticEval - beta) / 200, 3));
            const newDepth = Math.max(0, depth - R);
            _emitDebug('nullMoveAttempt', { ply, depth, beta, staticEval, reduction: R, newDepth });

            // Make null move (just flip side)
            pos.side ^= 1;
            if (pos.hash) ZOBRIST.pushHash(pos.hash ^ ZOBRIST.side());
            STACK.setSkipNull(ply + 1, true);

            const nullScore = -_search(pos, newDepth, -beta, -beta + 1, ply + 1, !cutNode);

            STACK.setSkipNull(ply + 1, false);
            if (pos.hash) ZOBRIST.popHash();
            pos.side ^= 1;

            if (STACK.shouldStop()) return 0;

            if (nullScore >= beta) {
                // Verification search for deep null-moves
                if (depth >= 12) {
                    const verScore = _search(pos, depth - R, beta - 1, beta, ply, cutNode);
                    if (verScore < beta) {
                        // Null-move failed verification — don't prune
                    } else {
                        _emitDebug('nullMoveCutoff', { ply, depth, beta, staticEval, reduction: R, newDepth, score: nullScore, verified: true });
                        return nullScore;
                    }
                } else {
                    _emitDebug('nullMoveCutoff', { ply, depth, beta, staticEval, reduction: R, newDepth, score: nullScore, verified: false });
                    return nullScore;
                }
            }
        }

        // ── Generate and order moves ───────────────────────────
        const list = STACK.getMoveList(ply);
        list.count = 0;
        MoveGen.generateMoves(pos, list);

        const prevMove = ply > 0 ? STACK.getMove(ply - 1) : 0;
        ORDER.scoreMoves(list, ttMove, ply, prevMove, pos.side);

        // ── Move loop ─────────────────────────────────────────
        let bestScore  = -INF;
        let bestMove   = 0;
        let legalCount = 0;
        let bound      = TT.UPPER;
        const quietsTried = [];  // for history penalty

        for (let i = 0; i < list.count; i++) {
            ORDER.pickBest(list, ORDER._scores, i);
            const move   = list.moves[i];
            const flags  = (move >>> 24) & 0xF;
            const isCapt = (flags & 4) !== 0;
            const isPromo = (flags & 8) !== 0;
            const isQuiet = !isCapt && !isPromo;

            // ── Singular extension ────────────────────────────
            // If TT move exists and was searched to sufficient depth,
            // check if it's the only good move (singular).
            let extension = 0;
            if (!isPV && move === ttMove &&
                !STACK.skipNull(ply) &&
                depth >= 6 &&
                _ttResult.hit &&
                _ttResult.bound !== TT.UPPER &&
                Math.abs(_ttResult.score) < MATE_SCORE - 100 &&
                ((_ttResult.score /* ttDepth from meta would be here */ ) >= depth - 3))
            {
                const sBeta = _ttResult.score - depth;
                STACK.setSkipNull(ply, true);  // reuse as "exclude this move" flag
                const singScore = _search(pos, Math.floor((depth - 1) / 2), sBeta - 1, sBeta, ply, cutNode);
                STACK.setSkipNull(ply, false);

                if (singScore < sBeta) {
                    extension = 1;  // singular — extend this move
                } else if (sBeta >= beta) {
                    return sBeta;   // multi-cut — prune
                }
            }

            // ── Futility pruning ──────────────────────────────
            if (!isPV && !inCheck && isQuiet && legalCount > 0 &&
                depth <= 6 && staticEval !== -INF) {
                const margin = FUTILITY_MARGIN[Math.min(depth, 6)];
                if (staticEval + margin <= alpha) continue;
            }

            // ── Late-move pruning (LMP) ───────────────────────
            if (!isPV && !inCheck && isQuiet && depth <= 5 &&
                legalCount >= (3 + depth * depth * (improving ? 2 : 1))) {
                continue;
            }

            // ── Make move ─────────────────────────────────────
            pos.makeMove(move);

            // Skip illegal moves
            if (pos.isInCheck(pos.side ^ 1)) {
                pos.unmakeMove();
                continue;
            }

            legalCount++;
            STACK.setMove(ply, move);
            if (pos.hash) ZOBRIST.pushHash(pos.hash);

            if (isQuiet) quietsTried.push(move);

            // ── LMR — Late-Move Reductions ────────────────────
            let newDepth = depth - 1 + extension;
            let score;

            if (legalCount >= 3 && depth >= 3 && isQuiet && !inCheck && !isPV) {
                let R = lmrReduction(depth, legalCount);
                R -= isPV ? 1 : 0;
                R += cutNode ? 1 : 0;
                R -= inCheck ? 1 : 0;
                R = Math.max(1, Math.min(R, newDepth - 1));
                _emitDebug('lmrApplied', { ply, depth, moveCount: legalCount, reduction: R, move, cutNode: Boolean(cutNode) });

                // Search with reduced depth
                score = -_search(pos, newDepth - R, -(alpha + 1), -alpha, ply + 1, true);

                // If LMR found improvement, re-search at full depth
                if (score > alpha) {
                    score = -_search(pos, newDepth, -(alpha + 1), -alpha, ply + 1, !cutNode);
                }
            } else if (!isPV || legalCount > 1) {
                // PVS null window
                _emitDebug('pvsNullWindow', { ply, depth, moveCount: legalCount, move, alpha, beta, isPV });
                score = -_search(pos, newDepth, -(alpha + 1), -alpha, ply + 1, !cutNode);
            }

            // Full-window search for first move (or when null window fails high)
            if (isPV && (legalCount === 1 || (score > alpha && score < beta))) {
                if (legalCount > 1) {
                    _emitDebug('pvsResearch', { ply, depth, moveCount: legalCount, move, alpha, beta, score });
                }
                score = -_search(pos, newDepth, -beta, -alpha, ply + 1, false);
            }

            // ── Unmake move ───────────────────────────────────
            if (pos.hash) ZOBRIST.popHash();
            pos.unmakeMove();

            if (STACK.shouldStop()) return 0;

            // ── Score bookkeeping ─────────────────────────────
            if (score > bestScore) {
                bestScore = score;
                bestMove  = move;

                if (score > alpha) {
                    alpha = score;
                    bound = TT.EXACT;
                    STACK.updatePV(ply, move);
                    STACK.setPVMove(ply, move);

                    if (score >= beta) {
                        // Beta cutoff
                        bound = TT.LOWER;

                        // Update killer / counter / history
                        if (isQuiet) {
                            ORDER.storeKiller(ply, move);
                            ORDER.storeCounter(prevMove, move);
                            ORDER.updateHistory(pos.side ^ 1, move, quietsTried, depth);
                        }

                        break;  // fail-high
                    }
                }
            }
        }

        // ── Terminal node detection ───────────────────────────
        if (legalCount === 0) {
            if (inCheck) return -(MATE_SCORE - ply);  // checkmate
            return DRAW_SCORE;                          // stalemate
        }

        // ── Store to TT ───────────────────────────────────────
        if (!STACK.shouldStop()) {
            TT.store(hash, bestMove, bestScore, depth, bound, ply);
        }

        return bestScore;
    }

    // ──────────────────────────────────────────────────────────
    //   ITERATIVE DEEPENING  +  ASPIRATION WINDOWS
    // ──────────────────────────────────────────────────────────

    function _iterativeDeepening(pos) {
        let prevScore  = 0;
        let bestMove   = 0;
        let bestScore  = 0;

        TT.newSearch();
        ORDER.clearKillers();

        for (let depth = 1; depth <= STACK.INFO.maxDepth; depth++) {
            STACK.INFO.depth    = depth;
            STACK.INFO.seldepth = 0;
            STACK.reset();

            // ── Aspiration windows ────────────────────────────
            let alpha, beta, delta, score;

            if (depth >= 5) {
                delta = ASP_DELTA;
                alpha = Math.max(-INF, prevScore - delta);
                beta  = Math.min( INF, prevScore + delta);
            } else {
                alpha = -INF;
                beta  =  INF;
            }

            // Research loop with widening windows
            while (true) {
                score = _search(pos, depth, alpha, beta, 0, false);

                if (STACK.shouldStop()) break;

                if (score <= alpha) {
                    // Fail low — widen lower bound
                    beta  = (alpha + beta) / 2;
                    alpha = Math.max(-INF, alpha - delta);
                    delta = Math.min(delta * 2, ASP_MAX_DELTA);
                } else if (score >= beta) {
                    // Fail high — widen upper bound
                    beta  = Math.min(INF, beta + delta);
                    delta = Math.min(delta * 2, ASP_MAX_DELTA);
                } else {
                    break;  // inside window
                }
            }

            if (STACK.shouldStop()) break;

            prevScore = score;
            bestScore = score;

            // Grab best move from PV
            const pvMove = STACK.pvMove(0);
            if (pvMove) bestMove = pvMove;

            STACK.INFO.bestMove  = bestMove;
            STACK.INFO.bestScore = bestScore;

            // Report this depth's result
            STACK.reportDepth(pos, depth, score);

            // ── Time management ───────────────────────────────
            // If we've used more than half the soft time limit,
            // don't start another iteration we won't finish cleanly.
            if (STACK.INFO.timeLimitMs > 0) {
                const elapsed = Date.now() - STACK.INFO.startTime;
                if (elapsed >= STACK.INFO.timeLimitMs / 2) break;
            }

            // Mate found — no point searching deeper
            if (Math.abs(score) >= MATE_SCORE - MAX_PLY) break;
        }

        return { bestMove, bestScore };
    }

    // ──────────────────────────────────────────────────────────
    //   PUBLIC API
    // ──────────────────────────────────────────────────────────

    /**
     * Start a search from `pos` with the given options.
     * This is synchronous — call from a Web Worker to avoid blocking the UI.
     *
     * @param {Position} pos
     * @param {Object}   options
     *   depth      {number}    max depth (default 64)
     *   movetime   {number}    soft time limit in ms
     *   hardLimit  {number}    hard time limit in ms (abort at this)
     *   nodes      {number}    node limit
     *   onInfo     {Function}  callback({ depth, score, nodes, time, pv })
     *
     * @returns {{ bestMove: number, bestScore: number }}
     */
    function go(pos, options) {
        _pos = pos;
        STACK.initSearch(options);
        ZOBRIST.clearHistory();

        const result = _iterativeDeepening(pos);

        STACK.INFO.stop     = false;
        STACK.INFO.bestMove = result.bestMove;
        STACK.INFO.bestScore = result.bestScore;

        return result;
    }

    /**
     * Abort the current search.  Safe to call from the main thread
     * while the search is running in a worker.
     */
    function stop() {
        STACK.INFO.stop = true;
    }

    /**
     * Search for the best move and return it as a UCI string.
     * Convenience wrapper for simple use cases.
     * @param {Position} pos
     * @param {Object}   options
     * @returns {string}  e.g. "e2e4"
     */
    function bestMoveUCI(pos, options) {
        const { bestMove } = go(pos, options);
        return bestMove ? MoveGen.moveToUCI(bestMove) : '(none)';
    }

    /**
     * Search the root position and return ordered root moves with scores.
     * Useful for multi-PV display.
     * @param {Position} pos
     * @param {number}   depth
     * @returns {{ move: string, score: number }[]}
     */
    function rootMoves(pos, depth) {
        const list = new MoveList();
        MoveGen.generateLegalMoves(pos, list);

        const results = [];
        for (let i = 0; i < list.count; i++) {
            const move = list.moves[i];
            pos.makeMove(move);
            const score = -_search(pos, depth - 1, -INF, INF, 1, false);
            pos.unmakeMove();
            results.push({ move: MoveGen.moveToUCI(move), score });
        }

        results.sort((a, b) => b.score - a.score);
        return results;
    }

    /**
     * Get info about the last completed search.
     * @returns {Object}
     */
    function getInfo() {
        return {
            depth:     STACK.INFO.depth,
            seldepth:  STACK.INFO.seldepth,
            score:     STACK.INFO.bestScore,
            nodes:     STACK.INFO.nodes + STACK.INFO.qnodes,
            bestMove:  STACK.INFO.bestMove ? MoveGen.moveToUCI(STACK.INFO.bestMove) : null,
            pv:        STACK.getPV(0).map(m => MoveGen.moveToUCI(m)),
            hashfull:  TT.hashfull(),
            time:      STACK.INFO.startTime ? Date.now() - STACK.INFO.startTime : 0,
        };
    }

    function setDebugHooks(hooks) {
        _debugHooks = hooks || null;
    }

    function clearDebugHooks() {
        _debugHooks = null;
    }

    return {
        go,
        stop,
        bestMoveUCI,
        rootMoves,
        getInfo,
        setDebugHooks,
        clearDebugHooks,

        // Exposed for worker.js
        _search,
        _qsearch,

        // Constants
        MATE_SCORE,
        DRAW_SCORE,
        INF,
    };

})();

(function (global) {
    global.SEARCH = SEARCH;
})(typeof self !== 'undefined' ? self : window);

console.log('search.js: loaded — SEARCH.go(pos, options) available');