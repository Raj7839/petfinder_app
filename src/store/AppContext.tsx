import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import type { FoundAnimalReport, MissingAnimalReport, MatchResult, AppNotification, UserProfile } from '../types';
import { runMatchingForFoundReport, runMatchingForMissingReport, runFullRematching } from '../lib/matchingEngine';

const REMATCH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface AppState {
  foundReports: FoundAnimalReport[];
  missingReports: MissingAnimalReport[];
  matches: MatchResult[];
  notifications: AppNotification[];
  user: UserProfile;
  sidebarCollapsed: boolean;
}

type Action =
  | { type: 'ADD_FOUND_REPORT'; payload: FoundAnimalReport }
  | { type: 'SET_FOUND_REPORTS'; payload: FoundAnimalReport[] }
  | { type: 'ADD_MISSING_REPORT'; payload: MissingAnimalReport }
  | { type: 'SET_MISSING_REPORTS'; payload: MissingAnimalReport[] }
  | { type: 'UPDATE_FOUND_REPORT'; payload: { id: string; updates: Partial<FoundAnimalReport> } }
  | { type: 'UPDATE_MISSING_REPORT'; payload: { id: string; updates: Partial<MissingAnimalReport> } }
  | { type: 'DELETE_FOUND_REPORT'; payload: string }
  | { type: 'DELETE_MISSING_REPORT'; payload: string }
  | { type: 'ADD_MATCH'; payload: MatchResult }
  | { type: 'UPDATE_MATCH'; payload: { id: string; updates: Partial<MatchResult> } }
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> };

const defaultUser: UserProfile = {
  id: 'user-1',
  name: 'Demo User',
  email: 'demo@animalmatch.com',
  role: 'admin',
  createdAt: new Date().toISOString(),
};

const initialState: AppState = {
  foundReports: [],
  missingReports: [],
  matches: [],
  notifications: [],
  user: defaultUser,
  sidebarCollapsed: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_FOUND_REPORT':
      return { ...state, foundReports: [action.payload, ...state.foundReports] };
    case 'SET_FOUND_REPORTS':
      return { ...state, foundReports: action.payload };
    case 'ADD_MISSING_REPORT':
      return { ...state, missingReports: [action.payload, ...state.missingReports] };
    case 'SET_MISSING_REPORTS':
      return { ...state, missingReports: action.payload };
    case 'UPDATE_FOUND_REPORT':
      return {
        ...state,
        foundReports: state.foundReports.map(r =>
          r.id === action.payload.id ? { ...r, ...action.payload.updates } : r
        ),
      };
    case 'UPDATE_MISSING_REPORT':
      return {
        ...state,
        missingReports: state.missingReports.map(r =>
          r.id === action.payload.id ? { ...r, ...action.payload.updates } : r
        ),
      };
    case 'DELETE_FOUND_REPORT':
      return { ...state, foundReports: state.foundReports.filter(r => r.id !== action.payload) };
    case 'DELETE_MISSING_REPORT':
      return { ...state, missingReports: state.missingReports.filter(r => r.id !== action.payload) };
    case 'ADD_MATCH':
      return { ...state, matches: [action.payload, ...state.matches] };
    case 'UPDATE_MATCH':
      return {
        ...state,
        matches: state.matches.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n =>
          n.id === action.payload ? { ...n, read: true } : n
        ),
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const STORAGE_KEY = 'animal-match-data';

function loadFromStorage(): Partial<AppState> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
  }
  return {};
}

function saveToStorage(state: AppState) {
  try {
    const toSave = {
      foundReports: state.foundReports,
      missingReports: state.missingReports,
      matches: state.matches,
      notifications: state.notifications,
      user: state.user,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.warn('Failed to save state to localStorage', e);
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addFoundReport: (report: FoundAnimalReport) => void;
  addMissingReport: (report: MissingAnimalReport) => void;
  addMatch: (match: MatchResult) => void;
  addNotification: (notification: AppNotification) => void;
  unreadCount: number;
  isLoading: boolean;
  dataSource: 'localStorage';
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const saved = loadFromStorage();
    if (saved) {
      dispatch({ type: 'LOAD_STATE', payload: saved });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveToStorage(state);
    }
  }, [state.foundReports, state.missingReports, state.matches, state.notifications, isLoading]);

  const runRematching = useCallback(() => {
    if (isLoading) return;
    const { matches: newMatches, notifications: newNotifs } = runFullRematching(
      state.foundReports,
      state.missingReports,
      state.matches
    );
    for (const match of newMatches) {
      dispatch({ type: 'ADD_MATCH', payload: match });
    }
    for (const notif of newNotifs) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notif });
    }
  }, [state.foundReports, state.missingReports, state.matches, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const timer = setInterval(runRematching, REMATCH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [runRematching, isLoading]);

  const addFoundReport = useCallback((report: FoundAnimalReport) => {
    dispatch({ type: 'ADD_FOUND_REPORT', payload: report });

    const { matches, notifications } = runMatchingForFoundReport(report, state.missingReports);
    for (const match of matches) {
      dispatch({ type: 'ADD_MATCH', payload: match });
    }
    for (const notif of notifications) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notif });
    }
  }, [state.missingReports]);

  const addMissingReport = useCallback((report: MissingAnimalReport) => {
    dispatch({ type: 'ADD_MISSING_REPORT', payload: report });

    const { matches, notifications } = runMatchingForMissingReport(report, state.foundReports);
    for (const match of matches) {
      dispatch({ type: 'ADD_MATCH', payload: match });
    }
    for (const notif of notifications) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notif });
    }
  }, [state.foundReports]);

  const addMatch = useCallback((match: MatchResult) => {
    dispatch({ type: 'ADD_MATCH', payload: match });
  }, []);

  const addNotification = useCallback((notification: AppNotification) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
  }, []);

  const unreadCount = state.notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      addFoundReport,
      addMissingReport,
      addMatch,
      addNotification,
      unreadCount,
      isLoading,
      dataSource: 'localStorage',
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
