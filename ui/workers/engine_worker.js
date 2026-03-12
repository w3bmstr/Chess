// engine_worker.js
// UI-side engine bridge that prefers the Worker transport and falls back to the local engine.

(function (global) {
    function createLocalEngineBridge() {
        if (typeof global.createEngine !== 'function') {
            throw new Error('createEngine is not available.');
        }

        const engine = global.createEngine();
        return {
            mode: 'local',
            setPosition(fen) {
                engine.setPosition(fen);
            },
            makeMove(move) {
                return engine.makeMove(move);
            },
            go(options, onInfo) {
                return engine.go(options, onInfo);
            },
            stop() {
                engine.stop();
            },
            getBestMove() {
                return engine.getBestMove();
            },
            getInfo() {
                return engine.getInfo();
            },
            getNNUEStatus() {
                return typeof engine.getNNUEStatus === 'function' ? engine.getNNUEStatus() : { ready: false, source: 'unavailable' };
            },
            loadNNUE(network, options) {
                if (typeof engine.loadNNUE !== 'function') {
                    throw new Error('loadNNUE is not available.');
                }
                return engine.loadNNUE(network, options);
            },
            resetNNUE() {
                if (typeof engine.resetNNUE !== 'function') {
                    throw new Error('resetNNUE is not available.');
                }
                return engine.resetNNUE();
            },
            getFEN() {
                return typeof engine.getFEN === 'function' ? engine.getFEN() : null;
            },
            destroy() {},
        };
    }

    function createWorkerEngineBridge() {
        if (typeof global.Worker !== 'function') {
            throw new Error('Web Workers are not supported in this environment.');
        }

        const worker = new global.Worker('worker.js');
        let nextRequestId = 1;
        let lastInfo = { depth: 0, score: 0, nodes: 0, pv: [], bestMove: null };
        let lastBestMove = null;
        let disposed = false;
        let activeGo = null;
        const pending = new Map();

        function makeDeferred(type, onInfo) {
            const requestId = nextRequestId++;
            let resolveRef;
            let rejectRef;
            const promise = new Promise((resolve, reject) => {
                resolveRef = resolve;
                rejectRef = reject;
            });

            pending.set(requestId, {
                type,
                resolve: resolveRef,
                reject: rejectRef,
                onInfo,
            });

            return { requestId, promise };
        }

        function send(type, payload, requestId) {
            worker.postMessage(Object.assign({ type, requestId }, payload || {}));
        }

        worker.addEventListener('message', event => {
            if (disposed) return;
            const data = event.data || {};
            const requestId = data.requestId;

            if (data.type === 'info') {
                lastInfo = data.info || lastInfo;
                if (activeGo && typeof activeGo.onInfo === 'function') {
                    activeGo.onInfo(lastInfo);
                }
                return;
            }

            if (data.type === 'bestmove') {
                lastBestMove = data.bestMove || null;
                const deferred = requestId ? pending.get(requestId) : activeGo;
                if (requestId) pending.delete(requestId);
                if (activeGo && activeGo.requestId === requestId) activeGo = null;
                if (deferred) {
                    deferred.resolve({ bestMove: data.bestMove || null, score: data.score || 0 });
                }
                return;
            }

            if (data.type === 'nnue-status') {
                const deferred = requestId ? pending.get(requestId) : null;
                if (requestId) pending.delete(requestId);
                if (deferred) {
                    deferred.resolve(data.nnue || { ready: false, source: 'unavailable' });
                }
                return;
            }

            if (data.type === 'error') {
                const deferred = requestId ? pending.get(requestId) : activeGo;
                if (requestId) pending.delete(requestId);
                if (activeGo && activeGo.requestId === requestId) activeGo = null;
                const error = new Error(data.message || 'Worker engine error');
                if (deferred) deferred.reject(error);
                return;
            }

            if (!requestId) return;

            const deferred = pending.get(requestId);
            if (!deferred) return;

            if (data.type === 'position-set' || data.type === 'move-made' || data.type === 'stopped') {
                pending.delete(requestId);
                deferred.resolve(data);
            }
        });

        return {
            mode: 'worker',
            setPosition(fen) {
                const deferred = makeDeferred('setPosition');
                send('setPosition', { fen }, deferred.requestId);
                return deferred.promise;
            },
            makeMove(move) {
                const deferred = makeDeferred('makeMove');
                send('makeMove', { move }, deferred.requestId);
                return deferred.promise.then(result => Boolean(result.ok));
            },
            go(options, onInfo) {
                const deferred = makeDeferred('go', onInfo);
                activeGo = Object.assign({ requestId: deferred.requestId }, pending.get(deferred.requestId));
                send('go', { options: options || {} }, deferred.requestId);
                return deferred.promise;
            },
            stop() {
                const deferred = makeDeferred('stop');
                send('stop', {}, deferred.requestId);
                if (activeGo) {
                    activeGo = null;
                }
                return deferred.promise;
            },
            getBestMove() {
                return lastBestMove;
            },
            getInfo() {
                return lastInfo;
            },
            getNNUEStatus() {
                const deferred = makeDeferred('getNNUEStatus');
                send('getNNUEStatus', {}, deferred.requestId);
                return deferred.promise;
            },
            loadNNUE(network, options) {
                const deferred = makeDeferred('loadNNUE');
                send('loadNNUE', { network, options: options || {} }, deferred.requestId);
                return deferred.promise;
            },
            resetNNUE() {
                const deferred = makeDeferred('resetNNUE');
                send('resetNNUE', {}, deferred.requestId);
                return deferred.promise;
            },
            getFEN() {
                return null;
            },
            destroy() {
                disposed = true;
                pending.forEach(entry => entry.reject(new Error('Engine bridge disposed.')));
                pending.clear();
                activeGo = null;
                worker.terminate();
            },
        };
    }

    function createPlayEngine(options) {
        const opts = options || {};
        const isFileOrigin = typeof global.location !== 'undefined' && global.location && global.location.protocol === 'file:';
        if (opts.preferWorker !== false) {
            if (isFileOrigin) {
                return createLocalEngineBridge();
            }
            try {
                return createWorkerEngineBridge();
            } catch (error) {
                console.warn('engine_worker.js: worker transport unavailable, falling back to local engine.', error);
            }
        }
        return createLocalEngineBridge();
    }

    global.createPlayEngine = createPlayEngine;
})(typeof self !== 'undefined' ? self : window);