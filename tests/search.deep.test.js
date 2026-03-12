(function (global) {
	const t = global.Chess2TestHarness;
	const MATE_SCORE = global.SEARCH && typeof global.SEARCH.MATE_SCORE === 'number'
		? global.SEARCH.MATE_SCORE
		: 32000;

	function mateScoreForMoves(movesToMate) {
		return MATE_SCORE - ((movesToMate * 2) - 1);
	}

	function searchFen(fen, depth) {
		const pos = new global.Position();
		pos.loadFEN(fen);
		if (global.TT && typeof global.TT.clear === 'function') {
			global.TT.clear();
		}
		return global.SEARCH.go(pos, { depth: depth });
	}

	function searchFenWithInfo(fen, depth) {
		const result = searchFen(fen, depth);
		const info = global.SEARCH && typeof global.SEARCH.getInfo === 'function'
			? global.SEARCH.getInfo()
			: null;
		return { result: result, info: info };
	}

	function withNNUEDisabled(run) {
		if (!global.NNUE || typeof global.NNUE.getNetwork !== 'function') {
			return run();
		}

		const original = global.NNUE.getNetwork();
		global.NNUE.clearNetwork();
		try {
			return run();
		} finally {
			if (original) {
				global.NNUE.loadNetwork(original, { source: original.source || 'test-restore' });
			}
		}
	}

	t.add('search finds a mate in 3 pattern', function () {
		const fen = '5rk1/5p1p/5p1B/8/8/8/8/K6R w - - 0 1';
		const result = searchFen(fen, 5);
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;

		t.equal(bestMove, 'h1g1', 'Mate-in-3 pattern should start with Rg1+.');
		t.assert(result.bestScore >= mateScoreForMoves(3), 'Mate-in-3 search should return a mate score. Got ' + result.bestScore + '.');
	});

	t.add('search finds a mate in 4 pattern', function () {
		const fen = '6k1/5p1p/7Q/5B2/8/8/8/K7 w - - 0 1';
		const result = searchFen(fen, 7);
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;

		t.assert(Boolean(bestMove), 'Mate-in-4 pattern should return a best move.');
		t.assert(result.bestScore >= mateScoreForMoves(4), 'Mate-in-4 search should return a mate score. Got ' + result.bestScore + '.');
	});

	t.add('search finds a mate in 5 pattern', function () {
		const fen = '5rk1/5ppp/8/8/8/8/1B6/K5R1 w - - 0 1';
		const result = searchFen(fen, 9);
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;

		t.equal(bestMove, 'g1g7', 'Mate-in-5 pattern should start with Rxg7+.');
		t.assert(result.bestScore >= mateScoreForMoves(5), 'Mate-in-5 search should return a mate score. Got ' + result.bestScore + '.');
	});

	t.add('search finds a mate in 6 pattern', function () {
		const fen = '7k/8/8/8/4KQ2/8/8/8 w - - 0 1';
		const search = searchFenWithInfo(fen, 13);
		const result = search.result;
		const info = search.info;
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;
		const pv = info && Array.isArray(info.pv) ? info.pv : [];
		const expectedPV = [
			'f4e5', 'h8g8', 'e4f5', 'g8f7', 'f5g5', 'f7g8',
			'e5e7', 'g8h8', 'g5g6', 'h8g8', 'e7d8'
		];

		t.equal(bestMove, 'f4e5', 'Mate-in-6 pattern should start with the quiet king move Ke5.');
		t.assert(result.bestScore >= mateScoreForMoves(6), 'Mate-in-6 search should return a mate score. Got ' + result.bestScore + '.');
		t.equal(pv.slice(0, expectedPV.length).join(' '), expectedPV.join(' '), 'Mate-in-6 PV should preserve the verified forcing line.');
	});

	t.add('search finds a mate in 7 pattern', function () {
		const fen = '7k/8/8/8/8/4K3/4Q3/8 w - - 0 1';
		const search = searchFenWithInfo(fen, 13);
		const result = search.result;
		const info = search.info;
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;
		const pv = info && Array.isArray(info.pv) ? info.pv : [];
		const expectedPV = [
			'e2g4', 'h8h7', 'e3d4', 'h7h8', 'd4e5', 'h8h7', 'g4h5',
			'h7g7', 'e5e6', 'g7g8', 'e6f6', 'g8f8', 'h5f7'
		];

		t.equal(bestMove, 'e2g4', 'Mate-in-7 pattern should start with the quiet queen lift Qg4.');
		t.assert(result.bestScore >= mateScoreForMoves(7), 'Mate-in-7 search should return a mate score. Got ' + result.bestScore + '.');
		t.assert(pv.length >= expectedPV.length, 'Mate-in-7 PV should include the full mating line.');
		t.equal(pv.slice(0, expectedPV.length).join(' '), expectedPV.join(' '), 'Mate-in-7 PV should follow the verified forcing line.');
	});

	t.add('embedded default NNUE stays neutral on deep tactical mate regressions', function () {
		const cases = [
			{
				fen: '7k/8/8/8/4KQ2/8/8/8 w - - 0 1',
				depth: 13,
				expectedBestMove: 'f4e5',
				expectedPV: [
					'f4e5', 'h8g8', 'e4f5', 'g8f7', 'f5g5', 'f7g8',
					'e5e7', 'g8h8', 'g5g6', 'h8g8', 'e7d8'
				],
			},
			{
				fen: '7k/8/8/8/8/4K3/4Q3/8 w - - 0 1',
				depth: 13,
				expectedBestMove: 'e2g4',
				expectedPV: [
					'e2g4', 'h8h7', 'e3d4', 'h7h8', 'd4e5', 'h8h7', 'g4h5',
					'h7g7', 'e5e6', 'g7g8', 'e6f6', 'g8f8', 'h5f7'
				],
			},
		];

		t.assert(global.NNUE && global.NNUE.isReady(), 'Default NNUE should be active for this regression test.');
		t.equal(global.NNUE.getStatus().source, 'embedded-default', 'The embedded default NNUE should be the active baseline network.');

		cases.forEach(function (entry) {
			const baseline = withNNUEDisabled(function () {
				return searchFenWithInfo(entry.fen, entry.depth);
			});
			const withDefaultNNUE = searchFenWithInfo(entry.fen, entry.depth);
			const baselineMove = baseline.result && baseline.result.bestMove ? global.MoveGen.moveToUCI(baseline.result.bestMove) : null;
			const nnueMove = withDefaultNNUE.result && withDefaultNNUE.result.bestMove ? global.MoveGen.moveToUCI(withDefaultNNUE.result.bestMove) : null;
			const baselinePV = baseline.info && Array.isArray(baseline.info.pv) ? baseline.info.pv : [];
			const nnuePV = withDefaultNNUE.info && Array.isArray(withDefaultNNUE.info.pv) ? withDefaultNNUE.info.pv : [];

			t.equal(baselineMove, entry.expectedBestMove, 'No-NNUE baseline should preserve the verified mating root for ' + entry.fen + '.');
			t.equal(nnueMove, entry.expectedBestMove, 'Embedded default NNUE should not change the mating root for ' + entry.fen + '.');
			t.assert(baseline.result.bestScore >= mateScoreForMoves(entry.expectedPV.length / 2 + 0.5), 'No-NNUE baseline should keep a mating score for ' + entry.fen + '.');
			t.assert(withDefaultNNUE.result.bestScore >= mateScoreForMoves(entry.expectedPV.length / 2 + 0.5), 'Embedded default NNUE should keep a mating score for ' + entry.fen + '.');
			t.equal(baselinePV.slice(0, entry.expectedPV.length).join(' '), entry.expectedPV.join(' '), 'No-NNUE baseline PV should match the verified line for ' + entry.fen + '.');
			t.equal(nnuePV.slice(0, entry.expectedPV.length).join(' '), entry.expectedPV.join(' '), 'Embedded default NNUE PV should match the verified line for ' + entry.fen + '.');
		});
	});

	t.add('search finds a sparse back-rank mate in an endgame net', function () {
		const fen = '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1';
		const result = searchFen(fen, 3);
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;

		t.equal(bestMove, 'd1d8', 'Sparse back-rank mate should start with Rd8#.');
		t.assert(result.bestScore >= mateScoreForMoves(1), 'Back-rank mating net should return a mate score. Got ' + result.bestScore + '.');
	});

	t.add('search evaluates a corridor mate pattern as a clearly winning attack', function () {
		const fen = '7k/6pp/8/8/8/8/6PP/6RK w - - 0 1';
		const result = searchFen(fen, 3);
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;

		t.assert(Boolean(bestMove), 'Corridor attack pattern should return a legal best move.');
		t.assert(result.bestScore >= 400, 'Corridor attack pattern should evaluate as clearly winning. Got ' + result.bestScore + '.');
	});

	t.add('search evaluates a corner mate pattern as a clearly winning attack', function () {
		const fen = '6Rk/7p/8/8/8/8/8/6NK w - - 0 1';
		const result = searchFen(fen, 3);
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;

		t.assert(Boolean(bestMove), 'Corner attack pattern should return a legal best move.');
		t.assert(result.bestScore >= 700, 'Corner attack pattern should evaluate as clearly winning. Got ' + result.bestScore + '.');
	});
})(typeof self !== 'undefined' ? self : window);