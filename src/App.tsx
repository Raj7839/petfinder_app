import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { AuthProvider, useAuth } from './store/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { LanguageProvider } from './i18n';
import { PageShell } from './components/layout/PageShell';
import { loadModel } from './lib/tfjs';
import { useEffect, Suspense, lazy } from 'react';

// Lazy loaded components
const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ReportFoundPage = lazy(() => import('./features/report-found/ReportFoundPage').then(module => ({ default: module.ReportFoundPage })));
const ReportMissingPage = lazy(() => import('./features/report-missing/ReportMissingPage').then(module => ({ default: module.ReportMissingPage })));
const MapViewPage = lazy(() => import('./features/map-view/MapViewPage').then(module => ({ default: module.MapViewPage })));
const MatchesPage = lazy(() => import('./features/matches/MatchesPage').then(module => ({ default: module.MatchesPage })));
const AdminPage = lazy(() => import('./features/admin/AdminPage').then(module => ({ default: module.AdminPage })));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const QuickScanPage = lazy(() => import('./features/quick-scan/QuickScanPage').then(module => ({ default: module.QuickScanPage })));
const LoginPage = lazy(() => import('./features/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage').then(module => ({ default: module.RegisterPage })));

// Loading component
function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--color-bg-primary)',
      color: 'var(--color-text-secondary)', fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" />
        <p>Optimizing...</p>
      </div>
    </div>
  );
}


// Role guard — redirects unauthorized users to dashboard
function RoleGuard({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Protected route wrapper — requires authentication
function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--color-bg-primary)',
        color: 'var(--color-text-secondary)', fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 32, height: 32, border: '3px solid rgba(59,130,246,0.2)',
            borderTopColor: '#3B82F6', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          Loading...
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppProvider>
      <ToastProvider>
        <Routes>
          <Route element={<PageShell />}>
            {/* Everyone can access */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/scan" element={<QuickScanPage />} />
            <Route path="/report-found" element={<ReportFoundPage />} />
            <Route path="/map" element={<MapViewPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Family + Admin only */}
            <Route path="/report-missing" element={
              <RoleGuard allowedRoles={['family', 'admin']}>
                <ReportMissingPage />
              </RoleGuard>
            } />

            {/* Admin only */}
            <Route path="/admin" element={
              <RoleGuard allowedRoles={['admin']}>
                <AdminPage />
              </RoleGuard>
            } />
          </Route>
        </Routes>
      </ToastProvider>
    </AppProvider>
  );
}

export default function App() {
  useEffect(() => {
    // Pre-load the AI model for faster scanning later
    loadModel().catch(err => console.error('Early model load failed', err));
  }, []);

  return (
    <LanguageProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  );
}
