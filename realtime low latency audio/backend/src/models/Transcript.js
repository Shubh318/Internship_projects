import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Room from './Room.js';
import User from './User.js';

const Transcript = sequelize.define('Transcript', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'room_id',
    references: {
      model: Room,
      key: 'id'
    }
  },
  speakerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'speaker_id',
    references: {
      model: User,
      key: 'id'
    }
  },
  originalLanguage: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'original_language'
  },
  originalText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'original_text'
  },
  translatedLanguage: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'translated_language'
  },
  translatedText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'translated_text'
  }
}, {
  tableName: 'call_transcripts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Associations
Room.hasMany(Transcript, { foreignKey: 'roomId' });
Transcript.belongsTo(Room, { foreignKey: 'roomId' });

User.hasMany(Transcript, { foreignKey: 'speakerId' });
Transcript.belongsTo(User, { foreignKey: 'speakerId', as: 'speaker' });

export default Transcript;
