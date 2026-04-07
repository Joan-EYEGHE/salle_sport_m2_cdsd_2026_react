import { useEffect, useState } from 'react';
import { Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import type { Transaction, TransactionSummary } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

type TypeFilter = 'ALL' | 'REVENU' | 'DEPENSE';

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
      const res = await api.get('/transactions/export', {
        responseType: 'blob',
      } as never);
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

  const filters: { label: string; value: TypeFilter }[] = [
    { label: 'Toutes', value: 'ALL' },
    { label: 'Revenus', value: 'REVENU' },
    { label: 'Dépenses', value: 'DEPENSE' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Caisse</h1>
          <p className="text-gray-400 text-sm mt-1">Suivi des transactions financières</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg px-4 py-2 transition disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Export...' : 'Exporter CSV'}
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800 border border-green-500/20 rounded-xl p-5 flex items-center gap-4">
            <div className="p-2.5 bg-green-500/10 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Revenus</p>
              <p className="text-lg font-bold text-green-400">{fmt(summary.totalRevenus)}</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-red-500/20 rounded-xl p-5 flex items-center gap-4">
            <div className="p-2.5 bg-red-500/10 rounded-xl">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Total Dépenses</p>
              <p className="text-lg font-bold text-red-400">{fmt(summary.totalDepenses)}</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-amber-500/20 rounded-xl p-5 flex items-center gap-4">
            <div className="p-2.5 bg-amber-500/10 rounded-xl">
              <Wallet className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Solde Net</p>
              <p className="text-lg font-bold text-amber-400">{fmt(summary.solde)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-wrap gap-4 items-end">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                typeFilter === f.value
                  ? 'bg-amber-500 text-gray-900'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center ml-auto">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Du</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Au</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-4">
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
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Libellé</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Membre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      Aucune transaction trouvée.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-700/40 transition">
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(tx.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">{tx.libelle}</td>
                      <td className="px-6 py-4">
                        <Badge variant={tx.type === 'REVENU' ? 'success' : 'danger'}>
                          {tx.type}
                        </Badge>
                      </td>
                      <td className={`px-6 py-4 text-right text-sm font-semibold ${
                        tx.type === 'REVENU' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {tx.type === 'DEPENSE' ? '−' : '+'}{fmt(tx.montant)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {tx.member
                          ? `${tx.member.prenom} ${tx.member.nom}`
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
