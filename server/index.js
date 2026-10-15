import express from 'express';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTopScores, getPlayerBest, addScore } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Necesario cuando corre detrás de Nginx o un balanceador en AWS EC2
app.set('trust proxy', 1);

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10kb' })); // Evita ataques de payloads gigantes

// Límite general para lecturas de API
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

// Límite estricto para guardar puntajes (máximo 6 por minuto por IP)
const scoreSubmitLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 6,
  message: { success: false, error: 'Demasiados intentos. Espera un minuto.' }
});

// Healthcheck para monitoreo en AWS
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/leaderboard', apiLimiter, (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const scores = getTopScores(limit);
    res.json({ success: true, scores });
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ success: false, error: 'Database error' });
  }
});

app.get('/api/leaderboard/me', apiLimiter, (req, res) => {
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

app.post('/api/scores', scoreSubmitLimiter, (req, res) => {
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
    const status = err.statusCode || 500;
    console.error('Error adding score:', err.message);
    res.status(status).json({ success: false, error: status === 422 ? err.message : 'Failed to record score' });
  }
});

// Vite copia automáticamente public/ dentro de dist/ al ejecutar "npm run build"
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath, {
  maxAge: '7d', // Cachea sprites y bundles por 7 días en el navegador de los jugadores
  index: false
}));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('Bee Hunt API is running. Run "npm run build" to serve the client.');
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🐝 BEE HUNT Server running on http://0.0.0.0:${PORT}`);
});
