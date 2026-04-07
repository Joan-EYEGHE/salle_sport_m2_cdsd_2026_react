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
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Activités', path: '/activities', icon: Dumbbell, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Membres', path: '/members', icon: Users, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Billetterie', path: '/tickets', icon: Ticket, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Caisse', path: '/transactions', icon: CreditCard, roles: ['ADMIN', 'CASHIER'] },
  { name: 'Contrôle QR', path: '/qr-control', icon: ScanLine, roles: ['ADMIN', 'CONTROLLER'] },
  { name: 'Utilisateurs', path: '/users', icon: UserCog, roles: ['ADMIN'] },
];

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const displayName =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ??
    user?.email ??
    'Utilisateur';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-gray-700">
        <span className="text-amber-500 font-bold text-2xl">GymFlow</span>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-gray-700 text-amber-500'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="bg-gray-700 rounded-lg p-3 mb-3">
          <p className="text-xs text-gray-400">Connecté en tant que</p>
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <p className="text-xs text-amber-500 mt-0.5">{user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 z-30">
        {sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex flex-col w-64 z-50">{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6 sticky top-0 z-20">
          <button
            className="md:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden md:block" />

          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
            >
              <div className="w-8 h-8 rounded-full bg-amber-500 text-gray-900 flex items-center justify-center font-bold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-white">{displayName}</p>
                <p className="text-xs text-gray-400">{user?.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-lg overflow-hidden z-50">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-gray-700 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Close dropdown on outside click */}
      {dropdownOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}
