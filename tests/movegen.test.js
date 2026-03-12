(function (global) {
	const t = global.Chess2TestHarness;

	function legalMovesForFen(fen) {
		const pos = new global.Position();
		pos.loadFEN(fen);
		const list = new global.MoveList();
		global.MoveGen.generateLegalMoves(pos, list);
		const moves = [];
		for (let index = 0; index < list.count; index++) {
			moves.push(global.MoveGen.moveToUCI(list.moves[index]));
		}
		return moves;
	}

	t.add('start position has 20 legal moves', function () {
		const pos = new global.Position();
		pos.loadFEN('startpos');
		const list = new global.MoveList();
		global.MoveGen.generateLegalMoves(pos, list);
		t.equal(list.count, 20, 'Start position legal move count is wrong.');
	});

	t.add('magic slider tables are initialized and wired into bitboard attacks', function () {
		t.assert(global.MAGIC_ATTACKS && global.MAGIC_ATTACKS.ready, 'MAGIC_ATTACKS should be initialized before move generation runs.');
		const occupancy = 0n;
		const magicRook = global.MAGIC_ATTACKS.getRookAttacks(27, occupancy);
		const bitboardRook = global.BB_ATTACKS.rookAttacks(27, occupancy);
		t.assert(magicRook === bitboardRook, 'Bitboard rook attacks should resolve through the magic attack tables.');
	});

	t.add('pawn promotions include all four underpromotion options', function () {
		const pos = new global.Position();
		pos.loadFEN('7k/P7/8/8/8/8/8/K7 w - - 0 1');
		const list = new global.MoveList();
		global.MoveGen.generateLegalMoves(pos, list);
		const moves = [];
		for (let index = 0; index < list.count; index++) {
			moves.push(global.MoveGen.moveToUCI(list.moves[index]));
		}

		t.includes(moves, 'a7a8q', 'Queen promotion is missing.');
		t.includes(moves, 'a7a8r', 'Rook underpromotion is missing.');
		t.includes(moves, 'a7a8b', 'Bishop underpromotion is missing.');
		t.includes(moves, 'a7a8n', 'Knight underpromotion is missing.');
	});

	t.add('castling is rejected while the king is in check', function () {
		const moves = legalMovesForFen('k3r3/8/8/8/8/8/8/4K2R w K - 0 1');

		t.assert(!moves.includes('e1g1'), 'Kingside castling should be illegal while the king is in check.');
	});

	t.add('castling is rejected when the king must pass through attack', function () {
		const moves = legalMovesForFen('k4r2/8/8/8/8/8/8/4K2R w K - 0 1');

		t.assert(!moves.includes('e1g1'), 'Kingside castling should be illegal when f1 is attacked.');
	});

	t.add('en passant is rejected when it exposes the king on the opened file', function () {
		const moves = legalMovesForFen('k3r3/8/8/3pP3/8/8/8/4K3 w - d6 0 1');

		t.assert(!moves.includes('e5d6'), 'En passant should be illegal if it leaves the king in check.');
	});

	t.add('pinned rook cannot move off the file shielding its king', function () {
		const moves = legalMovesForFen('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1');

		t.assert(!moves.includes('e2d2'), 'Pinned rook should not be allowed to move sideways off the e-file.');
		t.includes(moves, 'e2e8', 'Pinned rook should still be allowed to capture along the pin line.');
	});
})(typeof self !== 'undefined' ? self : window);
