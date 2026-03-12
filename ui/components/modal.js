(function (global) {
	function choose(options) {
		const choices = Array.isArray(options && options.choices) ? options.choices : [];
		const title = options && options.title ? options.title : 'Choose';
		const description = options && options.description ? options.description : '';

		return new Promise(resolve => {
			const overlay = document.createElement('div');
			overlay.className = 'app-modal-overlay';

			const modal = document.createElement('div');
			modal.className = 'app-modal';
			modal.innerHTML = '<h3 class="app-modal-title"></h3><p class="app-modal-description"></p><div class="app-modal-actions"></div>';

			modal.querySelector('.app-modal-title').textContent = title;
			modal.querySelector('.app-modal-description').textContent = description;
			const actions = modal.querySelector('.app-modal-actions');

			choices.forEach(choice => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'app-modal-btn';
				button.textContent = choice.label;
				button.addEventListener('click', () => close(choice.value));
				actions.appendChild(button);
			});

			const cancelButton = document.createElement('button');
			cancelButton.type = 'button';
			cancelButton.className = 'app-modal-btn secondary';
			cancelButton.textContent = 'Cancel';
			cancelButton.addEventListener('click', () => close(null));
			actions.appendChild(cancelButton);

			overlay.addEventListener('click', event => {
				if (event.target === overlay) close(null);
			});

			overlay.appendChild(modal);
			document.body.appendChild(overlay);

			function close(value) {
				overlay.remove();
				resolve(value);
			}
		});
	}

	global.Chess2Modal = { choose };
})(window);
