(function (global) {
	const t = global.Chess2TestHarness;

	function evaluateFen(fen) {
		const pos = new global.Position();
		pos.loadFEN(fen);
		return global.EVAL.evaluate(pos);
	}

	function withRestoredNetwork(run) {
		const original = global.NNUE.getNetwork();
		try {
			return run(original);
		} finally {
			if (original) {
				global.NNUE.loadNetwork(original, { source: original.source || 'test-restore' });
			} else {
				global.NNUE.clearNetwork();
			}
		}
	}

	t.add('starting position evaluates as equal', function () {
		t.equal(evaluateFen('startpos'), 0, 'Start position should evaluate to 0.');
	});

	t.add('insufficient material is detected for lone kings', function () {
		const pos = new global.Position();
		pos.loadFEN('8/8/8/8/8/8/8/K6k w - - 0 1');
		t.assert(global.EVAL.isInsufficientMaterial(pos), 'Lone kings should be insufficient material.');
	});

	t.add('bishop versus lone king is treated as insufficient material', function () {
		const pos = new global.Position();
		pos.loadFEN('8/8/8/8/8/2k5/8/K1B5 w - - 0 1');

		t.assert(global.EVAL.isInsufficientMaterial(pos), 'K+B vs K should be flagged as insufficient material.');
	});

	t.add('rook advantage evaluates clearly better than bare king', function () {
		const score = evaluateFen('8/8/8/8/8/2k5/8/R3K3 w Q - 0 1');

		t.assert(score > 400, 'A rook advantage should evaluate as clearly winning. Got ' + score + '.');
	});

	t.add('extra queen for black evaluates strongly against white', function () {
		const score = evaluateFen('4k3/8/8/8/8/8/8/3qK3 w - - 0 1');

		t.assert(score < -700, 'An extra black queen should evaluate as clearly losing for white. Got ' + score + '.');
	});

	t.add('evaluation is color-symmetric across mirrored lone-piece positions', function () {
		const whiteScore = evaluateFen('4k3/8/8/8/8/8/8/3QK3 w - - 0 1');
		const blackScore = evaluateFen('3qk3/8/8/8/8/8/8/4K3 b - - 0 1');

		t.equal(whiteScore, blackScore, 'Equivalent side-to-move queen advantages should evaluate identically from the mover perspective.');
	});

	t.add('advanced pawn evaluates better than a back-rank pawn', function () {
		const advanced = evaluateFen('4k3/8/8/4P3/8/8/8/4K3 w - - 0 1');
		const home = evaluateFen('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1');

		t.assert(advanced > home, 'An advanced pawn should score better than the same pawn on its home rank.');
	});

	t.add('passed pawn structure scores better than doubled isolated pawns', function () {
		const passed = evaluateFen('4k3/8/8/3P4/8/8/8/4K3 w - - 0 1');
		const doubled = evaluateFen('4k3/8/8/8/8/3P4/3P4/4K3 w - - 0 1');

		t.assert(passed > doubled, 'A healthy passed pawn should evaluate better than doubled isolated pawns.');
	});

	t.add('specialist eval modules and NNUE API are loaded', function () {
		t.assert(global.EVAL_PST && typeof global.EVAL_PST.evaluate === 'function', 'PST evaluator should be loaded.');
		t.assert(global.EVAL_PAWNS && typeof global.EVAL_PAWNS.evaluate === 'function', 'Pawn evaluator should be loaded.');
		t.assert(global.EVAL_MOBILITY && typeof global.EVAL_MOBILITY.evaluate === 'function', 'Mobility evaluator should be loaded.');
		t.assert(global.EVAL_KING_SAFETY && typeof global.EVAL_KING_SAFETY.evaluate === 'function', 'King safety evaluator should be loaded.');
		t.assert(global.EVAL_THREATS && typeof global.EVAL_THREATS.evaluate === 'function', 'Threat evaluator should be loaded.');
		t.assert(global.NNUE && typeof global.NNUE.evaluate === 'function', 'NNUE API should be available even without a loaded network.');
		t.assert(typeof global.NNUE.getStatus === 'function', 'NNUE status API should be available.');
		t.assert(global.NNUE.isReady(), 'NNUE should load a default network on startup.');
		t.equal(global.NNUE.getStatus().source, 'embedded-default', 'The startup NNUE network should come from the embedded default path.');
	});

	t.add('custom NNUE networks can be loaded and restored through the public API', function () {
		withRestoredNetwork(function () {
			const featureWeights = new Array(12 * 64).fill(0);
			featureWeights[4 * 64 + 3] = 640;
			const status = global.NNUE.loadNetwork({
				name: 'test-net',
				version: 7,
				bias: 0,
				scale: 1,
				blend: 1,
				featureWeights,
			}, { source: 'test-suite' });

			t.assert(status.ready, 'A valid custom network should become active.');
			t.equal(status.source, 'test-suite', 'Custom network source should be preserved.');
			t.equal(status.name, 'test-net', 'Custom network name should be exposed in status.');
			t.equal(evaluateFen('4k3/8/8/8/8/8/8/3QK3 w - - 0 1'), 640, 'The loaded custom network should drive evaluation when blend is 1.');
			t.equal(evaluateFen('4k3/8/8/8/8/8/8/4K3 w - - 0 1'), 0, 'Positions without the weighted feature should evaluate neutrally.');
		});
	});

	t.add('invalid NNUE networks are rejected without clobbering the active network', function () {
		withRestoredNetwork(function (original) {
			const before = global.NNUE.getStatus();
			let threw = false;
			try {
				global.NNUE.loadNetwork({
					name: 'broken-net',
					bias: 0,
					blend: 1,
					featureWeights: [0, NaN],
				}, { source: 'broken-test' });
			} catch (error) {
				threw = /finite numbers/i.test(error.message);
			}

			t.assert(threw, 'Malformed NNUE weights should throw a validation error.');
			t.equal(global.NNUE.getStatus().source, before.source, 'Rejecting a bad network should keep the previous source active.');
			t.equal(global.NNUE.getStatus().name, before.name, 'Rejecting a bad network should keep the previous network active.');
			t.assert(Boolean(original), 'The test should have an active baseline network to preserve.');
		});
	});

	t.add('engine info surfaces NNUE readiness and reset helpers', function () {
		const engine = global.createEngine();
		const status = engine.getNNUEStatus();
		const info = engine.getInfo();

		t.assert(status.ready, 'Engine NNUE status should report the active default network.');
		t.assert(info.nnue && info.nnue.ready, 'Engine info should include NNUE readiness.');
		engine.resetNNUE();
		t.equal(engine.getNNUEStatus().source, 'embedded-default', 'Engine reset should restore the embedded default network.');
	});
})(typeof self !== 'undefined' ? self : window);
