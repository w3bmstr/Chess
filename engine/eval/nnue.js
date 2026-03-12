// nnue.js
// NNUE evaluation for chess engine

(function (global) {
	const core = global.ChessCore;
	if (!core) {
		throw new Error('nnue.js requires ChessCore from position.js.');
	}

	const FEATURE_COUNT = 12 * 64;
	const DEFAULT_SOURCE = 'embedded-default';
	const PIECE_BASE = [0, 100, 320, 330, 500, 900, 0];
	let network = null;
	let networkStatus = {
		ready: false,
		source: 'none',
		name: null,
		version: null,
		featureCount: 0,
		blend: null,
		scale: null,
		lastError: null,
	};

	function cloneArray(values) {
		return Array.isArray(values) ? values.slice() : [];
	}

	function mirrorSquare(square) {
		const file = square & 7;
		const rank = square >>> 3;
		return ((7 - rank) << 3) | file;
	}

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function squareBonus(pieceCode, square) {
		const file = square & 7;
		const rank = square >>> 3;
		const fileDistance = Math.abs(file - 3.5);
		const rankDistance = Math.abs(rank - 3.5);
		const center = Math.max(0, 3.5 - fileDistance) + Math.max(0, 3.5 - rankDistance);

		switch (pieceCode) {
			case core.PIECE_PAWN:
				return rank * 12 + Math.round((3.5 - fileDistance) * 4);
			case core.PIECE_KNIGHT:
				return Math.round(center * 12) - rankDistance * 4;
			case core.PIECE_BISHOP:
				return Math.round(center * 8) - fileDistance * 2;
			case core.PIECE_ROOK:
				return rank * 4 + Math.round((3.5 - fileDistance) * 2);
			case core.PIECE_QUEEN:
				return Math.round(center * 5);
			case core.PIECE_KING:
				return rank <= 1 ? 24 - Math.round(fileDistance * 4) : -Math.round(center * 6);
			default:
				return 0;
		}
	}

	function buildDefaultNetwork() {
		const featureWeights = new Array(FEATURE_COUNT).fill(0);
		for (let pieceIndex = 0; pieceIndex < 12; pieceIndex++) {
			const color = pieceIndex < 6 ? core.COLOR_WHITE : core.COLOR_BLACK;
			const pieceCode = (pieceIndex % 6) + 1;
			const sign = color === core.COLOR_WHITE ? 1 : -1;
			for (let square = 0; square < 64; square++) {
				const orientedSquare = color === core.COLOR_WHITE ? square : mirrorSquare(square);
				featureWeights[pieceIndex * 64 + square] = sign * (PIECE_BASE[pieceCode] + squareBonus(pieceCode, orientedSquare));
			}
		}

		return {
			name: 'embedded-linear-default',
			version: 1,
			scale: 2,
			blend: 0,
			bias: 0,
			featureWeights,
		};
	}

	function applyStatus(nextStatus) {
		networkStatus = Object.assign({}, networkStatus, nextStatus || {});
	}

	function normalizeNetwork(nextNetwork, options) {
		if (!nextNetwork || typeof nextNetwork !== 'object') {
			throw new Error('NNUE network must be an object.');
		}

		const rawWeights = Array.isArray(nextNetwork.featureWeights) ? nextNetwork.featureWeights : null;
		if (!rawWeights) {
			throw new Error('NNUE network is missing featureWeights.');
		}

		const featureWeights = new Array(FEATURE_COUNT).fill(0);
		const limit = Math.min(rawWeights.length, FEATURE_COUNT);
		for (let index = 0; index < limit; index++) {
			const value = Number(rawWeights[index]);
			if (!Number.isFinite(value)) {
				throw new Error('NNUE featureWeights must contain only finite numbers.');
			}
			featureWeights[index] = value;
		}

		const bias = Number(nextNetwork.bias);
		if (!Number.isFinite(bias)) {
			throw new Error('NNUE bias must be a finite number.');
		}

		const scaleValue = Number(nextNetwork.scale);
		const blendValue = Number(nextNetwork.blend);
		const scale = Number.isFinite(scaleValue) && scaleValue > 0 ? scaleValue : 1;
		const blend = Number.isFinite(blendValue) ? clamp(blendValue, 0, 1) : 1;
		const source = options && typeof options.source === 'string' && options.source ? options.source : 'runtime';

		return {
			name: nextNetwork.name || 'custom-network',
			version: nextNetwork.version == null ? 1 : nextNetwork.version,
			scale,
			blend,
			bias,
			featureWeights,
			source,
		};
	}

	function extractFeatures(pos) {
		const features = [];
		for (let square = 0; square < 64; square++) {
			const piece = pos.board[square];
			if (!piece) continue;
			const pieceIndex = core.pieceIndexFromChar(piece);
			if (pieceIndex < 0) continue;
			features.push(pieceIndex * 64 + square);
		}
		return features;
	}

	function getNetwork() {
		if (!network) return null;
		return {
			name: network.name,
			version: network.version,
			scale: network.scale,
			blend: network.blend,
			bias: network.bias,
			source: network.source,
			featureWeights: cloneArray(network.featureWeights),
		};
	}

	function loadNetwork(nextNetwork, options) {
		const normalized = normalizeNetwork(nextNetwork, options);
		network = normalized;
		applyStatus({
			ready: true,
			source: normalized.source,
			name: normalized.name,
			version: normalized.version,
			featureCount: normalized.featureWeights.length,
			blend: normalized.blend,
			scale: normalized.scale,
			lastError: null,
		});
		return getStatus();
	}

	function setNetwork(nextNetwork, options) {
		return loadNetwork(nextNetwork, options);
	}

	function loadDefaultNetwork() {
		return loadNetwork(buildDefaultNetwork(), { source: DEFAULT_SOURCE });
	}

	function clearNetwork() {
		network = null;
		applyStatus({
			ready: false,
			source: 'none',
			name: null,
			version: null,
			featureCount: 0,
			blend: null,
			scale: null,
		});
	}

	function isReady() {
		return Boolean(network && Array.isArray(network.featureWeights) && typeof network.bias === 'number');
	}

	function getStatus() {
		return Object.assign({}, networkStatus);
	}

	function evaluate(pos, classicalScore) {
		if (!isReady()) return typeof classicalScore === 'number' ? classicalScore : null;
		const features = extractFeatures(pos);
		let total = network.bias;
		for (const feature of features) {
			total += network.featureWeights[feature] || 0;
		}
		const scaled = Math.round(total / (network.scale || 1));
		if (typeof classicalScore === 'number' && Number.isFinite(network.blend)) {
			const blend = Math.max(0, Math.min(1, network.blend));
			return Math.round(classicalScore * (1 - blend) + scaled * blend);
		}
		return scaled;
	}

	function boot() {
		const preloaded = global.CHESS2_NNUE_NETWORK;
		if (preloaded) {
			try {
				loadNetwork(preloaded, { source: 'preloaded' });
				return;
			} catch (error) {
				applyStatus({
					lastError: error && error.message ? error.message : String(error),
				});
			}
		}

		loadDefaultNetwork();
	}

	boot();

	global.NNUE = {
		setNetwork,
		loadNetwork,
		loadDefaultNetwork,
		clearNetwork,
		isReady,
		getStatus,
		getNetwork,
		extractFeatures,
		evaluate,
	};
})(typeof self !== 'undefined' ? self : window);
