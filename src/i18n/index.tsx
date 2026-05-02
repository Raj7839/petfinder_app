// ============================================
// Petfinder i18n — Lightweight translation system
// No external library. React Context + hook.
// Language preference stored in localStorage.
// ============================================

import React, { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'en';

// ─── English Translations ─────────────────────────────────────
const en = {
  // Brand
  tagline: 'Jo Kho Gaya, Woh Milega.',
  taglineHindi: 'जो खो गया, वो मिलेगा।',

  // Navigation
  nav: {
    dashboard: 'Dashboard',
    quickScan: 'Quick Scan',
    reportFound: 'Report Found',
    reportMissing: 'Report Missing',
    mapView: 'Map View',
    matches: 'Matches',
    admin: 'Admin',
    profile: 'Profile',
    home: 'Home',
    found: 'Found',
    scan: 'Scan',
    missing: 'Missing',
  },

  // Header
  header: {
    searchPlaceholder: 'Search reports...',
    dashboard: 'Dashboard',
    quickScan: 'Quick Scan',
    reportFound: 'Report Found Animal',
    reportMissing: 'Report Missing Pet',
    mapView: 'Map View',
    matchCenter: 'Match Center',
    adminPanel: 'Admin Panel',
    profile: 'Profile',
  },

  // Auth
  auth: {
    welcomeBack: 'Welcome Back',
    signIn: 'Sign In',
    signingIn: 'Signing In...',
    createAccount: 'Create Your Account',
    creatingAccount: 'Creating Account...',
    username: 'Username',
    password: 'Password',
    fullName: 'Full Name',
    email: 'Email',
    confirmPassword: 'Confirm Password',
    usernamePlaceholder: 'Enter your username',
    passwordPlaceholder: 'Enter your password',
    fullNamePlaceholder: 'Your full name',
    emailPlaceholder: 'your@email.com',
    confirmPasswordPlaceholder: 'Re-enter your password',
    newPasswordPlaceholder: 'Min 8 chars, uppercase + number',
    usernameHint: 'Letters, numbers, and _ only',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
    createAccountLink: 'Create Account',
    signInLink: 'Sign In',
    registeringAs: 'I am registering as',
    publicUser: '🔍 Public User',
    publicUserDesc: 'Report found animals, quick scan',
    familyMember: '👨‍👩‍👧 Pet Owner',
    familyMemberDesc: 'Report missing pets',
    lockedPrefix: 'Locked —',
    sessionExpiry: 'Your session expires in 5 minutes due to inactivity.',
    stayLoggedIn: 'Stay Logged In',
    passwordsMatch: '✓ Passwords match',
    passwordsMismatch: 'Passwords do not match',
  },

  // Dashboard
  dashboard: {
    heroSubtitle: 'AI-powered platform to locate and reunite missing pets with their owners using real-time image recognition and instant alerts.',
    foundReports: 'Found Reports',
    missingReports: 'Missing Reports',
    potentialMatches: 'Potential Matches',
    resolved: 'Resolved',
    recentActivity: 'Recent Activity',
    viewAll: 'View All',
    pendingMatches: 'Pending Matches',
    review: 'Review',
    noReports: 'No reports yet. Start by reporting a found or missing pet.',
    noPendingMatches: 'No pending matches. The AI engine is scanning for potential matches.',
    quickActions: 'Quick Actions',
    foundPersonReported: 'Found animal reported',
    missingLabel: 'Missing:',
    actions: {
      quickScan: 'Quick Scan',
      quickScanDesc: 'Camera → GPS → Instant database scan in seconds.',
      reportFound: 'Report Found Animal',
      reportFoundDesc: 'Spotted an animal who might need help? Report their location.',
      reportMissing: 'Report Missing Pet',
      reportMissingDesc: 'Register a missing pet for AI-powered matching.',
      viewMap: 'View Live Map',
      viewMapDesc: 'See all reports on an interactive real-time map.',
      reviewMatches: 'Review Matches',
      reviewMatchesDesc: 'Check AI-generated matches and verify identities.',
    },
  },

  // Matches
  matches: {
    title: 'Match Center',
    subtitle: 'AI-generated potential matches between found and missing pet reports. Each match shows WHY it was generated.',
    pending: 'Pending',
    confirmed: 'Confirmed',
    dismissed: 'Dismissed',
    all: 'All',
    noMatches: 'No matches found',
    noMatchesDesc: 'The AI engine is continuously scanning. Matches will appear here automatically when a found animal report matches a missing pet report.',
    foundPerson: 'Found Animal',
    missingPerson: 'Missing Pet',
    whyMatched: 'Why This Matched',
    confirmMatch: 'Confirm Match',
    dismiss: 'Dismiss',
    adminOnly: 'Only an admin can confirm or dismiss matches.',
    newAlerts: 'new match alert(s)',
    markAllRead: 'Mark all read',
    reviewMatches: 'Review the matches below to help reunite pets.',
    apart: 'apart',
  },

  // Profile
  profile: {
    myReports: 'My Reports',
    noReports: 'No reports filed yet.',
    privacySettings: 'Privacy & Settings',
    faceEncryption: 'Visual Data Encryption',
    faceEncryptionDesc: 'All image descriptors are encrypted at rest',
    profileBlur: 'Public Profile Privacy',
    profileBlurDesc: 'Protect privacy in public-facing reports',
    notifications: 'Notifications',
    notificationsDesc: 'Match alerts and nearby reports',
    enabled: 'Enabled',
    on: 'On',
    signOut: 'Sign Out',
    deleteData: 'Delete My Data',
    notifHistory: 'Notification History',
    noNotifications: 'No notifications yet.',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    currentPasswordPlaceholder: 'Your current password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    confirmNewPasswordPlaceholder: 'Re-enter new password',
    changePasswordBtn: 'Change Password',
    changing: 'Changing...',
    mustChangePassword: 'Please change your default password',
    mustChangePasswordDesc: 'You are using the default admin password. Change it below to secure your account.',
  },

  // Common
  common: {
    unknown: 'Unknown',
    gps: 'GPS Location',
    match: 'match',
    confidence: 'confidence',
    justNow: 'Just now',
  },

  // Language toggle
  lang: {
    switchTo: 'हिंदी',
    current: 'EN',
  },
};

// ─── Context ───────────────────────────────────────────────────
const translations = { en } as const;
type Translations = typeof en;

interface LanguageContextType {
  lang: Language;
  t: Translations;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);
const LANG_KEY = 'petfinder-lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');

  const toggleLanguage = useCallback(() => {
    // No-op for global English app
  }, []);

  // Apply lang attribute on mount
  React.useEffect(() => {
    document.documentElement.setAttribute('data-lang', lang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider');
  return ctx;
}
