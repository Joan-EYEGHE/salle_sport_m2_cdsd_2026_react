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
import type { TransactionSummary, AccessLogStats, Transaction } from '../types';
import { useAuth } from '../context/AuthContext';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

function getLast7Days(): { from: string; to: string; labels: string[] } {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 6);
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    labels.push(days[d.getDay()]);
  }
  return {
    from: from.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
    labels,
  };
}

interface KpiCard {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  change: number;
}

interface WeeklyEntry {
  day: string;
  revenue: number;
}

interface ScanStat {
  name: string;
  pct: number;
  color: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [ticketCount, setTicketCount] = useState<number | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [weeklyData, setWeeklyData] = useState<WeeklyEntry[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyError, setWeeklyError] = useState(false);

  const [scanStats, setScanStats] = useState<ScanStat[]>([]);
  const [scanLoading, setScanLoading] = useState(true);
  const [scanError, setScanError] = useState(false);

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

  useEffect(() => {
    const fetchWeekly = async () => {
      setWeeklyLoading(true);
      setWeeklyError(false);
      try {
        const { from, to, labels } = getLast7Days();
        const res = await api.get(`/transactions?date_debut=${from}&date_fin=${to}`);
        const rows: Transaction[] = (() => {
          const d = res.data?.data ?? res.data;
          return Array.isArray(d) ? d : [];
        })();

        const revenueByDay: Record<string, number> = {};
        labels.forEach((label, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          revenueByDay[d.toISOString().split('T')[0]] = 0;
        });

        for (const tx of rows) {
          if (tx.type === 'REVENU') {
            const day = new Date(tx.date).toISOString().split('T')[0];
            if (day in revenueByDay) {
              revenueByDay[day] = (revenueByDay[day] ?? 0) + tx.montant;
            }
          }
        }

        const entries: WeeklyEntry[] = labels.map((label, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const key = d.toISOString().split('T')[0];
          return { day: label, revenue: revenueByDay[key] ?? 0 };
        });

        setWeeklyData(entries);
      } catch {
        setWeeklyError(true);
      } finally {
        setWeeklyLoading(false);
      }
    };
    fetchWeekly();
  }, []);

  useEffect(() => {
    const fetchScanStats = async () => {
      setScanLoading(true);
      setScanError(false);
      try {
        const res = await api.get('/access-logs/stats');
        const d: AccessLogStats = res.data?.data ?? res.data;
        const total = d.total_scans || 1;
        setScanStats([
          {
            name: 'Scans réussis',
            pct: Math.round((d.total_succes / total) * 100),
            color: 'bg-emerald-500',
          },
          {
            name: 'Scans échoués',
            pct: Math.round((d.total_echec / total) * 100),
            color: 'bg-red-500',
          },
          {
            name: 'Taux de succès',
            pct: Math.round(d.taux_succes),
            color: 'bg-amber-500',
          },
        ]);
      } catch {
        setScanError(true);
      } finally {
        setScanLoading(false);
      }
    };
    fetchScanStats();
  }, []);

  if (loading) return <Loader size="lg" />;

  const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? 'vous';

  const kpiCards: KpiCard[] = [
    {
      label: 'Ventes du jour',
      value: summary ? fmt(summary.total_revenus) : '—',
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
      value: summary ? fmt(summary.total_revenus) : '—',
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
          </div>
          {weeklyLoading ? (
            <div className="animate-pulse h-[220px] bg-gray-100 rounded-lg" />
          ) : weeklyError ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
              Données indisponibles
            </div>
          ) : (
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
          )}
        </div>

        {/* Scan stats */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <h2 className="text-gray-900 font-semibold mb-1">Statistiques des scans</h2>
          <p className="text-gray-400 text-sm mb-5">Contrôle d'accès ce mois</p>
          {scanLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-3 bg-gray-100 rounded mb-2 w-3/4" />
                  <div className="h-2 bg-gray-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : scanError ? (
            <div className="text-sm text-gray-400 text-center py-8">Données indisponibles</div>
          ) : (
            <div className="space-y-4">
              {scanStats.map((stat) => (
                <div key={stat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{stat.name}</span>
                    <span className="text-gray-500">{stat.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${stat.color}`}
                      style={{ width: `${stat.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
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
