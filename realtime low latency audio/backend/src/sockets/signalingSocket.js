import Participant from '../models/Participant.js';
import Room from '../models/Room.js';

export default function registerSignalingSocket(io, socket) {
  // Join room event
  socket.on('join-room', async ({ roomCode, userId, name, speakingLanguage, listeningLanguage }) => {
    if (!roomCode || !userId) return;

    socket.join(roomCode);
    socket.roomCode = roomCode;
    socket.userId = userId;
    socket.userName = name;
    socket.speakingLanguage = speakingLanguage;
    socket.listeningLanguage = listeningLanguage;

    console.log(`User ${name} (${userId}) connected to room socket: ${roomCode}`);

    // Get all other users in this socket room to send back to the joining user
    const roomSockets = await io.in(roomCode).fetchSockets();
    const otherUsers = roomSockets
      .filter(s => s.id !== socket.id)
      .map(s => ({
        socketId: s.id,
        userId: s.userId,
        name: s.userName,
        speakingLanguage: s.speakingLanguage,
        listeningLanguage: s.listeningLanguage
      }));

    // Tell the joining client about existing peers in the room
    socket.emit('existing-peers', otherUsers);

    // Notify other participants that a new user has joined
    socket.to(roomCode).emit('user-joined', {
      socketId: socket.id,
      userId,
      name,
      speakingLanguage,
      listeningLanguage
    });
  });

  // Relay WebRTC connection offer
  socket.on('webrtc-offer', ({ targetSocketId, offer }) => {
    socket.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  // Relay WebRTC connection answer
  socket.on('webrtc-answer', ({ targetSocketId, answer }) => {
    socket.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  // Relay WebRTC ICE Candidate
  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    socket.to(targetSocketId).emit('ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // Handle call mute and control events
  socket.on('mute-status', ({ roomCode, isMuted }) => {
    socket.to(roomCode).emit('peer-mute-status', {
      socketId: socket.id,
      isMuted
    });
  });

  // Handle end call explicitly
  socket.on('end-call', async ({ roomCode }) => {
    console.log(`Call explicitly ended in room: ${roomCode}`);
    
    // Broadcast end to everyone
    io.to(roomCode).emit('call-ended');

    // Update DB
    try {
      const room = await Room.findOne({ where: { roomCode } });
      if (room) {
        room.status = 'ended';
        room.endedAt = new Date();
        await room.save();

        // Mark all active participants as left
        await Participant.update(
          { leftAt: new Date() },
          { where: { roomId: room.id, leftAt: null } }
        );
      }
    } catch (err) {
      console.error('Error saving call end status in database:', err);
    }
  });
}
