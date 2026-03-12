(function (global) {
	function copyText(text) {
		const value = String(text || '');
		if (!value) return Promise.resolve(false);

		if (global.navigator && global.navigator.clipboard && typeof global.navigator.clipboard.writeText === 'function') {
			return global.navigator.clipboard.writeText(value).then(() => true).catch(() => fallbackCopy(value));
		}

		return Promise.resolve(fallbackCopy(value));
	}

	function downloadText(filename, text) {
		const blob = new Blob([String(text || '')], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}

	function openTextFile(options) {
		const settings = options || {};
		return new Promise(resolve => {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = settings.accept || '.txt,text/plain';
			input.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;pointer-events:none;';
			const cleanup = function () {
				input.removeEventListener('change', onChange);
				input.remove();
			};
			const onChange = function () {
				const file = input.files && input.files[0];
				if (!file) {
					cleanup();
					resolve({ ok: false, cancelled: true, error: 'No file selected.' });
					return;
				}

				const reader = new FileReader();
				reader.onload = function () {
					cleanup();
					resolve({ ok: true, name: file.name, text: String(reader.result || '') });
				};
				reader.onerror = function () {
					cleanup();
					resolve({ ok: false, error: 'Could not read the selected file.' });
				};
				reader.readAsText(file);
			};

			input.addEventListener('change', onChange, { once: true });
			document.body.appendChild(input);
			input.click();
		});
	}

	function fallbackCopy(text) {
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
		document.body.appendChild(textarea);
		textarea.focus();
		textarea.select();
		let ok = false;
		try {
			ok = document.execCommand('copy');
		} catch (error) {
			ok = false;
		}
		textarea.remove();
		return ok;
	}

	global.Chess2Storage = {
		copyText,
		downloadText,
		openTextFile,
	};
})(window);
