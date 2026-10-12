import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'bee_hunt.sqlite');

const db = new DatabaseSync(dbPath);

// Initialize schema
db.exec(`
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

  CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);
  CREATE INDEX IF NOT EXISTS idx_leaderboard_device ON leaderboard (device_id);
`);

export function getTopScores(limit = 20) {
  const stmt = db.prepare(`
    SELECT id, device_id, nickname, score, round, hits, shots, created_at
    FROM leaderboard
    ORDER BY score DESC, created_at ASC
    LIMIT ?
  `);
  return stmt.all(limit);
}

export function getPlayerBest(deviceId) {
  const stmt = db.prepare(`
    SELECT id, nickname, score, round, hits, shots, created_at
    FROM leaderboard
    WHERE device_id = ?
    ORDER BY score DESC
    LIMIT 1
  `);
  return stmt.get(deviceId);
}

export function addScore({ device_id, nickname, score, round, hits = 0, shots = 0 }) {
  // Validate and sanitize
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

  const stmt = db.prepare(`
    INSERT INTO leaderboard (device_id, nickname, score, round, hits, shots)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(device_id, cleanNickname, cleanScore, cleanRound, cleanHits, cleanShots);

  // Calculate player's current rank
  const rankStmt = db.prepare(`
    SELECT COUNT(*) as rank
    FROM leaderboard
    WHERE score > ?
  `);
  const rankResult = rankStmt.get(cleanScore);
  const rank = (rankResult ? rankResult.rank : 0) + 1;

  return {
    id: result.lastInsertRowid,
    rank,
    nickname: cleanNickname,
    score: cleanScore
  };
}
