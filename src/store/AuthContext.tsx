import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'public' | 'family' | 'admin';
  createdAt: string;
  mustChangePassword?: boolean;
}

interface StoredUser extends AuthUser {
  passwordHash: string;
}

interface LockoutRecord {
  attempts: number;
  lockedUntil: number | null;
  lastAttempt: number;
}

interface AuditEntry {
  ts: string;
  event: string;
  username?: string;
  detail?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  sessionWarning: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; lockedSeconds?: number }>;
  loginAsGuest: () => Promise<{ success: boolean; error?: string }>;
  register: (data: { username: string; password: string; fullName: string; email: string; role?: 'public' | 'family' }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  dismissSessionWarning: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY         = 'petfinder-session';
const LOCKOUT_KEY         = 'petfinder-lockouts';
const AUDIT_KEY           = 'petfinder-audit';
const REG_RATE_KEY        = 'petfinder-reg-rate';
const ACTIVITY_KEY        = 'petfinder-last-activity';

const MAX_ATTEMPTS        = 5;
const LOCKOUT_MS          = 15 * 60 * 1000;
const SESSION_TIMEOUT_MS  = 30 * 60 * 1000;
const SESSION_WARN_MS     = 5  * 60 * 1000;
const MAX_REG_PER_HOUR    = 3;

const COMMON_PASSWORDS = [
  'password','password1','123456','1234567','12345678','admin123','qwerty',
  'welcome','letmein','petfinder123','iloveyou','sunshine','monkey','dragon',
  'master','pass1234','abc12345','india123','bharat123',
];

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function legacyHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
}

async function getStoredUsers(): Promise<StoredUser[]> {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Failed to fetch profiles', e);
    return [];
  }
}

async function insertUser(user: StoredUser): Promise<void> {
  await supabase.from('profiles').insert(user);
}

async function updateUser(user: StoredUser): Promise<void> {
  await supabase.from('profiles').upsert(user);
}

function getLockouts(): Record<string, LockoutRecord> {
  try { return JSON.parse(localStorage.getItem(LOCKOUT_KEY) || '{}'); } catch { return {}; }
}
function saveLockouts(l: Record<string, LockoutRecord>): void {
  localStorage.setItem(LOCKOUT_KEY, JSON.stringify(l));
}
function getAuditLog(): AuditEntry[] {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch { return []; }
}
function appendAudit(event: string, username?: string, detail?: string): void {
  const log = getAuditLog();
  log.unshift({ ts: new Date().toISOString(), event, username, detail });
  localStorage.setItem(AUDIT_KEY, JSON.stringify(log.slice(0, 100)));
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
  if (!/\d/.test(password)) return 'Password must contain at least one number.';
  if (COMMON_PASSWORDS.some(c => password.toLowerCase().includes(c))) {
    return 'Password is too common. Please choose a more unique password.';
  }
  return null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isValidUsername(u: string): boolean {
  return /^[a-zA-Z0-9_]{3,30}$/.test(u);
}

async function ensureSystemAccountsExist(): Promise<void> {
  const users = await getStoredUsers();

  if (!users.find(u => u.username === 'admin')) {
    const hash = await sha256('admin123');
    await insertUser({
      id: 'user-admin-001',
      username: 'admin',
      fullName: 'Petfinder Admin',
      email: 'admin@petfinder.life',
      role: 'admin',
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      mustChangePassword: true,
    });
  }

  if (!users.find(u => u.username === 'guest')) {
    const hash = await sha256('guest123');
    await insertUser({
      id: 'user-guest-001',
      username: 'guest',
      fullName: 'Guest Reporter',
      email: 'guest@petfinder.life',
      role: 'public',
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      mustChangePassword: false,
    });
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const activityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetActivityTimers = useCallback(() => {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());

    if (activityTimer.current) clearTimeout(activityTimer.current);
    if (warnTimer.current)     clearTimeout(warnTimer.current);
    setSessionWarning(false);

    warnTimer.current = setTimeout(() => {
      setSessionWarning(true);
    }, SESSION_TIMEOUT_MS - SESSION_WARN_MS);

    activityTimer.current = setTimeout(() => {
      appendAudit('session_timeout');
      setUser(null);
      localStorage.removeItem(SESSION_KEY);
    }, SESSION_TIMEOUT_MS);
  }, []);

  const handleUserActivity = useCallback(() => {
    if (user) resetActivityTimers();
  }, [user, resetActivityTimers]);

  useEffect(() => {
    const events = ['click', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, handleUserActivity, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handleUserActivity));
  }, [handleUserActivity]);

  useEffect(() => {
    (async () => {
      await ensureSystemAccountsExist();

      const sessionUserId = localStorage.getItem(SESSION_KEY);
      if (sessionUserId) {
        const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0', 10);
        if (lastActivity && Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
          localStorage.removeItem(SESSION_KEY);
          appendAudit('session_expired_on_load');
        } else {
          const users = await getStoredUsers();
          const found = users.find(u => u.id === sessionUserId);
          if (found) {
            const { passwordHash, ...safeUser } = found;
            setUser(safeUser);
            resetActivityTimers();
          }
        }
      }
      setIsLoading(false);
    })();
  }, [resetActivityTimers]);

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string; lockedSeconds?: number }> => {
    const trimUser = username.trim().toLowerCase();

    const lockouts = getLockouts();
    const rec = lockouts[trimUser];
    if (rec?.lockedUntil && Date.now() < rec.lockedUntil) {
      const remaining = Math.ceil((rec.lockedUntil - Date.now()) / 1000);
      appendAudit('login_blocked', trimUser, `locked for ${remaining}s`);
      return { success: false, error: `Account locked. Try again in ${Math.ceil(remaining / 60)} min ${remaining % 60}s.`, lockedSeconds: remaining };
    }

    const users = await getStoredUsers();
    const found = users.find(u => u.username.toLowerCase() === trimUser);

    if (!found) {
      appendAudit('login_fail', trimUser, 'user not found');
      return { success: false, error: 'No account found with this username.' };
    }

    const hash = await sha256(password);
    const legHash = legacyHash(password);
    const passwordMatch = found.passwordHash === hash || found.passwordHash === legHash;

    if (!passwordMatch) {
      const attempts = (rec?.attempts || 0) + 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;
      lockouts[trimUser] = { attempts, lockedUntil, lastAttempt: Date.now() };
      saveLockouts(lockouts);
      appendAudit('login_fail', trimUser, `attempt ${attempts}/${MAX_ATTEMPTS}`);

      if (lockedUntil) {
        return { success: false, error: `Too many failed attempts. Account locked for 15 minutes.`, lockedSeconds: LOCKOUT_MS / 1000 };
      }
      const remaining = MAX_ATTEMPTS - attempts;
      return { success: false, error: `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
    }

    if (found.passwordHash === legHash) {
      await updateUser({ ...found, passwordHash: hash });
    }

    delete lockouts[trimUser];
    saveLockouts(lockouts);

    const { passwordHash, ...safeUser } = found;
    setUser(safeUser);
    localStorage.setItem(SESSION_KEY, found.id);
    localStorage.removeItem('findmyfur-state-cache');
    resetActivityTimers();
    appendAudit('login_success', trimUser);
    return { success: true };
  }, [resetActivityTimers]);

  const loginAsGuest = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const result = await login('guest', 'guest123');
    return result;
  }, [login]);

  const register = useCallback(async (data: { username: string; password: string; fullName: string; email: string; role?: 'public' | 'family' }): Promise<{ success: boolean; error?: string }> => {
    const regRate = JSON.parse(localStorage.getItem(REG_RATE_KEY) || '[]') as number[];
    const oneHourAgo = Date.now() - 3600000;
    const recentRegs = regRate.filter(t => t > oneHourAgo);
    if (recentRegs.length >= MAX_REG_PER_HOUR) {
      return { success: false, error: 'Too many registration attempts. Please try again in an hour.' };
    }

    const trimUser = data.username.trim().toLowerCase();

    if (!isValidUsername(trimUser)) {
      return { success: false, error: 'Username must be 3–30 characters, letters, numbers, and underscores only.' };
    }
    if (!isValidEmail(data.email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!data.fullName.trim() || data.fullName.trim().length < 2) {
      return { success: false, error: 'Please enter your full name.' };
    }

    const pwError = validatePassword(data.password);
    if (pwError) return { success: false, error: pwError };

    const users = await getStoredUsers();
    if (users.find(u => u.username.toLowerCase() === trimUser)) {
      return { success: false, error: 'Username already taken.' };
    }
    if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
      return { success: false, error: 'Email already registered.' };
    }

    const hash = await sha256(data.password);
    const newUser: StoredUser = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      username: trimUser,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      role: data.role || 'public',
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      mustChangePassword: false,
    };

    await insertUser(newUser);
    recentRegs.push(Date.now());
    localStorage.setItem(REG_RATE_KEY, JSON.stringify(recentRegs));

    const { passwordHash, ...safeUser } = newUser;
    setUser(safeUser);
    localStorage.setItem(SESSION_KEY, newUser.id);
    localStorage.removeItem('findmyfur-state-cache');
    resetActivityTimers();
    appendAudit('register', trimUser, data.role || 'public');
    return { success: true };
  }, [resetActivityTimers]);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in.' };

    const pwError = validatePassword(newPassword);
    if (pwError) return { success: false, error: pwError };
    if (oldPassword === newPassword) return { success: false, error: 'New password must be different from current password.' };

    const users = await getStoredUsers();
    const found = users.find(u => u.id === user.id);
    if (!found) return { success: false, error: 'User not found.' };

    const oldHash = await sha256(oldPassword);
    const legHash = legacyHash(oldPassword);
    if (found.passwordHash !== oldHash && found.passwordHash !== legHash) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const newHash = await sha256(newPassword);
    await updateUser({ ...found, passwordHash: newHash, mustChangePassword: false });

    setUser(prev => prev ? { ...prev, mustChangePassword: false } : prev);
    appendAudit('password_change', user.username);
    return { success: true };
  }, [user]);

  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const pwError = validatePassword(newPassword);
    if (pwError) return { success: false, error: pwError };

    const users = await getStoredUsers();
    const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    
    if (!found) {
      // Security best practice: don't reveal if email exists, but for this app we'll be helpful
      return { success: false, error: 'No account associated with this email.' };
    }

    const newHash = await sha256(newPassword);
    await updateUser({ ...found, passwordHash: newHash, mustChangePassword: false });
    
    appendAudit('password_reset', found.username);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    if (activityTimer.current) clearTimeout(activityTimer.current);
    if (warnTimer.current)     clearTimeout(warnTimer.current);
    appendAudit('logout', user?.username);
    setUser(null);
    setSessionWarning(false);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    localStorage.removeItem('findmyfur-state-cache');
  }, [user]);

  const dismissSessionWarning = useCallback(() => {
    setSessionWarning(false);
    resetActivityTimers();
  }, [resetActivityTimers]);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, isLoading, isAdmin,
      sessionWarning, login, loginAsGuest, register, logout, changePassword, resetPassword, dismissSessionWarning,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function readAuditLog(): AuditEntry[] {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'); } catch { return []; }
}
