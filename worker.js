// worker.js
// Optional Web Worker wrapper around engine/engine.js.

importScripts(
	'engine/core/magic.js',
	'engine/core/bitboards.js',
	'engine/core/position.js',
	'engine/core/movegen.js',
	'engine/core/zobrist.js',
	'engine/search/tt.js',
	'engine/search/ordering.js',
	'engine/search/stack.js',
	'engine/eval/pst.js',
	'engine/eval/pawns.js',
	'engine/eval/mobility.js',
	'engine/eval/king_safety.js',
	'engine/eval/threats.js',
	'engine/eval/nnue.js',
	'engine/eval/eval.js',
	'engine/search/search.js',
	'engine/engine.js'
);

const engine = typeof createEngine === 'function' ? createEngine() : null;

function post(type, payload, requestId) {
	self.postMessage(Object.assign({ type, requestId }, payload || {}));
}

self.addEventListener('message', event => {
	if (!engine) {
		post('error', { message: 'Engine API unavailable in worker.' });
		return;
	}

	const data = event.data || {};
	const requestId = data.requestId;

	switch (data.type) {
		case 'setPosition':
			engine.setPosition(data.fen);
			post('position-set', { fen: engine.getFEN() }, requestId);
			break;
		case 'makeMove':
			post('move-made', { ok: engine.makeMove(data.move), fen: engine.getFEN() }, requestId);
			break;
		case 'go':
			engine.go(data.options || {}, info => post('info', { info }, requestId))
				.then(result => post('bestmove', result, requestId))
				.catch(error => post('error', { message: error && error.message ? error.message : String(error) }, requestId));
			break;
		case 'stop':
			engine.stop();
			post('stopped', {}, requestId);
			break;
		case 'getInfo':
			post('info', { info: engine.getInfo() }, requestId);
			break;
		case 'getNNUEStatus':
			post('nnue-status', { nnue: engine.getNNUEStatus() }, requestId);
			break;
		case 'loadNNUE':
			try {
				post('nnue-status', { nnue: engine.loadNNUE(data.network, data.options || {}) }, requestId);
			} catch (error) {
				post('error', { message: error && error.message ? error.message : String(error) }, requestId);
			}
			break;
		case 'resetNNUE':
			try {
				post('nnue-status', { nnue: engine.resetNNUE() }, requestId);
			} catch (error) {
				post('error', { message: error && error.message ? error.message : String(error) }, requestId);
			}
			break;
		default:
			post('error', { message: 'Unknown worker command: ' + data.type }, requestId);
			break;
	}
});
