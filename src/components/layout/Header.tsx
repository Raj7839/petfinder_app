import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Menu, Search, LogOut } from 'lucide-react';
import { BrandIcon } from '../ui/BrandIcon';
import { useApp } from '../../store/AppContext';
import { useAuth } from '../../store/AuthContext';
import { useLanguage } from '../../i18n';
import './Header.css';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { unreadCount } = useApp();
  const { user, logout } = useAuth();
  const { t, toggleLanguage, lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return t.header.dashboard;
    if (path.includes('scan')) return t.header.quickScan;
    if (path.includes('report-found')) return t.header.reportFound;
    if (path.includes('report-missing')) return t.header.reportMissing;
    if (path.includes('map')) return t.header.mapView;
    if (path.includes('matches')) return t.header.matchCenter;
    if (path.includes('admin')) return t.header.adminPanel;
    if (path.includes('profile')) return t.header.profile;
    return t.brand.name;
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="header-menu-btn" onClick={onToggleSidebar} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
        <Link to="/" className="header-logo">
          <div className="header-logo-icon">
            <BrandIcon size={22} />
          </div>
          <span className="header-logo-text">{t.brand.name}</span>
        </Link>
        <span className="header-divider" />
        <h1 className="header-page-title">{getPageTitle()}</h1>
      </div>

      <div className="header-right">
        <div className="header-search">
          <Search size={16} className="header-search-icon" />
          <input type="text" placeholder={t.header.searchPlaceholder} className="header-search-input" />
        </div>



        <Link to="/matches" className="header-notification-btn" aria-label="Notifications">
          <Bell size={20} />
          {unreadCount > 0 && <span className="header-notification-badge">{unreadCount}</span>}
        </Link>
        <button className="header-logout-btn" onClick={handleLogout} aria-label="Sign out" title="Sign out">
          <LogOut size={18} />
        </button>
        <Link to="/profile" className="header-avatar">
          <span>{initials}</span>
        </Link>
      </div>
    </header>
  );
}
