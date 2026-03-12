import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseUrl = process.env.CHESS2_TEST_BASE_URL || 'http://127.0.0.1:8765';
const suitePath = process.env.CHESS2_TEST_PATH || '/tests/engine-smoke.html';
const suiteUrl = new URL(suitePath, baseUrl).toString();
const timeoutMs = Number(process.env.CHESS2_TEST_TIMEOUT_MS || 120000);
const suiteName = process.env.CHESS2_TEST_NAME || suitePath.replace(/^\//, '');
const artifactDir = process.env.CHESS2_ARTIFACT_DIR || '';

function ensureArtifactDir() {
    if (!artifactDir) return null;
    fs.mkdirSync(artifactDir, { recursive: true });
    return artifactDir;
}

function writeArtifact(fileName, content) {
    const dir = ensureArtifactDir();
    if (!dir) return;
    fs.writeFileSync(path.join(dir, fileName), content);
}

function writeGitHubSummary(payload, failed, pageErrors) {
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryPath) return;

    const lines = [
        `## ${suiteName}`,
        '',
        `- URL: ${suiteUrl}`,
        `- Passed: ${payload.results.length - failed.length}`,
        `- Failed: ${failed.length}`,
        `- Browser errors: ${pageErrors.length}`,
        '',
    ];

    if (failed.length) {
        lines.push('### Failed Tests', '');
        for (const result of failed) {
            lines.push(`- ${result.name}: ${result.message || 'failed'}`);
        }
        lines.push('');
    }

    if (pageErrors.length) {
        lines.push('### Browser Errors', '');
        for (const error of pageErrors) {
            lines.push(`- ${error}`);
        }
        lines.push('');
    }

    fs.appendFileSync(summaryPath, lines.join('\n') + '\n');
}

const browser = await chromium.launch({ headless: true });

try {
    const page = await browser.newPage();
    const pageErrors = [];
    let payload = { summary: '', results: [] };

    page.on('pageerror', error => {
        pageErrors.push(error && error.message ? error.message : String(error));
    });

    page.on('console', message => {
        if (message.type() === 'error') {
            pageErrors.push(message.text());
        }
    });

    await page.goto(suiteUrl, { waitUntil: 'load', timeout: timeoutMs });
    await page.waitForFunction(
        () => Array.isArray(window.Chess2TestHarness && window.Chess2TestHarness.lastResults)
            && window.Chess2TestHarness.lastResults.length > 0,
        { timeout: timeoutMs }
    );

    payload = await page.evaluate(() => {
        const results = window.Chess2TestHarness.lastResults || [];
        return {
            summary: document.getElementById('results') ? document.getElementById('results').innerText : '',
            results,
        };
    });

    const failed = payload.results.filter(result => result.status !== 'pass');

    console.log('Suite:', suiteName);
    console.log('Suite URL:', suiteUrl);
    console.log(payload.summary);

    writeArtifact('results.json', JSON.stringify({
        suiteName,
        suiteUrl,
        pageErrors,
        results: payload.results,
    }, null, 2));
    writeArtifact('summary.txt', payload.summary + '\n');

    if (pageErrors.length) {
        console.error('Browser console/page errors detected:');
        for (const error of pageErrors) {
            console.error('-', error);
        }
        process.exitCode = 1;
    }

    if (failed.length) {
        console.error('Suite failures:');
        for (const result of failed) {
            console.error('-', result.name + ': ' + (result.message || 'failed'));
        }
        process.exitCode = 1;
    }

    if (pageErrors.length || failed.length) {
        const screenshotPath = ensureArtifactDir() ? path.join(artifactDir, 'failure-page.png') : null;
        if (screenshotPath) {
            await page.screenshot({ path: screenshotPath, fullPage: true });
        }
        writeArtifact('failure-page.html', await page.content());
    }

    if (!pageErrors.length && !failed.length) {
        console.log('Suite passed with', payload.results.length, 'tests.');
    }

    writeGitHubSummary(payload, failed, pageErrors);
} finally {
    await browser.close();
}