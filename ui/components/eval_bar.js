(function (global) {
	function render(container, score) {
		if (!container) return;
		const numeric = Number(score);
		const clamped = Number.isFinite(numeric) ? Math.max(-8, Math.min(8, numeric)) : 0;
		const whitePercent = 50 + (clamped / 8) * 50;

		container.innerHTML = [
			'<div class="eval-bar-track">',
			'<div class="eval-bar-fill-black" style="height:' + (100 - whitePercent) + '%"></div>',
			'<div class="eval-bar-fill-white" style="height:' + whitePercent + '%"></div>',
			'</div>',
			'<div class="eval-bar-label">' + escapeHtml(formatScore(score)) + '</div>'
		].join('');
	}

	function formatScore(score) {
		if (score == null || score === '') return '0.00';
		if (typeof score === 'string') return score;
		if (!Number.isFinite(Number(score))) return '0.00';
		const numeric = Number(score);
		return numeric > 0 ? '+' + numeric.toFixed(2) : numeric.toFixed(2);
	}

	function escapeHtml(value) {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	global.Chess2EvalBar = { render, formatScore };
})(window);
