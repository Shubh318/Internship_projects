import React, { useState, useEffect } from 'react';

const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'hi-IN', name: 'Hindi (हिन्दी)' },
  { code: 'es-ES', name: 'Spanish (Español)' },
  { code: 'fr-FR', name: 'French (Français)' },
  { code: 'de-DE', name: 'German (Deutsch)' },
  { code: 'zh-CN', name: 'Chinese (中文)' },
  { code: 'ja-JP', name: 'Japanese (日本語)' },
  { code: 'ar-SA', name: 'Arabic (العربية)' }
];

export default function Dashboard({ token, user, setUser, setRoomCode, navigateTo }) {
  const normalizeLang = (lang, fallback) => {
    if (!lang) return fallback;
    if (lang === 'en') return 'en-US';
    if (lang === 'hi') return 'hi-IN';
    return lang;
  };

  const [speakLanguage, setSpeakLanguage] = useState(normalizeLang(user?.defaultSpeakingLanguage, 'en-US'));
  const [hearLanguage, setHearLanguage] = useState(normalizeLang(user?.defaultListeningLanguage, 'hi-IN'));
  const [openaiKey, setOpenaiKey] = useState(localStorage.getItem('openai_key') || '');
  const [prefMessage, setPrefMessage] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [history, setHistory] = useState([]);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // Fetch Call History
  const fetchHistory = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/rooms/history', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [token]);

  // Save Preferences
  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setPrefMessage('');

    if (!speakLanguage || !hearLanguage) {
      setPrefMessage('⚠️ Both selections are compulsory!');
      return;
    }

    try {
      // Save OpenAI key locally in browser storage
      localStorage.setItem('openai_key', openaiKey.trim());

      const response = await fetch('http://localhost:3000/api/auth/language-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          defaultSpeakingLanguage: speakLanguage,
          defaultListeningLanguage: hearLanguage
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences');
      }

      // Update local state
      const updatedUser = { ...user, defaultSpeakingLanguage: speakLanguage, defaultListeningLanguage: hearLanguage };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setPrefMessage('✅ Preferences updated successfully!');
      
      // Clear message after 3 seconds
      setTimeout(() => setPrefMessage(''), 3000);
    } catch (err) {
      setPrefMessage(`❌ Error: ${err.message}`);
    }
  };

  // Create Room
  const handleCreateRoom = async () => {
    setCreating(true);
    setJoinError('');

    try {
      const response = await fetch('http://localhost:3000/api/rooms/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create room');
      }

      setRoomCode(data.roomCode);
      navigateTo('room');
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Join Room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode || joinCode.trim().length !== 6) {
      setJoinError('Room code must be exactly 6 characters.');
      return;
    }

    setJoining(true);
    setJoinError('');

    try {
      // 1. Verify and Join on backend
      const response = await fetch('http://localhost:3000/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roomCode: joinCode.trim().toUpperCase() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join room');
      }

      setRoomCode(data.roomCode);
      navigateTo('room');
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  // View Transcript Details
  const handleViewTranscript = async (roomId, roomCode) => {
    setTranscriptLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/rooms/${roomId}/transcript`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not fetch transcripts');
      }
      setSelectedTranscript({ roomCode, logs: data });
    } catch (err) {
      alert(`Error loading transcript: ${err.message}`);
    } finally {
      setTranscriptLoading(false);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Preferences Section */}
      <div className="glass-panel dashboard-card">
        <h2 className="card-title">
          <span style={{ fontSize: '1.8rem' }}>⚙️</span> Language Preferences
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Select the language you will speak during call sessions and the language you want to hear back from the opposite side.
        </p>

        <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="speakLanguage">I Will Speak In</label>
            <select
              id="speakLanguage"
              className="form-input form-select"
              value={speakLanguage}
              onChange={(e) => setSpeakLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="hearLanguage">I Want to Hear In</label>
            <select
              id="hearLanguage"
              className="form-input form-select"
              value={hearLanguage}
              onChange={(e) => setHearLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          {/* OpenAI Translation Key config */}
          <div className="form-group" style={{ borderTop: '1px dashed var(--border-glass)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <label className="form-label" htmlFor="openaiKey">🤖 OpenAI API Key (Optional)</label>
            <input
              id="openaiKey"
              type="password"
              className="form-input"
              placeholder="sk-proj-..."
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.2' }}>
              Add a key to enable GPT-4o-mini translation for natural mixed-language/idiomatic calling. Saved locally in your browser.
            </span>
          </div>

          {prefMessage && (
            <div style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: prefMessage.includes('✅') ? '#10b981' : '#f59e0b',
              marginTop: '-0.5rem'
            }}>
              {prefMessage}
            </div>
          )}

          <button type="submit" className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            💾 Save Defaults
          </button>
        </form>
      </div>

      {/* Call Launchpad */}
      <div className="glass-panel dashboard-card">
        <h2 className="card-title">
          <span style={{ fontSize: '1.8rem' }}>📞</span> Call Launcher
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
          Start a new multilingual call room or join a room code shared by your peer.
        </p>

        {joinError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {joinError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, justifyContent: 'center' }}>
          <div>
            <button
              onClick={handleCreateRoom}
              className="btn btn-primary"
              style={{ width: '100%', padding: '1rem' }}
              disabled={creating}
            >
              🚀 {creating ? 'Creating Room...' : 'Start New Audio Call'}
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            position: 'relative'
          }}>
            <span style={{ background: '#090d16', padding: '0 1rem', zIndex: 1 }}>OR JOIN PEER</span>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              height: '1px',
              background: 'rgba(255,255,255,0.08)'
            }}></div>
          </div>

          <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="ENTER 6-DIGIT CODE"
              maxLength={6}
              style={{ textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center', fontWeight: 'bold' }}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              required
            />
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={joining}
            >
              🚪 {joining ? 'Joining...' : 'Join'}
            </button>
          </form>
        </div>
      </div>

      {/* Call History */}
      <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: '2rem', marginTop: '1rem' }}>
        <h2 className="card-title">
          <span style={{ fontSize: '1.8rem' }}>📜</span> Call History
        </h2>
        
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            No calls logged yet. Create a call to start.
          </div>
        ) : (
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {history.map((item, idx) => (
              <div key={idx} className="history-item">
                <div className="history-details">
                  <span className="history-code">Room: {item.Room.roomCode}</span>
                  <span className="history-date">
                    Joined: {new Date(item.joined_at).toLocaleString()} | Creator: {item.Room.creator?.name || 'Peer'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className={`badge ${item.Room.status === 'active' ? 'badge-success' : 'badge-indigo'}`}>
                    {item.Room.status}
                  </span>
                  <button
                    onClick={() => handleViewTranscript(item.Room.id, item.Room.roomCode)}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderRadius: '8px' }}
                  >
                    📖 Transcript
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transcript Modal */}
      {selectedTranscript && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            background: 'var(--bg-secondary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>Call Transcript (Room: {selectedTranscript.roomCode})</h3>
              <button
                onClick={() => setSelectedTranscript(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
              {selectedTranscript.logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No speech was recorded in this call.
                </div>
              ) : (
                selectedTranscript.logs.map((log, idx) => (
                  <div key={idx} style={{
                    padding: '0.85rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600, color: '#818cf8' }}>{log.speaker?.name || 'Unknown'}</span>
                      <span>{log.originalLanguage.toUpperCase()} ➔ {log.translatedLanguage.toUpperCase()}</span>
                    </div>
                    <div style={{ fontStyle: 'italic', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                      "{log.originalText}"
                    </div>
                    <div style={{ fontWeight: 500, color: '#f8fafc', fontSize: '0.95rem' }}>
                      "{log.translatedText}"
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setSelectedTranscript(null)}
              className="btn btn-secondary"
              style={{ marginTop: '1.5rem', alignSelf: 'flex-end' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
