import Transcript from '../models/Transcript.js';
import Room from '../models/Room.js';

export default function registerTranslationSocket(io, socket) {
  // Listen for speech transcripts from client STT and relay them
  socket.on('speech-transcript', async ({ roomCode, text, isFinal }) => {
    if (!roomCode || !text || text.trim() === '') return;

    console.log(`[Socket Relay] Transcript from ${socket.userName || 'Unknown'} (${socket.userId}): "${text}" (isFinal: ${isFinal})`);

    // Broadcast the original text and language details. Peers will translate this locally!
    io.to(roomCode).emit('translation-update', {
      speakerId: socket.userId,
      speakerName: socket.userName,
      originalText: text,
      originalLang: socket.speakingLanguage || 'en-US',
      isFinal
    });
  });

  // Listen for completed client-side translations to save in DB
  socket.on('save-transcript', async ({ roomCode, originalText, translatedText, originalLang, translatedLang }) => {
    if (!roomCode || !originalText) return;

    try {
      console.log(`[DB Log] Saving transcript from ${socket.userName || 'Unknown'} to Room ${roomCode}`);
      const room = await Room.findOne({ where: { roomCode } });
      if (room) {
        await Transcript.create({
          roomId: room.id,
          speakerId: socket.userId,
          originalLanguage: originalLang || 'en',
          originalText,
          translatedLanguage: translatedLang || 'en',
          translatedText: translatedText || originalText
        });
        console.log(`[DB Log] Saved successfully.`);
      }
    } catch (err) {
      console.error('[DB Log] Error saving transcript to DB:', err);
    }
  });
}
