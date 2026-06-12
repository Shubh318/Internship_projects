import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';
import User from './User.js';

const Room = sequelize.define('Room', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'room_code'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    references: {
      model: User,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('waiting', 'active', 'ended'),
    defaultValue: 'waiting'
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'ended_at'
  }
}, {
  tableName: 'call_rooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Associations
User.hasMany(Room, { foreignKey: 'createdBy' });
Room.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

export default Room;
