import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuth } from '../../store/AuthContext';
import './PageShell.css';

export function PageShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { sessionWarning, dismissSessionWarning } = useAuth();

  // Close mobile sidebar whenever the route changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setSidebarCollapsed(prev => !prev);
    }
  };

  const handleCloseMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  const isMobile = window.innerWidth <= 768;

  return (
    <div className="page-shell">
      {sessionWarning && (
        <div className="page-shell-session-warn">
          <Clock size={14} />
          <span>Your session expires in 5 minutes due to inactivity.</span>
          <button onClick={dismissSessionWarning} className="page-shell-session-btn">Stay Logged In</button>
        </div>
      )}
      <Header onToggleSidebar={handleToggleSidebar} />
      <div className="page-shell-body">
        <Sidebar
          collapsed={isMobile ? !mobileSidebarOpen : sidebarCollapsed}
          onToggle={handleToggleSidebar}
          onNavClick={handleCloseMobileSidebar}
        />
        <main className={`page-shell-content ${sidebarCollapsed ? 'content-expanded' : ''}`}>
          <div className="page-shell-inner">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
