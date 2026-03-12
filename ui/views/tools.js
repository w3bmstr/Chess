(function (global) {
    function create(options) {
        let activePanel = 'perft';
        const outputByPanel = {
            perft: '',
            moves: null,
            tt: '',
            zobrist: '',
            'search-tree': '',
            logging: '',
            benchmark: '',
            stress: '',
        };
        const moveInspectorState = {
            message: 'Run Move Inspector to populate the legal move table.',
            actionStatus: '',
            summary: null,
            topScores: [],
            rows: [],
            sortKey: 'index',
            sortDir: 'asc',
        };
        let activePreview = null;

        function ensureShell() {
            const root = document.getElementById('view-tools');
            if (!root || root.dataset.ready === 'true') return root;

            root.dataset.ready = 'true';
            root.innerHTML = [
                '<div class="tools-layout">',
                '<div class="tools-main">',
                '<section class="play-panel">',
                '<h2 class="play-panel-title">Engine Tools</h2>',
                '<div class="tools-form-grid">',
                '<div class="tools-field">',
                '<label for="tools-fen-input">FEN</label>',
                '<textarea id="tools-fen-input" class="tools-textarea" rows="4" spellcheck="false"></textarea>',
                '</div>',
                '<div class="tools-field">',
                '<label for="tools-depth-input">Depth</label>',
                '<input id="tools-depth-input" class="tools-input" type="number" min="1" max="6" value="3">',
                '</div>',
                '<div class="tools-field">',
                '<label for="tools-iterations-input">Iterations</label>',
                '<input id="tools-iterations-input" class="tools-input" type="number" min="1" max="100" value="5">',
                '</div>',
                '</div>',
                '<div class="tools-actions">',
                '<button type="button" id="tools-use-current" class="board-ctrl-btn">Use Current Position</button>',
                '<select id="tools-preset-select" class="tools-input"></select>',
                '<button type="button" id="tools-load-preset" class="board-ctrl-btn">Load Preset</button>',
                '</div>',
                '<div id="tools-preset-meta" class="tools-note"></div>',
                '</section>',
                '<section class="play-panel">',
                '<div class="tools-panel-tabs">',
                '<button type="button" class="board-ctrl-btn tools-tab active" data-tools-panel="perft">Perft Runner</button>',
                '<button type="button" class="board-ctrl-btn tools-tab" data-tools-panel="moves">Move Inspector</button>',
                '<button type="button" class="board-ctrl-btn tools-tab" data-tools-panel="tt">TT Inspector</button>',
                '<button type="button" class="board-ctrl-btn tools-tab" data-tools-panel="zobrist">Zobrist Viewer</button>',
                '<button type="button" class="board-ctrl-btn tools-tab" data-tools-panel="search-tree">Search Tree</button>',
                '<button type="button" class="board-ctrl-btn tools-tab" data-tools-panel="logging">Logging Console</button>',
                '<button type="button" class="board-ctrl-btn tools-tab" data-tools-panel="benchmark">Benchmark</button>',
                '<button type="button" class="board-ctrl-btn tools-tab" data-tools-panel="stress">Stress Test</button>',
                '<button type="button" class="board-ctrl-btn tools-tab" data-tools-panel="tests">Tests</button>',
                '</div>',
                '<section id="tools-panel-perft" class="tools-subpanel active">',
                '<div class="tools-actions">',
                '<button type="button" id="tools-run-smoke" class="board-ctrl-btn">Run Smoke</button>',
                '<button type="button" id="tools-run-quick" class="board-ctrl-btn">Quick Check</button>',
                '<button type="button" id="tools-run-perft" class="board-ctrl-btn">Run Perft</button>',
                '<button type="button" id="tools-run-divide" class="board-ctrl-btn">Run Divide</button>',
                '<button type="button" id="tools-run-divide-diff" class="board-ctrl-btn">Run Divide Diff</button>',
                '</div>',
                '<div class="tools-status-label">Perft Output</div>',
                '<textarea id="tools-output-perft" class="tools-output" rows="16" readonly></textarea>',
                '</section>',
                '<section id="tools-panel-moves" class="tools-subpanel">',
                '<div class="tools-actions">',
                '<button type="button" id="tools-inspect-moves" class="board-ctrl-btn">Inspect Legal Moves</button>',
                '<button type="button" id="tools-clear-preview" class="board-ctrl-btn" disabled>Clear Preview</button>',
                '</div>',
                '<div class="tools-status-label">Move Inspector Output</div>',
                '<div id="tools-moves-summary" class="tools-move-summary tools-note">Run Move Inspector to populate the legal move table.</div>',
                '<div id="tools-moves-preview" class="tools-note"></div>',
                '<div id="tools-moves-action-status" class="tools-note"></div>',
                '<div id="tools-moves-top" class="tools-move-top"></div>',
                '<div class="tools-move-table-wrap">',
                '<table class="tools-move-table">',
                '<thead>',
                '<tr>',
                '<th><button type="button" class="tools-sort-btn active" data-tools-sort="index">#</button></th>',
                '<th><button type="button" class="tools-sort-btn" data-tools-sort="uci">UCI</button></th>',
                '<th><button type="button" class="tools-sort-btn" data-tools-sort="lan">LAN</button></th>',
                '<th><button type="button" class="tools-sort-btn" data-tools-sort="san">SAN</button></th>',
                '<th><button type="button" class="tools-sort-btn" data-tools-sort="score">Score</button></th>',
                '<th><button type="button" class="tools-sort-btn" data-tools-sort="pinned">Pin</button></th>',
                '<th><button type="button" class="tools-sort-btn" data-tools-sort="check">Check</button></th>',
                '<th><button type="button" class="tools-sort-btn" data-tools-sort="flags">Flags</button></th>',
                '<th>Actions</th>',
                '</tr>',
                '</thead>',
                '<tbody id="tools-move-table-body"></tbody>',
                '</table>',
                '</div>',
                '</section>',
                '<section id="tools-panel-tt" class="tools-subpanel">',
                '<div class="tools-actions">',
                '<button type="button" id="tools-tt-inspect" class="board-ctrl-btn">Inspect Current Hash</button>',
                '<button type="button" id="tools-tt-warm" class="board-ctrl-btn">Warm TT With Search</button>',
                '<button type="button" id="tools-tt-clear" class="board-ctrl-btn">Clear TT</button>',
                '</div>',
                '<div id="tools-tt-summary" class="tools-stat-grid"></div>',
                '<div class="tools-status-label">TT Inspector Output</div>',
                '<textarea id="tools-output-tt" class="tools-output" rows="14" readonly></textarea>',
                '</section>',
                '<section id="tools-panel-zobrist" class="tools-subpanel">',
                '<div class="tools-actions">',
                '<button type="button" id="tools-zobrist-inspect" class="board-ctrl-btn">Inspect Current Hash</button>',
                '</div>',
                '<div class="tools-status-label">Zobrist Output</div>',
                '<textarea id="tools-output-zobrist" class="tools-output" rows="16" readonly></textarea>',
                '</section>',
                '<section id="tools-panel-search-tree" class="tools-subpanel">',
                '<div class="tools-actions">',
                '<button type="button" id="tools-run-search-tree" class="board-ctrl-btn">Trace Search Tree</button>',
                '</div>',
                '<div class="tools-status-label">Search Tree Output</div>',
                '<textarea id="tools-output-search-tree" class="tools-output" rows="16" readonly></textarea>',
                '</section>',
                '<section id="tools-panel-logging" class="tools-subpanel">',
                '<div class="tools-actions">',
                '<button type="button" id="tools-run-logging" class="board-ctrl-btn">Run Logging Probe</button>',
                '<button type="button" id="tools-run-search" class="board-ctrl-btn">Run Search Snapshot</button>',
                '</div>',
                '<div class="tools-status-label">Logging Output</div>',
                '<textarea id="tools-output-logging" class="tools-output" rows="16" readonly></textarea>',
                '</section>',
                '<section id="tools-panel-benchmark" class="tools-subpanel">',
                '<div class="tools-actions">',
                '<button type="button" id="tools-run-benchmark" class="board-ctrl-btn">Run Benchmark</button>',
                '</div>',
                '<div class="tools-status-label">Benchmark Output</div>',
                '<textarea id="tools-output-benchmark" class="tools-output" rows="16" readonly></textarea>',
                '</section>',
                '<section id="tools-panel-stress" class="tools-subpanel">',
                '<div class="tools-actions">',
                '<button type="button" id="tools-run-stress" class="board-ctrl-btn">Run Stress Test</button>',
                '</div>',
                '<div class="tools-status-label">Stress Output</div>',
                '<textarea id="tools-output-stress" class="tools-output" rows="16" readonly></textarea>',
                '</section>',
                '<section id="tools-panel-tests" class="tools-subpanel">',
                '<div id="tools-test-grid" class="tools-test-grid"></div>',
                '<div class="tools-note">Use these links to open the standalone browser harnesses and regression suites in a new tab.</div>',
                '</section>',
                '</section>',
                '</div>',
                '<aside class="tools-sidebar">',
                '<section class="play-panel">',
                '<h3 class="play-panel-title">Module Status</h3>',
                '<div id="tools-module-list" class="tools-module-list"></div>',
                '</section>',
                '<section class="play-panel">',
                '<h3 class="play-panel-title">Notes</h3>',
                '<div class="tools-note">Perft and divide run inside the browser engine path. Search tree and logging use SEARCH debug hooks when available. The test launcher opens the standalone browser suites directly.</div>',
                '</section>',
                '</aside>',
                '</div>'
            ].join('');

            bindEvents(root);
            return root;
        }

        function bindEvents(root) {
            root.querySelector('#tools-use-current').addEventListener('click', () => {
                const fenInput = root.querySelector('#tools-fen-input');
                fenInput.value = typeof options.useCurrentPosition === 'function' ? options.useCurrentPosition() : '';
                writeOutput(activePanel, 'Loaded current position into diagnostics input.');
            });

            root.querySelector('#tools-load-preset').addEventListener('click', () => {
                loadSelectedPreset(root);
            });

            root.querySelector('#tools-preset-select').addEventListener('change', () => {
                const select = root.querySelector('#tools-preset-select');
                const positions = typeof options.getReferencePositions === 'function' ? options.getReferencePositions() : [];
                renderPresetMeta(positions.find(entry => entry.id === select.value) || null);
            });

            root.querySelectorAll('[data-tools-panel]').forEach(button => {
                button.addEventListener('click', () => {
                    activePanel = normalizePanelId(button.dataset.toolsPanel);
                    syncActivePanel(root);
                });
            });

            root.querySelectorAll('[data-tools-sort]').forEach(button => {
                button.addEventListener('click', () => {
                    const key = button.dataset.toolsSort;
                    if (!key) return;
                    if (moveInspectorState.sortKey === key) {
                        moveInspectorState.sortDir = moveInspectorState.sortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        moveInspectorState.sortKey = key;
                        moveInspectorState.sortDir = key === 'score' ? 'desc' : 'asc';
                    }
                    renderMoveInspector(root);
                });
            });

            root.querySelector('#tools-run-smoke').addEventListener('click', () => {
                runAction('perft', () => options.runSmoke(readFen(root)));
            });

            root.querySelector('#tools-run-quick').addEventListener('click', () => {
                runAction('perft', () => options.runQuickCheck());
            });

            root.querySelector('#tools-run-perft').addEventListener('click', () => {
                runAction('perft', () => options.runPerft(readFen(root), readDepth(root)));
            });

            root.querySelector('#tools-run-divide').addEventListener('click', () => {
                runAction('perft', () => options.runDivide(readFen(root), readDepth(root)));
            });

            root.querySelector('#tools-run-divide-diff').addEventListener('click', () => {
                runAction('perft', () => options.runDivideDiff(readFen(root), readDepth(root)));
            });

            root.querySelector('#tools-inspect-moves').addEventListener('click', () => {
                runAction('moves', () => options.inspectMoves(readFen(root), readDepth(root)));
            });

            root.querySelector('#tools-clear-preview').addEventListener('click', () => {
                Promise.resolve(typeof options.clearInspectedPreview === 'function' ? options.clearInspectedPreview() : null)
                    .then(result => {
                        moveInspectorState.actionStatus = result && result.message ? result.message : 'Preview cleared.';
                        renderMoveInspector(root);
                    })
                    .catch(error => {
                        moveInspectorState.actionStatus = error && error.message ? error.message : String(error);
                        renderMoveInspector(root);
                    });
            });

            root.querySelector('#tools-move-table-body').addEventListener('click', event => {
                const previewButton = event.target.closest('[data-tools-preview-move]');
                const playButton = event.target.closest('[data-tools-play-move]');
                if (!previewButton && !playButton) return;

                const uciMove = (previewButton || playButton).dataset.toolsMoveUci;
                const sourceFen = moveInspectorState.summary && moveInspectorState.summary.fen;
                if (!uciMove || !sourceFen) {
                    moveInspectorState.actionStatus = 'Run Move Inspector before using row actions.';
                    renderMoveInspector(root);
                    return;
                }

                const action = previewButton ? options.previewInspectedMove : options.playInspectedMove;
                Promise.resolve(typeof action === 'function' ? action(sourceFen, uciMove) : null)
                    .then(result => {
                        moveInspectorState.actionStatus = result && result.message
                            ? result.message
                            : (previewButton ? 'Preview updated.' : 'Move played.');
                        renderMoveInspector(root);
                    })
                    .catch(error => {
                        moveInspectorState.actionStatus = error && error.message ? error.message : String(error);
                        renderMoveInspector(root);
                    });
            });

            root.querySelector('#tools-tt-inspect').addEventListener('click', () => {
                runAction('tt', () => options.inspectTT(readFen(root)));
            });

            root.querySelector('#tools-tt-warm').addEventListener('click', () => {
                runAction('tt', () => options.warmTT(readFen(root), readDepth(root)));
            });

            root.querySelector('#tools-tt-clear').addEventListener('click', () => {
                runAction('tt', () => options.clearTT());
            });

            root.querySelector('#tools-zobrist-inspect').addEventListener('click', () => {
                runAction('zobrist', () => options.inspectZobrist(readFen(root)));
            });

            root.querySelector('#tools-run-search-tree').addEventListener('click', () => {
                runAction('search-tree', () => options.runSearchTree(readFen(root), readDepth(root)));
            });

            root.querySelector('#tools-run-logging').addEventListener('click', () => {
                runAction('logging', () => options.runLoggingConsole(readFen(root), readDepth(root)));
            });

            root.querySelector('#tools-run-search').addEventListener('click', () => {
                runAction('logging', () => options.runSearch(readFen(root), readDepth(root)));
            });

            root.querySelector('#tools-run-benchmark').addEventListener('click', () => {
                runAction('benchmark', () => options.runBenchmark(readFen(root), readDepth(root), readIterations(root)));
            });

            root.querySelector('#tools-run-stress').addEventListener('click', () => {
                runAction('stress', () => options.runStressTest(readFen(root), readDepth(root), readIterations(root)));
            });

            syncActivePanel(root);
        }

        function readFen(root) {
            const fen = (root.querySelector('#tools-fen-input').value || '').trim();
            if (!fen) {
                throw new Error('Enter a FEN before running diagnostics.');
            }
            const validation = typeof options.validateFEN === 'function'
                ? options.validateFEN(fen)
                : { valid: true };
            if (!validation.valid) {
                throw new Error(validation.error || 'Invalid FEN.');
            }
            return fen;
        }

        function readDepth(root) {
            const value = parseInt(root.querySelector('#tools-depth-input').value || '3', 10);
            return Math.max(1, Math.min(6, Number.isFinite(value) ? value : 3));
        }

        function readIterations(root) {
            const value = parseInt(root.querySelector('#tools-iterations-input').value || '5', 10);
            return Math.max(1, Math.min(100, Number.isFinite(value) ? value : 5));
        }

        async function runAction(panel, action) {
            if (panel !== 'moves' && panel !== 'tests') {
                writeOutput(panel, 'Running...');
            }
            try {
                const result = await Promise.resolve(action());
                writeOutput(panel, panel === 'moves' ? result : formatResult(result));
            } catch (error) {
                writeOutput(panel, 'ERROR\n' + (error && error.message ? error.message : String(error)));
            }
        }

        function formatResult(result) {
            if (!result) return 'No result.';
            if (Array.isArray(result.lines)) return result.lines.join('\n');
            if (typeof result === 'string') return result;
            return JSON.stringify(result, null, 2);
        }

        function writeOutput(panel, text) {
            if (panel === 'moves') {
                outputByPanel.moves = text;
                if (text && text.kind === 'move-inspector') {
                    moveInspectorState.message = '';
                    moveInspectorState.actionStatus = '';
                    moveInspectorState.summary = text.summary || null;
                    moveInspectorState.topScores = Array.isArray(text.topScores) ? text.topScores.slice() : [];
                    moveInspectorState.rows = Array.isArray(text.rows) ? text.rows.slice() : [];
                } else {
                    moveInspectorState.message = typeof text === 'string' ? text : formatResult(text);
                    moveInspectorState.actionStatus = '';
                    moveInspectorState.summary = null;
                    moveInspectorState.topScores = [];
                    moveInspectorState.rows = [];
                }
                renderMoveInspector(document.getElementById('view-tools'));
                return;
            }

            if (!Object.prototype.hasOwnProperty.call(outputByPanel, panel)) {
                return;
            }
            outputByPanel[panel] = text;
            const output = document.getElementById('tools-output-' + panel);
            if (output) output.value = text;
        }

        function syncActivePanel(root) {
            root.querySelectorAll('[data-tools-panel]').forEach(button => {
                button.classList.toggle('active', button.dataset.toolsPanel === activePanel);
            });

            root.querySelectorAll('.tools-subpanel').forEach(panel => {
                panel.classList.toggle('active', panel.id === 'tools-panel-' + activePanel);
            });
        }

        function populatePresets(root) {
            const select = root.querySelector('#tools-preset-select');
            if (!select) return;
            const positions = typeof options.getReferencePositions === 'function' ? options.getReferencePositions() : [];
            select.innerHTML = ['<option value="">Select reference position...</option>']
                .concat(positions.map(position => '<option value="' + escapeHtml(position.id) + '">' + escapeHtml(position.category + ' — ' + position.name) + '</option>'))
                .join('');
        }

        function loadSelectedPreset(root) {
            const select = root.querySelector('#tools-preset-select');
            const positions = typeof options.getReferencePositions === 'function' ? options.getReferencePositions() : [];
            const preset = positions.find(entry => entry.id === select.value);
            if (!preset) {
                writeOutput(activePanel, 'Select a reference position first.');
                return;
            }

            root.querySelector('#tools-fen-input').value = preset.fen;
            root.querySelector('#tools-depth-input').value = String(preset.defaultDepth || 3);
            renderPresetMeta(preset);
            writeOutput(activePanel, 'Loaded preset: ' + preset.name);
        }

        function renderPresetMeta(preset) {
            const meta = document.getElementById('tools-preset-meta');
            if (!meta) return;
            if (!preset) {
                meta.textContent = 'Choose a reference position to load a known FEN and suggested depth.';
                return;
            }

            const expected = preset.expected
                ? Object.keys(preset.expected).map(depth => 'd' + depth + '=' + preset.expected[depth]).join('  ')
                : '';
            const divide = Array.isArray(preset.divideReferenceDepths) && preset.divideReferenceDepths.length
                ? 'divide ref: ' + preset.divideReferenceDepths.map(depth => 'd' + depth).join(', ')
                : '';
            meta.textContent = [preset.category, preset.note || '', expected, divide, preset.referenceSource || ''].filter(Boolean).join(' | ');
        }

        function renderMoveInspector(root) {
            if (!root) return;

            const summary = root.querySelector('#tools-moves-summary');
            const previewNote = root.querySelector('#tools-moves-preview');
            const actionStatus = root.querySelector('#tools-moves-action-status');
            const top = root.querySelector('#tools-moves-top');
            const body = root.querySelector('#tools-move-table-body');
            const clearPreviewButton = root.querySelector('#tools-clear-preview');

            if (!summary || !previewNote || !actionStatus || !top || !body) return;

            if (moveInspectorState.summary) {
                summary.textContent = [
                    'FEN: ' + moveInspectorState.summary.fen,
                    'side: ' + moveInspectorState.summary.sideToMove,
                    'legal moves: ' + moveInspectorState.summary.legalMoves,
                ].join(' | ');
            } else {
                summary.textContent = moveInspectorState.message || 'Run Move Inspector to populate the legal move table.';
            }

            previewNote.textContent = activePreview
                ? 'Board preview: ' + (activePreview.moveSAN || activePreview.moveUci) + ' (' + activePreview.moveUci + ')'
                : '';
            actionStatus.textContent = moveInspectorState.actionStatus || '';
            if (clearPreviewButton) {
                clearPreviewButton.disabled = !activePreview;
            }

            top.innerHTML = moveInspectorState.topScores.length
                ? moveInspectorState.topScores.map(entry => [
                    '<div class="tools-move-pill">',
                    '<span class="tools-move-pill-rank">#', String(entry.rank), '</span>',
                    '<span class="tools-move-pill-uci">', escapeHtml(entry.uci), '</span>',
                    '<span class="tools-move-pill-score">', escapeHtml(String(entry.score)), '</span>',
                    '</div>'
                ].join('')).join('')
                : '';

            const rows = getSortedMoveRows(moveInspectorState.rows, moveInspectorState.sortKey, moveInspectorState.sortDir);
            if (!rows.length) {
                body.innerHTML = '<tr><td class="tools-move-empty" colspan="9">' + escapeHtml(moveInspectorState.message || 'No moves to display.') + '</td></tr>';
            } else {
                body.innerHTML = rows.map(row => [
                    '<tr>',
                    '<td>', escapeHtml(String(row.index)), '</td>',
                    '<td>', escapeHtml(row.uci), '</td>',
                    '<td>', escapeHtml(row.lan), '</td>',
                    '<td>', escapeHtml(row.san), '</td>',
                    '<td class="tools-cell-score', row.score == null ? ' missing' : '', '">', escapeHtml(row.score == null ? '-' : String(row.score)), '</td>',
                    '<td class="tools-cell-boolean ', row.pinned ? 'yes' : 'no', '">', row.pinned ? 'yes' : 'no', '</td>',
                    '<td class="tools-cell-boolean ', row.check ? 'yes' : 'no', '">', row.check ? 'yes' : 'no', '</td>',
                    '<td>', escapeHtml(row.flags), '</td>',
                    '<td class="tools-move-actions">',
                    '<button type="button" class="board-ctrl-btn tools-move-action" data-tools-preview-move="1" data-tools-move-uci="', escapeHtml(row.uci), '">Preview</button>',
                    '<button type="button" class="board-ctrl-btn tools-move-action" data-tools-play-move="1" data-tools-move-uci="', escapeHtml(row.uci), '">Play</button>',
                    '</td>',
                    '</tr>'
                ].join('')).join('');
            }

            root.querySelectorAll('[data-tools-sort]').forEach(button => {
                const active = button.dataset.toolsSort === moveInspectorState.sortKey;
                button.classList.toggle('active', active);
                button.setAttribute('data-sort-dir', active ? moveInspectorState.sortDir : '');
                button.setAttribute('aria-sort', active ? (moveInspectorState.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
            });
        }

        function getSortedMoveRows(rows, sortKey, sortDir) {
            const factor = sortDir === 'desc' ? -1 : 1;
            return (rows || []).slice().sort((left, right) => {
                if (sortKey === 'score') {
                    const leftMissing = left.score == null;
                    const rightMissing = right.score == null;
                    if (leftMissing && rightMissing) return left.index - right.index;
                    if (leftMissing) return 1;
                    if (rightMissing) return -1;
                    const delta = left.score - right.score;
                    return delta === 0 ? left.index - right.index : factor * delta;
                }
                return factor * compareMoveRows(left, right, sortKey);
            });
        }

        function compareMoveRows(left, right, sortKey) {
            switch (sortKey) {
                case 'uci':
                case 'lan':
                case 'san':
                case 'flags':
                    return String(left[sortKey]).localeCompare(String(right[sortKey]), undefined, { numeric: true, sensitivity: 'base' });
                case 'pinned':
                case 'check':
                    return compareBooleans(left[sortKey], right[sortKey]) || String(left.san).localeCompare(String(right.san), undefined, { numeric: true, sensitivity: 'base' });
                case 'index':
                default:
                    return left.index - right.index;
            }
        }

        function compareBooleans(left, right) {
            return Number(left) - Number(right);
        }

        function renderModuleStatus(moduleStatus) {
            const list = document.getElementById('tools-module-list');
            if (!list || !moduleStatus) return;

            const rows = [];
            rows.push(moduleRow('Protocol', moduleStatus.protocol || 'unknown', true));
            rows.push(moduleRow('Engine Mode', moduleStatus.engineMode || 'unknown', true));
            if (moduleStatus.NNUE) {
                const nnueStatus = moduleStatus.nnueStatus || {};
                const nnueLabel = nnueStatus.ready
                    ? 'ready' + (nnueStatus.source ? ' (' + nnueStatus.source + ')' : '')
                    : 'loaded';
                rows.push(moduleRow('NNUE', nnueLabel, true));
            } else {
                rows.push(moduleRow('NNUE', 'missing', false));
            }
            ['BB_ATTACKS', 'Position', 'MoveGen', 'ZOBRIST', 'TT', 'ORDER', 'STACK', 'EVAL', 'SEARCH', 'PERFT'].forEach(key => {
                rows.push(moduleRow(key, moduleStatus[key] ? 'ready' : 'missing', Boolean(moduleStatus[key])));
            });
            list.innerHTML = rows.join('');
        }

        function moduleRow(label, value, ok) {
            return [
                '<div class="tools-module-row">',
                '<span class="tools-module-label">', escapeHtml(label), '</span>',
                '<span class="tools-module-value ', ok ? 'ok' : 'fail', '">', escapeHtml(value), '</span>',
                '</div>'
            ].join('');
        }

        function init() {
            const root = ensureShell();
            if (!root) return;
            populatePresets(root);
            renderPresetMeta(null);
            renderTestLinks(root);
            renderMoveInspector(root);
        }

        function render(model) {
            const root = ensureShell();
            if (!root) return;

            const snapshot = model && model.snapshot ? model.snapshot : null;
            const moduleStatus = model && model.moduleStatus ? model.moduleStatus : null;
            activePreview = model && model.preview ? model.preview : null;
            const fenInput = root.querySelector('#tools-fen-input');

            if (snapshot && fenInput && document.activeElement !== fenInput) {
                fenInput.value = snapshot.currentBoardFEN || '';
            }

            Object.keys(outputByPanel).forEach(panel => {
                if (panel === 'moves') return;
                const output = root.querySelector('#tools-output-' + panel);
                if (output) output.value = outputByPanel[panel] || '';
            });

            renderModuleStatus(moduleStatus);
            renderTTSummary(moduleStatus, snapshot);
            renderMoveInspector(root);
        }

        function setActivePanel(panelId) {
            activePanel = normalizePanelId(panelId);
            const root = document.getElementById('view-tools');
            if (root) syncActivePanel(root);
        }

        function normalizePanelId(panelId) {
            const normalized = String(panelId || '').trim();
            if (!normalized) return 'perft';
            return Object.prototype.hasOwnProperty.call(outputByPanel, normalized) || normalized === 'tests'
                ? normalized
                : 'perft';
        }

        function renderTestLinks(root) {
            const container = root.querySelector('#tools-test-grid');
            if (!container) return;
            const links = typeof options.getTestLinks === 'function' ? options.getTestLinks() : [];
            container.innerHTML = links.map(link => [
                '<a class="tools-test-link" href="', escapeHtml(link.href), '" target="_blank" rel="noopener noreferrer">',
                '<span class="tools-test-link-title">', escapeHtml(link.label), '</span>',
                '<span class="tools-test-link-copy">', escapeHtml(link.description || ''), '</span>',
                '</a>'
            ].join('')).join('');
        }

        function renderTTSummary(moduleStatus, snapshot) {
            const summary = document.getElementById('tools-tt-summary');
            if (!summary) return;
            const info = snapshot && snapshot.currentEngineInfo ? snapshot.currentEngineInfo : null;
            const tt = typeof options.getTTSummary === 'function' ? options.getTTSummary() : null;
            const rows = [
                statTile('TT Ready', moduleStatus && moduleStatus.TT ? 'yes' : 'no'),
                statTile('Hashfull', tt && tt.hashfull != null ? String(tt.hashfull) : (info && info.hashfull != null ? String(info.hashfull) : '0')),
                statTile('Entries', tt && tt.size != null ? String(tt.size) : '0'),
                statTile('Generation', tt && tt.generation != null ? String(tt.generation) : '0'),
                statTile('Last Best Move', info && info.bestMove ? info.bestMove : '-'),
                statTile('Last Search Depth', info && info.depth != null ? String(info.depth) : '-'),
            ];
            summary.innerHTML = rows.join('');
        }

        function statTile(label, value) {
            return [
                '<div class="tools-stat-tile">',
                '<div class="tools-stat-label">', escapeHtml(label), '</div>',
                '<div class="tools-stat-value">', escapeHtml(value), '</div>',
                '</div>'
            ].join('');
        }

        return {
            init,
            render,
            getModuleStatus: options.getModuleStatus,
            setActivePanel,
        };
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    global.Chess2ToolsView = { create };
})(window);