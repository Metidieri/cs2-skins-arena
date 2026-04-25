require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const skinsRoutes = require('./routes/skins');
const usersRoutes = require('./routes/users');
const battlesRoutes = require('./routes/battles');
const battleController = require('./controllers/battleController');
const jackpotRoutes = require('./routes/jackpot');
const jackpotController = require('./controllers/jackpotController');
const marketRoutes = require('./routes/market');
const marketController = require('./controllers/marketController');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:4200', methods: ['GET', 'POST'] },
});

battleController.setIo(io);
jackpotController.setIo(io);
marketController.setIo(io);

app.use(cors({ origin: 'http://localhost:4200' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/skins', skinsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/battles', battlesRoutes);
app.use('/api/jackpot', jackpotRoutes);
app.use('/api/market', marketRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-lobby', () => {
    socket.join('lobby');
  });

  socket.on('leave-lobby', () => {
    socket.leave('lobby');
  });

  socket.on('join-battle', (battleId) => {
    socket.join(`battle-${battleId}`);
  });

  socket.on('leave-battle', (battleId) => {
    socket.leave(`battle-${battleId}`);
  });

  socket.on('join-jackpot', () => {
    socket.join('jackpot');
  });

  socket.on('leave-jackpot', () => {
    socket.leave('jackpot');
  });

  socket.on('join-marketplace', () => {
    socket.join('marketplace');
  });

  socket.on('leave-marketplace', () => {
    socket.leave('marketplace');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
