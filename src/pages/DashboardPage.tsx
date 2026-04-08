import { useEffect, useState } from 'react';
import {
  DollarSign,
  Ticket,
  Users,
  TrendingUp,
  Wallet,
  Download,
  TrendingDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/axios';
import Loader from '../components/Loader';
import type { TransactionSummary, Transaction } from '../types';
import { useAuth } from '../context/AuthContext';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

const weeklyData = [
  { day: 'Lun', revenue: 185000 },
  { day: 'Mar', revenue: 220000 },
  { day: 'Mer', revenue: 175000 },
  { day: 'Jeu', revenue: 310000 },
  { day: 'Ven', revenue: 265000 },
  { day: 'Sam', revenue: 390000 },
  { day: 'Dim', revenue: 145000 },
];

const activityBreakdown = [
  { name: 'Gym', pct: 45, color: 'bg-amber-500' },
  { name: 'Football', pct: 25, color: 'bg-blue-500' },
  { name: 'Karaté', pct: 18, color: 'bg-purple-500' },
  { name: 'Massage', pct: 12, color: 'bg-orange-500' },
];

interface KpiCard {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  change: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError('');
      try {
        const [summaryRes, membersRes, ticketsRes, txRes] = await Promise.allSettled([
          api.get('/transactions/summary'),
          api.get('/members'),
          api.get('/tickets'),
          api.get('/transactions?limit=5'),
        ]);

        if (summaryRes.status === 'fulfilled') {
          const d = summaryRes.value.data?.data ?? summaryRes.value.data;
          setSummary(d);
        }
        if (membersRes.status === 'fulfilled') {
          const d = membersRes.value.data?.data ?? membersRes.value.data;
          setMemberCount(Array.isArray(d) ? d.length : d?.total ?? d?.count ?? null);
        }
        if (ticketsRes.status === 'fulfilled') {
          const d = ticketsRes.value.data?.data ?? ticketsRes.value.data;
          setTicketCount(Array.isArray(d) ? d.length : d?.total ?? d?.count ?? null);
        }
        if (txRes.status === 'fulfilled') {
          const d = txRes.value.data?.data ?? txRes.value.data;
          setRecentTx(Array.isArray(d) ? d.slice(0, 5) : d?.items?.slice(0, 5) ?? []);
        }
      } catch {
        setError('Erreur lors du chargement du tableau de bord.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <Loader size="lg" />;

  const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'vous';

  const kpiCards: KpiCard[] = [
    {
      label: 'Ventes du jour',
      value: summary ? fmt(summary.totalRevenus) : '—',
      icon: DollarSign,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      change: 12,
    },
    {
      label: 'Tickets vendus',
      value: ticketCount !== null ? String(ticketCount) : '—',
      icon: Ticket,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: 8,
    },
    {
      label: 'Membres actifs',
      value: memberCount !== null ? String(memberCount) : '—',
      icon: Users,
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      change: 5,
    },
    {
      label: 'Revenu total',
      value: summary ? fmt(summary.totalRevenus) : '—',
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      change: 18,
    },
    {
      label: 'Solde de caisse',
      value: summary ? fmt(summary.solde) : '—',
      icon: Wallet,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      change: summary && summary.solde < 0 ? -3 : 7,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-0.5">Bon retour, {firstName}</p>
        </div>
        <button className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-4 py-2 text-sm transition">
          <Download className="w-4 h-4" />
          Exporter le rapport
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-100 rounded-xl shadow-sm p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span
                className={`text-xs font-semibold flex items-center gap-0.5 ${
                  card.change >= 0 ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {card.change >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(card.change)}%
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-1">{card.label}</p>
            <p className="text-gray-900 font-bold text-xl leading-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-gray-900 font-semibold">Revenu hebdomadaire</h2>
              <p className="text-gray-400 text-sm">Performances des 7 derniers jours</p>
            </div>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500">
              <option>Cette semaine</option>
              <option>Semaine passée</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={fmtCompact}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => [fmt(Number(v)), 'Revenu']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Activity breakdown */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <h2 className="text-gray-900 font-semibold mb-1">Répartition des activités</h2>
          <p className="text-gray-400 text-sm mb-5">Distribution par type</p>
          <div className="space-y-4">
            {activityBreakdown.map((act) => (
              <div key={act.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700 font-medium">{act.name}</span>
                  <span className="text-gray-500">{act.pct}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${act.color}`}
                    style={{ width: `${act.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-gray-900 font-semibold">Transactions récentes</h2>
          <p className="text-gray-400 text-sm">Dernières ventes et activités</p>
        </div>
        {recentTx.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            Aucune transaction récente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Libellé</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTx.map((tx) => {
                  const clientName = tx.member
                    ? `${tx.member.prenom} ${tx.member.nom}`
                    : '—';
                  const initials = tx.member
                    ? `${tx.member.prenom.charAt(0)}${tx.member.nom.charAt(0)}`.toUpperCase()
                    : '?';
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <span className="text-sm text-gray-900 font-medium">{clientName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          tx.type === 'REVENU'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {tx.type === 'REVENU' ? 'Revenu' : 'Dépense'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-500">{tx.libelle}</td>
                      <td className={`px-6 py-3 text-right text-sm font-semibold ${
                        tx.type === 'REVENU' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {tx.type === 'DEPENSE' ? '−' : '+'}{fmt(tx.montant)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-400">
                        {new Date(tx.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                          <span className="text-emerald-500">✓</span> Complété
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
