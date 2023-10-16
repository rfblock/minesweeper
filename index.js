'use strict';

const $ = x => document.querySelector(x);
const $$ = x => document.querySelectorAll(x);

const boardWidth = 30; // 22
const boardHeight = 16;
const boardElements = new Array(boardWidth * boardHeight).fill(null);
const boardMines = new Array(boardWidth * boardHeight).fill(false);
const boardRevealed = new Array(boardWidth * boardHeight).fill(false);
const boardFlagged = new Array(boardWidth * boardHeight).fill(false);
const countMines = 99; // 9
let firstClick = true;
let startTimestamp = null;
let endTimestamp = null;
let clicks = 0;

const coordinateToIndex = (x, y) => {
	if (x < 0 || x >= boardWidth || y < 0 || y >= boardHeight) {
		return null;
	}
	return x + y * boardWidth;
};

const iterateOverNeighbors = (idx, f) => {
	const x = idx % boardWidth;
	const y = idx / boardWidth | 0;
	const wrapper = (_x, _y) => {
		if (_x < 0 || _x >= boardWidth || _y < 0 || _y >= boardHeight) {
			return;
		}
		f(_x + _y * boardWidth);
	}

	wrapper(x-1, y-1);
	wrapper(x-1, y);
	wrapper(x-1, y+1);
	wrapper(x, y+1);
	wrapper(x, y-1);
	wrapper(x+1, y-1);
	wrapper(x+1, y);
	wrapper(x+1, y+1);
}

const countNeighboringMines = idx => {
	// Note: ternary required because javascript dumb (undefined ?? false === undefined)
	let count = 0;
	iterateOverNeighbors(idx, i => {
		count += boardMines[i];
	});
	return count;
}

const countNeighboringFlags = idx => {
	let count = 0;
	iterateOverNeighbors(idx, i => {
		count += boardFlagged[i];
	});
	return count;
}

const calculate3BV = () => {
	const passes = new Array(boardWidth * boardHeight).fill(false);
	let clicks = 0;

	const floodFill = idx => {
		if (passes[idx] || boardMines[idx]) {
			return false;
		}
		passes[idx] = true;
		if (countNeighboringMines(idx) === 0) {
			iterateOverNeighbors(idx, floodFill);
		}
		return true;
	}

	for (let i = 0; i < boardWidth * boardHeight; i++) {
		if (countNeighboringMines(i) === 0) {
			clicks += floodFill(i);
		}
	}
	for (let i = 0; i < boardWidth * boardHeight; i++) {
		if (countNeighboringMines(i) > 0 && !boardMines[i] && !passes[i]) {
			clicks += 1;
		}
	}

	return clicks;
}

const chord = idx => {
	const nearbyMines = countNeighboringMines(idx);
	const nearbyFlags = countNeighboringFlags(idx);
	if (nearbyMines === nearbyFlags) {
		iterateOverNeighbors(idx, reveal);
	}
}

const reveal = idx => {
	const element = boardElements[idx];
	if (boardFlagged[idx]) {
		return;
	}

	if (boardRevealed[idx] || boardRevealed[idx] === undefined) {
		rerenderElement(idx);
		return;
	}

	if (firstClick) {
		startTimestamp = Date.now();
	}

	if (boardMines[idx]) {
		if (firstClick) {
			boardMines[idx] = false;
			while (true) {
				const i = Math.random() * boardWidth * boardHeight;
				if (i === idx || boardMines[i]) {
					continue;
				}
				boardMines[i] = true;
				break;
			}
		} else {
			revealMines(idx);
			return;
		}
	}

	firstClick = false;
	boardRevealed[idx] = true;

	element.classList.add('open');
	let x = idx % boardWidth;
	let y = idx / boardWidth | 0;


	const count = countNeighboringMines(idx);
	if (count == 0) {
		iterateOverNeighbors(idx, reveal);
	}

	element.innerText = count != 0 ? count : '';
	if (checkCompletion()) {
		endTimestamp = Date.now();
		showModal();
	}
}

const flag = idx => {
	if (boardRevealed[idx]) {
		return;
	}

	const element = boardElements[idx];
	element.classList.toggle('flagged');
	boardFlagged[idx] = !boardFlagged[idx];
}

const revealMines = idx => {
	for (let i = 0; i < boardWidth * boardHeight; i++) {
		const flagged = boardFlagged[i];
		const mine = boardMines[i];
		const revealed = boardRevealed[i];
		const elem = boardElements[i];

		if (i === idx) {
			elem.classList.add('explosion');
			continue;
		}

		if (revealed) {
			continue;
		}

		if (flagged && !mine) {
			elem.classList.add('incorrect');
		} else if (!flagged && mine) {
			elem.classList.add('bomb');
		}
	}
}

const generateBoard = () => {
	let i = 0;
	while (i < countMines) {
		let x = Math.random() * boardWidth | 0;
		let y = Math.random() * boardHeight | 0;
		let idx = x + y * boardWidth;
		if (!boardMines[idx]) {
			boardMines[idx] = true;
			i++;
		}
	}
}

const checkCompletion = () => {
	for (let i = 0; i < boardWidth * boardHeight; i++) {
		if (boardRevealed[i] == boardMines[i]) {
			return false;
		}
	}

	return true;
}

const showModal = () => {
	let time = endTimestamp - startTimestamp;
	const ms = time % 1000;
	time = (time - ms) / 1000;
	const s = time % 60;
	time = (time - s) / 60;
	const m = time % 60;
	time = (time - m) / 60;
	const h = time;

	const _ms = ('000' + ms).slice(-3);
	const _s = ('00' + s).slice(-2);
	const _m = ('00' + m).slice(-2);

	let timeStr = ''
	if (h !== 0) {
		timeStr = `${h}:${_m}:${_s}.${_ms}`;
	} else {
		timeStr = `${m}:${_s}.${_ms}`;
	}

	const bbbv = calculate3BV();
	$('.time').innerText = timeStr;
	$('.bbbv').innerText = bbbv;
	$('.bbbvs').innerText = ((bbbv / (endTimestamp - startTimestamp) * 100000) | 0) / 100;
	$('.clicks').innerText = clicks;
	$('.efficiency').innerText = ((bbbv / clicks) * 1000 | 0) / 10 + '%';
	$('.modal-wrapper').classList.add('shown');
}

const rerenderElement = idx => {
	const x = idx % boardWidth;
	const y = idx / boardWidth | 0;
	const elem = boardElements[idx];

	const top = boardRevealed[coordinateToIndex(x, y-1)];
	const bottom = boardRevealed[coordinateToIndex(x, y+1)];
	const left = boardRevealed[coordinateToIndex(x-1, y)];
	const right = boardRevealed[coordinateToIndex(x+1, y)];

	elem.classList.add('debug');
	elem.classList.remove('debug');
	if (boardRevealed[idx]) {
		if (x != 0) {
			elem.classList.remove('left');
		}
		if (y != 0) {
			elem.classList.remove('top');
		}

		elem.classList.remove('radius-top');
		elem.classList.remove('radius-bottom');
		elem.classList.remove('radius-left');
		elem.classList.remove('radius-right');
		return;
	}

	if (top) { elem.classList.add('radius-top') }
	if (bottom) { elem.classList.add('radius-bottom') }
	if (left) { elem.classList.add('radius-left') }
	if (right) { elem.classList.add('radius-right') }

	if (top) {
		elem.classList.remove('top');
	} else {
		elem.classList.add('top');
	}

	if (left) {
		elem.classList.remove('left');
	} else {
		elem.classList.add('left');
	}
}

const generateBoardElements = () => {
	const parentElement = $('.game');
	const template = document.createElement('div');
	template.classList.add('cell');

	document.documentElement.style.setProperty('--board-width', boardWidth);
	document.documentElement.style.setProperty('--board-height', boardHeight);

	for (let i = 0; i < boardWidth * boardHeight; i++) {
		const elem = template.cloneNode();
		elem.addEventListener('click', () => {
			if (boardRevealed[i]) {
				chord(i);
			} else {
				reveal(i);
			}
			for (let i = 0; i < boardWidth * boardHeight; i++) {
				rerenderElement(i);
			}
		});
		elem.addEventListener('contextmenu', () => flag(i));
		if (i < boardWidth) {
			elem.classList.add('top');
		}
		if (i % boardWidth === 0) {
			elem.classList.add('left')
		}
		boardElements[i] = elem;
		rerenderElement(i);
		parentElement.appendChild(elem);
	}

	document.addEventListener('contextmenu', e => {
		clicks += 1;
		e.preventDefault();
	});
	document.addEventListener('click', () => clicks += 1);
}

const main = () => {
	generateBoard();
	generateBoardElements();
}

window.addEventListener('load', main);