import fs from 'node:fs';

export function loadEncyclopediaEntries(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const source = fs.readFileSync(filePath, 'utf8');
    const match = source.match(/global\.Chess2EcoEncyclopediaData\s*=\s*(\[[\s\S]*\]);/);
    if (!match) {
        throw new Error('Could not parse encyclopedia file: ' + filePath);
    }
    return JSON.parse(match[1]);
}

export function serializeAsJs(entries) {
    return [
        '(function (global) {',
        '\tglobal.Chess2EcoEncyclopediaData = ' + JSON.stringify(entries, null, 4) + ';',
        '})(window);',
        '',
    ].join('\n');
}

export function cleanEco(value) {
    const match = String(value || '').trim().toUpperCase().match(/^[A-E][0-9]{2}$/);
    return match ? match[0] : '';
}

export function cleanMoveText(text) {
    return String(text || '')
        .replace(/\{[^}]*\}/g, ' ')
        .replace(/;[^\n\r]*/g, ' ')
        .replace(/\$\d+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function slugify(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'opening';
}

export function firstNonEmpty(...values) {
    for (const value of values) {
        if (String(value || '').trim()) return String(value).trim();
    }
    return '';
}

export function compareEntries(left, right) {
    return (left.eco || '').localeCompare(right.eco || '')
        || (left.name || '').localeCompare(right.name || '')
        || (left.variation || '').localeCompare(right.variation || '')
        || (left.pgn || '').localeCompare(right.pgn || '');
}

export function buildEntryKey(entry) {
    return [entry.eco || '-', entry.name || '-', entry.variation || '-', entry.pgn || '-'].join(' | ');
}

export function normalizeAliases(value, blockedValues) {
    const rawAliases = Array.isArray(value)
        ? value
        : (typeof value === 'string' && value.trim() ? [value] : []);
    const blocked = new Set((Array.isArray(blockedValues) ? blockedValues : [])
        .map(item => normalizeTextKey(item))
        .filter(Boolean));
    const seen = new Set();
    const aliases = [];
    for (const item of rawAliases) {
        const alias = String(item || '').trim();
        if (!alias) continue;
        const key = normalizeTextKey(alias);
        if (!key || blocked.has(key) || seen.has(key)) continue;
        seen.add(key);
        aliases.push(alias);
    }
    return aliases;
}

export function normalizeEntry(entry) {
    const eco = cleanEco(entry && entry.eco);
    const name = firstNonEmpty(entry && entry.name, 'Unknown Opening');
    const variation = firstNonEmpty(entry && entry.variation, '');
    const label = variation ? name + ': ' + variation : name;
    const familyLabel = firstNonEmpty(entry && entry.familyLabel, name);
    const family = firstNonEmpty(entry && entry.family, slugify(familyLabel || name));
    const pgn = cleanMoveText(entry && entry.pgn);
    const aliases = normalizeAliases(entry && (entry.aliases != null ? entry.aliases : entry.alias), [name, label, familyLabel]);
    const weightValue = Number(entry && entry.weight);
    const weight = Number.isFinite(weightValue) && weightValue > 0 ? Math.round(weightValue) : 1;
    return {
        eco,
        name,
        variation,
        family,
        familyLabel,
        pgn,
        aliases,
        weight,
    };
}

export function validateEntries(entries, options) {
    const settings = Object.assign({ requireFullEcoCoverage: false }, options);
    const problems = [];
    const warnings = [];
    const normalizedEntries = [];
    const byKey = new Map();
    const ecoBuckets = new Map();

    for (let index = 0; index < entries.length; index += 1) {
        const entry = entries[index] || {};
        const normalized = normalizeEntry(entry);
        normalizedEntries.push(normalized);
        const label = formatEntryLabel(normalized, index);

        if (!normalized.eco) {
            problems.push(label + ' is missing a valid ECO code.');
        }
        if (!normalized.name) {
            problems.push(label + ' is missing a name.');
        }
        if (!normalized.family) {
            problems.push(label + ' is missing a family slug.');
        }
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized.family)) {
            problems.push(label + ' has a non-normalized family slug: ' + JSON.stringify(normalized.family));
        }
        if (!normalized.familyLabel) {
            problems.push(label + ' is missing a familyLabel.');
        }
        if (!normalized.pgn) {
            problems.push(label + ' is missing PGN text.');
        }
        if (normalized.pgn && !/^(?:\d+\.|[PNBRQK]?[a-h]?[1-8]?x?[a-h][1-8]|O-O(?:-O)?|[a-h][1-8]|\S+)/.test(normalized.pgn)) {
            warnings.push(label + ' has PGN text that looks unusual: ' + JSON.stringify(normalized.pgn.slice(0, 80)));
        }
        if (normalized.family !== slugify(normalized.family)) {
            problems.push(label + ' family slug should be normalized to ' + JSON.stringify(slugify(normalized.family)) + '.');
        }
        if (normalized.family !== slugify(normalized.familyLabel || normalized.name)) {
            warnings.push(label + ' family slug does not match the normalized family label.');
        }

        const suspiciousFields = [normalized.name, normalized.variation, normalized.familyLabel, normalized.pgn].concat(normalized.aliases);
        for (const value of suspiciousFields) {
            if (containsSuspiciousText(value)) {
                warnings.push(label + ' contains suspicious text: ' + JSON.stringify(value));
                break;
            }
        }

        const aliasKeys = new Set();
        for (const alias of normalized.aliases) {
            const aliasKey = normalizeTextKey(alias);
            if (aliasKeys.has(aliasKey)) {
                problems.push(label + ' has a duplicate alias: ' + JSON.stringify(alias));
            }
            aliasKeys.add(aliasKey);
        }

        const key = buildEntryKey(normalized);
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(label);
        if (normalized.eco) {
            if (!ecoBuckets.has(normalized.eco)) ecoBuckets.set(normalized.eco, []);
            ecoBuckets.get(normalized.eco).push(normalized);
        }
    }

    for (const [key, labels] of byKey.entries()) {
        if (labels.length > 1) {
            problems.push('Duplicate encyclopedia entry key ' + JSON.stringify(key) + ' appears ' + String(labels.length) + ' times.');
        }
    }

    const coverage = buildCoverageSummary(ecoBuckets);
    if (settings.requireFullEcoCoverage && coverage.missingCodes.length) {
        problems.push('Missing ECO codes: ' + coverage.missingCodes.join(', '));
    }

    return {
        ok: !problems.length,
        problems,
        warnings,
        coverage,
        entryCount: entries.length,
        normalizedEntries,
    };
}

export function buildCoverageSummary(ecoBuckets) {
    const presentCodes = Array.from(ecoBuckets.keys()).sort();
    const missingCodes = [];
    for (const prefix of ['A', 'B', 'C', 'D', 'E']) {
        for (let index = 0; index < 100; index += 1) {
            const code = prefix + String(index).padStart(2, '0');
            if (!ecoBuckets.has(code)) missingCodes.push(code);
        }
    }

    const lineCounts = {};
    for (const prefix of ['A', 'B', 'C', 'D', 'E']) {
        lineCounts[prefix] = 0;
    }
    for (const [eco, entries] of ecoBuckets.entries()) {
        const prefix = String(eco || '').charAt(0);
        if (!lineCounts[prefix]) lineCounts[prefix] = 0;
        lineCounts[prefix] += Array.isArray(entries) ? entries.length : 0;
    }

    return {
        presentCodes,
        missingCodes,
        coveredCodeCount: presentCodes.length,
        totalCodeCount: 500,
        lineCounts,
    };
}

export function convertGameToEntry(game) {
    const headers = game && game.headers ? game.headers : {};
    const normalized = normalizeEntry({
        eco: headers.ECO || headers.Eco || headers.eco || '',
        name: firstNonEmpty(headers.Opening, headers.OpeningName, headers.Name, headers.Event, 'Unknown Opening'),
        variation: firstNonEmpty(headers.Variation, headers.SubVariation, headers.Variant, ''),
        family: firstNonEmpty(headers.Family, headers.FamilyKey, ''),
        familyLabel: firstNonEmpty(headers.Family, headers.FamilyLabel, headers.Opening, headers.OpeningName, headers.Name, ''),
        pgn: game && game.movetext ? game.movetext : '',
        aliases: splitAliasHeaders(headers.Aliases || headers.Alias || ''),
        weight: headers.Weight || headers.Popularity || 1,
    });

    return normalized;
}

export function parsePgnGames(content) {
    const normalized = String(content || '').replace(/^\uFEFF/, '');
    const lines = normalized.split(/\r?\n/);
    const games = [];
    let headers = {};
    let movetext = [];

    function flushGame() {
        if (!Object.keys(headers).length && !movetext.join(' ').trim()) return;
        games.push({ headers, movetext: movetext.join(' ').trim() });
        headers = {};
        movetext = [];
    }

    for (const rawLine of lines) {
        const line = rawLine.trim();
        const headerMatch = line.match(/^\[([^\s]+)\s+"(.*)"\]$/);
        if (headerMatch) {
            if (movetext.length && Object.keys(headers).length) {
                flushGame();
            }
            headers[headerMatch[1]] = headerMatch[2];
            continue;
        }
        if (!line) {
            if (movetext.length) flushGame();
            continue;
        }
        movetext.push(line);
    }

    flushGame();
    return games;
}

function splitAliasHeaders(value) {
    const text = String(value || '').trim();
    if (!text) return [];
    return text.split(/\s*\|\s*|\s*;\s*/).map(item => item.trim()).filter(Boolean);
}

function formatEntryLabel(entry, index) {
    const label = entry.variation ? entry.name + ': ' + entry.variation : entry.name;
    return '[' + String(index + 1) + '] ' + (entry.eco || '???') + ' ' + label;
}

function normalizeTextKey(value) {
    return String(value || '').trim().toLowerCase();
}

function containsSuspiciousText(value) {
    const text = String(value || '');
    return /�|Ã.|Â.|â.|\u0000/.test(text);
}