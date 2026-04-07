import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import type { User } from '../types';

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

  function roleBadge(role: User['role']) {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'CASHIER': return 'warning';
      case 'CONTROLLER': return 'info';
      default: return 'info';
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-gray-400 text-sm mt-1">Comptes d'accès à l'application</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email ou rôle..."
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500"
        />
      </div>

      {error && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg p-4">
          {error}
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Utilisateur</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Dernière connexion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
                    const initial = fullName.charAt(0).toUpperCase();
                    return (
                      <tr key={u.id} className="hover:bg-gray-700/40 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold shrink-0">
                              {initial}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{fullName}</p>
                              <p className="text-xs text-gray-500">ID #{u.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{u.email}</td>
                        <td className="px-6 py-4">
                          <Badge variant={roleBadge(u.role)}>{u.role}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={u.status === 'ACTIVE' || u.status === 'active' ? 'success' : 'danger'}>
                            {u.status === 'ACTIVE' || u.status === 'active' ? 'Actif' : u.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {u.lastLogin
                            ? new Date(u.lastLogin).toLocaleString('fr-FR')
                            : '—'}
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
