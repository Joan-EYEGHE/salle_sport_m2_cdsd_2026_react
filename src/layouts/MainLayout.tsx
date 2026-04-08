import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Dumbbell,
  Users,
  Ticket,
  CreditCard,
  ScanLine,
  UserCog,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { name: 'Tableau de bord', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Activités', path: '/activities', icon: Dumbbell, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Billetterie', path: '/tickets', icon: Ticket, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Contrôle QR', path: '/qr-control', icon: ScanLine, roles: ['ADMIN', 'CONTROLLER'] },
  { name: 'Caisse', path: '/transactions', icon: CreditCard, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Clients', path: '/members', icon: Users, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Utilisateurs', path: '/users', icon: UserCog, roles: ['ADMIN'] },
];

const sidebarStyle = {
  background: 'linear-gradient(180deg, #1a1a1a 0%, #2d1a0a 100%)',
  borderTop: '3px solid #8B0000',
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const displayName =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ??
    user?.email ??
    'Utilisateur';

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <aside
      className="w-60 flex flex-col h-full"
      style={sidebarStyle}
    >
      {/* Logo */}
      <div className="py-6 px-5 flex items-center gap-3">
        <div className="bg-amber-500 rounded-xl p-2">
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <span className="text-amber-400 font-bold text-xl">GymFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-amber-500 rounded-r-full"
                  />
                )}
                <item.icon className="w-5 h-5 shrink-0" />
                {item.name}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-white/5">
          <div className="w-9 h-9 rounded-full bg-amber-500 text-gray-900 flex items-center justify-center text-sm font-bold shrink-0">
            {initials || displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <span className="inline-block mt-0.5 text-xs font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-60 z-30">
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-60 z-50">{sidebar}</div>
          <button
            className="absolute top-4 left-[244px] z-50 text-white bg-gray-700 rounded-lg p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-60">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-amber-500 font-bold text-lg">GymFlow</span>
        </div>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
