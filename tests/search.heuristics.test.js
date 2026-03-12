(function (global) {
	const t = global.Chess2TestHarness;

	function searchFen(fen, depth) {
		const pos = new global.Position();
		pos.loadFEN(fen);
		if (global.TT && typeof global.TT.clear === 'function') {
			global.TT.clear();
		}
		return global.SEARCH.go(pos, { depth: depth });
	}

	function withDebugHooks(hooks, run) {
		global.SEARCH.setDebugHooks(hooks);
		try {
			return run();
		} finally {
			global.SEARCH.clearDebugHooks();
		}
	}

	t.add('pvs emits null-window probes on a branching root search', function () {
		let pvsCount = 0;

		withDebugHooks({
			pvsNullWindow: function () {
				pvsCount++;
			},
		}, function () {
			searchFen('startpos', 4);
		});

		t.assert(pvsCount > 0, 'Expected PVS null-window probes during a multi-move root search.');
	});

	t.add('lmr emits reduction events in a quiet branching search', function () {
		const reductions = [];

		withDebugHooks({
			lmrApplied: function (event) {
				reductions.push(event.reduction);
			},
		}, function () {
			searchFen('startpos', 5);
		});

		t.assert(reductions.length > 0, 'Expected LMR reductions to be applied in a depth-5 start-position search.');
		t.assert(reductions.some(function (reduction) { return reduction > 0; }), 'Expected at least one strictly positive LMR reduction.');
	});

	t.add('null-move pruning emits attempt events when static eval is forced high', function () {
		const originalEvaluate = global.EVAL.evaluate;
		let nullMoveAttempts = 0;

		global.EVAL.evaluate = function () {
			return 5000;
		};

		try {
			withDebugHooks({
				nullMoveAttempt: function () {
					nullMoveAttempts++;
				},
			}, function () {
				searchFen('startpos', 5);
			});
		} finally {
			global.EVAL.evaluate = originalEvaluate;
		}

		t.assert(nullMoveAttempts > 0, 'Expected null-move pruning attempts when static eval comfortably exceeds beta.');
	});

	t.add('tt-assisted cutoffs can short-circuit non-root nodes through probe hits', function () {
		const originalProbe = global.TT.probe;
		let ttCutoffs = 0;
		const pos = new global.Position();
		pos.loadFEN('startpos');
		const move = global.MoveGen.uciToMove(pos, 'e2e4');
		t.assert(Boolean(move), 'Expected e2e4 to be legal from the starting position.');
		pos.makeMove(move);

		global.TT.probe = function (hash, depth, alpha, beta, ply, out) {
			if (ply > 0) {
				out.hit = true;
				out.move = 0;
				out.score = 91;
				out.bound = global.TT.EXACT;
				return true;
			}
			return originalProbe(hash, depth, alpha, beta, ply, out);
		};

		let score;
		try {
			global.TT.clear();
			global.STACK.initSearch({ depth: 2 });
			global.STACK.reset();
			global.ZOBRIST.clearHistory();
			withDebugHooks({
				ttCutoff: function () {
					ttCutoffs++;
				},
			}, function () {
				score = global.SEARCH._search(pos, 1, 0, 1, 1, false);
			});
		} finally {
			global.TT.probe = originalProbe;
		}

		t.assert(ttCutoffs > 0, 'Expected synthetic TT exact hits to trigger non-root cutoffs.');
		t.equal(score, 91, 'A synthetic TT exact hit should return immediately from a non-PV child search.');
	});
})(typeof self !== 'undefined' ? self : window);