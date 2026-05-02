import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Scan, Eye, SearchCheck, GitCompareArrows } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useLanguage } from '../../i18n';
import './MobileNav.css';

export function MobileNav() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = user?.role || 'public';

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: t.nav.home },
    { path: '/report-found', icon: Eye, label: t.nav.found },
    { path: '/scan', icon: Scan, label: t.nav.scan, highlight: true },
    ...(role === 'family' || role === 'admin'
      ? [{ path: '/report-missing', icon: SearchCheck, label: t.nav.missing }]
      : []),
    { path: '/matches', icon: GitCompareArrows, label: t.nav.matches },
  ];

  return (
    <nav className="mobile-nav">
      {navItems.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            `mobile-nav-link ${isActive ? 'mobile-nav-link-active' : ''} ${'highlight' in item && item.highlight ? 'mobile-nav-scan' : ''}`
          }
        >
          <item.icon size={'highlight' in item && item.highlight ? 24 : 20} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
