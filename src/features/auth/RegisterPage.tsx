import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { PetfinderIcon } from '../../components/ui/PetfinderIcon';
import { useAuth } from '../../store/AuthContext';
import { getPasswordStrength } from '../../utils/sanitize';
import './Auth.css';

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'public' | 'family'>('public');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (strength.score < 2) {
      setError('Please choose a stronger password.');
      return;
    }

    setLoading(true);
    const result = await register({ username, password, fullName, email, role });
    if (!result.success) {
      setError(result.error || 'Registration failed.');
    }
    setLoading(false);
  };

  if (isAuthenticated) return null;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <PetfinderIcon size={36} />
          <h1>petfinder</h1>
        </div>
        <p className="auth-tagline">Find Lost. Bring Home. AI-Powered.</p>

        <h2 className="auth-title">Create Your Account</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>I am registering as</label>
            <div className="auth-role-selector">
              <div className={`auth-role-option ${role === 'public' ? 'active' : ''}`} onClick={() => setRole('public')}>
                <strong>🔍 Public User</strong>
                <span>Report found persons, quick scan</span>
              </div>
              <div className={`auth-role-option ${role === 'family' ? 'active' : ''}`} onClick={() => setRole('family')}>
                <strong>👨‍👩‍👧 Family Member</strong>
                <span>Report missing persons</span>
              </div>
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-fullname">Full Name</label>
            <input id="reg-fullname" type="text" className="auth-input"
              placeholder="Your full name" value={fullName}
              onChange={e => setFullName(e.target.value)} autoFocus required />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" className="auth-input"
              placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} autoComplete="email" required />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-username">Username</label>
            <input id="reg-username" type="text" className="auth-input"
              placeholder="Letters, numbers, underscore (3–30 chars)" value={username}
              onChange={e => setUsername(e.target.value)} autoComplete="username" required />
            <span className="auth-field-hint">Letters, numbers, and _ only</span>
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" className="auth-input"
              placeholder="Min 8 chars, uppercase + number required" value={password}
              onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
            {/* Password strength meter */}
            {password.length > 0 && (
              <div className="auth-strength">
                <div className="auth-strength-bar">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="auth-strength-segment"
                      style={{ background: i <= strength.score ? strength.color : 'var(--color-bg-tertiary)' }}
                    />
                  ))}
                </div>
                <span className="auth-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input id="reg-confirm" type="password"
              className={`auth-input ${passwordsMismatch ? 'auth-input-error' : passwordsMatch ? 'auth-input-success' : ''}`}
              placeholder="Re-enter your password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
            {passwordsMismatch && <span className="auth-field-error">Passwords do not match</span>}
            {passwordsMatch && <span className="auth-field-success">✓ Passwords match</span>}
          </div>

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button type="submit" className="auth-submit"
            disabled={loading || !username || !password || !fullName || !email || strength.score < 2}>
            {loading && <span className="auth-spinner" />}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
