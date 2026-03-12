(function (global) {
    const tests = [];

    function add(name, run) {
        tests.push({ name, run });
    }

    function assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed.');
        }
    }

    function equal(actual, expected, message) {
        if (actual !== expected) {
            throw new Error((message || 'Expected values to match.') + ' Expected ' + expected + ', got ' + actual + '.');
        }
    }

    function includes(collection, value, message) {
        if (!collection.includes(value)) {
            throw new Error(message || ('Expected collection to include ' + value + '.'));
        }
    }

    async function runAll(outputNode) {
        const results = [];
        for (const test of tests) {
            const startedAt = performance.now();
            try {
                await test.run();
                results.push({
                    name: test.name,
                    status: 'pass',
                    durationMs: performance.now() - startedAt,
                });
            } catch (error) {
                results.push({
                    name: test.name,
                    status: 'fail',
                    durationMs: performance.now() - startedAt,
                    message: error && error.message ? error.message : String(error),
                });
            }
        }

        if (outputNode) {
            const passed = results.filter(result => result.status === 'pass').length;
            const failed = results.length - passed;
            outputNode.innerHTML = '';

            const summary = document.createElement('p');
            summary.textContent = 'Engine checks: ' + passed + ' passed, ' + failed + ' failed.';
            outputNode.appendChild(summary);

            const list = document.createElement('ul');
            for (const result of results) {
                const item = document.createElement('li');
                item.textContent = '[' + result.status.toUpperCase() + '] ' + result.name + ' (' + result.durationMs.toFixed(1) + ' ms)'
                    + (result.message ? ' - ' + result.message : '');
                item.style.color = result.status === 'pass' ? '#0b6b2d' : '#8a1c1c';
                list.appendChild(item);
            }
            outputNode.appendChild(list);
        }

        global.Chess2TestHarness.lastResults = results;
        global.dispatchEvent(new CustomEvent('chess2-tests-complete', {
            detail: {
                results,
                passed: results.filter(result => result.status === 'pass').length,
                failed: results.filter(result => result.status === 'fail').length,
            },
        }));

        if (global.parent && global.parent !== global && typeof global.parent.postMessage === 'function') {
            global.parent.postMessage({
                type: 'chess2-tests-complete',
                detail: {
                    results,
                    passed: results.filter(result => result.status === 'pass').length,
                    failed: results.filter(result => result.status === 'fail').length,
                },
            }, '*');
        }

        return results;
    }

    global.Chess2TestHarness = {
        add,
        assert,
        equal,
        includes,
        runAll,
        lastResults: [],
    };
})(typeof self !== 'undefined' ? self : window);