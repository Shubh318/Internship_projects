import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import Room from './Room.js';
import User from './User.js';

const Participant = sequelize.define('Participant', {
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
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: User,
      key: 'id'
    }
  },
  speakingLanguage: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'speaking_language'
  },
  listeningLanguage: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'listening_language'
  },
  leftAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'left_at'
  }
}, {
  tableName: 'call_participants',
  timestamps: true,
  createdAt: 'joined_at',
  updatedAt: false
});

// Associations
Room.hasMany(Participant, { foreignKey: 'roomId' });
Participant.belongsTo(Room, { foreignKey: 'roomId' });

User.hasMany(Participant, { foreignKey: 'userId' });
Participant.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Participant;
