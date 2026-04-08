import { useEffect, useState } from 'react';
import {
  Plus,
  Ticket,
  CheckCircle,
  XCircle,
  DollarSign,
  QrCode,
  Printer,
  MessageCircle,
  Search,
} from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import WhatsAppModal from '../components/WhatsAppModal';
import type { Activity, Ticket as TicketType } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

type TicketStatus = TicketType['status'] | 'ALL';

interface KpiCard {
  label: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const statusLabel: Record<string, string> = {
  ALL: 'Tout',
  DISPONIBLE: 'Disponible',
  VENDU: 'Vendu',
  UTILISE: 'Utilisé',
  EXPIRE: 'Expiré',
};

const statusPillClass: Record<string, string> = {
  ALL: 'bg-gray-900 text-white',
  DISPONIBLE: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  VENDU: 'bg-amber-100 text-amber-700 border border-amber-200',
  UTILISE: 'bg-blue-100 text-blue-700 border border-blue-200',
  EXPIRE: 'bg-red-100 text-red-700 border border-red-200',
};

const statusBadgeClass: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  VENDU: 'bg-amber-50 text-amber-600 border border-amber-200',
  UTILISE: 'bg-blue-50 text-blue-600 border border-blue-200',
  EXPIRE: 'bg-red-50 text-red-600 border border-red-200',
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [statusFilter, setStatusFilter] = useState<TicketStatus>('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const [generateOpen, setGenerateOpen] = useState(false);
  const [batchActivityId, setBatchActivityId] = useState<number | ''>('');
  const [batchQty, setBatchQty] = useState(10);
  const [batchPrice, setBatchPrice] = useState('');
  const [customPrice, setCustomPrice] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [batchMsg, setBatchMsg] = useState('');

  const [qrTicket, setQrTicket] = useState<TicketType | null>(null);
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);

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
    } catch { /* silent */ }
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
      if (customPrice && batchPrice) payload.prix_unitaire = Number(batchPrice);
      await api.post('/batches/generate', payload);
      setBatchMsg(`${batchQty} ticket(s) générés avec succès !`);
      fetchTickets();
    } catch {
      setBatchMsg('Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  const filtered = tickets
    .filter((t) => statusFilter === 'ALL' || t.status === statusFilter)
    .filter((t) =>
      search === '' || t.code_ticket.toLowerCase().includes(search.toLowerCase())
    );

  const disponible = tickets.filter((t) => t.status === 'DISPONIBLE').length;
  const vendu = tickets.filter((t) => t.status === 'VENDU').length;
  const revenuJour = tickets
    .filter((t) => t.status === 'VENDU')
    .reduce((sum, t) => sum + (t.batch?.prix_unitaire_applique ?? 0), 0);

  const kpiCards: KpiCard[] = [
    { label: 'Total des billets', value: tickets.length, icon: Ticket, iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
    { label: 'Billets disponibles', value: disponible, icon: CheckCircle, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
    { label: 'Billets vendus', value: vendu, icon: XCircle, iconBg: 'bg-pink-100', iconColor: 'text-pink-600' },
    { label: 'Revenus du jour', value: revenuJour, icon: DollarSign, iconBg: 'bg-gray-100', iconColor: 'text-gray-600' },
  ];

  const statuses: TicketStatus[] = ['ALL', 'DISPONIBLE', 'VENDU', 'UTILISE', 'EXPIRE'];

  const inputClass =
    'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Système de billetterie</h1>
          <p className="text-gray-500 text-sm mt-0.5">Générez et gérez des billets d'activité avec des codes QR</p>
        </div>
        <button
          onClick={() => { setGenerateOpen(true); setBatchMsg(''); }}
          style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
          className="flex items-center gap-2 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition"
        >
          <Plus className="w-4 h-4" />
          Générer des Tickets
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-gray-500 text-xs mb-0.5">{card.label}</p>
            <p className="text-gray-900 font-bold text-xl">
              {card.label === 'Revenus du jour' ? fmt(card.value) : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche un code..."
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>
          <button className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition">
            Recherche
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition ${
                statusFilter === s
                  ? statusPillClass[s]
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4">{error}</div>
      )}

      {/* Ticket cards grid */}
      {loadingTickets ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-16 text-center">
          <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Pas de tickets trouvés</p>
          <p className="text-gray-400 text-sm mt-1">Aucun ticket ne correspond aux critères de recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-orange-50/50 border border-orange-100 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-900 text-sm font-mono truncate">
                    {t.code_ticket}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {t.batch?.activity?.nom ?? `Lot #${t.id_batch}`}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                    statusBadgeClass[t.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {statusLabel[t.status] ?? t.status}
                </span>
              </div>

              <div className="space-y-0.5 mb-3 text-xs text-gray-500">
                {t.batch?.prix_unitaire_applique != null && (
                  <p>Prix : <span className="text-gray-900 font-medium">{fmt(t.batch.prix_unitaire_applique)}</span></p>
                )}
                <p>Expire : <span className="text-gray-700">{new Date(t.date_expiration).toLocaleDateString('fr-FR')}</span></p>
              </div>

              {/* QR code placeholder */}
              <div className="bg-gray-100 rounded-lg p-3 flex items-center justify-center mb-3 h-20">
                <QrCode className="w-10 h-10 text-gray-400" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5">
                <button
                  onClick={() => setQrTicket(t)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg py-1.5 transition"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  QR Code
                </button>
                <button
                  onClick={() => { setWhatsAppOpen(true); }}
                  className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                  title="Imprimer"
                >
                  <Printer className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate modal */}
      <Modal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Générer des tickets"
        size="md"
      >
        <form onSubmit={handleGenerateBatch} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1.5">Sélectionnez une activité *</label>
            <select
              value={batchActivityId}
              onChange={(e) => setBatchActivityId(e.target.value === '' ? '' : Number(e.target.value))}
              required
              className={inputClass}
            >
              <option value="">-- Activité --</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1.5">Nombre de tickets *</label>
            <input
              type="number"
              min={1}
              max={100}
              value={batchQty}
              onChange={(e) => setBatchQty(Number(e.target.value))}
              className={inputClass}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-gray-500 font-medium">Ticket Price</label>
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={customPrice}
                  onChange={(e) => setCustomPrice(e.target.checked)}
                  className="accent-amber-500"
                />
                Prix personnalisé
              </label>
            </div>
            {customPrice && (
              <input
                type="number"
                min={0}
                value={batchPrice}
                onChange={(e) => setBatchPrice(e.target.value)}
                placeholder="Prix unitaire (FCFA)"
                className={inputClass}
              />
            )}
          </div>

          {batchMsg && (
            <p className={`text-sm ${batchMsg.includes('Erreur') ? 'text-red-500' : 'text-emerald-600'}`}>
              {batchMsg}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setGenerateOpen(false)}
              className="flex-1 px-4 py-2.5 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={generating || !batchActivityId}
              style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
              className="flex-1 text-white font-semibold rounded-lg py-2.5 text-sm hover:opacity-90 disabled:opacity-50 transition"
            >
              {generating ? 'Génération...' : `+ Générer ${batchQty} Ticket(s)`}
            </button>
          </div>
        </form>
      </Modal>

      {/* QR Code modal */}
      <Modal
        isOpen={!!qrTicket}
        onClose={() => setQrTicket(null)}
        title="Ticket QR Code"
        size="sm"
      >
        {qrTicket && (
          <div className="space-y-4 text-center">
            <div className="bg-gray-100 rounded-xl p-8 flex items-center justify-center mx-auto w-40 h-40">
              <QrCode className="w-24 h-24 text-gray-600" />
            </div>
            <div className="space-y-1 text-sm">
              <p className="font-bold text-gray-900 font-mono">{qrTicket.code_ticket}</p>
              <p className="text-gray-500">{qrTicket.batch?.activity?.nom ?? `Lot #${qrTicket.id_batch}`}</p>
              {qrTicket.batch?.prix_unitaire_applique != null && (
                <p className="text-amber-600 font-semibold">{fmt(qrTicket.batch.prix_unitaire_applique)}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setQrTicket(null); setWhatsAppOpen(true); }}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg py-2.5 text-sm transition"
              >
                <MessageCircle className="w-4 h-4" />
                Partager
              </button>
              <button
                onClick={() => window.print()}
                style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
                className="flex-1 flex items-center justify-center gap-2 text-white font-medium rounded-lg py-2.5 text-sm hover:opacity-90 transition"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* WhatsApp modal */}
      <WhatsAppModal
        isOpen={whatsAppOpen}
        onClose={() => { setWhatsAppOpen(false); }}
        defaultPhone=""
      />
    </div>
  );
}
