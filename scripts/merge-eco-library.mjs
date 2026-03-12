import fs from 'node:fs';
import path from 'node:path';
import {
    buildEntryKey,
    compareEntries,
    convertGameToEntry,
    loadEncyclopediaEntries,
    normalizeEntry,
    parsePgnGames,
    serializeAsJs,
    validateEntries,
} from './eco-tooling.mjs';

const workspaceRoot = process.cwd();
const defaultOutputPath = path.join(workspaceRoot, 'data', 'books', 'eco_encyclopedia_data.js');
const args = process.argv.slice(2);

const options = {
    output: defaultOutputPath,
    replace: false,
    dryRun: false,
    validate: false,
    json: false,
    report: '',
};

const inputPaths = [];
for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--replace') {
        options.replace = true;
        continue;
    }
    if (token === '--dry-run') {
        options.dryRun = true;
        continue;
    }
    if (token === '--validate') {
        options.validate = true;
        continue;
    }
    if (token === '--json') {
        options.json = true;
        continue;
    }
    if (token === '--report') {
        options.report = path.resolve(workspaceRoot, args[index + 1] || '');
        index += 1;
        continue;
    }
    if (token === '--output') {
        options.output = path.resolve(workspaceRoot, args[index + 1] || defaultOutputPath);
        index += 1;
        continue;
    }
    inputPaths.push(path.resolve(workspaceRoot, token));
}

if (!inputPaths.length) {
    console.error('Usage: node scripts/merge-eco-library.mjs <library1.pgn> [library2.pgn ...] [--replace] [--dry-run] [--validate] [--json] [--report merge-report.json] [--output data/books/eco_encyclopedia_data.js]');
    process.exit(1);
}

const baseEntries = options.replace ? [] : loadEncyclopediaEntries(options.output);
const merged = new Map();
for (const entry of baseEntries) {
    const normalized = normalizeEntry(entry);
    merged.set(buildEntryKey(normalized), normalized);
}

const stats = {
    existing: baseEntries.length,
    parsedGames: 0,
    imported: 0,
    skippedMissingEco: 0,
    skippedMissingPgn: 0,
    duplicates: 0,
};

for (const inputPath of inputPaths) {
    const content = fs.readFileSync(inputPath, 'utf8');
    const games = parsePgnGames(content);
    for (const game of games) {
        stats.parsedGames += 1;
        const entry = convertGameToEntry(game);
        if (!entry.eco) {
            stats.skippedMissingEco += 1;
            continue;
        }
        if (!entry.pgn) {
            stats.skippedMissingPgn += 1;
            continue;
        }

        const key = buildEntryKey(entry);
        if (merged.has(key)) {
            stats.duplicates += 1;
            continue;
        }
        merged.set(key, entry);
        stats.imported += 1;
    }
}

const outputEntries = Array.from(merged.values()).sort(compareEntries);
const validation = options.validate ? validateEntries(outputEntries, { requireFullEcoCoverage: false }) : null;
const fileContent = serializeAsJs(outputEntries);

if (!options.dryRun) {
    fs.writeFileSync(options.output, fileContent, 'utf8');
}

const output = {
    output: options.output,
    dryRun: options.dryRun,
    replace: options.replace,
    validate: options.validate,
    report: options.report || null,
    totalEntries: outputEntries.length,
    ...stats,
};

if (validation) {
    output.validation = {
        ok: validation.ok,
        problems: validation.problems.length,
        warnings: validation.warnings.length,
    };
}

if (options.json) {
    console.log(JSON.stringify(output, null, 2));
} else {
    console.log('ECO merge summary');
    console.log('Output: ' + output.output);
    console.log('Existing: ' + String(stats.existing));
    console.log('Parsed games: ' + String(stats.parsedGames));
    console.log('Imported: ' + String(stats.imported));
    console.log('Duplicates: ' + String(stats.duplicates));
    console.log('Skipped missing ECO: ' + String(stats.skippedMissingEco));
    console.log('Skipped missing PGN: ' + String(stats.skippedMissingPgn));
    console.log('Total entries: ' + String(output.totalEntries));
    if (validation) {
        console.log('Validation: ' + (validation.ok ? 'ok' : 'failed') + ' (' + String(validation.problems.length) + ' problems, ' + String(validation.warnings.length) + ' warnings)');
    }
}

if (options.report) {
    fs.writeFileSync(options.report, JSON.stringify(output, null, 2) + '\n', 'utf8');
}

if (validation && validation.problems.length) {
    process.exit(1);
}