import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import type { FoundAnimalReport, MissingAnimalReport, MatchResult, AppNotification, UserProfile } from '../types';
import { runMatchingForFoundReport, runMatchingForMissingReport, runFullRematching } from '../lib/matchingEngine';
import { supabase } from '../lib/supabaseClient';

const REMATCH_INTERVAL_MS = 30 * 1000; // 30 seconds for active testing sync

interface AppState {
  foundReports: FoundAnimalReport[];
  missingReports: MissingAnimalReport[];
  matches: MatchResult[];
  notifications: AppNotification[];
  user: UserProfile | null;
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
  | { type: 'SET_MATCHES'; payload: MatchResult[] }
  | { type: 'UPDATE_MATCH'; payload: { id: string; updates: Partial<MatchResult> } }
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'SET_NOTIFICATIONS'; payload: AppNotification[] }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'LOAD_STATE'; payload: Partial<AppState> }
  | { type: 'MERGE_STATE'; payload: Partial<AppState> }
  | { type: 'SYNC_FROM_CLOUD'; payload: Partial<AppState> };

const initialState: AppState = {
  foundReports: [],
  missingReports: [],
  matches: [],
  notifications: [],
  user: null,
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
    case 'SET_MATCHES':
      return { ...state, matches: action.payload };
    case 'UPDATE_MATCH':
      return {
        ...state,
        matches: state.matches.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'SET_NOTIFICATIONS':
      return { ...state, notifications: action.payload };
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
    case 'SYNC_FROM_CLOUD':
      return {
        ...state,
        foundReports: action.payload.foundReports || state.foundReports,
        missingReports: action.payload.missingReports || state.missingReports,
        matches: action.payload.matches || state.matches,
        notifications: action.payload.notifications || state.notifications,
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  addFoundReport: (report: FoundAnimalReport) => Promise<void>;
  addMissingReport: (report: MissingAnimalReport) => Promise<void>;
  addMatch: (match: MatchResult) => Promise<void>;
  addNotification: (notification: AppNotification) => Promise<void>;
  unreadCount: number;
  isLoading: boolean;
  isSyncing: boolean;
  fetchLatestData: (manual?: boolean) => Promise<void>;
  dataSource: 'supabase';
}

const AppContext = createContext<AppContextType | null>(null);

const PERSISTENCE_KEY = 'findmyfur-state-cache';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load from localStorage first for instant UI
  useEffect(() => {
    const cached = localStorage.getItem(PERSISTENCE_KEY);
    if (cached) {
      try {
        dispatch({ type: 'LOAD_STATE', payload: JSON.parse(cached) });
      } catch (e) {
        console.error('Failed to parse cached state');
      }
    }
  }, []);

  // Persist to localStorage on state changes
  useEffect(() => {
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify({
      foundReports: state.foundReports,
      missingReports: state.missingReports,
      matches: state.matches,
      notifications: state.notifications,
    }));
  }, [state.foundReports, state.missingReports, state.matches, state.notifications]);

  const fetchLatestData = useCallback(async (manual = false) => {
    if (manual) setIsSyncing(true);
    try {
      const [
        { data: missingReports },
        { data: foundReports },
        { data: matches },
        { data: notifications }
      ] = await Promise.all([
        supabase.from('missing_reports').select('*').order('createdAt', { ascending: false }),
        supabase.from('found_reports').select('*').order('createdAt', { ascending: false }),
        supabase.from('matches').select('*').order('timestamp', { ascending: false }),
        supabase.from('notifications').select('*').order('timestamp', { ascending: false }),
      ]);

      dispatch({
        type: 'SYNC_FROM_CLOUD',
        payload: {
          missingReports: missingReports || [],
          foundReports: foundReports || [],
          matches: matches || [],
          notifications: notifications || [],
        }
      });
    } catch (err) {
      console.error('Background sync failed', err);
    } finally {
      if (manual) setIsSyncing(false);
    }
  }, []);

  const runRematching = useCallback(async () => {
    if (isLoading) return;
    
    // First, sync latest data to ensure we have other devices' reports
    await fetchLatestData();

    const { matches: newMatches, notifications: newNotifs } = runFullRematching(
      state.foundReports,
      state.missingReports,
      state.matches
    );

    for (const match of newMatches) {
      dispatch({ type: 'ADD_MATCH', payload: match });
      await supabase.from('matches').insert(match).catch(console.error);
    }
    for (const notif of newNotifs) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notif });
      await supabase.from('notifications').insert(notif).catch(console.error);
    }
  }, [state.foundReports, state.missingReports, state.matches, isLoading]);

  useEffect(() => {
    // Initial fetch
    fetchLatestData().finally(() => setIsLoading(false));
    
    // Periodical matching check
    const timer = setInterval(runRematching, REMATCH_INTERVAL_MS);

    // REAL-TIME SUBSCRIPTIONS for multi-device consistency
    const channels = [
      supabase.channel('found_reports_changes').on('postgres_changes', { event: '*', table: 'found_reports', schema: 'public' }, () => fetchLatestData()).subscribe(),
      supabase.channel('missing_reports_changes').on('postgres_changes', { event: '*', table: 'missing_reports', schema: 'public' }, () => fetchLatestData()).subscribe(),
      supabase.channel('matches_changes').on('postgres_changes', { event: '*', table: 'matches', schema: 'public' }, () => fetchLatestData()).subscribe(),
      supabase.channel('notifications_changes').on('postgres_changes', { event: '*', table: 'notifications', schema: 'public' }, () => fetchLatestData()).subscribe(),
    ];

    return () => {
      clearInterval(timer);
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [runRematching, fetchLatestData]);

  const addFoundReport = useCallback(async (report: FoundAnimalReport) => {
    dispatch({ type: 'ADD_FOUND_REPORT', payload: report });
    const { error } = await supabase.from('found_reports').insert(report);
    if (error) {
      console.error('Supabase Found Report Insert Error:', error);
      throw error; // Throw so the UI can handle it
    } else {
      console.log('Found Report synced to cloud successfully');
    }

    const { matches, notifications } = runMatchingForFoundReport(report, state.missingReports);
    for (const match of matches) {
      dispatch({ type: 'ADD_MATCH', payload: match });
      await supabase.from('matches').insert(match).catch(console.error);
    }
    for (const notif of notifications) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notif });
      await supabase.from('notifications').insert(notif).catch(console.error);
    }
  }, [state.missingReports]);

  const addMissingReport = useCallback(async (report: MissingAnimalReport) => {
    dispatch({ type: 'ADD_MISSING_REPORT', payload: report });
    const { error } = await supabase.from('missing_reports').insert(report);
    if (error) {
      console.error('Supabase Missing Report Insert Error:', error);
      throw error;
    } else {
      console.log('Missing Report synced to cloud successfully');
    }

    const { matches, notifications } = runMatchingForMissingReport(report, state.foundReports);
    for (const match of matches) {
      dispatch({ type: 'ADD_MATCH', payload: match });
      await supabase.from('matches').insert(match).catch(console.error);
    }
    for (const notif of notifications) {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notif });
      await supabase.from('notifications').insert(notif).catch(console.error);
    }
  }, [state.foundReports]);

  const addMatch = useCallback(async (match: MatchResult) => {
    dispatch({ type: 'ADD_MATCH', payload: match });
    await supabase.from('matches').insert(match).catch(console.error);
  }, []);

  const addNotification = useCallback(async (notification: AppNotification) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    await supabase.from('notifications').insert(notification).catch(console.error);
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
      isSyncing,
      fetchLatestData,
      dataSource: 'supabase',
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
