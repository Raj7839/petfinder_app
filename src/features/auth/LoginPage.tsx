import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, ShieldAlert, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { BrandIcon } from '../../components/ui/BrandIcon';
import { useAuth } from '../../store/AuthContext';
import { useLanguage } from '../../i18n';
import './Auth.css';

export function LoginPage() {
  const { login, loginAsGuest, resetPassword, isAuthenticated, sessionWarning, dismissSessionWarning } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedSeconds, setLockedSeconds] = useState(0);
  const [isResetMode, setIsResetMode] = useState(false);

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
    setSuccess('');
    setLoading(true);

    if (isResetMode) {
      const result = await resetPassword(email.trim(), password);
      if (result.success) {
        setSuccess(t.auth.resetSuccess);
        setIsResetMode(false);
      } else {
        setError(result.error || 'Reset failed.');
      }
    } else {
      const result = await login(username.trim(), password);
      if (!result.success) {
        setError(result.error || 'Login failed.');
        if (result.lockedSeconds) setLockedSeconds(result.lockedSeconds);
      }
    }
    setLoading(false);
  }, [login, resetPassword, username, password, email, lockedSeconds, isResetMode, t]);

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
          <BrandIcon size={36} />
          <h1>{t.brand.name}</h1>
        </div>
        <p className="auth-tagline">{t.brand.taglineHindi}</p>
        <p className="auth-tagline-sub">{t.brand.tagline}</p>

        {/* Session timeout warning */}
        {sessionWarning && (
          <div className="auth-session-warning">
            <Clock size={16} />
            <span>Your session is about to expire.</span>
            <button onClick={dismissSessionWarning} className="auth-warning-dismiss">Stay logged in</button>
          </div>
        )}

        <div className="auth-header-row">
          {isResetMode && (
            <button className="auth-back-btn" onClick={() => { setIsResetMode(false); setError(''); setSuccess(''); }}>
              <ChevronLeft size={18} />
            </button>
          )}
          <h2 className="auth-title">
            {isResetMode ? t.auth.recoveryTitle : t.auth.welcomeBack}
          </h2>
        </div>

        {isResetMode && <p className="auth-subtitle">{t.auth.recoverySubtitle}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isResetMode ? (
            <>
              <div className="auth-field">
                <label htmlFor="reset-email">{t.auth.emailForRecovery}</label>
                <input
                  id="reset-email"
                  type="email"
                  className="auth-input"
                  placeholder={t.auth.emailPlaceholder}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="auth-field">
                <label htmlFor="reset-password">{t.auth.confirmNewPassword}</label>
                <input
                  id="reset-password"
                  type="password"
                  className="auth-input"
                  placeholder={t.auth.newPasswordPlaceholder}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <>
              <div className="auth-field">
                <label htmlFor="login-username">{t.auth.username}</label>
                <input
                  id="login-username"
                  type="text"
                  className="auth-input"
                  placeholder={t.auth.usernamePlaceholder}
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={lockedSeconds > 0 || loading}
                />
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label htmlFor="login-password">{t.auth.password}</label>
                  <button type="button" className="auth-forgot-link" onClick={() => setIsResetMode(true)}>
                    {t.auth.forgotPassword}
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  className="auth-input"
                  placeholder={t.auth.passwordPlaceholder}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={lockedSeconds > 0 || loading}
                />
              </div>
            </>
          )}

          {error && (
            <div className={`auth-error ${lockedSeconds > 0 ? 'auth-error-locked' : ''}`}>
              {lockedSeconds > 0 ? <ShieldAlert size={16} /> : <AlertCircle size={16} />}
              <span>{error}</span>
              {lockedSeconds > 0 && (
                <span className="auth-lockout-timer">{formatLockTime(lockedSeconds)}</span>
              )}
            </div>
          )}

          {success && (
            <div className="auth-success-alert">
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || (isResetMode ? (!email || !password) : (!username || !password)) || lockedSeconds > 0}
          >
            {loading && <span className="auth-spinner" />}
            {lockedSeconds > 0
              ? `${t.auth.lockedPrefix} ${formatLockTime(lockedSeconds)}`
              : loading ? (isResetMode ? 'Resetting...' : t.auth.signingIn) : (isResetMode ? t.auth.resetPasswordBtn : t.auth.signIn)}
          </button>
        </form>

        <p className="auth-switch">
          {isResetMode ? (
            <button className="auth-switch-link-btn" onClick={() => setIsResetMode(false)}>{t.auth.backToLogin}</button>
          ) : (
            <>
              {t.auth.noAccount}{' '}
              <Link to="/register" className="auth-switch-link">{t.auth.createAccountLink}</Link>
            </>
          )}
        </p>

        {!isResetMode && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
