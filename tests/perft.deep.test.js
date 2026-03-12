(function (global) {
	const t = global.Chess2TestHarness;

	function createPosition(fen) {
		const pos = new global.Position();
		pos.loadFEN(fen);
		return pos;
	}

	function assertPerft(positionName, fen, depth, expected) {
		const pos = createPosition(fen);
		t.equal(global.PERFT.perft(pos, depth, 0), expected, positionName + ' perft depth ' + depth + ' mismatch.');
	}

	t.add('perft suite spot checks cover all six canonical positions', function () {
		const suite = global.PERFT.SUITE;

		assertPerft('Position 1', suite[0].fen, 4, suite[0].expected[4]);
		assertPerft('Position 2', suite[1].fen, 3, suite[1].expected[3]);
		assertPerft('Position 3', suite[2].fen, 4, suite[2].expected[4]);
		assertPerft('Position 4', suite[3].fen, 3, suite[3].expected[3]);
		assertPerft('Position 5', suite[4].fen, 3, suite[4].expected[3]);
		assertPerft('Position 6', suite[5].fen, 3, suite[5].expected[3]);
	});

	t.add('kiwipete perft depth 4 matches the canonical reference', function () {
		assertPerft(
			'Kiwipete',
			'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
			4,
			4085603
		);
	});

	t.add('position 3 divide matches the published depth-5 reference map', function () {
		const references = typeof global.getDiagnosticReferencePositions === 'function'
			? global.getDiagnosticReferencePositions()
			: [];
		const position3 = references.find(function (entry) {
			return entry.fen === '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
		});

		t.assert(position3 && position3.divideReference && position3.divideReference[5], 'Position 3 divide reference at depth 5 should be available.');

		const pos = createPosition(position3.fen);
		const divide = global.PERFT.divide(pos, 5);
		const actual = Object.fromEntries(divide.map(function (entry) {
			return [entry.move, entry.nodes];
		}));
		const expected = position3.divideReference[5];

		Object.keys(expected).forEach(function (move) {
			t.equal(actual[move], expected[move], 'Position 3 divide mismatch for ' + move + '.');
		});
	});
})(typeof self !== 'undefined' ? self : window);