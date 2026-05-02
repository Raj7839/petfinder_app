import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, ShieldAlert } from 'lucide-react';
import { PetfinderIcon } from '../../components/ui/PetfinderIcon';
import { useAuth } from '../../store/AuthContext';
import './Auth.css';

export function LoginPage() {
  const { login, loginAsGuest, isAuthenticated, sessionWarning, dismissSessionWarning } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockedSeconds <= 0) return;
    const t = setInterval(() => setLockedSeconds(s => {
      if (s <= 1) { clearInterval(t); setError(''); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [lockedSeconds]);

  const formatLockTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedSeconds > 0) return;
    setError('');
    setLoading(true);

    const result = await login(username.trim(), password);
    if (!result.success) {
      setError(result.error || 'Login failed.');
      if (result.lockedSeconds) setLockedSeconds(result.lockedSeconds);
    }
    setLoading(false);
  }, [login, username, password, lockedSeconds]);

  const handleGuestLogin = useCallback(async () => {
    setLoading(true);
    const result = await loginAsGuest();
    if (result.success) {
      navigate('/report-found', { replace: true });
    } else {
      setError(result.error || 'Failed to initialize quick report.');
      setLoading(false);
    }
  }, [loginAsGuest, navigate]);

  if (isAuthenticated) return null;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <PetfinderIcon size={36} />
          <h1>petfinder</h1>
        </div>
        <p className="auth-tagline">Find Lost. Bring Home. AI-Powered.</p>

        {/* Session timeout warning — shown if they were auto-redirected */}
        {sessionWarning && (
          <div className="auth-session-warning">
            <Clock size={16} />
            <span>Your session is about to expire.</span>
            <button onClick={dismissSessionWarning} className="auth-warning-dismiss">Stay logged in</button>
          </div>
        )}

        <h2 className="auth-title">Welcome Back</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-username">Username</label>
            <input
              id="login-username"
              type="text"
              className="auth-input"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              disabled={lockedSeconds > 0}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="auth-input"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={lockedSeconds > 0}
            />
          </div>

          {error && (
            <div className={`auth-error ${lockedSeconds > 0 ? 'auth-error-locked' : ''}`}>
              {lockedSeconds > 0 ? <ShieldAlert size={16} /> : <AlertCircle size={16} />}
              <span>{error}</span>
              {lockedSeconds > 0 && (
                <span className="auth-lockout-timer">{formatLockTime(lockedSeconds)}</span>
              )}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !username || !password || lockedSeconds > 0}
          >
            {loading && <span className="auth-spinner" />}
            {lockedSeconds > 0
              ? `Locked — ${formatLockTime(lockedSeconds)}`
              : loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/register" className="auth-switch-link">Create Account</Link>
        </p>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button 
          className="auth-guest-btn" 
          onClick={handleGuestLogin}
          disabled={loading || lockedSeconds > 0}
          type="button"
        >
          🚨 Quick Report Found Pet
        </button>
      </div>
    </div>
  );
}
