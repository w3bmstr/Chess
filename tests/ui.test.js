(function (global) {
	const t = global.Chess2TestHarness;
	const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

	function parseEcoReferenceCodes() {
		const referenceText = String(global.Chess2EcoReferenceText || '');
		const codes = [];
		const seen = new Set();
		const pattern = /^([A-E][0-9]{2})\s+(.+)$/gm;
		let match = pattern.exec(referenceText);
		while (match) {
			const eco = match[1];
			if (!seen.has(eco)) {
				seen.add(eco);
				codes.push(eco);
			}
			match = pattern.exec(referenceText);
		}
		return codes;
	}

	function parseEcoReferenceTitles() {
		const referenceText = String(global.Chess2EcoReferenceText || '');
		const titles = {};
		const pattern = /^([A-E][0-9]{2})\s+(.+)$/gm;
		let match = pattern.exec(referenceText);
		while (match) {
			const eco = match[1];
			if (!Object.prototype.hasOwnProperty.call(titles, eco)) {
				titles[eco] = match[2].trim();
			}
			match = pattern.exec(referenceText);
		}
		return titles;
	}

	function normalizeReferencePgn(text) {
		return String(text || '')
			.replace(/\*/g, ' ')
			.replace(/0-0-0/g, 'O-O-O')
			.replace(/0-0/g, 'O-O')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function createController(configOverrides) {
		return global.createGameController({
			config: {
				startFEN: START_FEN,
				humanColor: 'white',
				engineColor: 'black',
				...(configOverrides || {}),
			},
			parseFEN: global.parseFEN,
			serializeFEN: global.serializeFEN,
			getPieceAt: global.getPieceAt,
			pieceColor: global.pieceColor,
			generateLegalMovesFrom: global.generateLegalMovesFrom,
			generateLegalDropMoves: global.generateLegalDropMoves,
			generateAllLegalMoves: global.generateAllLegalMoves,
			applyMoveToState: global.applyMoveToState,
			moveToUCI: global.moveToUCI,
			getGameStatus: global.getGameStatus,
			findKingSquare: global.findKingSquare,
			isSquareAttacked: global.isSquareAttacked,
			oppositeColor: global.oppositeColor,
			validateFEN: global.validateFEN,
			notation: global.Chess2Notation,
			openings: global.Chess2Openings,
		});
	}

	t.add('opening recognition follows the current ECO move prefix', function () {
		const controller = createController();
		controller.applyMoveFromUCI('e2e4');
		controller.applyMoveFromUCI('e7e5');
		controller.applyMoveFromUCI('g1f3');
		controller.applyMoveFromUCI('b8c6');
		controller.applyMoveFromUCI('f1b5');

		const snapshot = controller.getSnapshot();
		t.assert(snapshot.opening && snapshot.opening.recognized, 'Opening recognition should exist after a known ECO sequence.');
		t.equal(snapshot.opening.recognized.eco, 'C60', 'The line should be recognized as C60.');
		t.equal(snapshot.opening.recognized.label, 'Ruy Lopez', 'The line should resolve to the Ruy Lopez name.');
	});

	t.add('controller imports a PGN game through the notation pipeline', function () {
		const controller = createController();
		const result = controller.importPGN('[Event "Test"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 *');

		t.assert(result && result.ok, 'PGN import should succeed for a simple main-line game.');

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.moveHistory.length, 5, 'PGN import should populate the move history.');
		t.assert(snapshot.opening && snapshot.opening.recognized, 'PGN import should update recognized opening state.');
		t.equal(snapshot.opening.recognized.eco, 'C60', 'The imported PGN should reach the Ruy Lopez position.');
	});

	t.add('opening explorer suggests known continuations from the current line', function () {
		const controller = createController();
		controller.applyMoveFromUCI('e2e4');
		controller.applyMoveFromUCI('e7e5');
		controller.applyMoveFromUCI('g1f3');
		controller.applyMoveFromUCI('b8c6');

		const snapshot = controller.getSnapshot();
		const nextMoves = snapshot.opening.nextMoves.map(entry => entry.uci);

		t.assert(nextMoves.includes('f1b5'), 'Explorer should suggest Bb5 as a known continuation.');
		t.assert(nextMoves.includes('f1c4'), 'Explorer should suggest Bc4 as a known continuation.');
	});

	t.add('opening explorer ranks continuations by weighted popularity', function () {
		const state = global.Chess2Openings.getOpeningState({
			uciLine: ['e2e4', 'c7c5', 'g1f3', 'd7d6', 'd2d4', 'c5d4', 'f3d4', 'g8f6', 'b1c3'],
			sanLine: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3'],
		});

		t.assert(state.nextMoves.length >= 2, 'The Najdorf/Sicilian branch should expose multiple weighted continuations.');
		t.equal(state.nextMoves[0].uci, 'a7a6', 'Najdorf a6 should outrank dragon/classical alternatives from this branch.');
		t.assert(state.nextMoves[0].weight > state.nextMoves[1].weight, 'The first ranked continuation should have a larger accumulated book weight.');
	});

	t.add('eco browser exposes a complete A00-E99 code index', function () {
		const catalog = global.Chess2Openings.getEcoCodeCatalog();
		const actualCodes = catalog.map(entry => entry.eco);
		const expectedCodes = [];
		['A', 'B', 'C', 'D', 'E'].forEach(function (letter) {
			for (let number = 0; number <= 99; number++) {
				expectedCodes.push(letter + String(number).padStart(2, '0'));
			}
		});
		const missingCodes = expectedCodes.filter(code => !actualCodes.includes(code));

		t.equal(catalog.length, 500, 'The ECO browser should expose every A00-E99 code.');
		t.equal(missingCodes.length, 0, 'No ECO codes should be missing from A00 through E99. Missing: ' + missingCodes.join(', '));
		t.assert(catalog.some(entry => entry.eco === 'A00'), 'The index should include A00.');
		t.assert(catalog.some(entry => entry.eco === 'E99'), 'The index should include E99.');
	});

	t.add('eco browser cross-references every code from the supplied ECO reference text', function () {
		const catalog = global.Chess2Openings.getEcoCodeCatalog();
		const actualCodes = new Set(catalog.map(entry => entry.eco));
		const referenceCodes = parseEcoReferenceCodes();
		const missingCodes = referenceCodes.filter(code => !actualCodes.has(code));

		t.assert(referenceCodes.length >= 500, 'The supplied ECO reference text should expose the expected code list.');
		t.equal(missingCodes.length, 0, 'Every ECO code from the supplied reference text should exist in the live encyclopedia. Missing: ' + missingCodes.join(', '));
	});

	t.add('eco browser uses the supplied reference title for every ECO code', function () {
		const catalog = global.Chess2Openings.getEcoCodeCatalog();
		const referenceTitles = parseEcoReferenceTitles();
		const mismatches = [];

		catalog.forEach(function (entry) {
			const expected = referenceTitles[entry.eco];
			if (!expected) {
				mismatches.push(entry.eco + ': missing reference title');
				return;
			}
			if (entry.name !== expected) {
				mismatches.push(entry.eco + ': expected "' + expected + '" but found "' + entry.name + '"');
			}
		});

		t.equal(mismatches.length, 0, 'Every ECO catalog code should expose the canonical supplied reference title. Mismatches: ' + mismatches.slice(0, 20).join(' || '));
	});

	t.add('eco encyclopedia avoids duplicate exact lines while cross-referencing the supplied reference text', function () {
		const encyclopedia = global.Chess2Openings.getEncyclopediaCatalog();
		const seen = new Set();
		const duplicates = [];

		encyclopedia.forEach(function (entry) {
			const key = [entry.eco || '-', entry.label || '-', entry.pgnText || entry.moveText || '-'].join(' | ');
			if (seen.has(key)) {
				duplicates.push(key);
				return;
			}
			seen.add(key);
		});

		t.equal(duplicates.length, 0, 'The encyclopedia should not contain duplicate exact ECO entries. Duplicates: ' + duplicates.join(' || '));
	});

	t.add('eco browser keeps exact recorded lines attached to matching codes', function () {
		const catalog = global.Chess2Openings.getEcoCodeCatalog();
		const ruyLopez = catalog.find(entry => entry.eco === 'C60');

		t.assert(ruyLopez, 'The code index should include C60.');
		t.assert(Array.isArray(ruyLopez.lines) && ruyLopez.lines.length > 0, 'Codes with recorded move trees should expose exact lines.');
		t.equal(ruyLopez.lines[0].label, 'Ruy Lopez', 'The exact line metadata should remain available in the ECO browser.');
	});

	t.add('eco browser supplements the four codes missing from the upstream opening-name dataset', function () {
		const catalog = global.Chess2Openings.getEcoCodeCatalog();
		const missingCodes = ['D72', 'D73', 'E57', 'E88'];

		missingCodes.forEach(function (eco) {
			const entry = catalog.find(item => item.eco === eco);
			t.assert(entry, eco + ' should be present in the completed code index.');
			t.assert(Array.isArray(entry.lines) && entry.lines.length > 0, eco + ' should expose at least one exact stored line.');
		});

		const d72 = catalog.find(entry => entry.eco === 'D72');
		t.equal(d72.lines[0].label, 'Grunfeld Defense: Kemeri (Botvinnik)', 'D72 should expose its exact supplemented line name.');
	});

	t.add('opening recognition names the Van\'t Kruijs branch after e3 Nc6', function () {
		const state = global.Chess2Openings.getOpeningState({
			uciLine: ['e2e3', 'b8c6'],
			sanLine: ['e3', 'Nc6'],
		});

		t.assert(state.recognized, 'The e3 Nc6 line should resolve to a recognized opening.');
		t.equal(state.recognized.name, 'Van\'t Kruijs Opening', 'The line should be identified as the Van\'t Kruijs Opening.');
		t.equal(state.recognized.variation, '1...Nc6', 'The recognized branch should preserve the specific black setup.');
	});

	t.add('recognized openings expose explicit transposition lines for the family', function () {
		const state = global.Chess2Openings.getOpeningState({
			uciLine: ['g1f3', 'd7d5', 'c2c4', 'e7e6'],
			sanLine: ['Nf3', 'd5', 'c4', 'e6'],
		});

		t.assert(state.recognized, 'The transposed move order should still recognize an opening family.');
		t.equal(state.recognized.family, 'qgd', 'The transposed move order should resolve to the Queen\'s Gambit Declined family.');
		t.assert(Array.isArray(state.recognized.transpositions) && state.recognized.transpositions.length > 0, 'Recognized openings should expose alternative move-order transpositions.');
		t.assert(state.recognized.transpositions.some(item => item.moveText === 'd2d4 d7d5 c2c4 e7e6'), 'The family should list the direct Queen\'s Gambit Declined move order as a transposition.');
	});

	t.add('opening recognition can match transpositions by exact reached position hash', function () {
		const transposedState = global.Chess2Openings.getOpeningState({
			uciLine: ['g1f3', 'd7d5', 'c2c4', 'e7e6'],
			sanLine: ['Nf3', 'd5', 'c4', 'e6'],
			currentGameState: global.parseFEN('rnbqkbnr/ppp2ppp/4p3/3p4/2P5/5N2/PP1PPPPP/RNBQKB1R w KQkq - 0 3'),
		});

		t.assert(transposedState.recognized, 'Hash-backed recognition should still resolve a recognized opening.');
		t.assert(Boolean(transposedState.currentHash), 'Opening state should expose the current position hash.');
		t.assert(transposedState.recognized.hashMatched, 'Recognition should report when the current position matched a stored book position hash.');
	});

	t.add('controller commits a legal move and records notation', function () {
		const controller = createController();
		const move = controller.findLegalMoveByUCI('e2e4');

		t.assert(move, 'Controller should resolve e2e4 as a legal move from start position.');
		controller.commitMove(move);

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.currentBoardFEN, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'Controller should advance to the post-move FEN.');
		t.equal(snapshot.moveHistory.length, 1, 'Controller should append one move to history.');
		t.equal(snapshot.moveHistory[0].uci, 'e2e4', 'Controller should record UCI notation.');
		t.equal(snapshot.moveHistory[0].san, 'e4', 'Controller should record SAN notation.');
	});

	t.add('controller trims future history when branching from review', function () {
		const controller = createController();
		controller.applyEngineMoveFromUCI('e2e4');
		controller.applyEngineMoveFromUCI('e7e5');
		controller.applyEngineMoveFromUCI('g1f3');

		controller.navigateToMove(0);
		controller.applyEngineMoveFromUCI('c7c5');

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.moveHistory.length, 2, 'Branching from review should discard later future moves.');
		t.equal(snapshot.moveHistory[1].uci, 'c7c5', 'Controller should append the replacement branch move.');
		t.equal(snapshot.currentMoveIndex, 1, 'Controller should return to the new live branch tip.');
	});

	t.add('controller navigateToMove rewinds and restores historical FEN', function () {
		const controller = createController();
		controller.applyEngineMoveFromUCI('e2e4');
		controller.applyEngineMoveFromUCI('e7e5');

		controller.navigateToMove(0);
		let snapshot = controller.getSnapshot();
		t.equal(snapshot.currentBoardFEN, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'Rewinding to move 0 should restore the first post-move FEN.');

		controller.navigateToMove(-1);
		snapshot = controller.getSnapshot();
		t.equal(snapshot.currentBoardFEN, START_FEN, 'Navigating before the first move should restore the starting position.');
	});

	t.add('controller selectSquare exposes legal targets for the side to move', function () {
		const controller = createController();
		controller.selectSquare('e2');
		const snapshot = controller.getSnapshot();

		t.assert(snapshot.legalTargets.includes('e3'), 'Pawn should be able to advance one square.');
		t.assert(snapshot.legalTargets.includes('e4'), 'Pawn should be able to advance two squares from the start rank.');
		t.equal(snapshot.selectedSquare, 'e2', 'Controller should remember the selected square.');
	});

	t.add('controller handleSquareClick supports human-vs-human turn ownership', async function () {
		const controller = createController({
			humanColor: null,
			humanColors: ['white', 'black'],
		});

		await controller.handleSquareClick('e2');
		await controller.handleSquareClick('e4');
		await controller.handleSquareClick('e7');
		await controller.handleSquareClick('e5');

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.moveHistory.length, 2, 'Both sides should be able to move in human-vs-human mode.');
		t.equal(snapshot.moveHistory[1].uci, 'e7e5', 'Black should be able to respond through the same click flow.');
	});

	t.add('controller handleSquareClick blocks input when no side is human-controlled', async function () {
		const controller = createController({
			humanColor: null,
			humanColors: [],
		});

		const handled = await controller.handleSquareClick('e2');
		const snapshot = controller.getSnapshot();

		t.equal(handled, false, 'Clicks should be ignored when the active side is engine-controlled.');
		t.equal(snapshot.moveHistory.length, 0, 'No moves should be recorded when no human side is allowed to move.');
	});

	t.add('controller handleSquareClick performs kingside castling through the board flow', async function () {
		const controller = createController({
			startFEN: '4k2r/8/8/8/8/8/8/4K2R w Kk - 0 1',
		});

		await controller.handleSquareClick('e1');
		await controller.handleSquareClick('g1');

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.moveHistory.length, 1, 'Castling should commit one move through square clicks.');
		t.equal(snapshot.moveHistory[0].uci, 'e1g1', 'Castling should be recorded as e1g1.');
		t.equal(snapshot.currentBoardFEN, '4k2r/8/8/8/8/8/8/5RK1 b k - 1 1', 'Castling should move both king and rook and preserve remaining rights.');
	});

	t.add('controller handleSquareClick performs legal en passant captures', async function () {
		const controller = createController({
			startFEN: 'k7/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
		});

		await controller.handleSquareClick('e5');
		await controller.handleSquareClick('d6');

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.moveHistory.length, 1, 'En passant should commit one move through square clicks.');
		t.equal(snapshot.moveHistory[0].uci, 'e5d6', 'En passant should be recorded with the capture destination square.');
		t.equal(snapshot.currentBoardFEN, 'k7/8/3P4/8/8/8/8/4K3 b - - 0 1', 'En passant should remove the captured pawn and clear the target square.');
	});

	t.add('controller handleSquareClick respects promotion selection callbacks', async function () {
		const controller = createController({
			startFEN: '7k/P7/8/8/8/8/8/K7 w - - 0 1',
		});

		await controller.handleSquareClick('a7', {
			choosePromotion() {
				return Promise.resolve('N');
			},
		});
		await controller.handleSquareClick('a8', {
			choosePromotion() {
				return Promise.resolve('N');
			},
		});

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.moveHistory.length, 1, 'Promotion should commit one move through square clicks.');
		t.equal(snapshot.moveHistory[0].uci, 'a7a8n', 'Promotion should honor the selected underpromotion piece.');
		t.equal(snapshot.currentBoardFEN, 'N6k/8/8/8/8/8/8/K7 b - - 0 1', 'Promotion should replace the pawn with the selected piece.');
	});

	t.add('controller undoLastMove restores the pre-promotion position', function () {
		const controller = createController({
			startFEN: '7k/P7/8/8/8/8/8/K7 w - - 0 1',
		});
		controller.applyEngineMoveFromUCI('a7a8q');

		const snapshotBeforeUndo = controller.getSnapshot();
		t.equal(snapshotBeforeUndo.currentBoardFEN, 'Q6k/8/8/8/8/8/8/K7 b - - 0 1', 'Promotion setup should reach the promoted position before undo.');

		controller.undoLastMove();
		const snapshot = controller.getSnapshot();

		t.equal(snapshot.currentBoardFEN, '7k/P7/8/8/8/8/8/K7 w - - 0 1', 'Undo should restore the original pre-promotion FEN.');
		t.equal(snapshot.moveHistory.length, 0, 'Undo should remove the promotion move from history.');
	});

	t.add('controller navigateToMove leaves review mode with analysis stopped and engine info cleared', function () {
		const controller = createController();
		controller.applyEngineMoveFromUCI('e2e4');
		controller.applyEngineMoveFromUCI('e7e5');
		controller.setEngineInfo({ depth: 4, score: 18 });
		controller.startAnalysis();
		controller.navigateToMove(0);

		const snapshot = controller.getSnapshot();
		t.equal(snapshot.currentMoveIndex, 0, 'Review mode should land on the requested move index.');
		t.assert(!snapshot.analysis.running, 'Navigating in history should stop a running analysis session.');
		t.equal(snapshot.currentEngineInfo, null, 'Review mode should clear stale engine info.');
		t.assert(!snapshot.isLivePosition, 'Navigating away from the tip should mark the position as non-live.');
	});

	t.add('controller startNewGame resets board state and ends analysis sessions', function () {
		const controller = createController();
		controller.applyEngineMoveFromUCI('e2e4');
		controller.setEngineThinking(true);
		const started = controller.startAnalysis();

		t.assert(started.running, 'Analysis should be running before resetting the game.');
		controller.startNewGame();
		const snapshot = controller.getSnapshot();

		t.equal(snapshot.currentBoardFEN, START_FEN, 'New game should restore the start position.');
		t.equal(snapshot.moveHistory.length, 0, 'New game should clear the move history.');
		t.assert(!snapshot.engineThinking, 'New game should clear the engine-thinking flag.');
		t.assert(!snapshot.analysis.enabled && !snapshot.analysis.running, 'New game should stop any analysis session.');
		t.assert(snapshot.analysis.requestId >= 2, 'Stopping analysis during reset should advance the analysis request id.');
	});

	t.add('controller loadFEN can preserve history while replacing the live board state', function () {
		const controller = createController();
		controller.applyEngineMoveFromUCI('e2e4');
		controller.applyEngineMoveFromUCI('e7e5');

		const result = controller.loadFEN('8/8/8/8/8/8/8/K6k w - - 0 1', {
			preserveHistory: true,
			engineInfo: { depth: 1, score: 0 },
		});
		const snapshot = controller.getSnapshot();

		t.assert(result && result.ok, 'loadFEN should accept a valid replacement FEN.');
		t.equal(snapshot.currentBoardFEN, '8/8/8/8/8/8/8/K6k w - - 0 1', 'loadFEN should replace the current board state.');
		t.equal(snapshot.moveHistory.length, 2, 'Preserving history should keep existing move records intact.');
		t.equal(snapshot.currentEngineInfo.depth, 1, 'loadFEN should accept replacement engine info metadata.');
	});

	t.add('controller importUCILine rebuilds history and exports the same UCI sequence', function () {
		const controller = createController();
		const result = controller.importUCILine('1. e2e4 e7e5 2. g1f3 *');
		const snapshot = controller.getSnapshot();

		t.assert(result && result.ok, 'UCI import should succeed for a valid move line.');
		t.equal(snapshot.moveHistory.length, 3, 'UCI import should rebuild all plies into history.');
		t.equal(snapshot.uciLine, 'e2e4 e7e5 g1f3', 'Exported UCI should match the imported sequence.');
		t.equal(snapshot.currentMoveIndex, 2, 'Imported lines should leave the controller at the live tip.');
	});

	t.add('controller analysis state toggles through start and stop', function () {
		const controller = createController();
		const started = controller.startAnalysis();
		t.assert(started.enabled && started.running, 'Analysis should be enabled and running after startAnalysis.');

		const stopped = controller.stopAnalysis();
		t.assert(!stopped.enabled && !stopped.running, 'Analysis should be disabled and stopped after stopAnalysis.');
	});

	t.add('three-check increments the delivered check counter and ends on the third check', function () {
		const state = global.parseFEN('4k3/8/8/8/8/8/4Q3/4K3 w - - 0 1 [variant=three-check;checks=2,0]');
		const move = global.findLegalMoveByUCI(state, 'e2e7');

		t.assert(move, 'The controller helpers should resolve the checking move in the three-check position.');
		const nextState = global.applyMoveToState(state, move);
		t.equal(nextState.checks.white, 3, 'Applying the move should increment white to three delivered checks.');
		const status = global.getGameStatus(nextState);
		t.assert(status.isOver, 'The game should end immediately once the third check is delivered.');
		t.equal(status.result, 'white-wins', 'White should win on the third delivered check.');
	});

	t.add('crazyhouse captures add pieces to the reserve and drops consume them', async function () {
		const captureState = global.parseFEN('4k3/8/8/8/8/8/3q4/3QK3 w - - 0 1 [variant=crazyhouse;wp=-;bp=-;promo=-]');
		const captureMove = global.findLegalMoveByUCI(captureState, 'd1d2');
		t.assert(captureMove, 'The white queen should be able to capture the black queen.');
		const capturedState = global.applyMoveToState(captureState, captureMove);
		t.equal(capturedState.reserve.white.Q, 1, 'Capturing a queen in Crazyhouse should add a queen to white\'s reserve.');

		const controller = createController({
			startFEN: '4k3/8/8/8/8/8/8/4K3 w - - 0 1 [variant=crazyhouse;wp=Q;bp=-;promo=-]',
			humanColor: null,
			humanColors: ['white', 'black'],
		});
		controller.selectReservePiece('Q');
		await controller.handleSquareClick('d5');
		const snapshot = controller.getSnapshot();
		t.equal(snapshot.currentGameState.reserve.white.Q, 0, 'Dropping a reserve piece should consume it from the pocket.');
		t.equal(global.getPieceAt(snapshot.currentGameState, 'd5'), 'Q', 'The dropped queen should appear on the selected square.');
	});

	t.add('bughouse exposes the same local reserve-drop controller path', async function () {
		const controller = createController({
			startFEN: '4k3/8/8/8/8/8/8/4K3 w - - 0 1 [variant=bughouse;wp=N;bp=-;promo=-]',
			humanColor: null,
			humanColors: ['white', 'black'],
		});
		controller.selectReservePiece('N');
		await controller.handleSquareClick('f4');
		const snapshot = controller.getSnapshot();
		t.equal(global.getPieceAt(snapshot.currentGameState, 'f4'), 'N', 'Bughouse local reserve mode should allow legal knight drops.');
	});

	t.add('capablanca positions preserve 10x8 board geometry and extra-piece movement', function () {
		const state = global.parseFEN('5k4/10/10/10/4A5/10/10/5K4 w - - 0 1 [variant=capablanca;files=abcdefghij;ranks=87654321]');
		t.equal(state.files.length, 10, 'Capablanca positions should preserve ten files.');
		const moves = global.generateLegalMovesFrom(state, 'e4').map(move => global.moveToUCI(move));
		t.assert(moves.includes('e4f5'), 'The archbishop should retain bishop movement on a 10x8 board.');
		t.assert(moves.includes('e4g5'), 'The archbishop should also retain knight movement on a 10x8 board.');
	});

	t.add('diagnostic reference positions include Position 3 divide data', function () {
		const positions = global.getDiagnosticReferencePositions();
		const position = positions.find(function (entry) {
			return entry.fen === '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1';
		});

		t.assert(position, 'Position 3 reference entry should exist.');
		t.assert(Array.isArray(position.divideReferenceDepths) && position.divideReferenceDepths.includes(5), 'Position 3 should advertise a depth-5 divide reference.');
		t.equal(position.divideReference[5].g2g3, 14747, 'Position 3 divide reference should include the published g2g3 count.');
	});

	t.add('diagnostics preview builds a non-mutating post-move snapshot', function () {
		const preview = global.createDiagnosticsPreview(START_FEN, 'e2e4');

		t.assert(preview, 'Diagnostics preview should resolve a legal move from the source FEN.');
		t.equal(preview.sourceFen, START_FEN, 'Preview should preserve the original source FEN.');
		t.equal(preview.fen, 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', 'Preview should expose the post-move FEN.');
		t.equal(preview.moveUci, 'e2e4', 'Preview should retain the move UCI.');
	});
})(typeof self !== 'undefined' ? self : window);
