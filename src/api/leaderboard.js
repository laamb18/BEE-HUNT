// Client for the Bee Hunt Leaderboard API

const STORAGE_KEY_DEVICE = 'bee_hunt_device_id';
const STORAGE_KEY_NICK = 'bee_hunt_nickname';

export function getDeviceId() {
  let id = localStorage.getItem(STORAGE_KEY_DEVICE);
  if (!id) {
    id = 'player_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem(STORAGE_KEY_DEVICE, id);
  }
  return id;
}

export function getSavedNickname() {
  return localStorage.getItem(STORAGE_KEY_NICK) || 'BEE';
}

export function saveNickname(nick) {
  const clean = (nick || 'BEE').toUpperCase().replace(/[^A-Z0-9_\-]/g, '').slice(0, 8);
  localStorage.setItem(STORAGE_KEY_NICK, clean);
  return clean;
}

export async function fetchTopScores(limit = 20) {
  try {
    const res = await fetch(`/api/leaderboard?limit=${limit}`);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    return data.scores || [];
  } catch (err) {
    console.warn('Could not fetch leaderboard from server, returning local fallback:', err);
    return getLocalLeaderboard();
  }
}

export async function fetchPersonalBest() {
  try {
    const deviceId = getDeviceId();
    const res = await fetch(`/api/leaderboard/me?deviceId=${encodeURIComponent(deviceId)}`);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    return data.best || null;
  } catch (err) {
    console.warn('Could not fetch personal best:', err);
    return null;
  }
}

export async function submitScore({ score, round, hits, shots, nickname }) {
  const deviceId = getDeviceId();
  const nick = saveNickname(nickname);

  // Always save locally in case of offline
  saveLocalScore({ deviceId, nickname: nick, score, round, hits, shots });

  try {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        nickname: nick,
        score,
        round,
        hits,
        shots
      })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error en el servidor');
    }
    return await res.json();
  } catch (err) {
    if (err.message && err.message !== 'Failed to fetch' && !err.message.includes('NetworkError')) {
      throw err;
    }
    console.warn('Saved score locally (server unreachable):', err);
    return { success: true, localOnly: true, nickname: nick, score };
  }
}

function getLocalLeaderboard() {
  try {
    const raw = localStorage.getItem('bee_hunt_local_scores');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalScore(entry) {
  try {
    const list = getLocalLeaderboard();
    list.push({ ...entry, created_at: new Date().toISOString() });
    list.sort((a, b) => b.score - a.score);
    localStorage.setItem('bee_hunt_local_scores', JSON.stringify(list.slice(0, 20)));
  } catch (e) {
    console.error('Local score save error:', e);
  }
}
