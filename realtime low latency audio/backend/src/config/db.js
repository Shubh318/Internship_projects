import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

let dbInstance = null;
let useFallback = false;

// 1. Setup Local JSON Database Fallback Engine
class JsonModel {
  constructor(modelName, dataFile) {
    this.modelName = modelName;
    this.dataFile = dataFile;
    this.tableName = modelName.toLowerCase() + 's';
  }

  // Sequelize Association Stubs to prevent boot crashes
  hasMany(target, options) {}
  belongsTo(target, options) {}
  hasOne(target, options) {}
  belongsToMany(target, options) {}

  _readData() {
    try {
      if (!fs.existsSync(this.dataFile)) {
        fs.writeFileSync(this.dataFile, JSON.stringify({ users: [], rooms: [], participants: [], transcripts: [] }, null, 2));
      }
      const raw = fs.readFileSync(this.dataFile, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      return { users: [], rooms: [], participants: [], transcripts: [] };
    }
  }

  _writeData(data) {
    fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }

  async findOne({ where } = {}) {
    const data = this._readData();
    const list = data[this.tableName] || [];
    const found = list.find(item => {
      return Object.keys(where).every(key => this._matches(item, key, where[key]));
    });
    
    if (!found) return null;
    return this._wrap(found);
  }

  async findByPk(id) {
    const data = this._readData();
    const list = data[this.tableName] || [];
    const found = list.find(item => String(item.id) === String(id));
    if (!found) return null;
    return this._wrap(found);
  }

  async create(attributes) {
    const data = this._readData();
    const list = data[this.tableName] || [];
    
    const newId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
    const newItem = {
      id: newId,
      ...attributes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Map snake_case database schema names
    if (this.modelName === 'User') {
      newItem.password_hash = attributes.password || attributes.password_hash;
      newItem.default_speaking_language = attributes.defaultSpeakingLanguage || 'en';
      newItem.default_listening_language = attributes.defaultListeningLanguage || 'en';
    } else if (this.modelName === 'Room') {
      newItem.room_code = attributes.roomCode;
      newItem.created_by = attributes.createdBy;
      newItem.status = attributes.status || 'waiting';
    } else if (this.modelName === 'Participant') {
      newItem.room_id = attributes.roomId;
      newItem.user_id = attributes.userId;
      newItem.speaking_language = attributes.speakingLanguage;
      newItem.listening_language = attributes.listeningLanguage;
    } else if (this.modelName === 'Transcript') {
      newItem.room_id = attributes.roomId;
      newItem.speaker_id = attributes.speakerId;
      newItem.original_language = attributes.originalLanguage;
      newItem.original_text = attributes.originalText;
      newItem.translated_language = attributes.translatedLanguage;
      newItem.translated_text = attributes.translatedText;
    }

    list.push(newItem);
    data[this.tableName] = list;
    this._writeData(data);
    
    return this._wrap(newItem);
  }

  async count({ where } = {}) {
    const data = this._readData();
    const list = data[this.tableName] || [];
    if (!where) return list.length;
    
    const filtered = list.filter(item => {
      return Object.keys(where).every(key => this._matches(item, key, where[key]));
    });
    return filtered.length;
  }

  async update(values, { where } = {}) {
    const data = this._readData();
    const list = data[this.tableName] || [];
    let updatedCount = 0;

    const updatedList = list.map(item => {
      const match = Object.keys(where).every(key => this._matches(item, key, where[key]));
      
      if (match) {
        updatedCount++;
        const mappedValues = {};
        // Map updates
        if (values.leftAt !== undefined) mappedValues.left_at = values.leftAt;
        if (values.status !== undefined) mappedValues.status = values.status;
        if (values.endedAt !== undefined) mappedValues.ended_at = values.endedAt;

        return { ...item, ...values, ...mappedValues, updated_at: new Date().toISOString() };
      }
      return item;
    });

    data[this.tableName] = updatedList;
    this._writeData(data);
    return [updatedCount];
  }

  async findAll({ where, order } = {}) {
    const data = this._readData();
    let list = data[this.tableName] || [];

    if (where) {
      list = list.filter(item => {
        return Object.keys(where).every(key => this._matches(item, key, where[key]));
      });
    }

    // Sort order
    if (order && order[0]) {
      const field = order[0][0];
      const direction = order[0][1] || 'ASC';
      list.sort((a, b) => {
        const valA = a[field] || this._mapField(a, field);
        const valB = b[field] || this._mapField(b, field);
        return direction === 'DESC' 
          ? String(valB).localeCompare(String(valA))
          : String(valA).localeCompare(String(valB));
      });
    }

    // Mimic database joins for history and transcripts
    const wrappedList = list.map(item => {
      const wrapped = this._wrap(item);
      
      // Mimic includes
      if (this.modelName === 'Participant') {
        const rooms = data.rooms || [];
        const roomMatch = rooms.find(r => r.id === item.room_id);
        if (roomMatch) {
          const users = data.users || [];
          const creatorMatch = users.find(u => u.id === roomMatch.created_by);
          wrapped.Room = {
            id: roomMatch.id,
            roomCode: roomMatch.room_code,
            status: roomMatch.status,
            created_at: roomMatch.created_at,
            ended_at: roomMatch.ended_at,
            creator: creatorMatch ? { name: creatorMatch.name } : { name: 'Peer' }
          };
        }
      } else if (this.modelName === 'Transcript') {
        const users = data.users || [];
        const speakerMatch = users.find(u => u.id === item.speaker_id);
        wrapped.speaker = speakerMatch ? { id: speakerMatch.id, name: speakerMatch.name } : null;
      }
      
      return wrapped;
    });

    return wrappedList;
  }

  _wrap(item) {
    const modelInstance = {
      ...item,
      // Map getters
      id: item.id,
      name: item.name,
      email: item.email,
      password: item.password_hash || item.password,
      defaultSpeakingLanguage: item.default_speaking_language || item.defaultSpeakingLanguage,
      defaultListeningLanguage: item.default_listening_language || item.defaultListeningLanguage,
      roomCode: item.room_code || item.roomCode,
      createdBy: item.created_by || item.createdBy,
      status: item.status,
      roomId: item.room_id || item.roomId,
      userId: item.user_id || item.userId,
      speakingLanguage: item.speaking_language || item.speakingLanguage,
      listeningLanguage: item.listening_language || item.listeningLanguage,
      leftAt: item.left_at || item.leftAt,
      originalLanguage: item.original_language || item.originalLanguage,
      originalText: item.original_text || item.originalText,
      translatedLanguage: item.translated_language || item.translatedLanguage,
      translatedText: item.translated_text || item.translatedText,
      created_at: item.created_at,
      
      save: async () => {
        const data = this._readData();
        const list = data[this.tableName] || [];
        const idx = list.findIndex(i => i.id === item.id);
        
        const updatedItem = {
          ...item,
          // Sync changes back to snake_case schema representation
          default_speaking_language: modelInstance.defaultSpeakingLanguage || 'en',
          default_listening_language: modelInstance.defaultListeningLanguage || 'en',
          status: modelInstance.status,
          ended_at: modelInstance.endedAt ? modelInstance.endedAt.toISOString() : item.ended_at
        };

        if (idx !== -1) {
          list[idx] = updatedItem;
        } else {
          list.push(updatedItem);
        }
        data[this.tableName] = list;
        this._writeData(data);
        return this;
      }
    };
    return modelInstance;
  }

  _mapField(item, key) {
    if (key === 'roomId') return item.room_id;
    if (key === 'userId') return item.user_id;
    if (key === 'roomCode') return item.room_code;
    if (key === 'speakerId') return item.speaker_id;
    if (key === 'leftAt') return item.left_at;
    return undefined;
  }

  _matches(item, key, expected) {
    let actual = item[key];
    if (actual === undefined) {
      actual = this._mapField(item, key);
    }
    
    if (actual === undefined) actual = null;
    let target = expected;
    if (target === undefined) target = null;

    if (Array.isArray(target)) {
      return target.some(val => {
        const normVal = val === undefined ? null : val;
        return String(actual) === String(normVal);
      });
    }

    if (actual === null || target === null) {
      return actual === target;
    }

    return String(actual) === String(target);
  }
}

// 2. Mock Sequelize instance
class JsonSequelize {
  constructor() {
    this.dataFile = path.join(process.cwd(), 'database.json');
  }
  async authenticate() {
    return true;
  }
  async sync() {
    return true;
  }
  define(modelName, attributes, options) {
    return new JsonModel(modelName, this.dataFile);
  }
}

// 3. Main DB switch initialization
let sequelize;

try {
  console.log('Database Config: Connecting to MySQL Database...');
  sequelize = new Sequelize(
    process.env.DB_NAME || 'realtime_call_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      dialect: 'mysql',
      logging: false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
      retry: { max: 0 } // Fail immediately to invoke fallback fast
    }
  );
  
  // Test connection sync
  await sequelize.authenticate();
  console.log('Database connection to MySQL has been established successfully.');
} catch (error) {
  console.warn('\n⚠️  WARNING: Could not connect to MySQL Server.');
  console.warn('Reason:', error.message);
  console.warn('🚀 SWITCHING DATABASE DIALECT: Activating JSON file database fallback (database.json)...\n');
  
  useFallback = true;
  sequelize = new JsonSequelize();
}

export default sequelize;
