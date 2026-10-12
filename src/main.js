import { Game } from './engine/Game.js';
import { audio } from './engine/Audio.js';
import { fetchTopScores, submitScore, getSavedNickname, getDeviceId } from './api/leaderboard.js';

const $ = (id) => document.getElementById(id);

const canvas = $('gameCanvas');
const soundBtn = $('soundBtn');
const soundLabel = $('soundLabel');
const leaderboardBtn = $('leaderboardBtn');
const mobileReloadBtn = $('mobileReloadBtn');

const gameOverModal = $('gameOverModal');
const scoreForm = $('scoreForm');
const nicknameInput = $('nicknameInput');
const saveScoreBtn = $('saveScoreBtn');
const playAgainBtn = $('playAgainBtn');
const rankNotice = $('rankNotice');

const leaderboardModal = $('leaderboardModal');
const leaderboardBody = $('leaderboardBody');
const closeLeaderboardBtn = $('closeLeaderboardBtn');

const game = new Game(canvas);
game.startLoop();

let lastStats = null;
let lastSavedId = null;

// ---------- Helpers ----------
function openModal(el) {
  el.classList.add('active');
}

function closeModal(el) {
  el.classList.remove('active');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Top bar ----------
soundBtn.addEventListener('click', () => {
  const muted = audio.toggleMute();
  soundBtn.setAttribute('aria-pressed', String(!muted));
  soundBtn.setAttribute('aria-label', muted ? 'Sonido desactivado' : 'Sonido activado');
  soundLabel.textContent = muted ? 'SILENCIO' : 'SONIDO';
});

leaderboardBtn.addEventListener('click', () => openLeaderboard());

mobileReloadBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  game.handleReload();
});

// ---------- Game over ----------
window.addEventListener('bee-hunt-game-over', (e) => {
  lastStats = e.detail;
  lastSavedId = null;
  $('finalScore').textContent = String(lastStats.score).padStart(6, '0');
  $('finalRound').textContent = lastStats.round;
  $('finalHits').textContent = `${lastStats.hits}/${lastStats.shots}`;
  $('finalAccuracy').textContent = `${lastStats.accuracy}%`;

  nicknameInput.value = getSavedNickname() === 'BEE' ? '' : getSavedNickname();
  rankNotice.textContent = '';
  rankNotice.classList.remove('error');
  saveScoreBtn.disabled = false;
  saveScoreBtn.textContent = 'GUARDAR';

  // Let the horse laugh for a moment before the modal appears
  setTimeout(() => {
    openModal(gameOverModal);
    if (window.matchMedia('(pointer: fine)').matches) nicknameInput.focus();
  }, 900);
});

nicknameInput.addEventListener('input', () => {
  nicknameInput.value = nicknameInput.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
});

scoreForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!lastStats || saveScoreBtn.disabled) return;

  const nickname = nicknameInput.value.trim() || 'BEE';
  saveScoreBtn.disabled = true;
  saveScoreBtn.textContent = 'GUARDANDO...';
  rankNotice.classList.remove('error');

  try {
    const res = await submitScore({ ...lastStats, nickname });
    lastSavedId = res.id ?? null;
    rankNotice.textContent = res.rank ? `Quedaste en el puesto #${res.rank}` : 'Puntaje guardado';
    saveScoreBtn.textContent = 'GUARDADO';
    setTimeout(() => {
      closeModal(gameOverModal);
      openLeaderboard();
    }, 1100);
  } catch {
    rankNotice.textContent = 'No se pudo guardar. Intenta de nuevo.';
    rankNotice.classList.add('error');
    saveScoreBtn.disabled = false;
    saveScoreBtn.textContent = 'GUARDAR';
  }
});

playAgainBtn.addEventListener('click', () => {
  closeModal(gameOverModal);
  game.startNewGame();
});

// ---------- Leaderboard ----------
async function openLeaderboard() {
  openModal(leaderboardModal);
  leaderboardBody.innerHTML = '<tr><td colspan="5" class="lb-empty">Cargando...</td></tr>';

  try {
    const scores = await fetchTopScores(20);
    const me = getDeviceId();

    if (!scores.length) {
      leaderboardBody.innerHTML = '<tr><td colspan="5" class="lb-empty">Todavía no hay puntajes. Sé el primero.</td></tr>';
      return;
    }

    leaderboardBody.innerHTML = scores.map((s, i) => {
      const isMe = s.device_id === me;
      const isLatest = lastSavedId != null && s.id === lastSavedId;
      const acc = s.shots > 0 ? Math.round((s.hits / s.shots) * 100) : 0;
      const classes = [i < 3 ? `top-${i + 1}` : '', isMe || isLatest ? 'me' : ''].join(' ').trim();
      return `
        <tr class="${classes}">
          <td class="rank">${i + 1}</td>
          <td>${escapeHtml(s.nickname || 'ANON')}${isMe ? '<span class="tag-me">TÚ</span>' : ''}</td>
          <td class="num score">${Number(s.score).toLocaleString('es')}</td>
          <td class="num">${s.round || 1}</td>
          <td class="num">${acc}%</td>
        </tr>`;
    }).join('');
  } catch {
    leaderboardBody.innerHTML = '<tr><td colspan="5" class="lb-empty">No se pudo cargar la tabla.</td></tr>';
  }
}

closeLeaderboardBtn.addEventListener('click', () => closeModal(leaderboardModal));

// Close leaderboard with Escape or by clicking the backdrop
leaderboardModal.addEventListener('click', (e) => {
  if (e.target === leaderboardModal) closeModal(leaderboardModal);
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal(leaderboardModal);
});
