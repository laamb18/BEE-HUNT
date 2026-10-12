import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTopScores, getPlayerBest, addScore } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API Routes
app.get('/api/leaderboard', (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const scores = getTopScores(limit);
    res.json({ success: true, scores });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.get('/api/leaderboard/me', (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId required' });
    }
    const best = getPlayerBest(deviceId);
    res.json({ success: true, best: best || null });
  } catch (err) {
    console.error('Error fetching player best:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.post('/api/scores', (req, res) => {
  try {
    const { deviceId, nickname, score, round, hits, shots } = req.body;
    if (!deviceId || typeof score !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid payload: deviceId and score are required' });
    }

    const saved = addScore({
      device_id: deviceId,
      nickname,
      score,
      round: round || 1,
      hits: hits || 0,
      shots: shots || 0
    });

    res.json({ success: true, ...saved });
  } catch (err) {
    console.error('Error adding score:', err);
    res.status(500).json({ success: false, error: 'Failed to record score' });
  }
});

// Serve frontend build if dist exists
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Bee Hunt API is running. Start Vite dev server for client.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`🐝 BEE HUNT Leaderboard Server running on http://localhost:${PORT}`);
});
