import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, MessageCircle, Eye, Search } from 'lucide-react';
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

export default function MembersPage() {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.nom.toLowerCase().includes(q) ||
      m.prenom.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.phone?.includes(q)
    );
  });

  const lastSub = (m: Member): Subscription | undefined =>
    (m.subscriptions ?? []).slice(-1)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Membres</h1>
          <p className="text-gray-400 text-sm mt-1">{members.length} membre(s) enregistré(s)</p>
        </div>
        <button
          onClick={() => navigate('/members/subscribe')}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-lg px-4 py-2 transition"
        >
          <UserPlus className="w-4 h-4" />
          Nouveau client
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, téléphone..."
          className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500"
        />
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
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Membre</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Téléphone</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Abonnement</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      Aucun membre trouvé.
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => {
                    const sub = lastSub(m);
                    const status = getSubscriptionStatus(m);
                    const initials = m.initials ?? `${m.prenom.charAt(0)}${m.nom.charAt(0)}`.toUpperCase();
                    return (
                      <tr key={m.id} className="hover:bg-gray-700/40 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm font-bold shrink-0">
                              {initials}
                            </div>
                            <div>
                              <p className="text-white font-medium">{m.prenom} {m.nom}</p>
                              <p className="text-xs text-gray-500">ID #{m.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-300 text-sm">{m.phone ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-300 text-sm">{m.email ?? '—'}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <Badge variant={status}>
                              {status === 'success' ? 'Actif' : 'Expiré / Aucun'}
                            </Badge>
                            {sub && (
                              <p className="text-xs text-gray-500">{sub.type_forfait}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDetailMember(m)}
                              title="Détails"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setWhatsAppMember(m)}
                              title="WhatsApp"
                              className="p-1.5 rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500/10 transition"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* Detail modal */}
      <Modal
        isOpen={!!detailMember}
        onClose={() => setDetailMember(null)}
        title="Détail du membre"
        size="lg"
      >
        {detailMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold">
                {`${detailMember.prenom.charAt(0)}${detailMember.nom.charAt(0)}`.toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {detailMember.prenom} {detailMember.nom}
                </h3>
                <p className="text-sm text-gray-400">{detailMember.email ?? 'Sans email'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-400">Téléphone</p>
                <p className="text-sm text-white mt-0.5">{detailMember.phone ?? '—'}</p>
              </div>
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-400">QR Code UUID</p>
                <p className="text-xs text-amber-400 mt-0.5 font-mono truncate">{detailMember.uuid_qr}</p>
              </div>
            </div>

            {detailMember.subscriptions && detailMember.subscriptions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-300 mb-2">Dernier abonnement</h4>
                {(() => {
                  const sub = detailMember.subscriptions!.slice(-1)[0];
                  return (
                    <div className="bg-gray-700 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Forfait</span>
                        <span className="text-white">{sub.type_forfait}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Montant total</span>
                        <span className="text-white">{fmt(sub.montant_total)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Début</span>
                        <span className="text-white">{new Date(sub.date_debut).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Prochain paiement</span>
                        <span className={new Date(sub.date_prochain_paiement) >= new Date() ? 'text-green-400' : 'text-red-400'}>
                          {new Date(sub.date_prochain_paiement).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
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
