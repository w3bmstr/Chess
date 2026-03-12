(function (global) {
	function create(options) {
		const boardApi = global.Chess2Board;
		const moveListApi = global.Chess2MoveList;
		const evalBarApi = global.Chess2EvalBar;
		let board = null;

		function ensureShell() {
			const root = document.getElementById('view-analysis');
			if (!root || root.dataset.ready === 'true') return root;

			root.dataset.ready = 'true';
			root.innerHTML = [
				'<div class="analysis-layout">',
				'<div class="analysis-main">',
				'<div class="analysis-toolbar">',
				'<button type="button" id="analysis-start" class="board-ctrl-btn">Start Analysis</button>',
				'<button type="button" id="analysis-stop" class="board-ctrl-btn">Stop Analysis</button>',
				'<button type="button" id="analysis-sync-current" class="board-ctrl-btn">Use Current Position</button>',
				'</div>',
				'<div id="analysis-session-status" class="analysis-session-status">Analysis idle.</div>',
				'<div id="analysis-section-tabs" class="analysis-section-tabs"></div>',
				'<div class="analysis-board-wrap">',
				'<div id="analysis-board" class="analysis-board"></div>',
				'</div>',
				'</div>',
				'<aside class="analysis-sidebar">',
				'<section class="play-panel">',
				'<h3 class="play-panel-title" id="analysis-detail-title">Analysis Board</h3>',
				'<div id="analysis-detail-panel" class="analysis-detail-panel"></div>',
				'</section>',
				'<section class="play-panel">',
				'<h3 class="play-panel-title">Moves</h3>',
				'<div id="analysis-move-list" class="move-list"></div>',
				'</section>',
				'</aside>',
				'</div>'
			].join('');

			const syncButton = document.getElementById('analysis-sync-current');
			const startButton = document.getElementById('analysis-start');
			const stopButton = document.getElementById('analysis-stop');
			const sectionTabs = document.getElementById('analysis-section-tabs');

			if (startButton && typeof options.onStartAnalysis === 'function') {
				startButton.addEventListener('click', () => options.onStartAnalysis());
			}
			if (stopButton && typeof options.onStopAnalysis === 'function') {
				stopButton.addEventListener('click', () => options.onStopAnalysis());
			}
			if (syncButton && typeof options.onSyncCurrent === 'function') {
				syncButton.addEventListener('click', () => options.onSyncCurrent());
			}
			if (sectionTabs && typeof options.onChangeSection === 'function') {
				sectionTabs.addEventListener('click', event => {
					const button = event.target.closest('[data-analysis-section]');
					if (!button) return;
					options.onChangeSection(button.getAttribute('data-analysis-section'));
				});
			}
			root.addEventListener('click', event => {
				const previewButton = event.target.closest('[data-analysis-preview-move]');
				const playButton = event.target.closest('[data-analysis-play-move]');
				const clearButton = event.target.closest('[data-analysis-clear-preview]');
				if (previewButton && typeof options.onPreviewMove === 'function') {
					options.onPreviewMove(
						previewButton.getAttribute('data-analysis-preview-fen'),
						previewButton.getAttribute('data-analysis-preview-move')
					);
					return;
				}
				if (playButton && typeof options.onPlayMove === 'function') {
					options.onPlayMove(
						playButton.getAttribute('data-analysis-play-fen'),
						playButton.getAttribute('data-analysis-play-move')
					);
					return;
				}
				if (clearButton && typeof options.onClearPreview === 'function') {
					options.onClearPreview();
				}
			});

			return root;
		}

		function init() {
			ensureShell();
			const boardEl = document.getElementById('analysis-board');
			if (boardApi && boardEl && !board) {
				board = boardApi.create({
					boardEl,
					files: options.files,
					ranks: options.ranks,
					createPiece: options.createPiece,
					onSquareClick: options.onSquareClick,
				});
			}

			if (board) {
				board.init();
			}
		}

		function render(snapshot) {
			init();
			if (!snapshot) return;

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

			renderTabs(snapshot.analysisSection || 'board');
			renderDetailPanel(snapshot, evalBarApi);

			if (moveListApi) {
				moveListApi.render(document.getElementById('analysis-move-list'), snapshot.moveHistory, snapshot.activeMoveIndex, options.onSelectMove);
			}

			const startButton = document.getElementById('analysis-start');
			const stopButton = document.getElementById('analysis-stop');
			const sessionStatus = document.getElementById('analysis-session-status');
			if (startButton) startButton.disabled = Boolean(snapshot.analysis && snapshot.analysis.running);
			if (stopButton) stopButton.disabled = !Boolean(snapshot.analysis && snapshot.analysis.enabled);
			if (sessionStatus) {
				sessionStatus.textContent = getSessionStatus(snapshot);
			}
		}

		return {
			init,
			render,
		};
	}

	function renderTabs(activeSection) {
		const container = document.getElementById('analysis-section-tabs');
		if (!container) return;

		const sections = [
			{ id: 'board', label: 'Board' },
			{ id: 'eval', label: 'Eval' },
			{ id: 'pv', label: 'PV' },
			{ id: 'stats', label: 'Stats' },
			{ id: 'threat', label: 'Threat' },
			{ id: 'hint', label: 'Hint' },
			{ id: 'logs', label: 'Logs' },
		];

		container.innerHTML = sections.map(section => (
			'<button type="button" class="analysis-section-tab' + (section.id === activeSection ? ' active' : '') + '" data-analysis-section="' + section.id + '">' + escapeHtml(section.label) + '</button>'
		)).join('');
	}

	function renderDetailPanel(snapshot, evalBarApi) {
		const titleEl = document.getElementById('analysis-detail-title');
		const container = document.getElementById('analysis-detail-panel');
		if (!container) return;

		if (titleEl) {
			titleEl.textContent = snapshot.analysisSectionLabel || 'Analysis Board';
		}

		const section = snapshot.analysisSection || 'board';
		const info = snapshot.engineInfo || {};
		const insights = snapshot.analysisInsights || {};
		const preview = snapshot.analysisPreview || null;
		const feedback = snapshot.analysisActionFeedback || null;

		switch (section) {
			case 'eval':
				renderEvaluationPanel(container, info, insights, evalBarApi, feedback);
				return;
			case 'pv':
				renderPVPanel(container, info, insights, feedback);
				return;
			case 'stats':
				renderStatsPanel(container, info, insights, feedback);
				return;
			case 'threat':
				renderThreatPanel(container, insights.threat, insights.error, preview, feedback);
				return;
			case 'hint':
				renderHintPanel(container, insights.hint, insights.rootMoves, insights.error, preview, feedback);
				return;
			case 'logs':
				renderLogsPanel(container, insights.logLines, insights.error, insights.sourceMode, feedback);
				return;
			case 'board':
			default:
				renderBoardPanel(container, info, insights, preview, feedback);
		}
	}

	function renderBoardPanel(container, info, insights, preview, feedback) {
		const score = info && info.score != null ? formatScore(info.score) : 'Start analysis to populate the evaluation, PV, and stats panels.';
		const updated = insights && insights.lastUpdatedAt ? new Date(insights.lastUpdatedAt).toLocaleTimeString() : 'not yet';
		container.innerHTML = [
			'<div class="analysis-section-copy">Interactive board analysis with live engine feedback and section-specific side panels.</div>',
			renderActionFeedback(feedback),
			'<div class="analysis-overview-grid">',
				statCard('Score', score),
				statCard('Best Move', info && info.bestMove ? info.bestMove : '-'),
				statCard('Depth', info && info.depth != null ? info.depth : '-'),
				statCard('Updated', updated),
			'</div>',
			'<div class="engine-pv"><strong>PV:</strong> ' + escapeHtml(formatPV(info && info.pv)) + '</div>',
			preview ? '<div class="analysis-preview-banner"><strong>Preview:</strong> ' + escapeHtml(preview.moveSAN || preview.moveUci || '-') + ' <button type="button" class="analysis-inline-action" data-analysis-clear-preview="true">Clear Preview</button></div>' : ''
		].join('');
	}

	function renderEvaluationPanel(container, info, insights, evalBarApi, feedback) {
		const score = info && info.score != null ? info.score : null;
		const trend = Array.isArray(insights && insights.history) ? insights.history.slice(-6).reverse() : [];
		container.innerHTML = [
			'<div id="analysis-eval-bar" class="analysis-eval-bar analysis-eval-bar-large"></div>',
			renderActionFeedback(feedback),
			'<div class="analysis-section-copy">' + escapeHtml(describeEval(score)) + '</div>',
			trend.length
				? '<div class="analysis-list">' + trend.map(entry => '<div class="analysis-list-row"><span>d' + escapeHtml(entry.depth == null ? '-' : entry.depth) + '</span><strong>' + escapeHtml(formatScore(entry.score)) + '</strong></div>').join('') + '</div>'
				: '<div class="engine-summary-empty">No evaluation trend yet. Start analysis to populate this view.</div>'
		].join('');

		if (evalBarApi) {
			evalBarApi.render(document.getElementById('analysis-eval-bar'), score);
		}
	}

	function renderPVPanel(container, info, insights, feedback) {
		const rootMoves = Array.isArray(insights && insights.rootMoves) ? insights.rootMoves : [];
		container.innerHTML = [
			'<div class="analysis-section-copy">The principal variation shows the engine\'s preferred continuation from the current position.</div>',
			renderActionFeedback(feedback),
			'<div class="analysis-pv-block"><strong>Best Move:</strong> ' + escapeHtml(info && info.bestMove ? info.bestMove : '-') + '</div>',
			'<div class="analysis-pv-block"><strong>Line:</strong> ' + escapeHtml(formatPV(info && info.pv)) + '</div>',
			rootMoves.length
				? '<div class="analysis-subtitle">Top Root Moves</div><div class="analysis-list">' + rootMoves.map((entry, index) => '<div class="analysis-list-row"><span>#' + escapeHtml(index + 1) + ' ' + escapeHtml(entry.move) + '</span><strong>' + escapeHtml(formatScore(entry.score)) + '</strong></div>').join('') + '</div>'
				: '<div class="engine-summary-empty">Root move ordering will appear after a completed search.</div>'
		].join('');
	}

	function renderStatsPanel(container, info, insights, feedback) {
		const safeInfo = info || {};
		container.innerHTML = [
			renderActionFeedback(feedback),
			'<div class="analysis-overview-grid">',
				statCard('Depth', safeInfo.depth != null ? safeInfo.depth : '-'),
				statCard('SelDepth', safeInfo.seldepth != null ? safeInfo.seldepth : '-'),
				statCard('Nodes', safeInfo.nodes != null ? formatInteger(safeInfo.nodes) : '-'),
				statCard('Time', safeInfo.time != null ? safeInfo.time + ' ms' : '-'),
				statCard('NPS', safeInfo.nps != null ? formatInteger(safeInfo.nps) : '-'),
				statCard('Hashfull', safeInfo.hashfull != null ? safeInfo.hashfull + ' / 1000' : '-'),
			'</div>',
			'<div class="analysis-section-copy">Source: ' + escapeHtml(insights && insights.sourceMode ? insights.sourceMode : 'unknown') + '</div>'
		].join('');
	}

	function renderThreatPanel(container, threat, error, preview, feedback) {
		if (!threat) {
			container.innerHTML = renderActionFeedback(feedback) + '<div class="engine-summary-empty">Threat analysis appears after a completed search. It estimates the opponent\'s best move if they were to play immediately.</div>' + renderOptionalError(error);
			return;
		}
		container.innerHTML = [
			'<div class="analysis-section-copy">If you effectively passed the move, this is the engine\'s best immediate threat for the opponent.</div>',
			renderActionFeedback(feedback),
			'<div class="analysis-overview-grid">',
				statCard('Threat Move', threat.san || threat.uci || '-'),
				statCard('UCI', threat.uci || '-'),
				statCard('Score', formatScore(threat.score)),
				statCard('Depth', threat.depth != null ? threat.depth : '-'),
			'</div>',
			'<div class="analysis-pv-block"><strong>Threat PV:</strong> ' + escapeHtml(formatPV(threat.pv)) + '</div>',
			renderPreviewActions(threat, preview),
			renderOptionalError(error),
		].join('');
	}

	function renderHintPanel(container, hint, rootMoves, error, preview, feedback) {
		if (!hint) {
			container.innerHTML = renderActionFeedback(feedback) + '<div class="engine-summary-empty">Hint mode uses the current analysis result to recommend a move.</div>' + renderOptionalError(error);
			return;
		}
		container.innerHTML = [
			'<div class="analysis-section-copy">Suggested move for the side to move based on the latest completed analysis.</div>',
			renderActionFeedback(feedback),
			'<div class="analysis-overview-grid">',
				statCard('Hint', hint.san || hint.uci || '-'),
				statCard('UCI', hint.uci || '-'),
				statCard('Score', formatScore(hint.score)),
				statCard('Depth', hint.depth != null ? hint.depth : '-'),
			'</div>',
			'<div class="analysis-pv-block"><strong>Suggested Line:</strong> ' + escapeHtml(formatPV(hint.pv)) + '</div>',
			renderPreviewActions(hint, preview),
			Array.isArray(rootMoves) && rootMoves.length
				? '<div class="analysis-subtitle">Candidate Moves</div><div class="analysis-list">' + rootMoves.map(entry => '<div class="analysis-list-row"><span>' + escapeHtml(entry.move) + '</span><strong>' + escapeHtml(formatScore(entry.score)) + '</strong></div>').join('') + '</div>'
				: '',
			renderOptionalError(error),
		].join('');
	}

	function renderLogsPanel(container, logLines, error, sourceMode, feedback) {
		const lines = Array.isArray(logLines) ? logLines : [];
		container.innerHTML = [
			'<div class="analysis-section-copy">Search info callbacks captured during the latest analysis run. Source: ' + escapeHtml(sourceMode || 'unknown') + '.</div>',
			renderActionFeedback(feedback),
			lines.length
				? '<pre class="analysis-log-console">' + escapeHtml(lines.join('\n')) + '</pre>'
				: '<div class="engine-summary-empty">No logs captured yet. Start analysis to populate this console.</div>',
			renderOptionalError(error),
		].join('');
	}

	function getSessionStatus(snapshot) {
		const label = snapshot.analysisSectionLabel || 'Analysis';
		const insights = snapshot.analysisInsights || {};
		if (snapshot.analysis && snapshot.analysis.running) {
			return label + ' running...';
		}
		if (snapshot.analysis && snapshot.analysis.enabled) {
			const updated = insights.lastUpdatedAt ? new Date(insights.lastUpdatedAt).toLocaleTimeString() : 'no result yet';
			return label + ' ready. Last result shown from ' + updated + '.';
		}
		return label + ' idle.';
	}

	function describeEval(score) {
		if (score == null) return 'No score available yet.';
		if (score >= 300) return 'Winning advantage for White.';
		if (score >= 75) return 'White is clearly better.';
		if (score > 20) return 'White holds a small edge.';
		if (score <= -300) return 'Winning advantage for Black.';
		if (score <= -75) return 'Black is clearly better.';
		if (score < -20) return 'Black holds a small edge.';
		return 'The position is close to balanced.';
	}

	function formatScore(score) {
		if (score == null || score === '') return '-';
		const numeric = Number(score);
		if (!Number.isFinite(numeric)) return String(score);
		if (Math.abs(numeric) >= 10000) return String(numeric);
		return (numeric > 0 ? '+' : '') + (numeric / 100).toFixed(2);
	}

	function formatPV(pv) {
		if (Array.isArray(pv) && pv.length) return pv.join(' ');
		if (pv) return String(pv);
		return '-';
	}

	function formatInteger(value) {
		const numeric = Number(value);
		return Number.isFinite(numeric) ? numeric.toLocaleString() : String(value);
	}

	function statCard(label, value) {
		return '<div class="analysis-stat-card"><span class="analysis-stat-label">' + escapeHtml(label) + '</span><strong class="analysis-stat-value">' + escapeHtml(value == null ? '-' : value) + '</strong></div>';
	}

	function renderOptionalError(error) {
		if (!error) return '';
		return '<div class="analysis-error-note">' + escapeHtml(error) + '</div>';
	}

	function renderPreviewActions(moveInsight, preview) {
		if (!moveInsight || !moveInsight.uci || !moveInsight.sourceFen) return '';
		const previewActive = preview && preview.moveUci === moveInsight.uci && preview.sourceFen === moveInsight.sourceFen;
		return [
			'<div class="analysis-action-row">',
			'<button type="button" class="analysis-inline-action" data-analysis-preview-move="' + escapeHtml(moveInsight.uci) + '" data-analysis-preview-fen="' + escapeHtml(moveInsight.sourceFen) + '">' + (previewActive ? 'Refresh Preview' : 'Preview On Board') + '</button>',
			'<button type="button" class="analysis-inline-action" data-analysis-play-move="' + escapeHtml(moveInsight.uci) + '" data-analysis-play-fen="' + escapeHtml(moveInsight.sourceFen) + '">Play This Move</button>',
			preview ? '<button type="button" class="analysis-inline-action" data-analysis-clear-preview="true">Clear Preview</button>' : '',
			'</div>'
		].join('');
	}

	function renderActionFeedback(feedback) {
		if (!feedback || !feedback.message) return '';
		const toneClass = feedback.tone ? ' analysis-feedback-' + escapeHtml(feedback.tone) : '';
		return '<div class="analysis-action-feedback' + toneClass + '">' + escapeHtml(feedback.message) + '</div>';
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	global.Chess2AnalysisView = { create };
})(window);