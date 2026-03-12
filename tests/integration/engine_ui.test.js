(function (global) {
	const t = global.Chess2TestHarness;
	const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

	function createController() {
		return global.createGameController({
			config: {
				startFEN: START_FEN,
				humanColor: 'white',
				engineColor: 'black',
			},
			parseFEN: global.parseFEN,
			serializeFEN: global.serializeFEN,
			getPieceAt: global.getPieceAt,
			pieceColor: global.pieceColor,
			generateLegalMovesFrom: global.generateLegalMovesFrom,
			generateAllLegalMoves: global.generateAllLegalMoves,
			applyMoveToState: global.applyMoveToState,
			moveToUCI: global.moveToUCI,
			getGameStatus: global.getGameStatus,
			findKingSquare: global.findKingSquare,
			isSquareAttacked: global.isSquareAttacked,
			oppositeColor: global.oppositeColor,
			validateFEN: global.validateFEN,
			notation: global.Chess2Notation,
		});
	}

	t.add('engine best move can be applied to the controller as a legal live move', async function () {
		const controller = createController();
		const engine = global.createEngine();
		engine.setPosition(START_FEN);
		const result = await engine.go({ depth: 1 });

		const applied = controller.applyEngineMoveFromUCI(result && result.bestMove);
		const snapshot = controller.getSnapshot();

		t.assert(applied, 'Controller should accept the engine best move as legal.');
		t.equal(snapshot.moveHistory.length, 1, 'Applying the engine move should create one history entry.');
		t.equal(snapshot.moveHistory[0].uci, result.bestMove, 'History should record the engine best move verbatim.');
	});

	t.add('engine can reply to a human opening from the controller position', async function () {
		const controller = createController();
		await controller.handleSquareClick('e2');
		await controller.handleSquareClick('e4');

		const engine = global.createEngine();
		engine.setPosition(controller.getSnapshot().currentBoardFEN);
		const result = await engine.go({ depth: 1 });
		const applied = controller.applyEngineMoveFromUCI(result && result.bestMove);
		const snapshot = controller.getSnapshot();

		t.assert(applied, 'Engine reply should be legal in the controller position after a human move.');
		t.equal(snapshot.moveHistory.length, 2, 'Human move plus engine reply should produce two plies of history.');
		t.equal(snapshot.currentGameState.activeColor, 'white', 'After black replies, the turn should return to white.');
	});

	t.add('engine-vs-engine self-play advances multiple plies from the starting position', async function () {
		const controller = global.createGameController({
			config: {
				startFEN: START_FEN,
				humanColor: null,
				engineColor: 'white',
				humanColors: [],
				engineColors: ['white', 'black'],
			},
			parseFEN: global.parseFEN,
			serializeFEN: global.serializeFEN,
			getPieceAt: global.getPieceAt,
			pieceColor: global.pieceColor,
			generateLegalMovesFrom: global.generateLegalMovesFrom,
			generateAllLegalMoves: global.generateAllLegalMoves,
			applyMoveToState: global.applyMoveToState,
			moveToUCI: global.moveToUCI,
			getGameStatus: global.getGameStatus,
			findKingSquare: global.findKingSquare,
			isSquareAttacked: global.isSquareAttacked,
			oppositeColor: global.oppositeColor,
			validateFEN: global.validateFEN,
			notation: global.Chess2Notation,
		});

		const engine = global.createEngine();
		for (let ply = 0; ply < 4; ply++) {
			const snapshotBefore = controller.getSnapshot();
			engine.setPosition(snapshotBefore.currentBoardFEN);
			const result = await engine.go({ depth: 1 });
			const applied = controller.applyEngineMoveFromUCI(result && result.bestMove);
			t.assert(applied, 'Self-play ply ' + (ply + 1) + ' should apply a legal engine move.');
		}

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.moveHistory.length, 4, 'Four self-play plies should be recorded in history.');
		t.equal(snapshot.currentGameState.activeColor, 'white', 'After four plies from the start position, white should be on move again.');
	});
})(typeof self !== 'undefined' ? self : window);
