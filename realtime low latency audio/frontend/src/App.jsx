import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Room from './pages/Room';
import { disconnectSocket } from './services/socketService';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login'); // 'login', 'register', 'dashboard', 'room'
  const [roomCode, setRoomCode] = useState('');
  const [initializing, setInitializing] = useState(true);

  // Authenticate user on startup
  useEffect(() => {
    const fetchUser = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setInitializing(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        const data = await response.json();
        if (response.ok) {
          setUser(data);
          setToken(storedToken);
          setPage('dashboard');
        } else {
          // Token invalid, clear it
          handleLogout();
        }
      } catch (err) {
        console.error('Error authenticating user on init:', err);
        // Offline or server down: fallback to cached user details
        const cachedUser = localStorage.getItem('user');
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
          setPage('dashboard');
        } else {
          handleLogout();
        }
      } finally {
        setInitializing(false);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    disconnectSocket();
    setPage('login');
  };

  const navigateTo = (destination) => {
    // Prevent unauthenticated navigation
    const storedToken = localStorage.getItem('token');
    if (!storedToken && destination !== 'register' && destination !== 'login') {
      setPage('login');
      return;
    }
    setPage(destination);
  };

  if (initializing) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #090d16 70%)',
        color: '#f8fafc'
      }}>
        <div className="avatar-pulse" style={{ width: '80px', height: '80px', background: '#6366f1', borderRadius: '50%' }} />
        <h2 style={{ marginTop: '2.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>Loading System...</h2>
      </div>
    );
  }

  return (
    <>
      {/* Global Navigation Header (only visible when authenticated) */}
      {token && user && (
        <header className="navbar">
          <div className="navbar-brand">
            <span>🗣️</span> Real-Time Translator Call
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.95rem', color: '#94a3b8' }}>
              Logged in: <strong style={{ color: '#f8fafc' }}>{user.name}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
              Logout 🚪
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="app-container">
        {page === 'login' && (
          <Login setToken={setToken} setUser={setUser} navigateTo={navigateTo} />
        )}
        {page === 'register' && (
          <Register setToken={setToken} setUser={setUser} navigateTo={navigateTo} />
        )}
        {page === 'dashboard' && (
          <Dashboard token={token} user={user} setUser={setUser} setRoomCode={setRoomCode} navigateTo={navigateTo} />
        )}
        {page === 'room' && (
          <Room token={token} user={user} roomCode={roomCode} navigateTo={navigateTo} />
        )}
      </main>
    </>
  );
}
