import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import sequelize from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';

import registerSignalingSocket from './sockets/signalingSocket.js';
import registerTranslationSocket from './sockets/translationSocket.js';

import Room from './models/Room.js';
import Participant from './models/Participant.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// CORS config
const corsOptions = {
  origin: '*', // Allow all origins for local development MVP
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Socket.IO Server Setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Register handlers
  registerSignalingSocket(io, socket);
  registerTranslationSocket(io, socket);

  // Handle disconnection
  socket.on('disconnect', async () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    const { roomCode, userId, userName } = socket;

    if (roomCode && userId) {
      // Notify remaining peer in the room
      socket.to(roomCode).emit('peer-left', {
        socketId: socket.id,
        userId,
        name: userName
      });

      try {
        const room = await Room.findOne({ where: { roomCode } });
        if (room) {
          // Update Participant record
          await Participant.update(
            { leftAt: new Date() },
            { where: { roomId: room.id, userId, leftAt: null } }
          );

          // Check if anyone is still in the room
          const activeCount = await Participant.count({
            where: { roomId: room.id, leftAt: null }
          });

          // If no active participants left, end the room session
          if (activeCount === 0) {
            room.status = 'ended';
            room.endedAt = new Date();
            await room.save();
            console.log(`Room ${roomCode} set to ended (no active participants).`);
          }
        }
      } catch (err) {
        console.error('Error during disconnect cleanup:', err);
      }
    }
  });
});

// Sync database and start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Synchronize DB models (creates tables in MySQL/SQLite if they don't exist)
    console.log('Synchronizing database models...');
    await sequelize.sync({ alter: true });
    console.log('Database synced successfully.');

    server.listen(PORT, () => {
      console.log(`=============================================`);
      console.log(`  Real-Time Translation Server Running on:   `);
      console.log(`  HTTP: http://localhost:${PORT}             `);
      console.log(`  WS: ws://localhost:${PORT}                 `);
      console.log(`=============================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
