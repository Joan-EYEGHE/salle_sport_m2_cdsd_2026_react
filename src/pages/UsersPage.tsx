import { useEffect, useState } from 'react';
import { Search, UserCog, DollarSign, Plus } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import type { User } from '../types';

interface KpiCard {
  label: string;
  count: number;
  active: number;
  inactive: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/users');
        const data = res.data?.data ?? res.data;
        const items = Array.isArray(data) ? data : data?.items ?? [];
        setUsers(items);
      } catch {
        setError("Impossible de charger les utilisateurs. La route /api/users est peut-être non disponible.");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase();
    return fullName.includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const isActive = (u: User) => u.status === 'ACTIVE' || u.status === 'active';

  const admins = users.filter((u) => u.role === 'ADMIN');
  const cashiers = users.filter((u) => u.role === 'CASHIER');

  const kpiCards: KpiCard[] = [
    {
      label: 'Admins',
      count: admins.length,
      active: admins.filter(isActive).length,
      inactive: admins.filter((u) => !isActive(u)).length,
      icon: UserCog,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Cashiers',
      count: cashiers.length,
      active: cashiers.filter(isActive).length,
      inactive: cashiers.filter((u) => !isActive(u)).length,
      icon: DollarSign,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  function roleBadge(role: User['role']): 'danger' | 'warning' | 'info' | 'purple' {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'CASHIER': return 'warning';
      case 'CONTROLLER': return 'info';
      default: return 'info';
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gérer les utilisateurs et les permissions du système</p>
        </div>
        <button
          style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
          className="flex items-center gap-2 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Nouvel utilisateur
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-gray-900 font-bold text-2xl">{card.count}</p>
                <p className="text-xs mt-0.5">
                  <span className="text-emerald-600 font-medium">{card.active} actifs</span>
                  {' / '}
                  <span className="text-gray-400">{card.inactive} inactifs</span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email ou rôle..."
          className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
        />
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg p-4">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Dernière connexion</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
                    const initial = fullName.charAt(0).toUpperCase();
                    const active = isActive(u);
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                              {initial}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{fullName}</p>
                              <p className="text-xs text-gray-400">ID #{u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-600">{u.email}</td>
                        <td className="px-6 py-3.5">
                          <Badge variant={roleBadge(u.role)}>{u.role}</Badge>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant={active ? 'success' : 'danger'}>
                            {active ? 'Actif' : u.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-sm text-gray-400">
                          {u.lastLogin
                            ? new Date(u.lastLogin).toLocaleString('fr-FR')
                            : '—'}
                        </td>
                        <td className="px-6 py-3.5">
                          <button className="text-xs text-amber-600 hover:text-amber-700 font-medium transition">
                            Modifier
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
