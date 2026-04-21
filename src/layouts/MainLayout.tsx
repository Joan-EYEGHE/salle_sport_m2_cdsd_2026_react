/*
AUDIT CSS GYMFLOW - MainLayout.tsx
Problème 1 : Couleurs palette (#f0f2f5, #7b809a, #344767, white) en inline — zone principale et header
Problème 2 : Item nav actif background white — remplacé par var(--gf-white)
Total : 2 problèmes trouvés
*/
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  CalendarDays,
  Ticket,
  CreditCard,
  ScanLine,
  UserCog,
  LogOut,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',     path: '/dashboard',     icon: LayoutDashboard, roles: ['ADMIN', 'CASHIER'] },
  { label: 'Membres',       path: '/members',        icon: Users,           roles: ['ADMIN', 'CASHIER'] },
  { label: 'Activités',     path: '/activities',     icon: Dumbbell,        roles: ['ADMIN', 'CASHIER'] },
  { label: 'Abonnements',   path: '/subscriptions',       icon: CalendarDays,    roles: ['ADMIN', 'CASHIER'] },
  { label: 'Tickets',       path: '/tickets',        icon: Ticket,          roles: ['ADMIN', 'CASHIER'] },
  { label: 'Transactions',  path: '/transactions',   icon: CreditCard,      roles: ['ADMIN', 'CASHIER'] },
  { label: 'Scan QR',       path: '/qr-control',     icon: ScanLine,        roles: ['ADMIN', 'CONTROLLER'] },
  { label: 'Utilisateurs',  path: '/users',          icon: UserCog,         roles: ['ADMIN'] },
];

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/members':      'Membres',
  '/activities':   'Activités',
  '/subscriptions': 'Abonnements',
  '/subscriptions/form': 'Abonnements',
  '/expirations':   'Expirations',
  '/tickets':       'Tickets',
  '/tickets/new':   'Tickets',
  '/transactions': 'Transactions',
  '/qr-control':   'Scan QR',
  '/users':        'Utilisateurs',
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [expiring, setExpiring] = useState<number | '!'>(0);

  useEffect(() => {
    api
      .get('/subscriptions/expiring-soon?days=30')
      .then((res) => {
        const rows = res.data?.data ?? res.data;
        const count =
          typeof res.data?.count === 'number'
            ? res.data.count
            : Array.isArray(rows)
              ? rows.length
              : 0;
        setExpiring(count);
      })
      .catch(() => setExpiring('!'));
  }, [pathname]);

  const filteredNav = NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const joinedName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
  const displayName =
    (user?.fullName ?? joinedName) ||
    user?.email ||
    'Utilisateur';

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const baseSegment = '/' + pathname.split('/')[1];
  const pageLabel = PAGE_LABELS[baseSegment] ?? '';

  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const showBadge = expiring === '!' || expiring > 0;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col overflow-y-auto"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 260,
          height: '100vh',
          background: 'linear-gradient(195deg, #42424a, #191919)',
          padding: '16px 0 12px',
          zIndex: 40,
        }}
      >
        {/* Brand */}
        <div
          style={{
            height: 72,
            paddingTop: 12,
            paddingBottom: 18,
            paddingLeft: 20,
            paddingRight: 20,
            borderBottom: '1px solid rgba(255,255,255,0.12)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(195deg, #EC407A, #D81B60)',
              boxShadow: '0 4px 20px rgba(236,64,122,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Dumbbell size={18} color="var(--gf-white)" />
          </div>
          <span style={{ color: 'var(--gf-white)', fontSize: 15, fontWeight: 600 }}>GymFlow</span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col" style={{ flex: 1 }}>
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) =>
                isActive
                  ? {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      margin: '2px 12px',
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'var(--gf-white)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(0,187,212,0.2)',
                      textDecoration: 'none',
                    }
                  : {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      margin: '2px 12px',
                      padding: '10px 14px',
                      borderRadius: 8,
                      textDecoration: 'none',
                    }
              }
              className={({ isActive }) =>
                isActive ? '' : 'hover:bg-white/10 transition-colors'
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={18}
                    style={{ color: isActive ? 'var(--gf-dark)' : 'rgba(255,255,255,0.75)', flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--gf-dark)' : 'rgba(255,255,255,0.75)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.10)', margin: '10px 16px' }} />

        {/* User block */}
        <div
          style={{
            margin: '0 12px',
            padding: '10px 14px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'var(--gf-white)', fontSize: 12, fontWeight: 700 }}>
              {initials || displayName.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Name + role */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                color: 'var(--gf-white)',
                fontSize: 12,
                fontWeight: 600,
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayName}
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 10,
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {user?.role}
            </p>
          </div>

          {/* Logout icon */}
          <button
            onClick={handleLogout}
            title="Déconnexion"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            className="hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={16} style={{ color: 'rgba(244,67,53,0.75)' }} />
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          marginLeft: 260,
          background: 'var(--gf-bg)',
        }}
      >
        {/* Header */}
        <header
          style={{
            height: 72,
            padding: '0 28px',
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          {/* Left: breadcrumb + title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, color: 'var(--gf-muted)' }}>
              GymFlow
              {pageLabel && (
                <>
                  {' / '}
                  <span style={{ color: 'var(--gf-dark)', fontWeight: 500 }}>{pageLabel}</span>
                </>
              )}
            </span>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gf-dark)' }}>
              {pageLabel}
            </span>
          </div>

          {/* Right: date + bell */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--gf-muted)' }}>{today}</span>

            {/* Bell */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/expirations')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--gf-muted)',
                }}
              >
                <Bell size={20} />
              </button>
              {showBadge && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: '#e91e63',
                    color: 'var(--gf-white)',
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    fontSize: 9,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  {expiring === '!' ? '!' : expiring > 9 ? '9+' : expiring}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page zone */}
        <main
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '24px 28px 28px',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
