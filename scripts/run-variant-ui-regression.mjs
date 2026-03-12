import { chromium } from 'playwright';

const baseUrl = process.env.CHESS2_TEST_BASE_URL || 'http://127.0.0.1:8765';
const appUrl = new URL('/index.html', baseUrl).toString();
const timeoutMs = Number(process.env.CHESS2_TEST_TIMEOUT_MS || 120000);

const checks = [];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function printResult(result) {
    const prefix = result.ok ? 'PASS' : 'FAIL';
    console.log(prefix + ' | ' + result.name + ' | ' + JSON.stringify(result.details));
}

const browser = await chromium.launch({ headless: true });

try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

    async function pause(ms = 350) {
        await page.waitForTimeout(ms);
    }

    async function showFenLoader() {
        await page.goto(appUrl, { waitUntil: 'networkidle', timeout: timeoutMs });
        await pause();
        await page.evaluate(() => {
            if (typeof window.Chess2ShowView === 'function') {
                window.Chess2ShowView('fen-load');
            }
        });
        await page.waitForSelector('#view-fen-load.active #fen-input', { state: 'visible', timeout: timeoutMs });
    }

    async function loadFenThroughUi(fen) {
        await showFenLoader();
        await page.locator('#fen-input').fill(fen);
        await page.locator('#fen-load-btn').click();
        await page.waitForSelector('#view-play.active', { state: 'visible', timeout: timeoutMs });
        await pause(300);
    }

    async function ensure2DBoard() {
        const shouldToggle = await page.evaluate(() => {
            const button = document.getElementById('btn-toggle-3d');
            const board = document.getElementById('chessboard');
            if (!button || !board) return false;
            return button.classList.contains('active') || getComputedStyle(board).display === 'none';
        });
        if (shouldToggle) {
            await page.locator('#btn-toggle-3d').click();
            await pause(500);
        }
        await page.waitForSelector('#chessboard .square', { state: 'visible', timeout: timeoutMs });
    }

    async function clickSquare(square) {
        await page.locator('#chessboard [data-square="' + square + '"]').click();
        await pause(150);
    }

    async function openVariantWorkspace(viewId) {
        await page.goto(appUrl, { waitUntil: 'networkidle', timeout: timeoutMs });
        await pause();
        await page.locator('#menu-button').click();
        await page.locator('#side-drawer .submenu-label').filter({ hasText: 'Variants' }).first().click();
        await page.locator('#side-drawer li[data-view="' + viewId + '"]').click();
        await page.waitForSelector('#view-variants .variant-panel', { state: 'visible', timeout: timeoutMs });
        await pause();
    }

    async function capturePlayState() {
        await pause(500);
        return page.evaluate(() => {
            const playView = document.getElementById('view-play');
            const meta = document.getElementById('play-meta');
            const status = document.getElementById('play-status');
            const board = document.getElementById('chessboard');
            const stats = Array.from(meta ? meta.querySelectorAll('.engine-stat') : []);
            const readStat = name => {
                const stat = stats.find(element => element.querySelector('.engine-stat-label')?.textContent.trim() === name);
                return stat ? (stat.querySelector('.engine-stat-value')?.textContent.trim() || '') : '';
            };
            const fenRow = meta
                ? Array.from(meta.querySelectorAll('.engine-pv')).find(element => /FEN:/.test(element.textContent || ''))
                : null;
            return {
                playActive: Boolean(playView && playView.classList.contains('active')),
                status: status ? status.textContent.trim() : '',
                variant: readStat('Variant'),
                boardLabel: readStat('Board'),
                reservePanels: meta ? meta.querySelectorAll('.reserve-panel').length : 0,
                activeReservePanelTitle: meta ? (meta.querySelector('.reserve-panel.active .reserve-panel-title')?.textContent || '') : '',
                squareCount: board ? board.querySelectorAll('.square').length : 0,
                hasSquareJ8: Boolean(board && board.querySelector('[data-square="j8"]')),
                hasSquareJ1: Boolean(board && board.querySelector('[data-square="j1"]')),
                fenText: fenRow ? fenRow.textContent.trim() : '',
            };
        });
    }

    async function captureInteractiveState(squares) {
        return page.evaluate(requestedSquares => {
            const board = document.getElementById('chessboard');
            const meta = document.getElementById('play-meta');
            const moveList = document.getElementById('move-list');
            const status = document.getElementById('play-status');
            const fenRow = meta
                ? Array.from(meta.querySelectorAll('.engine-pv')).find(element => /FEN:/.test(element.textContent || ''))
                : null;
            const squarePieces = {};
            for (const square of requestedSquares) {
                const piece = board ? board.querySelector('[data-square="' + square + '"] .piece') : null;
                squarePieces[square] = piece ? (piece.getAttribute('data-piece') || '') : '';
            }
            return {
                status: status ? status.textContent.trim() : '',
                fenText: fenRow ? fenRow.textContent.trim() : '',
                reserveButtons: meta ? Array.from(meta.querySelectorAll('.reserve-piece-btn')).map(element => element.textContent.trim()) : [],
                moveListText: moveList ? moveList.textContent.replace(/\s+/g, ' ').trim() : '',
                squarePieces,
            };
        }, squares);
    }

    async function runCheck(name, worker) {
        try {
            const details = await worker();
            const result = { name, ok: true, details };
            checks.push(result);
            printResult(result);
        } catch (error) {
            const result = {
                name,
                ok: false,
                details: { error: error && error.message ? error.message : String(error) },
            };
            checks.push(result);
            printResult(result);
        }
    }

    await runCheck('Three-Check launch', async () => {
        await openVariantWorkspace('three-check');
        await page.locator('#view-variants [data-variant-action="primary"]').click();
        const play = await capturePlayState();
        assert(play.playActive, 'Play view did not activate.');
        assert(/Three-Check/i.test(play.variant), 'Variant label was not Three-Check.');
        assert(/White to move/i.test(play.status), 'Status did not normalize to White to move.');
        assert(play.squareCount === 64, 'Three-Check board did not render 64 squares.');
        assert(play.reservePanels === 0, 'Three-Check should not render reserve pockets.');
        assert(/variant=three-check/i.test(play.fenText), 'Three-Check FEN metadata was missing.');
        return { play };
    });

    await runCheck('Crazyhouse launch', async () => {
        await openVariantWorkspace('crazyhouse');
        await page.locator('#view-variants [data-variant-action="primary"]').click();
        const play = await capturePlayState();
        assert(play.playActive, 'Play view did not activate.');
        assert(/Crazyhouse/i.test(play.variant), 'Variant label was not Crazyhouse.');
        assert(play.squareCount === 64, 'Crazyhouse board did not render 64 squares.');
        assert(play.reservePanels === 2, 'Crazyhouse should render two reserve pockets.');
        assert(/White Pocket/i.test(play.activeReservePanelTitle), 'White reserve pocket did not render active.');
        assert(/variant=crazyhouse/i.test(play.fenText), 'Crazyhouse FEN metadata was missing.');
        return { play };
    });

    await runCheck('Bughouse launch', async () => {
        await openVariantWorkspace('bughouse');
        await page.locator('#view-variants [data-variant-action="primary"]').click();
        const play = await capturePlayState();
        assert(play.playActive, 'Play view did not activate.');
        assert(/Bughouse/i.test(play.variant), 'Variant label was not Bughouse.');
        assert(play.squareCount === 64, 'Bughouse board did not render 64 squares.');
        assert(play.reservePanels === 2, 'Bughouse should render two reserve pockets.');
        assert(/White Pocket/i.test(play.activeReservePanelTitle), 'White reserve pocket did not render active.');
        assert(/variant=bughouse/i.test(play.fenText), 'Bughouse FEN metadata was missing.');
        return { play };
    });

    await runCheck('Capablanca launch', async () => {
        await openVariantWorkspace('capablanca');
        await page.locator('#view-variants [data-variant-action="primary"]').click();
        const play = await capturePlayState();
        assert(play.playActive, 'Play view did not activate.');
        assert(/^Capablanca$/i.test(play.variant), 'Variant label was not Capablanca.');
        assert(/10x8/i.test(play.boardLabel), 'Board label did not report 10x8.');
        assert(play.squareCount === 80, 'Capablanca board did not render 80 squares.');
        assert(play.hasSquareJ8 && play.hasSquareJ1, 'Capablanca board did not expose j-file squares.');
        assert(/setup=capablanca/i.test(play.fenText), 'Capablanca setup metadata was missing.');
        return { play };
    });

    await runCheck('Gothic launch', async () => {
        await openVariantWorkspace('capablanca');
        await page.locator('#view-variants [data-variant-action="alternate"]').click();
        const play = await capturePlayState();
        assert(play.playActive, 'Play view did not activate.');
        assert(/^Gothic$/i.test(play.variant), 'Variant label was not Gothic.');
        assert(/10x8/i.test(play.boardLabel), 'Board label did not report 10x8.');
        assert(play.squareCount === 80, 'Gothic board did not render 80 squares.');
        assert(play.hasSquareJ8 && play.hasSquareJ1, 'Gothic board did not expose j-file squares.');
        assert(/setup=gothic/i.test(play.fenText), 'Gothic setup metadata was missing.');
        return { play };
    });

    await runCheck('Crazyhouse reserve drop', async () => {
        await loadFenThroughUi('4k3/8/8/8/8/8/8/4K3 w - - 0 1 [variant=crazyhouse;wp=P;bp=-;promo=-]');
        await ensure2DBoard();
        await page.locator('.reserve-piece-btn[data-reserve-piece="P"]').click();
        await clickSquare('e4');
        await page.waitForFunction(() => {
            const piece = document.querySelector('#chessboard [data-square="e4"] .piece');
            return piece && piece.getAttribute('data-piece') === 'P';
        }, { timeout: timeoutMs });

        const state = await captureInteractiveState(['e1', 'e4', 'e8']);
        assert(state.squarePieces.e4 === 'P', 'Crazyhouse drop did not place the pawn on e4.');
        assert(!/P\s*×\s*1/.test(state.reserveButtons.join(' | ')), 'Crazyhouse reserve button still showed a pawn after the drop.');
        assert(/variant=crazyhouse/i.test(state.fenText), 'Crazyhouse drop FEN metadata was missing.');
        assert(/wp=-/i.test(state.fenText), 'Crazyhouse drop did not consume the white pocket in FEN.');
        assert(/P@e4/i.test(state.moveListText), 'Move list did not record the reserve drop.');
        return { state };
    });

    await runCheck('Capablanca kingside castling', async () => {
        await loadFenThroughUi('r4k3r/10/10/10/10/10/10/R4K3R w KQkq - 0 1 [variant=capablanca;files=abcdefghij;ranks=87654321;setup=capablanca]');
        await ensure2DBoard();
        await clickSquare('f1');
        await clickSquare('i1');
        await page.waitForFunction(() => {
            const king = document.querySelector('#chessboard [data-square="i1"] .piece');
            const rook = document.querySelector('#chessboard [data-square="h1"] .piece');
            return king && king.getAttribute('data-piece') === 'K' && rook && rook.getAttribute('data-piece') === 'R';
        }, { timeout: timeoutMs });

        const state = await captureInteractiveState(['f1', 'h1', 'i1', 'j1']);
        assert(state.squarePieces.i1 === 'K', 'Capablanca castling did not move the king to i1.');
        assert(state.squarePieces.h1 === 'R', 'Capablanca castling did not move the rook to h1.');
        assert(!state.squarePieces.f1 && !state.squarePieces.j1, 'Capablanca castling left pieces on the original king or rook squares.');
        assert(/variant=capablanca/i.test(state.fenText), 'Capablanca castling FEN metadata was missing.');
        assert(/ b kq /i.test(state.fenText), 'Capablanca castling did not reduce rights to black-only castling.');
        assert(/O-O|0-0/.test(state.moveListText), 'Move list did not record the castle as O-O.');
        return { state };
    });

    const failed = checks.filter(result => !result.ok);
    if (!failed.length) {
        console.log('Variant UI regression passed with', checks.length, 'checks.');
    } else {
        process.exitCode = 1;
    }
} finally {
    await browser.close();
}