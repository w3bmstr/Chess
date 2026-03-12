(function (global) {
	const t = global.Chess2TestHarness;

	function createPosition(fen) {
		const pos = new global.Position();
		pos.loadFEN(fen);
		return pos;
	}

	t.add('start position perft matches depths 1 to 3', function () {
		const pos = new global.Position();
		pos.loadFEN('startpos');

		t.equal(global.PERFT.perft(pos, 1, 0), 20, 'Perft depth 1 mismatch.');
		t.equal(global.PERFT.perft(pos, 2, 0), 400, 'Perft depth 2 mismatch.');
		t.equal(global.PERFT.perft(pos, 3, 0), 8902, 'Perft depth 3 mismatch.');
	});

	t.add('perft exposes six canonical suite positions', function () {
		const suite = global.PERFT.SUITE;
		t.equal(suite.length, 6, 'PERFT.SUITE should expose six canonical positions.');
	});

	t.add('perft returns zero nodes from a checkmated position at depth 1', function () {
		const pos = createPosition('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1');
		t.equal(global.PERFT.perft(pos, 1, 0), 0, 'Checkmated positions should have no legal moves.');
	});

	t.add('perft returns zero nodes from a stalemate position at depth 1', function () {
		const pos = createPosition('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
		t.equal(global.PERFT.perft(pos, 1, 0), 0, 'Stalemated positions should have no legal moves.');
	});

	t.add('perft divide matches the published start-position depth-3 root map', function () {
		const references = typeof global.getDiagnosticReferencePositions === 'function'
			? global.getDiagnosticReferencePositions()
			: [];
		const start = references.find(function (entry) {
			return entry.fen === 'startpos'
				|| entry.fen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
		});

		t.assert(start && start.divideReference && start.divideReference[3], 'Start position divide reference at depth 3 should be available.');

		const pos = createPosition('startpos');
		const divide = global.PERFT.divide(pos, 3);
		const actual = Object.fromEntries(divide.map(function (entry) {
			return [entry.move, entry.nodes];
		}));
		const expected = start.divideReference[3];

		Object.keys(expected).forEach(function (move) {
			t.equal(actual[move], expected[move], 'Start position divide mismatch for ' + move + '.');
		});
	});
})(typeof self !== 'undefined' ? self : window);
