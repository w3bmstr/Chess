(function (global) {
	function create(options) {
		const boardEl = options && options.boardEl;
		let files = options && options.files ? options.files : 'abcdefgh';
		let ranks = options && options.ranks ? options.ranks : '87654321';
		const overlayMarkerId = 'board-arrow-head-' + Math.random().toString(36).slice(2, 10);
		let overlayEl = null;
		let flipped = false;
		let lastSnapshot = null;
		const dragState = {
			active: false,
			source: null,
			over: null,
			pointerId: null,
			suppressClick: false,
		};

		function init() {
			buildSquares({
				boardEl,
				files,
				ranks,
				flipped,
				dragState,
				onSquareClick(squareName) {
					if (typeof options.onSquareClick === 'function') {
						options.onSquareClick(squareName);
					}
				},
			});
			overlayEl = ensureArrowOverlay(boardEl, overlayMarkerId);
		}

		function render(snapshot) {
			if (!boardEl || !snapshot) return;
			const nextFiles = snapshot.files || files;
			const nextRanks = snapshot.ranks || ranks;
			if (nextFiles !== files || nextRanks !== ranks) {
				files = nextFiles;
				ranks = nextRanks;
				buildSquares({
					boardEl,
					files,
					ranks,
					flipped,
					dragState,
					onSquareClick(squareName) {
						if (typeof options.onSquareClick === 'function') {
							options.onSquareClick(squareName);
						}
					},
				});
				overlayEl = ensureArrowOverlay(boardEl, overlayMarkerId);
			}
			lastSnapshot = snapshot;
			renderPieces({
				boardEl,
				fen: snapshot.fen,
				files,
				ranks,
				createPiece: options.createPiece,
			});

			applyAnnotations({
				boardEl,
				selectedSquare: snapshot.selectedSquare,
				legalTargets: snapshot.legalTargets,
				lastMoveSquares: snapshot.lastMoveSquares,
				checkSquare: snapshot.checkSquare,
			});

			renderArrows({
				boardEl,
				overlayEl,
				overlayMarkerId,
				arrows: snapshot.arrows || [],
			});
		}

		function setFlipped(nextFlipped) {
			const target = Boolean(nextFlipped);
			if (flipped === target) return;
			flipped = target;
			buildSquares({
				boardEl,
				files,
				ranks,
				flipped,
				dragState,
				onSquareClick(squareName) {
					if (typeof options.onSquareClick === 'function') {
						options.onSquareClick(squareName);
					}
				},
			});
			overlayEl = ensureArrowOverlay(boardEl, overlayMarkerId);
			if (lastSnapshot) {
				render(lastSnapshot);
			}
		}

		return {
			init,
			render,
			setFlipped,
			getElement() {
				return boardEl;
			},
		};
	}

	function buildSquares(options) {
		const boardEl = options && options.boardEl;
		if (!boardEl) return;

		const files = options.files || 'abcdefgh';
		const ranks = options.ranks || '87654321';
		const fileCount = files.length;
		const rankCount = ranks.length;
		const flipped = Boolean(options && options.flipped);
		const displayFiles = flipped ? reverseAxis(files) : files;
		const displayRanks = flipped ? reverseAxis(ranks) : ranks;
		const dragState = options.dragState || null;
		boardEl.innerHTML = '';
		boardEl.style.gridTemplateColumns = 'repeat(' + fileCount + ', minmax(0, 1fr))';
		boardEl.style.gridTemplateRows = 'repeat(' + rankCount + ', minmax(0, 1fr))';
		boardEl.style.setProperty('--board-aspect-ratio', String(fileCount) + ' / ' + String(rankCount));

		for (let rank = 0; rank < rankCount; rank++) {
			for (let file = 0; file < fileCount; file++) {
				const square = document.createElement('div');
				square.classList.add('square');
				square.classList.add((rank + file) % 2 === 0 ? 'light' : 'dark');
				square.dataset.square = displayFiles[file] + displayRanks[rank];

				if (file === 0) {
					const rankLabel = document.createElement('span');
					rankLabel.className = 'square-label rank-label';
					rankLabel.textContent = displayRanks[rank];
					square.appendChild(rankLabel);
				}

				if (rank === rankCount - 1) {
					const fileLabel = document.createElement('span');
					fileLabel.className = 'square-label file-label';
					fileLabel.textContent = displayFiles[file];
					square.appendChild(fileLabel);
				}

				boardEl.appendChild(square);
			}
		}

		if (!boardEl.dataset.bound && typeof options.onSquareClick === 'function') {
			boardEl.dataset.bound = 'true';

			function clearDragClasses() {
				boardEl.querySelectorAll('.square-drag-source, .square-drag-over').forEach(square => {
					square.classList.remove('square-drag-source', 'square-drag-over');
				});
			}

			function resetDragState() {
				if (!dragState) return;
				dragState.active = false;
				dragState.source = null;
				dragState.over = null;
				dragState.pointerId = null;
				clearDragClasses();
			}

			function squareFromPoint(clientX, clientY) {
				const target = document.elementFromPoint(clientX, clientY);
				const square = target && typeof target.closest === 'function' ? target.closest('.square') : null;
				return square && boardEl.contains(square) ? square : null;
			}

			boardEl.addEventListener('pointerdown', event => {
				if (!dragState) return;
				const square = event.target.closest('.square');
				if (!square || !boardEl.contains(square)) return;
				if (!square.classList.contains('has-piece')) return;

				dragState.active = true;
				dragState.source = square.dataset.square;
				dragState.over = square.dataset.square;
				dragState.pointerId = event.pointerId;
				clearDragClasses();
				square.classList.add('square-drag-source');
			});

			boardEl.addEventListener('pointermove', event => {
				if (!dragState || !dragState.active || dragState.pointerId !== event.pointerId) return;
				const overSquare = squareFromPoint(event.clientX, event.clientY);
				clearDragClasses();
				const sourceEl = dragState.source ? boardEl.querySelector('[data-square="' + dragState.source + '"]') : null;
				if (sourceEl) sourceEl.classList.add('square-drag-source');
				if (overSquare) {
					dragState.over = overSquare.dataset.square;
					overSquare.classList.add('square-drag-over');
				}
			});

			boardEl.addEventListener('pointerup', event => {
				if (!dragState || !dragState.active || dragState.pointerId !== event.pointerId) return;
				const sourceSquare = dragState.source;
				const overSquare = squareFromPoint(event.clientX, event.clientY);
				const targetSquare = overSquare ? overSquare.dataset.square : dragState.over;

				if (sourceSquare && targetSquare && sourceSquare !== targetSquare) {
					dragState.suppressClick = true;
					options.onSquareClick(sourceSquare);
					options.onSquareClick(targetSquare);
				}

				resetDragState();
			});

			boardEl.addEventListener('pointercancel', () => {
				resetDragState();
			});

			boardEl.addEventListener('click', event => {
				if (dragState && dragState.suppressClick) {
					dragState.suppressClick = false;
					return;
				}
				const square = event.target.closest('.square');
				if (!square || !boardEl.contains(square)) return;
				options.onSquareClick(square.dataset.square);
			});
		}
	}

	function renderPieces(options) {
		const boardEl = options && options.boardEl;
		const fen = options && options.fen;
		const files = options && options.files ? options.files : 'abcdefgh';
		const ranks = options && options.ranks ? options.ranks : '87654321';
		const createPiece = options && options.createPiece;
		if (!boardEl || !fen || typeof createPiece !== 'function') return;

		const squares = boardEl.querySelectorAll('.square');
		squares.forEach(square => {
			square.querySelectorAll('.piece').forEach(piece => piece.remove());
		});

		const rows = String(fen).split(' ')[0].split('/');

		for (let rank = 0; rank < ranks.length; rank++) {
			const row = rows[rank] || String(files.length);
			let fileIndex = 0;
				for (let file = 0; file < row.length; file++) {
					const token = row[file];
					if (/^[0-9]$/.test(token)) {
						let digits = token;
						while (file + 1 < row.length && /^[0-9]$/.test(row[file + 1])) {
							file += 1;
							digits += row[file];
						}
						fileIndex += parseInt(digits, 10);
						continue;
					}

					const piece = createPiece(token);
					const squareName = files[fileIndex] + ranks[rank];
					const squareEl = boardEl.querySelector('[data-square="' + squareName + '"]');
					if (piece && squareEl) squareEl.appendChild(piece);
					fileIndex++;
				}
		}
	}

	function ensureArrowOverlay(boardEl, overlayMarkerId) {
		if (!boardEl) return null;
		let overlayEl = boardEl.querySelector('.board-arrow-overlay');
		if (overlayEl) return overlayEl;

		overlayEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		overlayEl.setAttribute('class', 'board-arrow-overlay');
		overlayEl.setAttribute('viewBox', '0 0 800 800');
		overlayEl.setAttribute('preserveAspectRatio', 'none');

		const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
		const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
		marker.setAttribute('id', overlayMarkerId);
		marker.setAttribute('markerWidth', '8');
		marker.setAttribute('markerHeight', '8');
		marker.setAttribute('refX', '6');
		marker.setAttribute('refY', '4');
		marker.setAttribute('orient', 'auto');
		marker.setAttribute('markerUnits', 'strokeWidth');

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', 'M 0 0 L 8 4 L 0 8 z');
		path.setAttribute('fill', 'context-stroke');
		marker.appendChild(path);
		defs.appendChild(marker);
		overlayEl.appendChild(defs);
		boardEl.appendChild(overlayEl);
		return overlayEl;
	}

	function renderArrows(options) {
		const boardEl = options && options.boardEl;
		const overlayMarkerId = options && options.overlayMarkerId ? options.overlayMarkerId : 'board-arrow-head';
		const overlayEl = options && options.overlayEl ? options.overlayEl : ensureArrowOverlay(boardEl, overlayMarkerId);
		const arrows = Array.isArray(options && options.arrows) ? options.arrows : [];
		if (!boardEl || !overlayEl) return;
		overlayEl.setAttribute('viewBox', '0 0 ' + String(Math.max(1, boardEl.clientWidth || 1)) + ' ' + String(Math.max(1, boardEl.clientHeight || 1)));

		overlayEl.querySelectorAll('.board-arrow-line').forEach(node => node.remove());
		arrows.forEach((arrow, index) => {
			if (!arrow || !arrow.from || !arrow.to || arrow.from === arrow.to) return;
			const fromPoint = getSquareCenter(boardEl, arrow.from);
			const toPoint = getSquareCenter(boardEl, arrow.to);
			if (!fromPoint || !toPoint) return;

			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			line.setAttribute('class', 'board-arrow-line');
			if (arrow.variant) {
				line.classList.add('board-arrow-' + String(arrow.variant));
			}
			line.setAttribute('x1', String(fromPoint.x));
			line.setAttribute('y1', String(fromPoint.y));
			line.setAttribute('x2', String(toPoint.x));
			line.setAttribute('y2', String(toPoint.y));
			line.setAttribute('marker-end', 'url(#' + overlayMarkerId + ')');
			if (arrow.color) {
				line.style.setProperty('--board-arrow-color', String(arrow.color));
			}
			if (arrow.strokeWidth != null) {
				line.style.setProperty('--board-arrow-width', String(arrow.strokeWidth));
			}
			if (arrow.dashArray) {
				line.style.strokeDasharray = String(arrow.dashArray);
			}
			line.style.opacity = arrow.opacity != null ? String(arrow.opacity) : (index === 0 ? '0.96' : '0.72');
			overlayEl.appendChild(line);
		});
	}

	function getSquareCenter(boardEl, squareName) {
		const squareEl = boardEl.querySelector('[data-square="' + squareName + '"]');
		if (!squareEl) return null;
		const left = Number(squareEl.offsetLeft) || 0;
		const top = Number(squareEl.offsetTop) || 0;
		const width = Number(squareEl.offsetWidth) || 0;
		const height = Number(squareEl.offsetHeight) || 0;
		return {
			x: left + (width / 2),
			y: top + (height / 2),
		};
	}

	function reverseAxis(text) {
		return String(text || '').split('').reverse().join('');
	}

	function applyAnnotations(options) {
		const boardEl = options && options.boardEl;
		if (!boardEl) return;

		const selectedSquare = options.selectedSquare || null;
		const legalTargets = options.legalTargets || [];
		const lastMoveSquares = options.lastMoveSquares || [];
		const checkSquare = options.checkSquare || null;

		const squares = boardEl.querySelectorAll('.square');
		squares.forEach(square => {
			square.classList.remove('square-selected', 'square-legal', 'square-last-move', 'square-check', 'has-piece');
			if (square.querySelector('.piece')) square.classList.add('has-piece');
		});

		if (selectedSquare) {
			const selectedEl = boardEl.querySelector('[data-square="' + selectedSquare + '"]');
			if (selectedEl) selectedEl.classList.add('square-selected');
		}

		legalTargets.forEach(squareName => {
			const squareEl = boardEl.querySelector('[data-square="' + squareName + '"]');
			if (squareEl) squareEl.classList.add('square-legal');
		});

		lastMoveSquares.forEach(squareName => {
			const squareEl = boardEl.querySelector('[data-square="' + squareName + '"]');
			if (squareEl) squareEl.classList.add('square-last-move');
		});

		if (checkSquare) {
			const checkEl = boardEl.querySelector('[data-square="' + checkSquare + '"]');
			if (checkEl) checkEl.classList.add('square-check');
		}
	}

	global.Chess2Board = {
		create,
		buildSquares,
		renderPieces,
		applyAnnotations,
		renderArrows,
	};
})(window);
