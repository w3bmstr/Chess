(function (global) {
	function create(options) {
		const settings = Object.assign({
			serverUrl: global.Chess2NetworkProtocol && typeof global.Chess2NetworkProtocol.getDefaultServerUrl === 'function'
				? global.Chess2NetworkProtocol.getDefaultServerUrl()
				: 'http://localhost:3000',
			timeoutMs: 10000,
		}, options || {});

		const listeners = new Map();
		let scriptPromise = null;
		let connectPromise = null;
		let socket = null;

		function loadClientScript() {
			if (!settings.serverUrl) {
				return Promise.reject(new Error('Multiplayer server URL is not configured. Set CHESS2_SOCKET_SERVER_URL in config/runtime-config.js.'));
			}
			if (typeof global.io === 'function') {
				return Promise.resolve(global.io);
			}
			if (scriptPromise) return scriptPromise;

			scriptPromise = new Promise((resolve, reject) => {
				const script = document.createElement('script');
				script.src = buildSocketScriptUrl();
				script.async = true;
				script.onload = () => {
					if (typeof global.io === 'function') {
						resolve(global.io);
						return;
					}
					reject(new Error('Socket.IO client failed to initialize.'));
				};
				script.onerror = () => reject(new Error('Unable to load local Socket.IO client from ' + script.src));
				document.head.appendChild(script);
			});

			return scriptPromise;
		}

		function connect() {
			if (socket && socket.connected) {
				return Promise.resolve(socket);
			}
			if (connectPromise) return connectPromise;

			connectPromise = loadClientScript().then(() => new Promise((resolve, reject) => {
				const client = global.io(settings.serverUrl, {
					transports: ['websocket', 'polling'],
					autoConnect: true,
					reconnection: true,
					reconnectionAttempts: Infinity,
					reconnectionDelay: 1000,
					reconnectionDelayMax: 4000,
				});
				socket = client;
				bindSocketListeners();

				let timeoutId = global.setTimeout(() => {
					timeoutId = null;
					connectPromise = null;
					try {
						client.disconnect();
					} catch (error) {
						// ignore disconnect errors during timeout cleanup
					}
					reject(new Error('Timed out while connecting to multiplayer server.'));
				}, settings.timeoutMs);

				const handleConnect = () => {
					cleanup();
					resolve(client);
				};

				const handleError = error => {
					cleanup();
					connectPromise = null;
					reject(error instanceof Error ? error : new Error(String(error || 'Connection failed.')));
				};

				function cleanup() {
					if (timeoutId) {
						global.clearTimeout(timeoutId);
						timeoutId = null;
					}
					client.off('connect', handleConnect);
					client.off('connect_error', handleError);
				}

				client.on('connect', handleConnect);
				client.on('connect_error', handleError);
			})).finally(() => {
				connectPromise = null;
			});

			return connectPromise;
		}

		function emit(eventName, payload) {
			return connect().then(activeSocket => {
				activeSocket.emit(eventName, payload);
				return activeSocket;
			});
		}

		function on(eventName, listener) {
			if (typeof listener !== 'function') {
				return function noop() {};
			}

			const bucket = listeners.get(eventName) || new Set();
			bucket.add(listener);
			listeners.set(eventName, bucket);

			if (socket) {
				socket.on(eventName, listener);
			}

			return function unsubscribe() {
				const currentBucket = listeners.get(eventName);
				if (!currentBucket) return;
				currentBucket.delete(listener);
				if (!currentBucket.size) {
					listeners.delete(eventName);
				}
				if (socket) {
					socket.off(eventName, listener);
				}
			};
		}

		function disconnect() {
			if (socket) {
				socket.disconnect();
				socket = null;
			}
		}

		function getSocket() {
			return socket;
		}

		function bindSocketListeners() {
			if (!socket) return;
			listeners.forEach((bucket, eventName) => {
				bucket.forEach(listener => {
					socket.off(eventName, listener);
					socket.on(eventName, listener);
				});
			});
		}

		return {
			connect,
			emit,
			on,
			disconnect,
			getSocket,
			getServerUrl() {
				return settings.serverUrl;
			},
		};
	}

	function buildSocketScriptUrl() {
		const configured = typeof global.CHESS2_SOCKET_CLIENT_SCRIPT_URL === 'string'
			? global.CHESS2_SOCKET_CLIENT_SCRIPT_URL.trim()
			: '';
		return configured || 'vendor/socket.io/socket.io.min.js';
	}

	global.Chess2SocketBridge = { create };
})(window);
