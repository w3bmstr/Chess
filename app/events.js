(function (global) {
	function createEventEmitter() {
		const listeners = new Map();

		function on(eventName, listener) {
			if (typeof listener !== 'function') {
				return function noop() {};
			}

			const bucket = listeners.get(eventName) || new Set();
			bucket.add(listener);
			listeners.set(eventName, bucket);

			return function unsubscribe() {
				bucket.delete(listener);
				if (!bucket.size) {
					listeners.delete(eventName);
				}
			};
		}

		function emit(eventName, payload) {
			const bucket = listeners.get(eventName);
			if (!bucket) return;
			bucket.forEach(listener => listener(payload));
		}

		return { on, emit };
	}

	global.createEventEmitter = createEventEmitter;
})(window);
