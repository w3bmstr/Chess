// tt.js
// First real transposition table pass using a bounded Map.

(function (global) {
	const EXACT = 0;
	const LOWER = 1;
	const UPPER = 2;
	const MAX_ENTRIES = 50000;
	const table = new Map();
	let generation = 0;

	function keyString(hash) {
		return BigInt.asUintN(64, hash).toString();
	}

	function scoreToTT(score, ply) {
		if (score > 31000) return score + ply;
		if (score < -31000) return score - ply;
		return score;
	}

	function scoreFromTT(score, ply) {
		if (score > 31000) return score - ply;
		if (score < -31000) return score + ply;
		return score;
	}

	const TT = {
		EXACT,
		LOWER,
		UPPER,

		newSearch() {
			generation++;
		},

		store(hash, move, score, depth, bound, ply) {
			const key = keyString(hash);
			const existing = table.get(key);
			if (existing && existing.depth > depth && existing.generation === generation) {
				return;
			}

			table.set(key, {
				move: move || 0,
				score: scoreToTT(score, ply),
				depth,
				bound,
				generation,
			});

			if (table.size > MAX_ENTRIES) {
				const oldestKey = table.keys().next().value;
				table.delete(oldestKey);
			}
		},

		probe(hash, depth, alpha, beta, ply, out) {
			const entry = table.get(keyString(hash));
			out.hit = false;
			out.move = 0;
			out.score = 0;
			out.bound = UPPER;

			if (!entry) return false;

			out.hit = true;
			out.move = entry.move;
			out.score = scoreFromTT(entry.score, ply);
			out.bound = entry.bound;

			if (entry.depth < depth) return false;
			if (entry.bound === EXACT) return true;
			if (entry.bound === LOWER && out.score >= beta) return true;
			if (entry.bound === UPPER && out.score <= alpha) return true;
			return false;
		},

		hashfull() {
			return Math.min(1000, Math.floor((table.size / MAX_ENTRIES) * 1000));
		},

		clear() {
			table.clear();
			generation = 0;
		},

		stats() {
			return {
				size: table.size,
				maxEntries: MAX_ENTRIES,
				generation,
				hashfull: this.hashfull(),
			};
		},

		inspect(hash) {
			const key = keyString(hash);
			const entry = table.get(key);
			if (!entry) return null;

			return {
				key,
				move: entry.move || 0,
				score: entry.score,
				depth: entry.depth,
				bound: entry.bound,
				generation: entry.generation,
			};
		},
	};

	global.TT = TT;
})(typeof self !== 'undefined' ? self : window);
