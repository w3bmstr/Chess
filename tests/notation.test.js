(function (global) {
	const t = global.Chess2TestHarness;

	function createNotationDeps() {
		return {
			moveToUCI: global.moveToUCI,
			getGameStatus: global.getGameStatus,
			generateLegalMovesFrom: global.generateLegalMovesFrom,
		};
	}

	function createRecordFromFen(fen, uciMove) {
		const stateBefore = global.parseFEN(fen);
		const move = global.generateAllLegalMoves(stateBefore).find(function (candidate) {
			return global.moveToUCI(candidate) === uciMove;
		});

		t.assert(move, 'Expected move ' + uciMove + ' to be legal in FEN: ' + fen);

		const stateAfter = global.applyMoveToState(stateBefore, move);
		return global.Chess2Notation.formatMoveRecord(move, stateBefore, stateAfter, createNotationDeps());
	}

	t.add('notation exports a UCI line from move history', function () {
		const line = global.Chess2Notation.exportUCILine([
			{ uci: 'e2e4' },
			{ uci: 'e7e5' },
			{ uci: 'g1f3' },
		]);

		t.equal(line, 'e2e4 e7e5 g1f3', 'UCI export should preserve move order.');
	});

	t.add('notation imports a UCI line through callbacks', function () {
		const applied = [];
		const result = global.Chess2Notation.importUCILine('1. e2e4 e7e5 *', {
			findMove(token) {
				return { uci: token };
			},
			applyMove(move) {
				applied.push(move.uci);
			},
		});

		t.assert(result && result.ok, 'UCI import should succeed for valid tokens.');
		t.equal(applied.join(' '), 'e2e4 e7e5', 'UCI import should apply non-result tokens in order.');
	});

	t.add('notation exports PGN headers and SAN tokens', function () {
		const pgn = global.Chess2Notation.exportPGN({
			startFEN: 'startpos',
			moveHistory: [
				{ san: 'e4', lan: 'e2-e4', uci: 'e2e4' },
				{ san: 'e5', lan: 'e7-e5', uci: 'e7e5' },
				{ san: 'Nf3', lan: 'Ng1-f3', uci: 'g1f3' },
			],
			headers: {
				White: 'Tester',
				Black: 'Engine',
				Result: '*',
			},
		});

		t.assert(pgn.includes('[White "Tester"]'), 'PGN export should include custom headers.');
		t.assert(pgn.includes('1. e4 e5 2. Nf3 *'), 'PGN export should include SAN move text.');
	});

	t.add('notation formats kingside castling in LAN and SAN', function () {
		const record = createRecordFromFen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1', 'e1g1');

		t.equal(record.uci, 'e1g1', 'Castling record should preserve the UCI move.');
		t.equal(record.lan, 'O-O', 'Kingside castling should use O-O in LAN.');
		t.equal(record.san, 'O-O', 'Kingside castling should use O-O in SAN.');
	});

	t.add('notation formats promotion with check suffix', function () {
		const record = createRecordFromFen('7k/P7/8/8/8/8/8/K7 w - - 0 1', 'a7a8q');

		t.equal(record.uci, 'a7a8q', 'Promotion record should preserve the promotion UCI.');
		t.equal(record.lan, 'a7-a8=Q', 'Promotion LAN should include the promotion piece.');
		t.equal(record.san, 'a8=Q+', 'Promotion SAN should include the promotion piece and check suffix.');
	});

	t.add('notation appends mate suffix for checkmating moves', function () {
		const record = createRecordFromFen('6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1', 'd1d8');

		t.equal(record.lan, 'Rd1-d8', 'Mating rook move should preserve rook LAN notation.');
		t.equal(record.san, 'Rd8#', 'Mating SAN should end with checkmate marker.');
	});

	t.add('notation disambiguates same-piece moves in SAN', function () {
		const record = createRecordFromFen('4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1', 'b1d2');

		t.equal(record.lan, 'Nb1-d2', 'Knight LAN should include the origin square.');
		t.equal(record.san, 'Nbd2', 'SAN should disambiguate between two knights that can reach the same square.');
	});

	t.add('notation formats en passant captures with SAN pawn capture notation', function () {
		const record = createRecordFromFen('k7/8/8/3pP3/8/8/8/4K3 w - d6 0 1', 'e5d6');

		t.equal(record.lan, 'e5xd6', 'En passant LAN should use the destination square like a normal capture.');
		t.equal(record.san, 'exd6', 'En passant SAN should keep pawn capture notation without extra markers.');
	});

	t.add('notation appends check suffix to castling SAN when applicable', function () {
		const record = createRecordFromFen('5k2/8/8/8/8/8/8/4K2R w K - 0 1', 'e1g1');

		t.equal(record.lan, 'O-O', 'Castling LAN should stay O-O even when it gives check.');
		t.equal(record.san, 'O-O+', 'Castling SAN should include the check suffix when the rook gives check after castling.');
	});

	t.add('notation uses full-square disambiguation when file and rank both collide', function () {
		const record = createRecordFromFen('4k3/3N4/8/8/8/3N1N2/8/4K3 w - - 0 1', 'd3e5');

		t.equal(record.lan, 'Nd3-e5', 'LAN should preserve the full origin square.');
		t.equal(record.san, 'Nd3e5', 'SAN should use the full origin square when both file and rank collide.');
	});
})(typeof self !== 'undefined' ? self : window);