import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  MessageCircle,
  Search,
  Users,
  UserCheck,
  CalendarPlus,
  Phone,
  Mail,
  QrCode,
  Pencil,
  UserX,
} from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import WhatsAppModal from '../components/WhatsAppModal';
import type { Member, Subscription } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function getSubscriptionStatus(member: Member): 'success' | 'danger' {
  const subs = member.subscriptions ?? [];
  if (subs.length === 0) return 'danger';
  const last = subs[subs.length - 1];
  const expiry = new Date(last.date_prochain_paiement);
  return expiry >= new Date() ? 'success' : 'danger';
}

interface KpiCard {
  label: string;
  value: number | null;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

export default function MembersPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIF' | 'EXPIRE'>('ALL');
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [whatsAppMember, setWhatsAppMember] = useState<Member | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/members');
      const data = res.data?.data ?? res.data;
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les membres.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const activeMembers = members.filter((m) => getSubscriptionStatus(m) === 'success');

  const now = new Date();
  const thisMonth = members.filter((m) => {
    const subs = m.subscriptions ?? [];
    if (subs.length === 0) return false;
    const last = subs[subs.length - 1];
    const d = new Date(last.date_debut);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  const kpiCards: KpiCard[] = [
    {
      label: 'Clients totaux',
      value: members.length,
      icon: Users,
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
    },
    {
      label: 'Membres actifs',
      value: activeMembers.length,
      icon: UserCheck,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Nouveau ce mois-ci',
      value: thisMonth.length,
      icon: CalendarPlus,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      m.nom.toLowerCase().includes(q) ||
      m.prenom.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q);
    const status = getSubscriptionStatus(m);
    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIF' && status === 'success') ||
      (statusFilter === 'EXPIRE' && status === 'danger');
    return matchSearch && matchStatus;
  });

  const lastSub = (m: Member): Subscription | undefined =>
    (m.subscriptions ?? []).slice(-1)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des clients</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gérer les profils clients et les codes QR</p>
        </div>
        <button
          onClick={() => navigate('/members/subscribe')}
          style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
          className="flex items-center gap-2 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition"
        >
          <UserPlus className="w-4 h-4" />
          Nouveau Client
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-gray-900 font-bold text-2xl">{card.value ?? '—'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
        <h2 className="text-gray-900 font-semibold mb-3">Tous les clients</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, téléphone..."
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
            />
          </div>
          <button className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition">
            Recherche
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIF' | 'EXPIRE')}
            className="border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          >
            <option value="ALL">Tous</option>
            <option value="ACTIF">Actif</option>
            <option value="EXPIRE">Expiré</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Member cards grid */}
      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-16 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucun membre trouvé.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((m) => {
            const sub = lastSub(m);
            const status = getSubscriptionStatus(m);
            const initials = m.initials ?? `${m.prenom.charAt(0)}${m.nom.charAt(0)}`.toUpperCase();
            return (
              <div
                key={m.id}
                className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                      {initials}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 uppercase text-sm">
                        {m.prenom} {m.nom}
                      </p>
                    </div>
                  </div>
                  <Badge variant={status === 'success' ? 'success' : 'danger'}>
                    {status === 'success' ? 'Active' : 'Expiré'}
                  </Badge>
                </div>

                {/* Info */}
                <div className="space-y-1.5 mb-4">
                  {m.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {m.phone}
                    </div>
                  )}
                  {m.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      {m.email}
                    </div>
                  )}
                  {sub && (
                    <div className="text-xs text-gray-400 mt-1 pt-1 border-t border-gray-100">
                      {sub.type_forfait} — {fmt(sub.montant_total)}
                    </div>
                  )}
                </div>

                {/* QR placeholder */}
                <div className="bg-gray-100 rounded-lg h-24 flex items-center justify-center mb-4">
                  <QrCode className="w-12 h-12 text-gray-400" />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDetailMember(m)}
                    style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
                    className="flex-1 text-white text-sm font-medium rounded-lg py-2 hover:opacity-90 transition"
                  >
                    Afficher
                  </button>
                  <button
                    onClick={() => setWhatsAppMember(m)}
                    title="WhatsApp"
                    className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <button
                    title="Modifier"
                    className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    title="Désactiver"
                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        isOpen={!!detailMember}
        onClose={() => setDetailMember(null)}
        title="Détail du client"
        size="lg"
      >
        {detailMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl font-bold">
                {`${detailMember.prenom.charAt(0)}${detailMember.nom.charAt(0)}`.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {detailMember.prenom} {detailMember.nom}
                </h3>
                <p className="text-sm text-gray-500">{detailMember.email ?? 'Sans email'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">Téléphone</p>
                <p className="text-sm text-gray-900 font-medium">{detailMember.phone ?? '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-0.5">QR Code UUID</p>
                <p className="text-xs text-amber-600 font-mono truncate">{detailMember.uuid_qr}</p>
              </div>
            </div>

            {detailMember.subscriptions && detailMember.subscriptions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Dernier abonnement</h4>
                {(() => {
                  const sub = detailMember.subscriptions!.slice(-1)[0];
                  return (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Forfait</span>
                        <span className="text-gray-900 font-medium">{sub.type_forfait}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Montant total</span>
                        <span className="text-gray-900 font-medium">{fmt(sub.montant_total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Début</span>
                        <span className="text-gray-900">{new Date(sub.date_debut).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Prochain paiement</span>
                        <span className={new Date(sub.date_prochain_paiement) >= new Date() ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                          {new Date(sub.date_prochain_paiement).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => navigate('/members/subscribe')}
                style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
                className="flex-1 flex items-center justify-center gap-2 text-white font-medium rounded-lg py-2.5 text-sm hover:opacity-90 transition"
              >
                <UserPlus className="w-4 h-4" />
                Nouvel abonnement
              </button>
              <button
                onClick={() => {
                  setDetailMember(null);
                  setWhatsAppMember(detailMember);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg py-2.5 text-sm transition"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* WhatsApp modal */}
      <WhatsAppModal
        isOpen={!!whatsAppMember}
        onClose={() => setWhatsAppMember(null)}
        defaultPhone={whatsAppMember?.phone ?? ''}
      />
    </div>
  );
}
