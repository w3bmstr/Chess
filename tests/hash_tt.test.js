(function (global) {
	const t = global.Chess2TestHarness;
	const MATE_SCORE = global.SEARCH && typeof global.SEARCH.MATE_SCORE === 'number'
		? global.SEARCH.MATE_SCORE
		: 32000;

	function loadPosition(fen) {
		const pos = new global.Position();
		pos.loadFEN(fen);
		return pos;
	}

	function findMove(pos, uciMove) {
		const move = global.MoveGen.uciToMove(pos, uciMove);
		t.assert(Boolean(move), 'Expected legal move ' + uciMove + ' in ' + pos.toFEN());
		return move;
	}

	t.add('zobrist hash matches a fresh recomputation after FEN load', function () {
		const pos = loadPosition('r3k2r/pppq1ppp/2npbn2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w kq - 4 8');
		const recomputed = global.ZOBRIST.hashPosition(pos);

		t.equal(pos.hash, recomputed, 'Position hash should match ZOBRIST.hashPosition after loading a FEN.');
	});

	t.add('zobrist hash changes when castling rights change', function () {
		const withRights = loadPosition('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
		const withoutRights = loadPosition('r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1');

		t.assert(withRights.hash !== withoutRights.hash, 'Castling rights should contribute to the Zobrist hash.');
	});

	t.add('zobrist hash changes when en passant target changes', function () {
		const withEnPassant = loadPosition('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');
		const withoutEnPassant = loadPosition('4k3/8/8/3pP3/8/8/8/4K3 w - - 0 1');

		t.assert(withEnPassant.hash !== withoutEnPassant.hash, 'En passant file should contribute to the Zobrist hash.');
	});

	t.add('zobrist hash is restored by make and unmake for special moves', function () {
		const scenarios = [
			{ fen: 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', move: 'e1g1', label: 'castling' },
			{ fen: '4k3/P7/8/8/8/8/8/K7 w - - 0 1', move: 'a7a8q', label: 'promotion' },
			{ fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1', move: 'e5d6', label: 'en passant' },
		];

		scenarios.forEach(function (scenario) {
			const pos = loadPosition(scenario.fen);
			const originalFen = pos.toFEN();
			const originalHash = pos.hash;
			const move = findMove(pos, scenario.move);

			pos.makeMove(move);
			const movedHash = pos.hash;
			t.assert(movedHash !== originalHash, 'Hash should change after ' + scenario.label + '.');

			pos.unmakeMove();
			t.equal(pos.toFEN(), originalFen, 'FEN should be restored after unmaking ' + scenario.label + '.');
			t.equal(pos.hash, originalHash, 'Hash should be restored after unmaking ' + scenario.label + '.');
		});
	});

	t.add('zobrist repetition history reports a repeated position on matching side to move', function () {
		const pos = loadPosition('8/8/8/8/8/8/8/K6k w - - 0 1');
		const hash = pos.hash;

		global.ZOBRIST.clearHistory();
		global.ZOBRIST.pushHash(hash);
		global.ZOBRIST.pushHash(1n);
		global.ZOBRIST.pushHash(hash);
		global.ZOBRIST.pushHash(2n);
		global.ZOBRIST.pushHash(hash);

		t.assert(global.ZOBRIST.isRepetition(hash, 5), 'Repeated same-side hash should be detected as repetition.');
		global.ZOBRIST.clearHistory();
	});

	t.add('tt exact probe round-trips mate scores with ply adjustment', function () {
		const hash = 0x1234n;
		const out = { hit: false, move: 0, score: 0, bound: 0 };

		global.TT.clear();
		global.TT.newSearch();
		global.TT.store(hash, 0x112233, MATE_SCORE - 5, 8, global.TT.EXACT, 3);

		const hit = global.TT.probe(hash, 8, -33000, 33000, 3, out);
		t.assert(hit, 'Exact TT entry should probe successfully.');
		t.assert(out.hit, 'Probe result should mark the TT lookup as a hit.');
		t.equal(out.move, 0x112233, 'TT probe should return the stored move.');
		t.equal(out.score, MATE_SCORE - 5, 'TT probe should restore the original mate score at the same ply.');
	});

	t.add('tt lower and upper bounds only cut off when alpha beta conditions are met', function () {
		const lowerHash = 0x2234n;
		const upperHash = 0x3234n;
		const out = { hit: false, move: 0, score: 0, bound: 0 };

		global.TT.clear();
		global.TT.newSearch();

		global.TT.store(lowerHash, 11, 80, 6, global.TT.LOWER, 0);
		global.TT.store(upperHash, 22, -40, 6, global.TT.UPPER, 0);

		t.assert(global.TT.probe(lowerHash, 6, -10, 50, 0, out), 'Lower-bound entry should cut off when score exceeds beta.');
		t.equal(out.bound, global.TT.LOWER, 'Lower-bound probe should preserve the stored bound type.');

		t.assert(!global.TT.probe(lowerHash, 6, -10, 120, 0, out), 'Lower-bound entry should not cut off when score stays below beta.');
		t.assert(out.hit, 'Non-cutoff lower-bound probe should still report a TT hit.');

		t.assert(global.TT.probe(upperHash, 6, -20, 50, 0, out), 'Upper-bound entry should cut off when score is below alpha.');
		t.equal(out.bound, global.TT.UPPER, 'Upper-bound probe should preserve the stored bound type.');

		t.assert(!global.TT.probe(upperHash, 6, -80, 50, 0, out), 'Upper-bound entry should not cut off when score stays above alpha.');
		t.assert(out.hit, 'Non-cutoff upper-bound probe should still report a TT hit.');
	});

	t.add('tt keeps deeper entries within a generation and allows replacement across generations', function () {
		const hash = 0x4234n;
		const out = { hit: false, move: 0, score: 0, bound: 0 };

		global.TT.clear();
		global.TT.newSearch();
		global.TT.store(hash, 101, 12, 7, global.TT.EXACT, 0);
		global.TT.store(hash, 202, 30, 4, global.TT.EXACT, 0);

		global.TT.probe(hash, 7, -100, 100, 0, out);
		t.equal(out.move, 101, 'Shallower TT entries should not replace deeper entries in the same generation.');

		global.TT.newSearch();
		global.TT.store(hash, 303, 44, 4, global.TT.EXACT, 0);
		global.TT.probe(hash, 4, -100, 100, 0, out);
		t.equal(out.move, 303, 'A new generation should allow replacement even with a shallower entry.');
	});

	t.add('tt clear resets table statistics', function () {
		global.TT.clear();
		global.TT.newSearch();
		global.TT.store(0x5234n, 77, 15, 5, global.TT.EXACT, 0);
		t.assert(global.TT.stats().size > 0, 'TT should contain an entry after storing one.');

		global.TT.clear();
		const stats = global.TT.stats();
		t.equal(stats.size, 0, 'TT.clear should empty the table.');
		t.equal(stats.hashfull, 0, 'TT.clear should reset hashfull to zero.');
	});
})(typeof self !== 'undefined' ? self : window);