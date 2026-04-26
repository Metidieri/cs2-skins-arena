require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const { createApp, getCorsOrigins } = require('./app');
const battleController = require('./controllers/battleController');
const jackpotController = require('./controllers/jackpotController');
const marketController = require('./controllers/marketController');
const logger = require('./utils/logger');

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: getCorsOrigins(), methods: ['GET', 'POST'] },
});

battleController.setIo(io);
jackpotController.setIo(io);
marketController.setIo(io);

io.on('connection', (socket) => {
  logger.info('Socket connected:', socket.id);

  socket.on('join-lobby', () => socket.join('lobby'));
  socket.on('leave-lobby', () => socket.leave('lobby'));

  socket.on('join-battle', (battleId) => socket.join(`battle-${battleId}`));
  socket.on('leave-battle', (battleId) => socket.leave(`battle-${battleId}`));

  socket.on('join-jackpot', () => socket.join('jackpot'));
  socket.on('leave-jackpot', () => socket.leave('jackpot'));

  socket.on('join-marketplace', () => socket.join('marketplace'));
  socket.on('leave-marketplace', () => socket.leave('marketplace'));

  socket.on('disconnect', () => logger.info('Socket disconnected:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
