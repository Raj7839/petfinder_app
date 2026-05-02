import { useState } from 'react';
import { Eye, SearchCheck, Bell, Shield, Trash2, Lock, Mail, User, LogOut, KeyRound, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useApp } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { getPasswordStrength } from '../../utils/sanitize';
import './Profile.css';

export function ProfilePage() {
  const { state } = useApp();
  const { user, logout, isAdmin, changePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Change password state
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const newPwStrength = getPasswordStrength(newPw);

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const roleBadge = user?.role === 'admin'
    ? { label: '🛡️ Admin', variant: 'purple' as const }
    : user?.role === 'family'
    ? { label: '👨‍👩‍👧 Family', variant: 'amber' as const }
    : { label: '🔍 Public', variant: 'blue' as const };

  const roleDescription = user?.role === 'admin'
    ? 'Full access: manage all reports, confirm/dismiss matches, view analytics, system settings.'
    : user?.role === 'family'
    ? 'You can report missing persons, view matches, use quick scan, and report found persons.'
    : 'You can report found persons, use quick scan, and view matches. To report missing persons, please register as a Family Member.';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    if (newPwStrength.score < 2) { setPwError('Please choose a stronger password.'); return; }
    setPwLoading(true);
    const result = await changePassword(oldPw, newPw);
    setPwLoading(false);
    if (result.success) {
      showToast({ type: 'success', title: 'Password Changed', message: 'Your password has been updated successfully.' });
      setOldPw(''); setNewPw(''); setConfirmPw(''); setPwError('');
    } else {
      setPwError(result.error || 'Failed to change password.');
    }
  };

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <Card className="profile-header-card" padding="lg">
        <div className="profile-top">
          <div className="profile-avatar-large">
            <span>{initials}</span>
          </div>
          <div className="profile-info">
            <h1>{user?.fullName || 'User'}</h1>
            <p className="profile-email"><Mail size={14} /> {user?.email || '—'}</p>
            <p className="profile-username"><User size={14} /> @{user?.username || '—'}</p>
            <Badge variant={roleBadge.variant} size="md"><Shield size={12} /> {roleBadge.label}</Badge>
          </div>
        </div>
        <p className="profile-role-desc">{roleDescription}</p>
        <div className="profile-stats">
          <div className="profile-stat">
            <Eye size={18} />
            <div><span className="profile-stat-num">{state.foundReports.length}</span><span className="profile-stat-label">Found Reports</span></div>
          </div>
          <div className="profile-stat">
            <SearchCheck size={18} />
            <div><span className="profile-stat-num">{state.missingReports.length}</span><span className="profile-stat-label">Missing Reports</span></div>
          </div>
          <div className="profile-stat">
            <Bell size={18} />
            <div><span className="profile-stat-num">{state.notifications.filter(n => !n.read).length}</span><span className="profile-stat-label">Unread</span></div>
          </div>
        </div>
      </Card>

      <div className="profile-grid">
        {/* My Reports */}
        <Card>
          <h2>My Reports</h2>
          <div className="profile-report-list">
            {state.foundReports.length === 0 && state.missingReports.length === 0 && (
              <p className="profile-empty">No reports filed yet.</p>
            )}
            {state.foundReports.slice(0, 3).map(r => (
              <div key={r.id} className="profile-report-item">
                <div className="profile-report-photo">{r.photos[0] && <img src={r.photos[0]} alt="" />}</div>
                <div className="profile-report-info">
                  <Badge variant="blue" size="sm">Found</Badge>
                  <span>{r.location.address || 'GPS Location'}</span>
                </div>
              </div>
            ))}
            {state.missingReports.slice(0, 3).map(r => (
              <div key={r.id} className="profile-report-item">
                <div className="profile-report-photo">{r.photos[0] && <img src={r.photos[0]} alt="" />}</div>
                <div className="profile-report-info">
                  <Badge variant="amber" size="sm">Missing</Badge>
                  <span>{r.identity.name || 'Unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Settings */}
        <Card>
          <h2>Privacy & Settings</h2>
          <div className="settings-list">
            <div className="setting-item">
              <div className="setting-info">
                <Lock size={18} />
                <div><strong>Face Data Encryption</strong><p>All face descriptors are encrypted at rest</p></div>
              </div>
              <Badge variant="emerald" size="sm">Enabled</Badge>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <User size={18} />
                <div><strong>Public Profile Blur</strong><p>Blur faces in public-facing reports</p></div>
              </div>
              <Badge variant="emerald" size="sm">On</Badge>
            </div>
            <div className="setting-item">
              <div className="setting-info">
                <Bell size={18} />
                <div><strong>Notifications</strong><p>Match alerts and nearby reports</p></div>
              </div>
              <Badge variant="emerald" size="sm">On</Badge>
            </div>
          </div>
          <div className="profile-actions">
            <Button variant="danger" size="sm" icon={<LogOut size={16} />} onClick={handleLogout}>
              Sign Out
            </Button>
            <Button variant="ghost" size="sm" icon={<Trash2 size={16} />} onClick={() => {
              showToast({ type: 'info', title: 'Data Deletion', message: 'In production, this would delete all your personal data.' });
            }}>
              Delete My Data
            </Button>
          </div>
        </Card>
      </div>

      {/* Must-change-password banner */}
      {user?.mustChangePassword && (
        <Card style={{ borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'var(--color-amber-400)' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Please change your default password</strong>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                You are using the default admin password. Change it below to secure your account.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Change Password */}
      <Card>
        <h2><KeyRound size={18} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />Change Password</h2>
        <form onSubmit={handleChangePassword} className="profile-pw-form">
          <div className="profile-pw-field">
            <label htmlFor="old-pw">Current Password</label>
            <input id="old-pw" type="password" className="auth-input" placeholder="Your current password"
              value={oldPw} onChange={e => setOldPw(e.target.value)} autoComplete="current-password" required />
          </div>
          <div className="profile-pw-field">
            <label htmlFor="new-pw">New Password</label>
            <input id="new-pw" type="password" className="auth-input" placeholder="Min 8 chars, uppercase + number"
              value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" required />
            {newPw.length > 0 && (
              <div className="auth-strength" style={{ marginTop: 6 }}>
                <div className="auth-strength-bar">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="auth-strength-segment"
                      style={{ background: i <= newPwStrength.score ? newPwStrength.color : 'var(--color-bg-tertiary)' }} />
                  ))}
                </div>
                <span className="auth-strength-label" style={{ color: newPwStrength.color }}>{newPwStrength.label}</span>
              </div>
            )}
          </div>
          <div className="profile-pw-field">
            <label htmlFor="confirm-pw">Confirm New Password</label>
            <input id="confirm-pw" type="password"
              className={`auth-input ${confirmPw && newPw !== confirmPw ? 'auth-input-error' : confirmPw && newPw === confirmPw ? 'auth-input-success' : ''}`}
              placeholder="Re-enter new password"
              value={confirmPw} onChange={e => setConfirmPw(e.target.value)} autoComplete="new-password" required />
          </div>
          {pwError && (
            <div className="auth-error" style={{ marginTop: 'var(--space-2)' }}>
              <AlertTriangle size={14} />{pwError}
            </div>
          )}
          <Button type="submit" variant="primary" size="sm" icon={<Lock size={15} />}
            disabled={pwLoading || !oldPw || !newPw || !confirmPw || newPwStrength.score < 2}>
            {pwLoading ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </Card>

      {/* Notification History */}
      <Card>
        <h2>Notification History</h2>
        <div className="notif-list">
          {state.notifications.length === 0 && <p className="profile-empty">No notifications yet.</p>}
          {state.notifications.map(n => (
            <div key={n.id} className={`notif-item ${!n.read ? 'notif-unread' : ''}`}>
              <div className={`notif-dot notif-dot-${n.type}`} />
              <div className="notif-content">
                <strong>{n.title}</strong>
                <p>{n.message}</p>
              </div>
              <span className="notif-time">{new Date(n.timestamp).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
