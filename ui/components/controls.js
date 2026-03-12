(function (global) {
	const ACTIONS = [
		{ key: 'goStart', label: '|<' },
		{ key: 'goPrevious', label: '<' },
		{ key: 'goNext', label: '>' },
		{ key: 'goEnd', label: '>|' },
		{ key: 'newGame', label: 'New Game' },
		{ key: 'undoMove', label: 'Undo Move' },
	];

	function init(container, handlers) {
		if (!container) return;
		if (container.dataset.initialized === 'true') {
			updateState(container, handlers);
			return;
		}

		container.dataset.initialized = 'true';
		const bar = document.createElement('div');
		bar.className = 'play-action-bar';

		ACTIONS.forEach(action => {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'play-action-btn';
			button.dataset.action = action.key;
			button.textContent = action.label;
			button.addEventListener('click', () => {
				if (handlers && typeof handlers[action.key] === 'function') {
					handlers[action.key]();
				}
			});
			bar.appendChild(button);
		});

		container.innerHTML = '';
		container.appendChild(bar);
		updateState(container, handlers);
	}

	function updateState(container, handlers) {
		if (!container) return;
		setDisabled(container, 'goStart', !(handlers && handlers.canGoPrevious));
		setDisabled(container, 'goPrevious', !(handlers && handlers.canGoPrevious));
		setDisabled(container, 'goNext', !(handlers && handlers.canGoNext));
		setDisabled(container, 'goEnd', !(handlers && handlers.canGoNext));
		setDisabled(container, 'newGame', !(handlers && handlers.canNewGame !== false));
		setDisabled(container, 'undoMove', !(handlers && handlers.canUndo));
	}

	function setDisabled(container, action, disabled) {
		const button = container.querySelector('[data-action="' + action + '"]');
		if (button) {
			button.disabled = Boolean(disabled);
		}
	}

	global.Chess2Controls = {
		init,
		updateState,
	};
})(window);
