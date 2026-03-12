(function (global) {
	const t = global.Chess2TestHarness;
	const MATE_SCORE = global.SEARCH && typeof global.SEARCH.MATE_SCORE === 'number'
		? global.SEARCH.MATE_SCORE
		: 32000;

	function searchFen(fen, depth) {
		const pos = new global.Position();
		pos.loadFEN(fen);
		if (global.TT && typeof global.TT.clear === 'function') {
			global.TT.clear();
		}
		return global.SEARCH.go(pos, { depth: depth });
	}

	function mateScoreForMoves(movesToMate) {
		return MATE_SCORE - ((movesToMate * 2) - 1);
	}

	t.add('root search returns one scored move per legal start move at depth 1', function () {
		const pos = new global.Position();
		pos.loadFEN('startpos');
		const rootMoves = global.SEARCH.rootMoves(pos, 1);
		t.equal(rootMoves.length, 20, 'SEARCH.rootMoves should return all legal root moves.');
	});

	t.add('engine API resolves a legal best move', async function () {
		const pos = new global.Position();
		pos.loadFEN('startpos');
		const legalMoves = new Set();
		const list = new global.MoveList();
		global.MoveGen.generateLegalMoves(pos, list);
		for (let index = 0; index < list.count; index++) {
			legalMoves.add(global.MoveGen.moveToUCI(list.moves[index]));
		}

		const engine = global.createEngine();
		engine.setPosition('startpos');
		const result = await engine.go({ depth: 1 });
		t.assert(result && result.bestMove, 'Engine did not return a best move.');
		t.assert(legalMoves.has(result.bestMove), 'Engine returned an illegal move: ' + result.bestMove);
	});

	t.add('search returns no move and mate score in a checkmated position', function () {
		const fen = '7k/6Q1/6K1/8/8/8/8/8 b - - 0 1';
		const result = searchFen(fen, 2);

		t.assert(!result.bestMove, 'Checkmated side should not have a legal best move.');
		t.equal(result.bestScore, -MATE_SCORE, 'Checkmated side should receive the terminal mate score.');
	});

	t.add('search returns no move and draw score in a stalemate position', function () {
		const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
		const result = searchFen(fen, 2);

		t.assert(!result.bestMove, 'Stalemated side should not have a legal best move.');
		t.equal(result.bestScore, 0, 'Stalemated side should receive the draw score.');
	});

	t.add('search finds a mating move when an immediate mate is available', function () {
		const fen = '6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1';
		const result = searchFen(fen, 3);
		const bestMove = result && result.bestMove ? global.MoveGen.moveToUCI(result.bestMove) : null;

		t.assert(Boolean(bestMove), 'Immediate mate pattern should return a best move.');
		t.assert(result.bestScore >= mateScoreForMoves(1), 'Immediate mate pattern should return a mate score. Got ' + result.bestScore + '.');
	});

	t.add('search scores insufficient-material endings as drawn even with legal moves', function () {
		const fen = '8/8/8/8/8/2k5/8/K1B5 w - - 0 1';
		const result = searchFen(fen, 3);

		t.equal(result.bestScore, 0, 'K+B vs K should evaluate as a draw by insufficient material.');
		t.assert(Boolean(result.bestMove), 'Drawn insufficient-material positions can still have legal moves.');
	});
})(typeof self !== 'undefined' ? self : window);
