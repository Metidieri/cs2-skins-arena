require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const { createApp, getCorsOrigins } = require('./app');
const battleController = require('./controllers/battleController');
const jackpotController = require('./controllers/jackpotController');
const marketController = require('./controllers/marketController');
const boxController = require('./controllers/boxController');
const rouletteController = require('./controllers/rouletteController');
const prisma = require('./config/db');
const logger = require('./utils/logger');

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: getCorsOrigins(), methods: ['GET', 'POST'] },
});

battleController.setIo(io);
jackpotController.setIo(io);
marketController.setIo(io);
boxController.setIo(io);
rouletteController.init(io);

io.on('connection', (socket) => {
  logger.info('Socket connected:', socket.id);

  socket.on('identify', (userId) => {
    if (userId != null) socket.join(`user-${userId}`);
  });
  socket.on('unidentify', (userId) => {
    if (userId != null) socket.leave(`user-${userId}`);
  });

  socket.on('join-lobby', () => socket.join('lobby'));
  socket.on('leave-lobby', () => socket.leave('lobby'));

  socket.on('join-battle', (battleId) => socket.join(`battle-${battleId}`));
  socket.on('leave-battle', (battleId) => socket.leave(`battle-${battleId}`));

  socket.on('join-jackpot', () => socket.join('jackpot'));
  socket.on('leave-jackpot', () => socket.leave('jackpot'));

  socket.on('join-marketplace', () => socket.join('marketplace'));
  socket.on('leave-marketplace', () => socket.leave('marketplace'));

  socket.on('join-roulette', () => socket.join('roulette'));
  socket.on('leave-roulette', () => socket.leave('roulette'));

  socket.on('chat:join', () => socket.join('general-chat'));

  socket.on('chat:message', async (data) => {
    try {
      const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, level: true },
      });
      if (!user) return;

      const now = Date.now();
      const lastMsg = socket._lastMessage || 0;
      if (now - lastMsg < 2000) return;
      socket._lastMessage = now;

      const content = data.content.trim().slice(0, 200);
      if (!content) return;

      const msg = await prisma.chatMessage.create({
        data: { userId: user.id, content },
      });

      io.to('general-chat').emit('chat:message', {
        id: msg.id,
        content,
        createdAt: msg.createdAt,
        user: { id: user.id, username: user.username, level: user.level },
      });

      const count = await prisma.chatMessage.count();
      if (count > 500) {
        const oldest = await prisma.chatMessage.findMany({
          orderBy: { createdAt: 'asc' },
          take: count - 500,
        });
        await prisma.chatMessage.deleteMany({
          where: { id: { in: oldest.map((m) => m.id) } },
        });
      }
    } catch {
      // invalid token or other error — ignore silently
    }
  });

  socket.on('disconnect', () => logger.info('Socket disconnected:', socket.id));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});
