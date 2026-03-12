import path from 'node:path';
import {
    loadEncyclopediaEntries,
    validateEntries,
} from './eco-tooling.mjs';

const workspaceRoot = process.cwd();
const defaultInputPath = path.join(workspaceRoot, 'data', 'books', 'eco_encyclopedia_data.js');
const args = process.argv.slice(2);

const options = {
    input: defaultInputPath,
    json: false,
    strict: false,
};

for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--input') {
        options.input = path.resolve(workspaceRoot, args[index + 1] || defaultInputPath);
        index += 1;
        continue;
    }
    if (token === '--json') {
        options.json = true;
        continue;
    }
    if (token === '--strict') {
        options.strict = true;
        continue;
    }
}

const entries = loadEncyclopediaEntries(options.input);
const report = validateEntries(entries, { requireFullEcoCoverage: true });

if (options.json) {
    console.log(JSON.stringify({
        input: options.input,
        ok: report.ok && (!options.strict || !report.warnings.length),
        entryCount: report.entryCount,
        coverage: report.coverage,
        problems: report.problems,
        warnings: report.warnings,
    }, null, 2));
} else {
    console.log('ECO encyclopedia validation');
    console.log('Input: ' + options.input);
    console.log('Entries: ' + String(report.entryCount));
    console.log('Coverage: ' + String(report.coverage.coveredCodeCount) + '/' + String(report.coverage.totalCodeCount) + ' codes');
    console.log('Missing codes: ' + (report.coverage.missingCodes.length ? report.coverage.missingCodes.join(', ') : 'none'));
    console.log('Line counts: ' + ['A', 'B', 'C', 'D', 'E'].map(prefix => prefix + '=' + String(report.coverage.lineCounts[prefix] || 0)).join(' '));
    console.log('Problems: ' + String(report.problems.length));
    for (const problem of report.problems) {
        console.log('  ERROR  ' + problem);
    }
    console.log('Warnings: ' + String(report.warnings.length));
    for (const warning of report.warnings) {
        console.log('  WARN   ' + warning);
    }
}

if (report.problems.length || (options.strict && report.warnings.length)) {
    process.exit(1);
}