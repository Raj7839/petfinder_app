import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Scan, Eye, SearchCheck, Map, GitCompareArrows, ShieldCheck, User, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useLanguage } from '../../i18n';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavClick?: () => void;
}

export function Sidebar({ collapsed, onToggle, onNavClick }: SidebarProps) {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const role = user?.role || 'public';

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t.nav.dashboard },
    { path: '/scan', icon: Scan, label: t.nav.quickScan },
    { path: '/report-found', icon: Eye, label: t.nav.reportFound },
    ...(role === 'family' || role === 'admin'
      ? [{ path: '/report-missing', icon: SearchCheck, label: t.nav.reportMissing }]
      : []),
    { path: '/map', icon: Map, label: t.nav.mapView },
    { path: '/matches', icon: GitCompareArrows, label: t.nav.matches },
    ...(isAdmin
      ? [{ path: '/admin', icon: ShieldCheck, label: t.nav.admin }]
      : []),
    { path: '/profile', icon: User, label: t.nav.profile },
  ];

  return (
    <>
      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              title={collapsed ? item.label : undefined}
              onClick={onNavClick}
            >
              <item.icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {!collapsed && user && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-role">{role === 'admin' ? '🛡️ Admin' : role === 'family' ? '👨‍👩‍👧 Family' : '🔍 Public'}</span>
            </div>
          )}
          <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
            <ChevronLeft size={18} className={collapsed ? 'sidebar-toggle-rotated' : ''} />
          </button>
        </div>
      </aside>
      {!collapsed && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  );
}
