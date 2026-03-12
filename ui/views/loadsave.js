(function (global) {
    function create(options) {
        function ensureShell() {
            const root = document.getElementById('view-loadsave');
            if (!root || root.dataset.ready === 'true') return root;

            root.dataset.ready = 'true';
            root.innerHTML = [
                '<div class="loadsave-layout">',
                '<section class="play-panel">',
                '<h2 class="play-panel-title">FEN</h2>',
                '<textarea id="loadsave-fen-input" class="loadsave-textarea" rows="3" placeholder="Paste a FEN string here"></textarea>',
                '<div class="loadsave-actions">',
                '<button type="button" id="loadsave-fen-load" class="board-ctrl-btn">Load FEN</button>',
                '<button type="button" id="loadsave-fen-copy" class="board-ctrl-btn">Copy Current FEN</button>',
                '<button type="button" id="loadsave-fen-download" class="board-ctrl-btn">Download FEN</button>',
                '</div>',
                '<div id="loadsave-fen-status" class="loadsave-status"></div>',
                '</section>',
                '<section class="play-panel">',
                '<h2 class="play-panel-title">PGN Import</h2>',
                '<textarea id="loadsave-pgn-input" class="loadsave-textarea" rows="10" placeholder="Paste a PGN game here or use Load PGN to choose a file"></textarea>',
                '<div class="loadsave-actions">',
                '<button type="button" id="loadsave-pgn-import" class="board-ctrl-btn">Load PGN</button>',
                '<button type="button" id="loadsave-pgn-import-text" class="board-ctrl-btn">Import Pasted PGN</button>',
                '</div>',
                '<div id="loadsave-pgn-status" class="loadsave-status"></div>',
                '</section>',
                '<section class="play-panel">',
                '<h2 class="play-panel-title">PGN Export</h2>',
                '<textarea id="loadsave-pgn-output" class="loadsave-textarea" rows="10" readonly></textarea>',
                '<div class="loadsave-actions">',
                '<button type="button" id="loadsave-pgn-refresh" class="board-ctrl-btn">Refresh PGN</button>',
                '<button type="button" id="loadsave-pgn-copy" class="board-ctrl-btn">Copy PGN</button>',
                '<button type="button" id="loadsave-pgn-download" class="board-ctrl-btn">Download PGN</button>',
                '</div>',
                '</section>',
                '<section class="play-panel">',
                '<h2 class="play-panel-title">Move Text</h2>',
                '<textarea id="loadsave-uci-input" class="loadsave-textarea" rows="6" placeholder="Paste a UCI move line, for example: e2e4 e7e5 g1f3"></textarea>',
                '<div class="loadsave-actions">',
                '<button type="button" id="loadsave-uci-import" class="board-ctrl-btn">Import UCI Line</button>',
                '<button type="button" id="loadsave-uci-copy" class="board-ctrl-btn">Copy UCI Line</button>',
                '</div>',
                '<div id="loadsave-uci-status" class="loadsave-status"></div>',
                '</section>',
                '</div>'
            ].join('');

            bindEvents(root);
            return root;
        }

        function bindEvents(root) {
            root.querySelector('#loadsave-fen-load').addEventListener('click', () => {
                const input = root.querySelector('#loadsave-fen-input');
                const status = root.querySelector('#loadsave-fen-status');
                const fen = input.value.trim();
                const result = options.onLoadFEN ? options.onLoadFEN(fen) : { ok: false, error: 'Load handler missing.' };
                status.textContent = result && result.ok ? 'Position loaded.' : ((result && result.error) || 'Invalid FEN.');
            });

            root.querySelector('#loadsave-fen-copy').addEventListener('click', () => {
                runAsyncAction(options.onCopyFEN, root.querySelector('#loadsave-fen-status'), 'FEN copied.', 'Could not copy FEN.');
            });

            root.querySelector('#loadsave-fen-download').addEventListener('click', () => {
                if (options.onDownloadFEN) options.onDownloadFEN();
                root.querySelector('#loadsave-fen-status').textContent = 'FEN downloaded.';
            });

            root.querySelector('#loadsave-pgn-refresh').addEventListener('click', () => {
                render(options.getSnapshot ? options.getSnapshot() : null);
            });

            root.querySelector('#loadsave-pgn-import').addEventListener('click', () => {
                const status = root.querySelector('#loadsave-pgn-status');
                const input = root.querySelector('#loadsave-pgn-input');
                Promise.resolve(options.onPickPGN ? options.onPickPGN() : { ok: false, error: 'File picker missing.' })
                    .then(result => {
                        if (result && result.ok) {
                            if (input) input.value = result.text || '';
                            status.textContent = result.name ? ('Loaded ' + result.name + '.') : 'PGN loaded.';
                            return;
                        }
                        if (result && result.cancelled) {
                            status.textContent = 'No PGN file selected.';
                            return;
                        }
                        status.textContent = (result && result.error) || 'Could not load PGN.';
                    })
                    .catch(() => {
                        status.textContent = 'Could not load PGN.';
                    });
            });

            root.querySelector('#loadsave-pgn-import-text').addEventListener('click', () => {
                const input = root.querySelector('#loadsave-pgn-input');
                const status = root.querySelector('#loadsave-pgn-status');
                const result = options.onImportPGN ? options.onImportPGN(input.value) : { ok: false, error: 'Import handler missing.' };
                status.textContent = result && result.ok ? 'PGN imported from text.' : ((result && result.error) || 'Could not import PGN text.');
            });

            root.querySelector('#loadsave-pgn-copy').addEventListener('click', () => {
                runAsyncAction(options.onCopyPGN, root.querySelector('#loadsave-pgn-status'), 'PGN copied.', 'Could not copy PGN.');
            });

            root.querySelector('#loadsave-pgn-download').addEventListener('click', () => {
                if (options.onDownloadPGN) options.onDownloadPGN();
                root.querySelector('#loadsave-pgn-status').textContent = 'PGN downloaded.';
            });

            root.querySelector('#loadsave-uci-import').addEventListener('click', () => {
                const input = root.querySelector('#loadsave-uci-input');
                const status = root.querySelector('#loadsave-uci-status');
                const result = options.onImportUCILine ? options.onImportUCILine(input.value) : { ok: false, error: 'Import handler missing.' };
                status.textContent = result && result.ok ? 'Move line imported.' : ((result && result.error) || 'Could not import move line.');
            });

            root.querySelector('#loadsave-uci-copy').addEventListener('click', () => {
                runAsyncAction(options.onCopyUCILine, root.querySelector('#loadsave-uci-status'), 'Move line copied.', 'Could not copy move line.');
            });
        }

        function runAsyncAction(action, statusEl, okMessage, failMessage) {
            if (typeof action !== 'function') return;
            Promise.resolve(action())
                .then(result => {
                    if (statusEl) statusEl.textContent = result === false ? failMessage : okMessage;
                })
                .catch(() => {
                    if (statusEl) statusEl.textContent = failMessage;
                });
        }

        function init() {
            ensureShell();
        }

        function render(snapshot) {
            const root = ensureShell();
            if (!root || !snapshot) return;

            const fenInput = root.querySelector('#loadsave-fen-input');
            const pgnInput = root.querySelector('#loadsave-pgn-input');
            const pgnOutput = root.querySelector('#loadsave-pgn-output');
            const uciInput = root.querySelector('#loadsave-uci-input');

            if (fenInput && document.activeElement !== fenInput) {
                fenInput.value = snapshot.currentBoardFEN || '';
            }
            if (pgnOutput) {
                pgnOutput.value = snapshot.pgnText || '';
            }
            if (pgnInput && document.activeElement !== pgnInput && !pgnInput.value.trim()) {
                pgnInput.value = snapshot.pgnText || '';
            }
            if (uciInput && document.activeElement !== uciInput) {
                uciInput.value = snapshot.uciLine || '';
            }
        }

        return { init, render };
    }

    global.Chess2LoadSaveView = { create };
})(window);