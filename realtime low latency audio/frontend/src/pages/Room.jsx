import React, { useState, useEffect, useRef } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../services/socketService';
import { WebRTCService } from '../services/webrtcService';
import { startSpeechRecognition, stopSpeechRecognition, speakText, translateTextClient } from '../services/speechService';

export default function Room({ token, user, roomCode, navigateTo }) {
  const [callState, setCallState] = useState('connecting'); // 'connecting', 'waiting', 'active', 'ended'
  const [peer, setPeer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [audioMode, setAudioMode] = useState('translated-only'); // 'translated-only', 'original-translated'
  const [captions, setCaptions] = useState([]);
  const [liveCaption, setLiveCaption] = useState(null); // { speakerName, text, isSelf }
  const [speakingState, setSpeakingState] = useState('idle'); // 'idle', 'self-speaking', 'peer-speaking'
  const [micStatus, setMicStatus] = useState('connecting'); // 'connecting', 'listening', 'paused', 'blocked', 'error'
  const [micError, setMicError] = useState('');
  const [chatInput, setChatInput] = useState(''); // Text fallback input

  const socketRef = useRef(null);
  const webrtcRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const captionsEndRef = useRef(null);
  const captionTimeoutRef = useRef(null);
  const isMutedRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Map user codes to Web Speech API locales (codes are already in standard format 'en-US', 'hi-IN')
  const getLanguageLocale = (code) => {
    if (!code) return 'en-US';
    if (code === 'en') return 'en-US';
    if (code === 'hi') return 'hi-IN';
    return code;
  };

  // Scroll to bottom of transcripts automatically
  useEffect(() => {
    captionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [captions, liveCaption]);

  // Function to initialize Speech Recognition
  const initSpeechRecognition = () => {
    const speakLocale = getLanguageLocale(user.defaultSpeakingLanguage);
    console.log(`[STT] Initializing speech recognition in ${speakLocale}...`);
    setMicStatus('connecting');
    setMicError('');

    try {
      startSpeechRecognition(
        speakLocale,
        (text, isFinal) => {
          // Verify we aren't muted (using Ref to avoid stale closure)
          if (!isMutedRef.current) {
            console.log(`[STT] Captured text (${isFinal ? 'Final' : 'Interim'}): "${text}"`);
            
            // Emit to translation socket
            if (socketRef.current) {
              socketRef.current.emit('speech-transcript', { roomCode, text, isFinal });
            }
          }
        },
        (error) => {
          console.error('[STT] Speech recognition runtime error:', error);
          if (error === 'not-allowed') {
            setMicStatus('blocked');
            setMicError('Microphone permission blocked. Please click the mic icon in your address bar to allow.');
          } else {
            setMicStatus('error');
            setMicError(`Voice Capture Error: ${error}. Try tapping the Mic button to restart.`);
          }
        }
      );
      setMicStatus('listening');
    } catch (err) {
      setMicStatus('error');
      setMicError('Web Speech API is not supported or failed to start.');
    }
  };

  useEffect(() => {
    if (!roomCode) {
      navigateTo('dashboard');
      return;
    }

    // 1. Initialize Socket Connection
    const socket = connectSocket();
    socketRef.current = socket;

    // Queue ICE Candidates that are generated before the peer socket ID is loaded
    const iceCandidatesQueue = [];

    // 2. Initialize WebRTC Helper
    const webrtc = new WebRTCService({
      onIceCandidate: (candidate) => {
        const activePeerSocketId = webrtcRef.current?.activePeerSocketId;
        if (activePeerSocketId) {
          socket.emit('ice-candidate', { targetSocketId: activePeerSocketId, candidate });
        } else {
          // Queue the candidate until peer socket is loaded
          iceCandidatesQueue.push(candidate);
        }
      },
      onTrack: (remoteStream) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          console.log('Linked remote audio stream to element.');
        }
      },
      onConnectionStateChange: (state) => {
        if (state === 'connected') {
          setCallState('active');
        } else if (state === 'disconnected' || state === 'failed') {
          setCallState('waiting');
        }
      }
    });
    webrtcRef.current = webrtc;

    const flushIceCandidates = (targetSocketId) => {
      if (iceCandidatesQueue.length > 0) {
        console.log(`[WebRTC] Flushing ${iceCandidatesQueue.length} queued ICE candidates to peer: ${targetSocketId}`);
        while (iceCandidatesQueue.length > 0) {
          const candidate = iceCandidatesQueue.shift();
          socket.emit('ice-candidate', { targetSocketId, candidate });
        }
      }
    };

    // 3. Request microphone access and setup local streams
    const prepareMedia = async () => {
      let micSuccess = false;
      try {
        await webrtc.getLocalAudioStream();
        micSuccess = true;
      } catch (err) {
        console.warn('Microphone access denied or failed:', err);
        setMicStatus('blocked');
        setMicError('Could not access microphone hardware. Please allow microphone access or connect a mic.');
      }

      // Allow joining the call even if microphone access fails/is pending
      setCallState('waiting');

      if (socket) {
        socket.emit('join-room', {
          roomCode,
          userId: user.id,
          name: user.name,
          speakingLanguage: getLanguageLocale(user.defaultSpeakingLanguage),
          listeningLanguage: getLanguageLocale(user.defaultListeningLanguage)
        });
      }

      // Initialize Speech Recognition only if mic capture succeeded
      if (micSuccess) {
        initSpeechRecognition();
      }
    };
    prepareMedia();

    // 4. Socket Listeners
    socket.on('existing-peers', async (peersList) => {
      console.log('Existing peers in room:', peersList);
      if (peersList && peersList.length > 0) {
        const activePeer = peersList[0];
        setPeer(activePeer);
        webrtc.activePeerSocketId = activePeer.socketId;

        // Flush queued ICE candidates
        flushIceCandidates(activePeer.socketId);

        // Since we joined a room with an existing user, we initiate the call offer
        try {
          const offer = await webrtc.createOffer();
          socket.emit('webrtc-offer', { targetSocketId: activePeer.socketId, offer });
          console.log('WebRTC connection offer sent to peer.');
        } catch (err) {
          console.error('Error initiating WebRTC call:', err);
        }
      }
    });

    socket.on('user-joined', ({ socketId, userId, name, speakingLanguage, listeningLanguage }) => {
      console.log('New peer joined call:', name);
      const activePeer = { socketId, userId, name, speakingLanguage, listeningLanguage };
      setPeer(activePeer);
      webrtc.activePeerSocketId = socketId;
      setCallState('active');

      // Flush queued ICE candidates
      flushIceCandidates(socketId);
    });

    socket.on('webrtc-offer', async ({ senderSocketId, offer }) => {
      console.log('Received WebRTC call offer from peer.');
      try {
        const answer = await webrtc.handleOffer(offer);
        socket.emit('webrtc-answer', { targetSocketId: senderSocketId, answer });
        console.log('WebRTC call answer sent.');
      } catch (err) {
        console.error('Error processing WebRTC offer:', err);
      }
    });

    socket.on('webrtc-answer', async ({ senderSocketId, answer }) => {
      console.log('Received WebRTC call answer.');
      await webrtc.handleAnswer(answer);
    });

    socket.on('ice-candidate', async ({ senderSocketId, candidate }) => {
      await webrtc.addIceCandidate(candidate);
    });

    socket.on('peer-mute-status', ({ isMuted }) => {
      console.log('Peer muted microphone:', isMuted);
    });

    socket.on('translation-update', async ({ speakerId, speakerName, originalText, originalLang, isFinal }) => {
      const isSelf = speakerId === user.id;
      console.log(`[SOCKET] Received translation-update event from ${speakerName}: "${originalText}" (isFinal: ${isFinal})`);

      // Update Waveform animation based on who is speaking
      if (isSelf) {
        setSpeakingState('self-speaking');
      } else {
        setSpeakingState('peer-speaking');
      }

      // Reset speaking animation after a short timeout of inactivity
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
      captionTimeoutRef.current = setTimeout(() => {
        setSpeakingState('idle');
        setLiveCaption(null);
      }, 3000);

      // Determine target language (our default listening language)
      const ourListeningLang = getLanguageLocale(user.defaultListeningLanguage);

      let translatedText = originalText;
      if (!isSelf && originalLang.split('-')[0] !== ourListeningLang.split('-')[0]) {
        // Perform client-side translation using browser's working network connection
        translatedText = await translateTextClient(originalText, originalLang, ourListeningLang);
      }

      if (isFinal) {
        setLiveCaption(null);
        setCaptions(prev => [...prev, {
          speakerName,
          originalText,
          translatedText,
          isSelf
        }]);

        // Speak translated text out loud if it's from the peer
        if (!isSelf) {
          console.log(`[TTS] Speaking translated phrase: "${translatedText}" in ${ourListeningLang}`);
          speakText(translatedText, ourListeningLang);

          // Emit save-transcript event so backend logs it to the local DB
          if (socketRef.current) {
            socketRef.current.emit('save-transcript', {
              roomCode,
              originalText,
              translatedText,
              originalLang,
              translatedLang: ourListeningLang
            });
          }
        }
      } else {
        // Show interim transcript live captions
        setLiveCaption({
          speakerName,
          text: isSelf ? originalText : translatedText,
          isSelf
        });
      }
    });

    socket.on('peer-left', () => {
      console.log('Peer disconnected.');
      setCallState('waiting');
      setPeer(null);
      if (webrtcRef.current) {
        webrtcRef.current.close();
      }
    });

    socket.on('call-ended', () => {
      console.log('Call ended.');
      setCallState('ended');
      setTimeout(() => navigateTo('dashboard'), 2000);
    });

    // Cleanup on unmount
    return () => {
      stopSpeechRecognition();
      if (webrtcRef.current) {
        webrtcRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.off('existing-peers');
        socketRef.current.off('user-joined');
        socketRef.current.off('webrtc-offer');
        socketRef.current.off('webrtc-answer');
        socketRef.current.off('ice-candidate');
        socketRef.current.off('peer-mute-status');
        socketRef.current.off('translation-update');
        socketRef.current.off('peer-left');
        socketRef.current.off('call-ended');
      }
      disconnectSocket(); // Clean up socket connection fully to reset room memberships!
      if (captionTimeoutRef.current) clearTimeout(captionTimeoutRef.current);
    };
  }, [roomCode]);

  // Adjust volume when audio mode changes or remote track updates
  useEffect(() => {
    if (remoteAudioRef.current) {
      if (audioMode === 'translated-only') {
        remoteAudioRef.current.volume = 0; // Mute original peer voice
      } else {
        remoteAudioRef.current.volume = 0.2; // Set original peer voice to 20%
      }
    }
  }, [audioMode]);

  // Toggle Microphone Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (webrtcRef.current) {
      webrtcRef.current.setMute(nextMute);
    }
    
    // Stop/Start STT loop to prevent transcribing muted inputs
    if (nextMute) {
      stopSpeechRecognition();
      setMicStatus('paused');
    } else {
      initSpeechRecognition();
    }

    // Inform peer of mute status
    if (socketRef.current) {
      socketRef.current.emit('mute-status', { roomCode, isMuted: nextMute });
    }
  };

  // Toggle Audio Mixing Mode
  const handleToggleAudioMode = () => {
    setAudioMode(prev => prev === 'translated-only' ? 'original-translated' : 'translated-only');
  };

  // Exit Room / End Call
  const handleEndCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('end-call', { roomCode });
    }
    navigateTo('dashboard');
  };

  // Fallback Typed Text Sending Handler
  const handleSendText = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    console.log(`[Fallback] Sending typed message: "${chatInput}"`);
    if (socketRef.current) {
      socketRef.current.emit('speech-transcript', {
        roomCode,
        text: chatInput.trim(),
        isFinal: true
      });
    }
    setChatInput('');
  };

  return (
    <div className="room-container">
      {/* Hidden audio element to play remote peer stream */}
      <audio ref={remoteAudioRef} autoPlay />

      {/* Mic permission status warning banner */}
      {micStatus === 'blocked' && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          color: '#fca5a5',
          padding: '0.85rem 1.5rem',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.95rem',
          fontWeight: 500
        }}>
          <span>⚠️ {micError}</span>
          <button 
            onClick={initSpeechRecognition} 
            className="btn btn-secondary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', borderRadius: '8px' }}
          >
            Retry Permission 🎙️
          </button>
        </div>
      )}

      {micStatus === 'error' && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.2)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          color: '#fde047',
          padding: '0.85rem 1.5rem',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.95rem',
          fontWeight: 500
        }}>
          <span>⚠️ {micError}</span>
          <button 
            onClick={initSpeechRecognition} 
            className="btn btn-secondary" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', borderRadius: '8px' }}
          >
            Restart Mic 🔄
          </button>
        </div>
      )}

      <div className="call-layout">
        
        {/* Main Call View */}
        <div className="glass-panel main-call-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Room Code: <span style={{ color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>{roomCode}</span></h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`badge ${micStatus === 'listening' ? 'badge-success' : 'badge-indigo'}`} style={{ textTransform: 'none' }}>
                {micStatus === 'listening' ? '🎙️ Voice Capture: ON' : micStatus === 'paused' ? '🎙️ Muted' : '🎙️ Mic: Inactive'}
              </span>
              <span className={`badge ${callState === 'active' ? 'badge-success' : 'badge-indigo'}`}>
                {callState === 'connecting' ? 'Connecting...' : callState === 'waiting' ? 'Waiting for peer...' : 'Active Call'}
              </span>
            </div>
          </div>

          {/* Visual Waveform and Avatar */}
          <div className="call-status-area">
            <div className="avatar-container">
              <div className="avatar">
                {peer ? peer.name.substring(0, 1).toUpperCase() : '?'}
              </div>
              <div className={`avatar-pulse ${speakingState === 'peer-speaking' ? 'active' : ''}`} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h3>{peer ? peer.name : 'Waiting...'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                {peer ? `Speaks: ${peer.speakingLanguage.toUpperCase()} | Hears: ${peer.listeningLanguage.toUpperCase()}` : 'Share code with peer to join'}
              </p>
            </div>

            {/* Jumping Waveform Indicator */}
            <div className={`waveform ${speakingState !== 'idle' ? 'active' : ''}`}>
              <div className="waveform-bar"></div>
              <div className="waveform-bar"></div>
              <div className="waveform-bar"></div>
              <div className="waveform-bar"></div>
              <div className="waveform-bar"></div>
              <div className="waveform-bar"></div>
              <div className="waveform-bar"></div>
              <div className="waveform-bar"></div>
            </div>

            {/* Live Caption overlay (Interim transcript updates) */}
            {liveCaption && (
              <div className="live-caption-overlay">
                <span style={{ fontSize: '0.8rem', color: liveCaption.isSelf ? 'var(--accent-primary)' : 'var(--accent-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                  {liveCaption.speakerName} (Speaking...)
                </span>
                <span style={{ fontSize: '1rem', fontStyle: 'italic' }}>
                  "{liveCaption.text}"
                </span>
              </div>
            )}
          </div>

          {/* Call Controls */}
          <div className="controls-bar">
            {/* Mute Button */}
            <button
              onClick={handleToggleMute}
              className={`control-btn ${isMuted ? 'active' : ''}`}
              title={isMuted ? 'Unmute Mic' : 'Mute Mic'}
            >
              {isMuted ? '🎙️❌' : '🎙️'}
            </button>

            {/* Audio Mode Toggle */}
            <button
              onClick={handleToggleAudioMode}
              className="btn btn-secondary"
              style={{ padding: '0.6rem 1.2rem', borderRadius: '30px' }}
              title="Switch translation audio mixing mode"
            >
              Mode: {audioMode === 'translated-only' ? '🔇 Raw + 🔊 Translated' : '🔊 Raw (20%) + 🔊 Translated'}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndCall}
              className="control-btn danger"
              title="Hang Up"
            >
              📞
            </button>
          </div>
        </div>

        {/* Captions and Transcripts Side Panel */}
        <div className="glass-panel participants-panel">
          <h3 style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
            💬 Live Translation
          </h3>

          <div className="captions-area">
            <div className="transcript-list">
              {captions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                  Translation captions will appear here as you speak.
                </div>
              ) : (
                captions.map((cap, idx) => (
                  <div key={idx} className={`transcript-bubble ${cap.isSelf ? 'self' : 'peer'}`}>
                    <div className="bubble-meta">
                      <span style={{ fontWeight: 600, color: cap.isSelf ? '#818cf8' : '#c084fc' }}>{cap.speakerName}</span>
                    </div>
                    <div className="bubble-text-translated" style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      "{cap.isSelf ? cap.originalText : cap.translatedText}"
                    </div>
                    {!cap.isSelf && cap.originalText !== cap.translatedText && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                        Original: "{cap.originalText}"
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={captionsEndRef} />
            </div>

            {/* Fallback Text Input Form */}
            <form onSubmit={handleSendText} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Type a message fallback..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{ fontSize: '0.9rem', padding: '0.75rem' }}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ padding: '0.75rem', borderRadius: '12px' }}
              >
                Send
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
