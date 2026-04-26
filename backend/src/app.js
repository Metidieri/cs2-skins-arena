const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const skinsRoutes = require('./routes/skins');
const usersRoutes = require('./routes/users');
const battlesRoutes = require('./routes/battles');
const jackpotRoutes = require('./routes/jackpot');
const marketRoutes = require('./routes/market');
const leaderboardRoutes = require('./routes/leaderboard');
const statsRoutes = require('./routes/stats');

const { generalLimiter, marketLimiter } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./utils/logger');

function getCorsOrigins() {
  const fromEnv = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Permitimos siempre el dev local para que funcione en desarrollo aunque haya FRONTEND_URL definida.
  const dev = ['http://localhost:4200', 'http://127.0.0.1:4200'];
  const all = [...new Set([...dev, ...fromEnv])];
  return all.length === 1 ? all[0] : all;
}

function createApp() {
  const app = express();

  // Confiar en proxies (Railway, etc.) para que req.ip funcione tras un load balancer.
  app.set('trust proxy', 1);

  app.use(cors({ origin: getCorsOrigins(), credentials: false }));
  app.use(express.json());
  app.use(requestLogger);

  // Rate limit global (excluye health check)
  app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    return generalLimiter(req, res, next);
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/skins', skinsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/battles', battlesRoutes);
  app.use('/api/jackpot', jackpotRoutes);
  app.use('/api/market', marketLimiter, marketRoutes);
  app.use('/api/leaderboard', leaderboardRoutes);
  app.use('/api/stats', statsRoutes);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // 404 + error handler (al final)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, getCorsOrigins };
