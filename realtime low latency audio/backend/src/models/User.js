import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  defaultSpeakingLanguage: {
    type: DataTypes.STRING(20),
    defaultValue: 'en',
    field: 'default_speaking_language'
  },
  defaultListeningLanguage: {
    type: DataTypes.STRING(20),
    defaultValue: 'en',
    field: 'default_listening_language'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export default User;
