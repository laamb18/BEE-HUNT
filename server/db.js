import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Permitir configurar la ruta por variable de entorno para volúmenes Docker en EC2
const dataDir = process.env.DATA_DIR || __dirname;
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'bee_hunt.sqlite');

const db = new DatabaseSync(dbPath);

// Optimización crítica para múltiples usuarios concurrentes:
// WAL permite lecturas y escrituras simultáneas sin bloquear la base de datos.
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    score INTEGER NOT NULL,
    round INTEGER NOT NULL,
    hits INTEGER DEFAULT 0,
    shots INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC, created_at ASC);
  CREATE INDEX IF NOT EXISTS idx_leaderboard_device ON leaderboard (device_id);
`);

// Prepared statements reutilizables (evita recompilar SQL en cada petición)
const stmtTopScores = db.prepare(`
  SELECT id, device_id, nickname, score, round, hits, shots, created_at
  FROM leaderboard
  ORDER BY score DESC, created_at ASC
  LIMIT ?
`);

const stmtPlayerBest = db.prepare(`
  SELECT id, nickname, score, round, hits, shots, created_at
  FROM leaderboard
  WHERE device_id = ?
  ORDER BY score DESC
  LIMIT 1
`);

const stmtInsertScore = db.prepare(`
  INSERT INTO leaderboard (device_id, nickname, score, round, hits, shots)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const stmtCalculateRank = db.prepare(`
  SELECT COUNT(*) as rank
  FROM leaderboard
  WHERE score > ?
`);

export function getTopScores(limit = 20) {
  return stmtTopScores.all(limit);
}

export function getPlayerBest(deviceId) {
  return stmtPlayerBest.get(deviceId);
}

export function addScore({ device_id, nickname, score, round, hits = 0, shots = 0 }) {
  const cleanNickname = (nickname || 'ANON')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_\-]/g, '')
    .slice(0, 10) || 'BEE';

  const cleanScore = Math.max(0, parseInt(score, 10) || 0);
  const cleanRound = Math.max(1, parseInt(round, 10) || 1);
  const cleanHits = Math.max(0, parseInt(hits, 10) || 0);
  const cleanShots = Math.max(cleanHits, parseInt(shots, 10) || 0);

  // Validación Anti-Cheat basada en las reglas de src/engine/Game.js:
  // Máximo 50 pts (abeja dorada) * multiplicador máximo x3 = 150 pts por acierto.
  if (cleanScore > cleanHits * 150) {
    const err = new Error('Puntaje matemáticamente inválido respecto a los aciertos');
    err.statusCode = 422;
    throw err;
  }

  // Para llegar a una ronda N, el jugador debió superar las cuotas de las N-1 rondas previas
  if (cleanRound > 1 && cleanHits < (cleanRound - 1) * 15) {
    const err = new Error('Ronda inconsistente con el número de aciertos');
    err.statusCode = 422;
    throw err;
  }

  const result = stmtInsertScore.run(
    String(device_id).slice(0, 64),
    cleanNickname,
    cleanScore,
    cleanRound,
    cleanHits,
    cleanShots
  );

  const rankResult = stmtCalculateRank.get(cleanScore);
  const rank = (rankResult ? rankResult.rank : 0) + 1;

  return {
    id: Number(result.lastInsertRowid),
    rank,
    nickname: cleanNickname,
    score: cleanScore
  };
}
