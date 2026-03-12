(function (global) {
	function formatMoveLabel(entry) {
		if (!entry) return '';
		return entry.san || entry.uci || '';
	}

	function render(container, entries, activeIndex, onSelect) {
		if (!container) return;
		container.innerHTML = '';

		if (!Array.isArray(entries) || !entries.length) {
			const empty = document.createElement('div');
			empty.className = 'move-list-empty';
			empty.textContent = 'No moves yet.';
			container.appendChild(empty);
			return;
		}

		for (let index = 0; index < entries.length; index += 2) {
			const row = document.createElement('div');
			row.className = 'move-list-row';

			const moveNumber = document.createElement('div');
			moveNumber.className = 'move-list-number';
			moveNumber.textContent = String(Math.floor(index / 2) + 1) + '.';
			row.appendChild(moveNumber);

			row.appendChild(createEntryButton(entries[index], index, activeIndex, onSelect));
			row.appendChild(createEntryButton(entries[index + 1], index + 1, activeIndex, onSelect));
			container.appendChild(row);
		}
	}

	function createEntryButton(entry, index, activeIndex, onSelect) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'move-list-entry' + (index === activeIndex ? ' active' : '');

		if (!entry) {
			button.disabled = true;
			button.textContent = '';
			return button;
		}

		button.textContent = formatMoveLabel(entry);
		if (typeof onSelect === 'function') {
			button.addEventListener('click', () => onSelect(index, entry));
		}
		return button;
	}

	global.Chess2MoveList = { render };
})(window);
