import { useEffect, useState } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import type { Activity, Ticket } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

type TicketStatus = Ticket['status'] | 'ALL';

function ticketBadgeVariant(status: Ticket['status']) {
  switch (status) {
    case 'DISPONIBLE': return 'info';
    case 'VENDU': return 'warning';
    case 'UTILISE': return 'success';
    case 'EXPIRE': return 'danger';
    default: return 'info';
  }
}

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus>('ALL');
  const [error, setError] = useState('');

  // Batch form
  const [batchActivityId, setBatchActivityId] = useState<number | ''>('');
  const [batchQty, setBatchQty] = useState(10);
  const [batchPrice, setBatchPrice] = useState('');
  const [generating, setGenerating] = useState(false);
  const [batchMsg, setBatchMsg] = useState('');

  // Sell state
  const [sellingId, setSellingId] = useState<number | null>(null);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    setError('');
    try {
      const res = await api.get('/tickets');
      const data = res.data?.data ?? res.data;
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les tickets.');
    } finally {
      setLoadingTickets(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities');
      const data = res.data?.data ?? res.data;
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchActivities();
  }, []);

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchActivityId) return;
    setGenerating(true);
    setBatchMsg('');
    try {
      const payload: Record<string, unknown> = {
        id_activity: Number(batchActivityId),
        quantite: batchQty,
      };
      if (batchPrice) payload.prix_unitaire = Number(batchPrice);
      await api.post('/batches/generate', payload);
      setBatchMsg(`${batchQty} ticket(s) générés avec succès !`);
      fetchTickets();
    } catch {
      setBatchMsg('Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSell = async (ticket: Ticket) => {
    setSellingId(ticket.id);
    try {
      await api.put(`/tickets/${ticket.id}/sell`, {});
      fetchTickets();
    } catch {
      alert('Erreur lors de la vente.');
    } finally {
      setSellingId(null);
    }
  };

  const filteredTickets = statusFilter === 'ALL'
    ? tickets
    : tickets.filter((t) => t.status === statusFilter);

  const statuses: TicketStatus[] = ['ALL', 'DISPONIBLE', 'VENDU', 'UTILISE', 'EXPIRE'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billetterie</h1>
        <p className="text-gray-400 text-sm mt-1">Gérer les lots et tickets</p>
      </div>

      {/* Batch generator */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-white">Générer un lot de tickets</h2>
        </div>
        <form onSubmit={handleGenerateBatch} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Activité *</label>
            <select
              value={batchActivityId}
              onChange={(e) => setBatchActivityId(e.target.value === '' ? '' : Number(e.target.value))}
              required
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- Activité --</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Quantité *</label>
            <input
              type="number"
              min={1}
              value={batchQty}
              onChange={(e) => setBatchQty(Number(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Prix unitaire (override)</label>
            <input
              type="number"
              min={0}
              value={batchPrice}
              onChange={(e) => setBatchPrice(e.target.value)}
              placeholder="Laisser vide = défaut"
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={generating || !batchActivityId}
            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-semibold rounded-lg px-4 py-2 transition"
          >
            {generating ? 'Génération...' : 'Générer'}
          </button>
        </form>
        {batchMsg && (
          <p className={`mt-3 text-sm ${batchMsg.includes('Erreur') ? 'text-red-400' : 'text-green-400'}`}>
            {batchMsg}
          </p>
        )}
      </div>

      {/* Tickets table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                statusFilter === s
                  ? 'bg-amber-500 text-gray-900'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'ALL' ? 'Tous' : s}
            </button>
          ))}
        </div>

        {error && (
          <div className="m-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-4">
            {error}
          </div>
        )}

        {loadingTickets ? (
          <Loader />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50 border-b border-gray-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Activité</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Prix</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Expiration</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                      Aucun ticket trouvé.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-700/40 transition">
                      <td className="px-6 py-4 font-mono text-sm text-gray-300">{t.code_ticket}</td>
                      <td className="px-6 py-4 text-gray-300 text-sm">
                        {t.batch?.activity?.nom ?? `Lot #${t.id_batch}`}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={ticketBadgeVariant(t.status)}>{t.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm">
                        {t.batch?.prix_unitaire_applique != null
                          ? fmt(t.batch.prix_unitaire_applique)
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(t.date_expiration).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {t.status === 'DISPONIBLE' && (
                          <button
                            onClick={() => handleSell(t)}
                            disabled={sellingId === t.id}
                            className="flex items-center gap-1.5 ml-auto px-3 py-1.5 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg transition disabled:opacity-50"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            Vendre
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
