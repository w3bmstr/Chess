(function (global) {
	function create(options) {
		const boardApi = global.Chess2Board;
		const moveListApi = global.Chess2MoveList;
		const controlsApi = global.Chess2Controls;
		const modalApi = global.Chess2Modal;
		let board = null;

		function getBoardElement() {
			return document.getElementById('chessboard');
		}

		function getMoveListElement() {
			return document.getElementById('move-list');
		}

		function getOpeningElement() {
			return document.getElementById('play-opening');
		}

		function getControlsElement() {
			return document.getElementById('play-controls');
		}

		function getStatusElement() {
			return document.getElementById('play-status');
		}

		function getEngineSummaryElement() {
			return document.getElementById('engine-summary');
		}

		function getClockElement() {
			return document.getElementById('play-clock');
		}

		function getOnlineElement() {
			return document.getElementById('play-online');
		}

		function getThinkingElement() {
			return document.getElementById('play-thinking');
		}

		function getMetaElement() {
			return document.getElementById('play-meta');
		}

		function init() {
			const boardEl = getBoardElement();
			if (boardApi && boardEl && !board) {
				board = boardApi.create({
					boardEl,
					files: options.files,
					ranks: options.ranks,
					createPiece: options.createPiece,
					onSquareClick: squareName => {
						if (typeof options.onSquareClick === 'function') {
							options.onSquareClick(squareName);
						}
					},
				});
			}

			if (board) {
				board.init();
			}

			if (controlsApi) {
				controlsApi.init(getControlsElement(), {
					goStart: options.onGoStart,
					goPrevious: options.onGoPrevious,
					goNext: options.onGoNext,
					goEnd: options.onGoEnd,
					newGame: options.onNewGame,
					undoMove: options.onUndoMove,
					canNewGame: options.canNewGame === undefined ? true : Boolean(options.canNewGame()),
					canUndo: Boolean(options.canUndo && options.canUndo()),
					canGoPrevious: Boolean(options.canGoPrevious && options.canGoPrevious()),
					canGoNext: Boolean(options.canGoNext && options.canGoNext()),
				});
			}

			const openingEl = getOpeningElement();
			if (openingEl && !openingEl.dataset.bound) {
				openingEl.dataset.bound = 'true';
				openingEl.addEventListener('click', event => {
					const moveButton = event.target.closest('[data-opening-move]');
					if (moveButton && typeof options.onPlayOpeningMove === 'function') {
						options.onPlayOpeningMove(moveButton.getAttribute('data-opening-move'));
						return;
					}

					const explorerButton = event.target.closest('[data-openings-view]');
					if (explorerButton && typeof options.onOpeningsView === 'function') {
						options.onOpeningsView();
					}
				});
			}

			const onlineEl = getOnlineElement();
			if (onlineEl && !onlineEl.dataset.bound) {
				onlineEl.dataset.bound = 'true';
				onlineEl.addEventListener('click', event => {
					const actionButton = event.target.closest('[data-online-action]');
					if (!actionButton) return;

					const action = actionButton.getAttribute('data-online-action');
					const joinInput = onlineEl.querySelector('[data-online-join-input]');
					const joinValue = joinInput ? joinInput.value : '';

					if (action === 'find-match' && typeof options.onPlayOnline === 'function') {
						options.onPlayOnline();
						return;
					}
					if (action === 'cancel-match' && typeof options.onCancelOnline === 'function') {
						options.onCancelOnline();
						return;
					}
					if (action === 'create-private' && typeof options.onCreatePrivateGame === 'function') {
						options.onCreatePrivateGame();
						return;
					}
					if (action === 'join-private' && typeof options.onJoinPrivateGame === 'function') {
						options.onJoinPrivateGame(joinValue);
						return;
					}
					if (action === 'copy-private-link' && typeof options.onCopyPrivateLink === 'function') {
						options.onCopyPrivateLink();
						return;
					}
					if (action === 'leave-game' && typeof options.onLeaveOnlineGame === 'function') {
						options.onLeaveOnlineGame();
						return;
					}
					if (action === 'resign-game' && typeof options.onResignOnlineGame === 'function') {
						options.onResignOnlineGame();
						return;
					}
					if (action === 'offer-draw' && typeof options.onOfferDraw === 'function') {
						options.onOfferDraw();
						return;
					}
					if (action === 'accept-draw' && typeof options.onAcceptDraw === 'function') {
						options.onAcceptDraw();
						return;
					}
					if (action === 'decline-draw' && typeof options.onDeclineDraw === 'function') {
						options.onDeclineDraw();
						return;
					}
					if (action === 'cancel-draw' && typeof options.onCancelDraw === 'function') {
						options.onCancelDraw();
					}
				});
			}

			const clockEl = getClockElement();
			if (clockEl && !clockEl.dataset.bound) {
				clockEl.dataset.bound = 'true';
				clockEl.addEventListener('click', event => {
					const actionButton = event.target.closest('[data-play-action]');
					if (!actionButton) return;
					if (actionButton.getAttribute('data-play-action') === 'open-game-options' && typeof options.onOpenGameOptions === 'function') {
						options.onOpenGameOptions();
					}
				});
			}

			const metaEl = getMetaElement();
			if (metaEl && !metaEl.dataset.bound) {
				metaEl.dataset.bound = 'true';
				metaEl.addEventListener('click', event => {
					const puzzleButton = event.target.closest('[data-puzzle-action]');
					if (puzzleButton) {
						const action = puzzleButton.getAttribute('data-puzzle-action');
						if (action === 'hint' && typeof options.onPuzzleHint === 'function') {
							options.onPuzzleHint();
							return;
						}
						if (action === 'reveal' && typeof options.onPuzzleReveal === 'function') {
							options.onPuzzleReveal();
							return;
						}
						if (action === 'next' && typeof options.onPuzzleNext === 'function') {
							options.onPuzzleNext();
							return;
						}
						if (action === 'restart' && typeof options.onPuzzleRestart === 'function') {
							options.onPuzzleRestart();
							return;
						}
					}

					const reserveButton = event.target.closest('[data-reserve-piece]');
					if (!reserveButton || typeof options.onSelectReservePiece !== 'function') return;
					options.onSelectReservePiece(reserveButton.getAttribute('data-reserve-piece') || '');
				});
			}
		}

		function render(snapshot) {
			if (!snapshot) return;
			const boardEl = getBoardElement();

			if (board) {
				board.render({
					fen: snapshot.fen,
					files: snapshot.files,
					ranks: snapshot.ranks,
					selectedSquare: snapshot.selectedSquare,
					legalTargets: snapshot.legalTargets,
					lastMoveSquares: snapshot.lastMoveSquares,
					checkSquare: snapshot.checkSquare,
					arrows: snapshot.arrows,
				});
			}

			renderStatus(snapshot.statusMessage, snapshot.statusTone);
			renderOpeningInfo(snapshot.openingInfo);
			renderEngineInfo(snapshot.engineInfo);
			renderClockInfo(snapshot.clockInfo);
			renderOnlineInfo(snapshot.onlineInfo);
			renderThinkingInfo(snapshot.thinkingInfo);
			renderPositionMeta(snapshot.positionMeta);

			if (moveListApi) {
				moveListApi.render(getMoveListElement(), snapshot.moveHistory, snapshot.activeMoveIndex, options.onSelectMove);
			}

			if (controlsApi) {
				controlsApi.updateState(getControlsElement(), {
					canNewGame: options.canNewGame === undefined ? true : Boolean(options.canNewGame()),
					canUndo: Boolean(options.canUndo && options.canUndo()),
					canGoPrevious: Boolean(options.canGoPrevious && options.canGoPrevious()),
					canGoNext: Boolean(options.canGoNext && options.canGoNext()),
				});
			}
		}

		function choosePromotion(color) {
			if (!modalApi || typeof modalApi.choose !== 'function') {
				return Promise.resolve(color === 'white' ? 'Q' : 'q');
			}

			const isWhite = color === 'white';
			return modalApi.choose({
				title: 'Choose promotion',
				description: 'Select the piece for pawn promotion.',
				choices: [
					{ label: 'Queen', value: isWhite ? 'Q' : 'q' },
					{ label: 'Rook', value: isWhite ? 'R' : 'r' },
					{ label: 'Bishop', value: isWhite ? 'B' : 'b' },
					{ label: 'Knight', value: isWhite ? 'N' : 'n' },
				],
			});
		}

		function setBoardFlipped(flipped) {
			if (board && typeof board.setFlipped === 'function') {
				board.setFlipped(flipped);
			}
		}

		function renderStatus(message, tone) {
			const statusEl = getStatusElement();
			if (!statusEl) return;
			statusEl.textContent = message || '';
			statusEl.className = 'play-status' + (tone ? ' ' + tone : '');
		}

		function renderEngineInfo(info) {
			const container = getEngineSummaryElement();
			if (!container) return;

			const safeInfo = info || {};
			if (!Object.keys(safeInfo).length) {
				container.innerHTML = '<div class="engine-summary-empty">Engine data will appear here during search.</div>';
				return;
			}

			const score = safeInfo.score != null ? String(safeInfo.score) : '-';
			const depth = safeInfo.depth != null ? String(safeInfo.depth) : '-';
			const nodes = safeInfo.nodes != null ? String(safeInfo.nodes) : '-';
			const bestMove = safeInfo.bestMove || '-';
			const pv = Array.isArray(safeInfo.pv) ? safeInfo.pv.join(' ') : (safeInfo.pv || '');

			container.innerHTML = [
				'<div class="engine-summary-grid">',
				renderStat('Score', score),
				renderStat('Depth', depth),
				renderStat('Nodes', nodes),
				renderStat('Best', bestMove),
				'</div>',
				'<div class="engine-pv"><strong>PV:</strong> ' + escapeHtml(pv || '-') + '</div>'
			].join('');
		}

		function renderOnlineInfo(info) {
			const container = getOnlineElement();
			if (!container) return;

			const safeInfo = info || {};
			const drawOffer = safeInfo.drawOffer || null;
			const localColor = String(safeInfo.localColor || '').toLowerCase();
			const drawDetail = drawOffer
				? (drawOffer.from === localColor
					? 'Your draw offer is pending.'
					: 'Opponent offered a draw.')
				: 'No draw offer is pending.';
			const statusDetail = safeInfo.reconnecting
				? 'Reconnecting to the server and attempting to restore your online session.'
				: (safeInfo.opponentDisconnected
					? 'Your opponent is offline. Their seat is reserved briefly so they can resume the game.'
					: (safeInfo.message || 'Online play is idle.'));
			const eventDetail = safeInfo.matchContext
				? ((safeInfo.matchContext.tournamentName || 'Tournament') + (safeInfo.matchContext.roundNumber ? (' • Round ' + safeInfo.matchContext.roundNumber) : '') + (safeInfo.matchContext.clubName ? (' • ' + safeInfo.matchContext.clubName) : ''))
				: '';
			container.innerHTML = [
				'<div class="engine-summary-grid">',
				renderStat('State', safeInfo.modeLabel || 'Offline'),
				renderStat('Server', safeInfo.connected ? 'connected' : (safeInfo.connecting ? 'connecting' : 'offline')),
				renderStat('Game', safeInfo.gameId || '-'),
				renderStat('Color', safeInfo.localColor || '-'),
				renderStat('White', safeInfo.whiteStatus || '-'),
				renderStat('Black', safeInfo.blackStatus || '-'),
				'</div>',
				'<div class="engine-pv online-status-detail"><strong>Status:</strong> ' + escapeHtml(statusDetail) + '</div>',
				eventDetail ? '<div class="engine-pv online-status-detail"><strong>Event:</strong> ' + escapeHtml(eventDetail) + '</div>' : '',
				'<div class="engine-pv online-status-detail"><strong>Draw:</strong> ' + escapeHtml(drawDetail) + '</div>',
				safeInfo.joinUrl ? '<div class="engine-pv"><strong>Private Link:</strong> <span class="online-link">' + escapeHtml(safeInfo.joinUrl) + '</span></div>' : '',
				'<div class="engine-pv"><strong>Server URL:</strong> ' + escapeHtml(safeInfo.serverUrl || '-') + '</div>',
				'<div class="online-actions">',
				'<button type="button" class="play-action-btn" data-online-action="find-match">Play Online</button>',
				'<button type="button" class="play-action-btn" data-online-action="create-private">Create Private Game</button>',
				safeInfo.canCancel ? '<button type="button" class="play-action-btn" data-online-action="cancel-match">Cancel</button>' : '',
				safeInfo.canLeave ? '<button type="button" class="play-action-btn" data-online-action="leave-game">Leave Game</button>' : '',
				safeInfo.canResign ? '<button type="button" class="play-action-btn" data-online-action="resign-game">Resign</button>' : '',
				safeInfo.canOfferDraw ? '<button type="button" class="play-action-btn" data-online-action="offer-draw">Offer Draw</button>' : '',
				safeInfo.canAcceptDraw ? '<button type="button" class="play-action-btn" data-online-action="accept-draw">Accept Draw</button>' : '',
				safeInfo.canDeclineDraw ? '<button type="button" class="play-action-btn" data-online-action="decline-draw">Decline Draw</button>' : '',
				safeInfo.canCancelDraw ? '<button type="button" class="play-action-btn" data-online-action="cancel-draw">Cancel Offer</button>' : '',
				safeInfo.joinUrl ? '<button type="button" class="play-action-btn" data-online-action="copy-private-link">Copy Link</button>' : '',
				'</div>',
				'<div class="online-join-row">',
				'<input type="text" class="online-join-input" data-online-join-input="true" value="' + escapeHtml(safeInfo.joinInputValue || '') + '" placeholder="Enter private game code or /game/... link">',
				'<button type="button" class="play-action-btn" data-online-action="join-private">Join</button>',
				'</div>'
			].join('');
		}

		function renderClockInfo(info) {
			const container = getClockElement();
			if (!container) return;

			const safeInfo = info || {};
			const whiteClass = safeInfo.activeColor === 'white' && !safeInfo.flaggedColor ? ' engine-stat-value-active' : '';
			const blackClass = safeInfo.activeColor === 'black' && !safeInfo.flaggedColor ? ' engine-stat-value-active' : '';
			const whiteValueClass = safeInfo.flaggedColor === 'white' ? ' engine-stat-value-flagged' : whiteClass;
			const blackValueClass = safeInfo.flaggedColor === 'black' ? ' engine-stat-value-flagged' : blackClass;

			container.innerHTML = [
				'<div class="engine-summary-grid">',
				renderStat('White', safeInfo.whiteClock || 'Untimed', whiteValueClass),
				renderStat('Black', safeInfo.blackClock || 'Untimed', blackValueClass),
				renderStat('Base', safeInfo.timeControlLabel || 'Unlimited'),
				renderStat('Bonus', safeInfo.bonusLabel || 'None'),
				renderStat('Handicap', safeInfo.handicapLabel || 'No handicap'),
				renderStat('Status', safeInfo.flaggedColor ? 'Flagged' : (safeInfo.running ? 'Running' : 'Ready')),
				'</div>',
				'<div class="engine-pv"><strong>Details:</strong> ' + escapeHtml(safeInfo.detail || 'No local game options configured yet.') + '</div>',
				safeInfo.pendingChanges ? '<div class="engine-pv clock-pending-note"><strong>Pending:</strong> Saved options differ from the current game and will apply on the next new game.</div>' : '',
				'<div class="play-action-bar"><button type="button" class="play-action-btn" data-play-action="open-game-options">Game Options</button></div>'
			].join('');
		}

		function renderOpeningInfo(info) {
			const container = getOpeningElement();
			if (!container) return;

			const safeInfo = info || {};
			const recognized = safeInfo.recognized || null;
			const lineText = Array.isArray(safeInfo.sanLine) && safeInfo.sanLine.length
				? safeInfo.sanLine.join(' ')
				: 'No opening moves played yet.';
			const nextMoves = copyArraySafe(safeInfo.nextMoves, 4);

			container.innerHTML = [
				recognized
					? '<div class="opening-badge"><span class="opening-eco">' + escapeHtml(recognized.eco || '-') + '</span><span class="opening-name">' + escapeHtml(recognized.label || recognized.name || 'Recognized line') + '</span><span class="opening-weight">' + escapeHtml(recognized.popularity || '') + '</span></div>'
					: '<div class="engine-summary-empty">No ECO line recognized yet.</div>',
				recognized
					? '<div class="opening-subtitle"><strong>Family:</strong> ' + escapeHtml(recognized.familyLabel || recognized.family || '-') + '</div>'
					: '',
				renderAliasMeta(recognized && recognized.aliases),
				'<div class="engine-pv"><strong>Line:</strong> ' + escapeHtml(lineText) + '</div>',
				nextMoves.length
					? '<div class="opening-next-list">' + nextMoves.map(renderOpeningMoveButton).join('') + '</div>'
					: '<div class="engine-pv"><strong>Explorer:</strong> No catalog continuation available from this position.</div>',
				recognized && Array.isArray(recognized.transpositions) && recognized.transpositions.length
					? '<div class="opening-transposition-list compact">' + recognized.transpositions.slice(0, 2).map(renderTranspositionChip).join('') + '</div>'
					: '',
				'<div class="opening-actions"><button type="button" class="play-action-btn" data-openings-view="true">Open Explorer</button></div>'
			].join('');
		}

		function renderThinkingInfo(info) {
			const container = getThinkingElement();
			if (!container) return;

			const safeInfo = info || {};
			container.innerHTML = [
				'<div class="engine-summary-grid">',
				renderStat('Mode', safeInfo.mode || '-'),
				renderStat('Turn', safeInfo.sideToMove || '-'),
				renderStat('Control', safeInfo.turnControl || '-'),
				renderStat('State', safeInfo.thinkingState || '-'),
				renderStat('View', safeInfo.liveState || '-'),
				renderStat('Input', safeInfo.inputMode || '-'),
				'</div>',
				'<div class="engine-pv"><strong>Move Recognition:</strong> ' + escapeHtml(safeInfo.note || 'Click a source and destination square, or drag from source to destination.') + '</div>'
			].join('');
		}

		function renderPositionMeta(info) {
			const container = getMetaElement();
			if (!container) return;

			const safeInfo = info || {};
			const reserveMarkup = renderReservePanel(safeInfo);
			const puzzleMarkup = renderPuzzlePanel(safeInfo.puzzle);
			container.innerHTML = [
				'<div class="engine-summary-grid">',
				renderStat('Halfmove', safeInfo.halfmoveClock != null ? String(safeInfo.halfmoveClock) : '-'),
				renderStat('Fullmove', safeInfo.fullmoveNumber != null ? String(safeInfo.fullmoveNumber) : '-'),
				renderStat('Selection', safeInfo.selectionState || '-'),
				renderStat('Targets', safeInfo.legalTargetCount != null ? String(safeInfo.legalTargetCount) : '0'),
				renderStat('Variant', safeInfo.variantLabel || 'Standard'),
				renderStat('Board', safeInfo.boardLabel || '8x8'),
				'</div>',
				reserveMarkup,
				puzzleMarkup,
				'<div class="engine-pv"><strong>FEN:</strong> ' + escapeHtml(safeInfo.fen || '-') + '</div>'
			].join('');
		}

		function renderPuzzlePanel(info) {
			if (!info) return '';
			const actionButtons = [
				'<button type="button" class="play-action-btn" data-puzzle-action="hint">' + escapeHtml(info.hint ? 'Hide Hint' : 'Hint') + '</button>',
				'<button type="button" class="play-action-btn secondary" data-puzzle-action="reveal">Reveal</button>',
				'<button type="button" class="play-action-btn secondary" data-puzzle-action="restart">Restart</button>',
				(info.completed ? '<button type="button" class="play-action-btn" data-puzzle-action="next">Next</button>' : '')
			].join('');
			return [
				'<div class="reserve-panel-wrap puzzle-panel-wrap">',
				'<div class="reserve-panel active">',
				'<div class="reserve-panel-title">' + escapeHtml(info.modeLabel || 'Puzzle') + ': ' + escapeHtml(info.title || '') + '</div>',
				'<div class="engine-pv"><strong>Prompt:</strong> ' + escapeHtml(info.prompt || 'Find the best move.') + '</div>',
				'<div class="engine-summary-grid">',
				renderStat('Theme', info.theme || '-'),
				renderStat('Difficulty', info.difficulty || '-'),
				renderStat('Queue', info.queueLabel || '-'),
				renderStat('Score', info.score != null ? String(info.score) : '0'),
				renderStat('Misses', info.misses != null ? String(info.misses) : '0'),
				renderStat(info.bestTitle || 'Best', info.bestLabel || '0'),
				(info.timerLabel ? renderStat('Timer', info.timerLabel) : ''),
				(info.ghostScore != null ? renderStat('Ghost', String(info.ghostScore)) : ''),
				'</div>',
				(info.feedback ? '<div class="engine-pv"><strong>Status:</strong> ' + escapeHtml(info.feedback) + '</div>' : ''),
				(info.hint ? '<div class="engine-pv"><strong>Hint:</strong> ' + escapeHtml(info.hint) + '</div>' : ''),
				'<div class="play-action-bar">' + actionButtons + '</div>',
				'</div>',
				'</div>'
			].join('');
		}

		function renderReservePanel(info) {
			const reserve = info && info.reserve ? info.reserve : null;
			if (!reserve) return '';
			const white = renderReserveSide('White Pocket', reserve.white, info.selectedReservePiece, info.activeColor === 'white');
			const black = renderReserveSide('Black Pocket', reserve.black, info.selectedReservePiece, info.activeColor === 'black');
			return '<div class="reserve-panel-wrap">' + white + black + '</div>';
		}

		function renderReserveSide(label, pieces, selectedPiece, isActive) {
			const entries = Array.isArray(pieces) ? pieces : [];
			return [
				'<div class="reserve-panel' + (isActive ? ' active' : '') + '">',
				'<div class="reserve-panel-title">' + escapeHtml(label) + '</div>',
				entries.length
					? '<div class="reserve-piece-list">' + entries.map(entry => renderReservePieceButton(entry, selectedPiece)).join('') + '</div>'
					: '<div class="engine-summary-empty">No pieces in pocket.</div>',
				'</div>'
			].join('');
		}

		function renderReservePieceButton(entry, selectedPiece) {
			const piece = entry && entry.piece ? entry.piece : '';
			const count = entry && entry.count != null ? String(entry.count) : '0';
			const selected = selectedPiece === piece;
			return '<button type="button" class="play-action-btn reserve-piece-btn' + (selected ? ' active' : '') + '" data-reserve-piece="' + escapeHtml(piece) + '">' + escapeHtml(piece) + ' × ' + escapeHtml(count) + '</button>';
		}

		function renderOpeningMoveButton(move) {
			const label = move && move.display ? move.display : (move && move.uci ? move.uci : '-');
			const title = move && move.primary ? move.primary.label : 'Opening explorer move';
			const meta = [];
			if (move && move.popularity) meta.push(move.popularity);
			if (move && move.primary && move.primary.eco) meta.push(move.primary.eco);
			if (move && move.transpositionCount) meta.push(String(move.transpositionCount + 1) + ' families');
			return '<button type="button" class="opening-move-btn" data-opening-move="' + escapeHtml(move && move.uci ? move.uci : '') + '" title="' + escapeHtml(title || '') + '"><span class="opening-move-main"><span class="opening-move-label">' + escapeHtml(label) + '</span><span class="opening-move-meta">' + escapeHtml(meta.join(' • ')) + '</span></span>' + renderBookBar(move) + '</button>';
		}

		function renderTranspositionChip(item) {
			return '<div class="opening-transposition-item"><span class="opening-eco">' + escapeHtml(item.eco || '-') + '</span><span class="opening-transposition-copy">' + escapeHtml(item.label || '-') + ' • ' + escapeHtml(item.popularity || '') + '</span></div>';
		}

		function renderAliasMeta(aliases) {
			const text = copyArraySafe(aliases).filter(Boolean).join(' • ');
			if (!text) return '';
			return '<div class="engine-pv"><strong>Aliases:</strong> ' + escapeHtml(text) + '</div>';
		}

		function renderBookBar(move) {
			const percent = Math.max(0, Math.min(100, Number(move && move.barPercent) || 0));
			return '<span class="opening-book-bar-wrap"><span class="opening-book-bar"><span class="opening-book-bar-fill" style="width:' + String(percent) + '%"></span></span><span class="opening-book-bar-value">' + escapeHtml(move && move.popularity ? move.popularity : '0%') + '</span></span>';
		}

		function copyArraySafe(value, limit) {
			if (!Array.isArray(value)) return [];
			if (typeof limit === 'number') return value.slice(0, limit);
			return value.slice();
		}

		return {
			init,
			render,
			setBoardFlipped,
			choosePromotion,
			renderStatus,
			renderEngineInfo,
			renderOnlineInfo,
		};
	}

	function renderStat(label, value, valueClassName) {
		const extraClass = valueClassName ? String(valueClassName) : '';
		return '<div class="engine-stat"><span class="engine-stat-label">' + escapeHtml(label) + '</span><span class="engine-stat-value' + escapeHtml(extraClass) + '">' + escapeHtml(value) + '</span></div>';
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	global.Chess2PlayView = { create };
})(window);
