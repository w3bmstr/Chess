(function (global) {
	function formatMoveRecord(move, stateBefore, stateAfter, deps) {
		const uci = deps.moveToUCI(move);
		const lan = toLAN(move);
		const san = toSAN(move, stateBefore, stateAfter, deps);
		return { uci, lan, san };
	}

	function exportPGN(options) {
		const settings = options || {};
		const headers = Object.assign({
			Event: 'Chess2 Casual Game',
			Site: 'Local',
			Date: formatDate(new Date()),
			Round: '-',
			White: 'White',
			Black: 'Black',
			Result: '*',
			FEN: settings.startFEN || undefined,
		}, settings.headers || {});

		const headerLines = Object.keys(headers)
			.filter(key => headers[key] !== undefined && headers[key] !== null && headers[key] !== '')
			.map(key => '[' + key + ' "' + escapeHeader(headers[key]) + '"]');

		const history = Array.isArray(settings.moveHistory) ? settings.moveHistory : [];
		const tokens = [];
		for (let index = 0; index < history.length; index += 2) {
			tokens.push(String(Math.floor(index / 2) + 1) + '.');
			tokens.push(history[index].san || history[index].lan || history[index].uci || '');
			if (history[index + 1]) {
				tokens.push(history[index + 1].san || history[index + 1].lan || history[index + 1].uci || '');
			}
		}

		tokens.push(headers.Result || '*');
		return headerLines.join('\n') + '\n\n' + tokens.filter(Boolean).join(' ').trim();
	}

	function exportUCILine(moveHistory) {
		const history = Array.isArray(moveHistory) ? moveHistory : [];
		return history.map(entry => entry.uci).filter(Boolean).join(' ');
	}

	function importPGN(text, options) {
		const settings = options || {};
		const parseFEN = settings.parseFEN;
		const applyMoveToState = settings.applyMoveToState;
		const generateAllLegalMoves = settings.generateAllLegalMoves;
		const moveToUCI = settings.moveToUCI;
		const getGameStatus = settings.getGameStatus;
		const generateLegalMovesFrom = settings.generateLegalMovesFrom;
		const formatMoveRecord = settings.formatMoveRecord;
		const findMoveByUCI = settings.findMoveByUCI;
		const applyMove = settings.applyMove;
		const loadStartPosition = settings.loadStartPosition;
		const defaultStartFEN = settings.startFEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

		if (typeof parseFEN !== 'function' || typeof applyMoveToState !== 'function' || typeof generateAllLegalMoves !== 'function' || typeof moveToUCI !== 'function' || typeof getGameStatus !== 'function' || typeof generateLegalMovesFrom !== 'function' || typeof formatMoveRecord !== 'function' || typeof findMoveByUCI !== 'function' || typeof applyMove !== 'function' || typeof loadStartPosition !== 'function') {
			return { ok: false, error: 'PGN import callbacks missing.' };
		}

		const sourceText = String(text || '').trim();
		if (!sourceText) {
			return { ok: false, error: 'Paste a PGN game first.' };
		}

		const headers = parsePgnHeaders(sourceText);
		const startFEN = headers.FEN || defaultStartFEN;
		const loadResult = loadStartPosition(startFEN);
		if (!loadResult || loadResult.ok === false) {
			return loadResult || { ok: false, error: 'Could not load the PGN start position.' };
		}

		let transientState = parseFEN(startFEN);
		const tokens = tokenizePgn(sourceText);
		let importedMoves = 0;

		for (const token of tokens) {
			const move = resolveMoveBySAN(transientState, token, {
				generateAllLegalMoves,
				applyMoveToState,
				getGameStatus,
				generateLegalMovesFrom,
				moveToUCI,
				formatMoveRecord,
			});
			if (!move) {
				return { ok: false, error: 'Could not parse PGN move: ' + token };
			}

			const uci = moveToUCI(move);
			const liveMove = findMoveByUCI(uci);
			if (!liveMove) {
				return { ok: false, error: 'PGN move is not legal in the current position: ' + token };
			}

			applyMove(liveMove);
			transientState = applyMoveToState(transientState, move);
			importedMoves += 1;
		}

		return { ok: true, importedMoves, startFEN };
	}

	function importUCILine(text, options) {
		const settings = options || {};
		const applyMove = settings.applyMove;
		const findMove = settings.findMove;
		if (typeof applyMove !== 'function' || typeof findMove !== 'function') {
			return { ok: false, error: 'Notation import callbacks missing.' };
		}

		const tokens = String(text || '').trim().split(/\s+/).filter(Boolean);
		for (const token of tokens) {
			if (/^\d+\.$/.test(token) || token === '*' || token === '1-0' || token === '0-1' || token === '1/2-1/2') {
				continue;
			}
			const move = findMove(token);
			if (!move) {
				return { ok: false, error: 'Could not parse move: ' + token };
			}
			applyMove(move);
		}

		return { ok: true };
	}

	function toLAN(move) {
		if (!move) return '';
		if (move.isDrop) {
			return String((move.dropPiece || move.piece || '')).toUpperCase() + '@' + move.to;
		}
		const piece = (move.piece || '').toUpperCase();
		if (move.isCastle) {
			return move.to && move.from && move.to[0] > move.from[0] ? 'O-O' : 'O-O-O';
		}
		const separator = move.captured ? 'x' : '-';
		const prefix = piece === 'P' ? '' : piece;
		const suffix = move.promotion ? '=' + String(move.promotion).toUpperCase() : '';
		return prefix + move.from + separator + move.to + suffix;
	}

	function toSAN(move, stateBefore, stateAfter, deps) {
		if (!move) return '';
		if (move.isDrop) {
			return withSuffix(String((move.dropPiece || move.piece || '')).toUpperCase() + '@' + move.to, stateAfter, deps);
		}
		if (move.isCastle) {
			return withSuffix(isKingsideCastle(move, stateBefore) ? 'O-O' : 'O-O-O', stateAfter, deps);
		}

		const piece = (move.piece || '').toUpperCase();
		const piecePrefix = piece === 'P' ? '' : piece;
		const captureMarker = move.captured ? 'x' : '';
		const pawnCapturePrefix = piece === 'P' && move.captured ? move.from[0] : '';
		const disambiguation = piece === 'P' ? '' : getDisambiguation(move, stateBefore, deps);
		const promotionSuffix = move.promotion ? '=' + String(move.promotion).toUpperCase() : '';
		const base = piece === 'P'
			? pawnCapturePrefix + captureMarker + move.to + promotionSuffix
			: piecePrefix + disambiguation + captureMarker + move.to + promotionSuffix;
		return withSuffix(base, stateAfter, deps);
	}

	function getDisambiguation(move, stateBefore, deps) {
		if (!stateBefore || !deps || typeof deps.generateLegalMovesFrom !== 'function') return '';
		const piece = move.piece;
		const candidates = [];

		for (let index = 0; index < stateBefore.board.length; index++) {
			const occupant = stateBefore.board[index];
			if (!occupant || occupant !== piece) continue;
			const fromSquare = coordsFromIndex(index, stateBefore);
			if (!fromSquare || fromSquare === move.from) continue;
			const moves = deps.generateLegalMovesFrom(stateBefore, fromSquare);
			if (moves.some(candidate => candidate.to === move.to && String(candidate.promotion || '') === String(move.promotion || ''))) {
				candidates.push(fromSquare);
			}
		}

		if (!candidates.length) return '';
		const sameFile = candidates.some(square => square[0] === move.from[0]);
		const sameRank = candidates.some(square => square[1] === move.from[1]);
		if (!sameFile) return move.from[0];
		if (!sameRank) return move.from[1];
		return move.from;
	}

	function coordsFromIndex(index, state) {
		const files = state && state.files ? state.files : 'abcdefgh';
		const ranks = state && state.ranks ? state.ranks : '87654321';
		if (index < 0 || index >= files.length * ranks.length) return null;
		return files[index % files.length] + ranks[Math.floor(index / files.length)];
	}

	function isKingsideCastle(move, stateBefore) {
		if (!move || !move.isCastle || !stateBefore) return false;
		const files = stateBefore.files || 'abcdefgh';
		return files.indexOf(move.to[0]) > files.indexOf(move.from[0]);
	}

	function withSuffix(base, stateAfter, deps) {
		if (!stateAfter || !deps || typeof deps.getGameStatus !== 'function') return base;
		const status = deps.getGameStatus(stateAfter);
		if (!status.inCheck) return base;
		return base + (status.isOver ? '#' : '+');
	}

	function parsePgnHeaders(text) {
		const headers = {};
		String(text || '').replace(/^\s*\[([^\s]+)\s+"([^"]*)"\]\s*$/gm, function (_, key, value) {
			headers[key] = value;
			return _;
		});
		return headers;
	}

	function tokenizePgn(text) {
		const collapsed = stripParentheticalText(
			String(text || '')
				.replace(/^\s*\[[^\]]*\]\s*$/gm, ' ')
				.replace(/\{[^}]*\}/g, ' ')
				.replace(/;[^\n\r]*/g, ' ')
				.replace(/\$\d+/g, ' ')
				.replace(/\d+\.(?:\.\.)?/g, ' ')
		);

		return collapsed
			.split(/\s+/)
			.map(normalizeSanToken)
			.filter(Boolean)
			.filter(token => token !== '*' && token !== '1-0' && token !== '0-1' && token !== '1/2-1/2');
	}

	function stripParentheticalText(text) {
		let depth = 0;
		let result = '';
		for (const char of String(text || '')) {
			if (char === '(') {
				depth += 1;
				continue;
			}
			if (char === ')') {
				depth = Math.max(0, depth - 1);
				continue;
			}
			if (!depth) result += char;
		}
		return result;
	}

	function normalizeSanToken(token) {
		return String(token || '')
			.replace(/0-0-0/g, 'O-O-O')
			.replace(/0-0/g, 'O-O')
			.replace(/[!?]+$/g, '')
			.trim();
	}

	function stripSanSuffix(token) {
		return normalizeSanToken(token).replace(/[+#]+$/g, '');
	}

	function resolveMoveBySAN(state, sanToken, deps) {
		const legalMoves = deps.generateAllLegalMoves(state);
		const target = stripSanSuffix(sanToken);
		for (const move of legalMoves) {
			const nextState = deps.applyMoveToState(state, move);
			const record = deps.formatMoveRecord(move, state, nextState, {
				getGameStatus: deps.getGameStatus,
				moveToUCI: deps.moveToUCI,
				generateLegalMovesFrom: deps.generateLegalMovesFrom,
			});
			if (stripSanSuffix(record && record.san) === target) {
				return move;
			}
		}
		return null;
	}

	function escapeHeader(value) {
		return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	}

	function formatDate(date) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return year + '.' + month + '.' + day;
	}

	global.Chess2Notation = {
		formatMoveRecord,
		exportPGN,
		exportUCILine,
		importPGN,
		importUCILine,
	};
})(window);
