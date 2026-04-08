import { useEffect, useState } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  FileText,
} from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import type { Transaction, TransactionSummary } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

type TypeFilter = 'ALL' | 'REVENU' | 'DEPENSE';

interface KpiCard {
  label: string;
  value: string;
  subLabel: string;
  subColor: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const periodOptions = [
  { label: "Aujourd'hui", value: 'today' },
  { label: 'Cette semaine', value: 'week' },
  { label: 'Ce mois', value: 'month' },
  { label: 'Tout', value: 'all' },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'ALL') params.append('type', typeFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const [txRes, sumRes] = await Promise.allSettled([
        api.get(`/transactions?${params.toString()}`),
        api.get('/transactions/summary'),
      ]);

      if (txRes.status === 'fulfilled') {
        const data = txRes.value.data?.data ?? txRes.value.data;
        setTransactions(Array.isArray(data) ? data : data?.items ?? []);
      }
      if (sumRes.status === 'fulfilled') {
        const data = sumRes.value.data?.data ?? sumRes.value.data;
        setSummary(data);
      }
    } catch {
      setError('Impossible de charger les transactions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, dateFrom, dateTo]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/transactions/export', { responseType: 'blob' } as never);
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Erreur lors de l\'export CSV.');
    } finally {
      setExporting(false);
    }
  };

  const totalRevenus = summary?.totalRevenus ?? 0;
  const totalDepenses = summary?.totalDepenses ?? 0;
  const solde = summary?.solde ?? 0;
  const totalForBar = totalRevenus + totalDepenses;
  const revenuPct = totalForBar > 0 ? Math.round((totalRevenus / totalForBar) * 100) : 0;

  const kpiCards: KpiCard[] = [
    {
      label: 'Revenu total',
      value: fmt(totalRevenus),
      subLabel: 'FCFA',
      subColor: 'text-emerald-600',
      icon: TrendingUp,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Dépenses totales',
      value: fmt(totalDepenses),
      subLabel: 'FCFA',
      subColor: 'text-red-500',
      icon: TrendingDown,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-500',
    },
    {
      label: 'Solde de trésorerie',
      value: fmt(solde),
      subLabel: 'Solde disponible',
      subColor: 'text-blue-600',
      icon: Wallet,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: "Revenu d'aujourd'hui",
      value: fmt(totalRevenus),
      subLabel: 'FCFA',
      subColor: 'text-blue-600',
      icon: DollarSign,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  const filters: { label: string; value: TypeFilter }[] = [
    { label: 'Tout', value: 'ALL' },
    { label: 'Revenu', value: 'REVENU' },
    { label: 'Dépenses', value: 'DEPENSE' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de la Caisse</h1>
          <p className="text-gray-500 text-sm mt-0.5">Suivi des transactions financières</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-4 py-2 text-sm transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Export...' : 'Exporter CSV'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-1">{card.label}</p>
            <p className="text-gray-900 font-bold text-lg leading-tight">{card.value}</p>
            <p className={`text-xs mt-0.5 ${card.subColor}`}>{card.subLabel}</p>
          </div>
        ))}
      </div>

      {/* Balance overview */}
      {summary && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-gray-900 font-semibold">Aperçu du solde</h2>
              <p className="text-gray-400 text-sm">Revenus vs Dépenses</p>
            </div>
            <span className="text-sm font-semibold text-emerald-600">{revenuPct}% Revenu</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${revenuPct}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-600 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Revenu : {fmt(totalRevenus)}
            </span>
            <span className="text-red-500 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" />
              Dépenses : {fmt(totalDepenses)}
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                  typeFilter === f.value
                    ? f.value === 'REVENU'
                      ? 'bg-teal-600 text-white'
                      : f.value === 'DEPENSE'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center ml-auto flex-wrap">
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500">
              {periodOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg px-3 py-2 transition disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Exporter
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4">{error}</div>
      )}

      {/* Table */}
      {loading ? (
        <Loader />
      ) : transactions.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-16 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Pas de vente trouvées</p>
          <p className="text-gray-400 text-sm mt-1">
            Aucune vente ne correspond aux critères de recherche pour le moment.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Libellé</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Membre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-3.5 text-sm text-gray-400">
                      {new Date(tx.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-900">{tx.libelle}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={tx.type === 'REVENU' ? 'success' : 'danger'}>
                        {tx.type === 'REVENU' ? 'Revenu' : 'Dépense'}
                      </Badge>
                    </td>
                    <td className={`px-6 py-3.5 text-right text-sm font-semibold ${
                      tx.type === 'REVENU' ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {tx.type === 'DEPENSE' ? '−' : '+'}{fmt(tx.montant)}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-400">
                      {tx.member ? `${tx.member.prenom} ${tx.member.nom}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
