import React, { useState } from 'react';

export default function Register({ setToken, setUser, navigateTo }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [speakLanguage, setSpeakLanguage] = useState('en-US');
  const [hearLanguage, setHearLanguage] = useState('hi-IN');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
          defaultSpeakingLanguage: speakLanguage,
          defaultListeningLanguage: hearLanguage
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Save token and user details
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      navigateTo('dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper glass-panel" style={{ maxWidth: '480px' }}>
      <div className="auth-header">
        <h1>Create Account</h1>
        <p>Start communicating without borders</p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444',
          padding: '0.75rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Full Name</label>
          <input
            id="name"
            type="text"
            className="form-input"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="speakLanguage">I Will Speak In</label>
            <select
              id="speakLanguage"
              className="form-input form-select"
              value={speakLanguage}
              onChange={(e) => setSpeakLanguage(e.target.value)}
            >
              <option value="en-US">English (US)</option>
              <option value="hi-IN">Hindi (हिन्दी)</option>
              <option value="es-ES">Spanish (Español)</option>
              <option value="fr-FR">French (Français)</option>
              <option value="de-DE">German (Deutsch)</option>
              <option value="zh-CN">Chinese (中文)</option>
              <option value="ja-JP">Japanese (日本語)</option>
              <option value="ar-SA">Arabic (العربية)</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="hearLanguage">I Want to Hear In</label>
            <select
              id="hearLanguage"
              className="form-input form-select"
              value={hearLanguage}
              onChange={(e) => setHearLanguage(e.target.value)}
            >
              <option value="en-US">English (US)</option>
              <option value="hi-IN">Hindi (हिन्दी)</option>
              <option value="es-ES">Spanish (Español)</option>
              <option value="fr-FR">French (Français)</option>
              <option value="de-DE">German (Deutsch)</option>
              <option value="zh-CN">Chinese (中文)</option>
              <option value="ja-JP">Japanese (日本語)</option>
              <option value="ar-SA">Arabic (العربية)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '1rem' }}
          disabled={loading}
        >
          {loading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8' }}>
        Already have an account?{' '}
        <span
          onClick={() => navigateTo('login')}
          style={{ color: '#6366f1', cursor: 'pointer', fontWeight: 600 }}
        >
          Login
        </span>
      </div>
    </div>
  );
}
