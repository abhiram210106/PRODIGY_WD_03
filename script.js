const WIN_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const X_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`;
const O_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>`;

const board = document.getElementById('board');
const cells = board.querySelectorAll('.cell');
const winLine = document.getElementById('winLine');
const currentPlayerEl = document.getElementById('currentPlayer');
const turnIndicator = document.getElementById('turnIndicator');
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const labelO = document.getElementById('labelO');
const restartBtn = document.getElementById('restartBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const modal = document.getElementById('modal');
const modalIcon = document.getElementById('modalIcon');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const modalPlayAgain = document.getElementById('modalPlayAgain');
const modalClose = document.getElementById('modalClose');
const toast = document.getElementById('toast');
const modeBtns = document.querySelectorAll('.mode-btn');

let gameState = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  scores: { X: 0, O: 0 },
  mode: 'pvp',
  gameActive: true,
  winningCombo: null
};

function init() {
  loadScores();
  renderBoard();
  updateUI();
  bindEvents();
}

function bindEvents() {
  cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
    cell.addEventListener('keydown', handleCellKeydown);
  });

  restartBtn.addEventListener('click', restartGame);
  resetScoreBtn.addEventListener('click', resetScores);

  modalPlayAgain.addEventListener('click', () => { closeModal(); restartGame(); });
  modalClose.addEventListener('click', closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

  modeBtns.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
}

function handleCellClick(e) {
  const index = parseInt(e.currentTarget.dataset.index, 10);
  makeMove(index);
}

function handleCellKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleCellClick(e);
  }
}

function makeMove(index) {
  if (!gameState.gameActive || gameState.board[index] !== null) return;

  gameState.board[index] = gameState.currentPlayer;
  renderCell(index);

  const result = checkGameResult();
  if (result) {
    handleGameEnd(result);
    return;
  }

  switchPlayer();
  updateUI();

  if (gameState.mode === 'ai' && gameState.currentPlayer === 'O' && gameState.gameActive) {
    setTimeout(makeAIMove, 400);
  }
}

function makeAIMove() {
  if (!gameState.gameActive) return;
  const result = getBestMove(gameState.board, 'O');
  if (result && result.index !== undefined) makeMove(result.index);
}

function getBestMove(board, player) {
  const opponent = player === 'X' ? 'O' : 'X';

  const winner = checkWinner(board);
  if (winner === 'O') return { index: -1, score: 10 };
  if (winner === 'X') return { index: -1, score: -10 };
  if (!board.includes(null)) return { index: -1, score: 0 };

  const moves = [];
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      const newBoard = [...board];
      newBoard[i] = player;
      const result = getBestMove(newBoard, opponent);
      moves.push({ index: i, score: result.score });
    }
  }

  let bestMove;
  if (player === 'O') {
    let bestScore = -Infinity;
    for (const move of moves) {
      if (move.score > bestScore) { bestScore = move.score; bestMove = move; }
    }
  } else {
    let bestScore = Infinity;
    for (const move of moves) {
      if (move.score < bestScore) { bestScore = move.score; bestMove = move; }
    }
  }
  return bestMove;
}

function checkWinner(boardState = gameState.board) {
  for (const [a, b, c] of WIN_COMBINATIONS) {
    if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
      return boardState[a];
    }
  }
  return null;
}

function checkGameResult() {
  const winner = checkWinner();
  if (winner) {
    gameState.winningCombo = WIN_COMBINATIONS.find(([a, b, c]) =>
      gameState.board[a] === winner && gameState.board[b] === winner && gameState.board[c] === winner
    );
    return { type: 'win', winner };
  }
  if (!gameState.board.includes(null)) {
    return { type: 'draw' };
  }
  return null;
}

function handleGameEnd(result) {
  gameState.gameActive = false;
  updateUI();

  if (result.type === 'win') {
    gameState.scores[result.winner]++;
    saveScores();
    showWinLine(result.winner);
    showModal(result.winner);
    showToast(`Player ${result.winner} wins!`, 'success');
  } else {
    showModal('draw');
    showToast("It's a draw!", 'info');
  }
}

function showWinLine(winner) {
  if (!gameState.winningCombo) return;
  const [a, b, c] = gameState.winningCombo;
  const cellA = cells[a].getBoundingClientRect();
  const cellC = cells[c].getBoundingClientRect();
  const boardRect = board.getBoundingClientRect();

  const x1 = cellA.left + cellA.width / 2 - boardRect.left;
  const y1 = cellA.top + cellA.height / 2 - boardRect.top;
  const x2 = cellC.left + cellC.width / 2 - boardRect.left;
  const y2 = cellC.top + cellC.height / 2 - boardRect.top;

  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  winLine.innerHTML = `<svg><path d="M ${cx - length/2} ${cy} L ${cx + length/2} ${cy}" transform="rotate(${angle} ${cx} ${cy})"/></svg>`;
  winLine.dataset.player = winner;
  winLine.hidden = false;
}

function showModal(result) {
  modal.hidden = false;
  modalContent = modal.querySelector('.modal-content');
  modalContent.dataset.result = result;

  if (result === 'draw') {
    modalIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    modalTitle.textContent = "It's a Draw!";
    modalMessage.textContent = "Well played! Neither player could secure a victory.";
  } else {
    modalIcon.innerHTML = result === 'X' ? X_SVG : O_SVG;
    modalTitle.textContent = `Player ${result} Wins!`;
    modalMessage.textContent = gameState.mode === 'ai' && result === 'O'
      ? "The AI outsmarted you this time."
      : `Congratulations Player ${result}!`;
  }
}

function closeModal() {
  modal.hidden = true;
  winLine.hidden = true;
}

function switchPlayer() {
  gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
}

function restartGame() {
  gameState.board = Array(9).fill(null);
  gameState.currentPlayer = 'X';
  gameState.gameActive = true;
  gameState.winningCombo = null;
  winLine.hidden = true;
  renderBoard();
  updateUI();
  showToast('New game started', 'success');
}

function resetScores() {
  gameState.scores = { X: 0, O: 0 };
  saveScores();
  updateScoreDisplay();
  showToast('Scores reset', 'info');
}

function setMode(mode) {
  gameState.mode = mode;
  modeBtns.forEach(btn => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', isActive);
  });
  labelO.textContent = mode === 'ai' ? 'AI (O)' : 'Player O';
  restartGame();
}

function renderBoard() {
  cells.forEach((cell, i) => {
    cell.classList.remove('filled', 'winning');
    cell.removeAttribute('data-player');
    cell.innerHTML = '';
    cell.disabled = false;
  });
}

function renderCell(index) {
  const cell = cells[index];
  const player = gameState.board[index];
  cell.classList.add('filled');
  cell.setAttribute('data-player', player);
  cell.innerHTML = player === 'X' ? X_SVG : O_SVG;
  cell.disabled = true;
}

function updateUI() {
  currentPlayerEl.textContent = gameState.currentPlayer;
  turnIndicator.dataset.player = gameState.currentPlayer;

  document.querySelectorAll('.score-item').forEach(item => {
    item.classList.toggle('active', item.dataset.player === gameState.currentPlayer);
  });

  updateScoreDisplay();
}

function updateScoreDisplay() {
  scoreX.textContent = gameState.scores.X;
  scoreO.textContent = gameState.scores.O;
}

function saveScores() {
  localStorage.setItem('ttt_scores', JSON.stringify(gameState.scores));
}

function loadScores() {
  const saved = localStorage.getItem('ttt_scores');
  if (saved) {
    try { gameState.scores = JSON.parse(saved); } catch { /* ignore */ }
  }
}

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  clearTimeout(toast.hideTimer);
  toast.hideTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

init();