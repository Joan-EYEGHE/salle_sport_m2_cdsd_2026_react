import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, UserPlus, Search, Dumbbell } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import type { Activity } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

const emptyForm: Omit<Activity, 'id'> = {
  nom: '',
  status: true,
  frais_inscription: 0,
  prix_ticket: 0,
  prix_hebdomadaire: 0,
  prix_mensuel: 0,
  prix_trimestriel: 0,
  prix_annuel: 0,
  isMonthlyOnly: false,
};

interface Tarif {
  label: string;
  key: keyof Omit<Activity, 'id' | 'nom' | 'status' | 'isMonthlyOnly'>;
  isInscription?: boolean;
}

const tarifs: Tarif[] = [
  { label: 'Inscription', key: 'frais_inscription', isInscription: true },
  { label: 'Prix Ticket', key: 'prix_ticket' },
  { label: 'Hebdomadaire', key: 'prix_hebdomadaire' },
  { label: 'Mensuelle', key: 'prix_mensuel' },
  { label: 'Trimestrielle', key: 'prix_trimestriel' },
  { label: 'Annuelle', key: 'prix_annuel' },
];

export default function ActivitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Activity | null>(null);
  const [form, setForm] = useState<Omit<Activity, 'id'>>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/activities');
      const data = res.data?.data ?? res.data;
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les activités.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivities(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditTarget(a);
    const { id, ...rest } = a;
    void id;
    setForm(rest);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editTarget) {
        await api.put(`/activities/${editTarget.id}`, form);
      } else {
        await api.post('/activities', form);
      }
      setModalOpen(false);
      fetchActivities();
    } catch {
      alert('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette activité ?')) return;
    setDeleteId(id);
    try {
      await api.delete(`/activities/${id}`);
      fetchActivities();
    } catch {
      alert('Erreur lors de la suppression.');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = activities.filter((a) =>
    a.nom.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass =
    'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des activités</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gérer toutes les activités sportives et de bien-être</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
            className="flex items-center gap-2 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Ajouter une activité
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une activité..."
            className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
        </div>
        <button className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition">
          Recherche
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4">
          {error}
        </div>
      )}

      {/* Activity cards grid */}
      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm py-16 text-center">
          <Dumbbell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Aucune activité trouvée.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Image placeholder */}
              <div className="bg-gray-100 h-40 flex items-center justify-center">
                <Dumbbell className="w-12 h-12 text-gray-300" />
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-lg">{a.nom}</h3>
                  <Badge variant={a.status ? 'success' : 'danger'}>
                    {a.status ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Tariffs list */}
                <div className="space-y-1.5 mb-4">
                  {tarifs.map((t) => {
                    const price = a[t.key] as number;
                    if (price === 0) return null;
                    return (
                      <div key={t.key} className="flex items-center justify-between text-sm">
                        <span className={t.isInscription ? 'text-amber-600 font-medium' : 'text-gray-500'}>
                          {t.label}
                        </span>
                        <span className="font-medium text-gray-900">{fmt(price)}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Subscribe button */}
                <button
                  onClick={() => navigate(`/activities/${a.id}/subscribe`)}
                  style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
                  className="w-full flex items-center justify-center gap-2 text-white font-medium rounded-lg py-2.5 text-sm hover:opacity-90 transition mb-3"
                >
                  <UserPlus className="w-4 h-4" />
                  Nouvel abonnement
                </button>

                {/* Admin actions */}
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(a)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deleteId === a.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Modifier l\'activité' : 'Nouvelle activité'}
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 font-medium mb-1.5">Nom de l'activité *</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Musculation, Cardio..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {tarifs.map((t) => (
              <div key={t.key}>
                <label className="block text-sm text-gray-500 font-medium mb-1.5">{t.label} (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  value={form[t.key] as number}
                  onChange={(e) => setForm({ ...form, [t.key]: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.checked })}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-sm text-gray-700">Actif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMonthlyOnly}
                onChange={(e) => setForm({ ...form, isMonthlyOnly: e.target.checked })}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-sm text-gray-700">Forfait mensuel uniquement</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.nom.trim()}
              style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
              className="px-4 py-2 text-sm text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
