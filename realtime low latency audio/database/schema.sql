CREATE DATABASE IF NOT EXISTS realtime_call_db;
USE realtime_call_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    default_speaking_language VARCHAR(20) DEFAULT 'en',
    default_listening_language VARCHAR(20) DEFAULT 'en',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call Rooms Table
CREATE TABLE IF NOT EXISTS call_rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_code VARCHAR(50) UNIQUE NOT NULL,
    created_by INT NOT NULL,
    status ENUM('waiting', 'active', 'ended') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Call Participants Table
CREATE TABLE IF NOT EXISTS call_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    speaking_language VARCHAR(20) NOT NULL,
    listening_language VARCHAR(20) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES call_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Call Transcripts Table
CREATE TABLE IF NOT EXISTS call_transcripts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    speaker_id INT NOT NULL,
    original_language VARCHAR(20) NOT NULL,
    original_text TEXT,
    translated_language VARCHAR(20) NOT NULL,
    translated_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES call_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (speaker_id) REFERENCES users(id) ON DELETE CASCADE
);
