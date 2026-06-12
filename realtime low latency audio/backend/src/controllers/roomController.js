import Room from '../models/Room.js';
import Participant from '../models/Participant.js';
import User from '../models/User.js';
import Transcript from '../models/Transcript.js';

// Generate a random 6-character room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createRoom(req, res) {
  try {
    const userId = req.user.id;
    let roomCode = generateRoomCode();
    
    // Ensure uniqueness
    let existingRoom = await Room.findOne({ where: { roomCode, status: ['waiting', 'active'] } });
    while (existingRoom) {
      roomCode = generateRoomCode();
      existingRoom = await Room.findOne({ where: { roomCode, status: ['waiting', 'active'] } });
    }

    const room = await Room.create({
      roomCode,
      createdBy: userId,
      status: 'waiting'
    });

    // Add creator as the first participant
    const user = await User.findByPk(userId);
    await Participant.create({
      roomId: room.id,
      userId,
      speakingLanguage: user.defaultSpeakingLanguage || 'en-US',
      listeningLanguage: user.defaultListeningLanguage || 'hi-IN'
    });

    res.status(201).json({
      message: 'Room created successfully',
      roomCode: room.roomCode,
      roomId: room.id,
      status: room.status
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Server error creating room' });
  }
}

export async function getRoomDetails(req, res) {
  try {
    const { roomCode } = req.params;

    const room = await Room.findOne({
      where: { roomCode },
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status === 'ended') {
      return res.status(400).json({ error: 'Room has already ended' });
    }

    // Check current participants count
    const activeParticipantsCount = await Participant.count({
      where: { roomId: room.id, leftAt: null }
    });

    res.status(200).json({
      id: room.id,
      roomCode: room.roomCode,
      status: room.status,
      creator: room.creator,
      activeParticipantsCount
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Server error retrieving room details' });
  }
}

export async function joinRoom(req, res) {
  try {
    const { roomCode } = req.body;
    const userId = req.user.id;

    if (!roomCode) {
      return res.status(400).json({ error: 'Room code is required' });
    }

    const room = await Room.findOne({ where: { roomCode } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (room.status === 'ended') {
      return res.status(400).json({ error: 'Room has already ended' });
    }

    // Check if user is already an active participant
    const existingActive = await Participant.findOne({
      where: { roomId: room.id, userId, leftAt: null }
    });

    if (existingActive) {
      return res.status(200).json({
        message: 'Already in room',
        roomCode: room.roomCode,
        roomId: room.id
      });
    }

    // Count active participants
    const activeParticipantsCount = await Participant.count({
      where: { roomId: room.id, leftAt: null }
    });

    if (activeParticipantsCount >= 2) {
      return res.status(400).json({ error: 'Room is full (max 2 participants allowed)' });
    }

    // Get user preferences to record speaking/listening languages
    const user = await User.findByPk(userId);
    
    await Participant.create({
      roomId: room.id,
      userId,
      speakingLanguage: user.defaultSpeakingLanguage || 'en',
      listeningLanguage: user.defaultListeningLanguage || 'en'
    });

    // If second participant joins, set room to active
    if (room.status === 'waiting' && activeParticipantsCount + 1 === 2) {
      room.status = 'active';
      await room.save();
    }

    res.status(200).json({
      message: 'Joined room successfully',
      roomCode: room.roomCode,
      roomId: room.id
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ error: 'Server error joining room' });
  }
}

export async function getCallHistory(req, res) {
  try {
    const userId = req.user.id;

    // Find all participant records for this user, including room details
    const participations = await Participant.findAll({
      where: { userId },
      attributes: ['joined_at', 'left_at'],
      include: [
        {
          model: Room,
          required: true,
          attributes: ['id', 'roomCode', 'status', 'created_at', 'ended_at'],
          include: [
            { model: User, as: 'creator', attributes: ['name'] }
          ]
        }
      ],
      order: [[Room, 'created_at', 'DESC']]
    });

    res.status(200).json(participations);
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ error: 'Server error fetching call history' });
  }
}

export async function getRoomTranscript(req, res) {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    // Verify user participated in this call to preserve privacy
    const wasParticipant = await Participant.findOne({
      where: { roomId, userId }
    });

    if (!wasParticipant) {
      return res.status(403).json({ error: 'Access denied: You were not a participant in this call' });
    }

    const transcripts = await Transcript.findAll({
      where: { roomId },
      include: [
        { model: User, as: 'speaker', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'ASC']]
    });

    res.status(200).json(transcripts);
  } catch (error) {
    console.error('Get transcript error:', error);
    res.status(500).json({ error: 'Server error fetching transcript' });
  }
}
