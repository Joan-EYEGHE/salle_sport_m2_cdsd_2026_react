import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
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

export default function ActivitiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const numberField = (label: string, key: keyof Omit<Activity, 'id' | 'nom' | 'status' | 'isMonthlyOnly'>) => (
    <div key={key}>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        value={form[key] as number}
        onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Activités</h1>
          <p className="text-gray-400 text-sm mt-1">{activities.length} activité(s) enregistrée(s)</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-lg px-4 py-2 transition"
          >
            <Plus className="w-4 h-4" />
            Nouvelle activité
          </button>
        )}
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
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nom</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Frais inscription</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Prix mensuel</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {activities.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      Aucune activité trouvée.
                    </td>
                  </tr>
                ) : (
                  activities.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-700/40 transition">
                      <td className="px-6 py-4 text-white font-medium">{a.nom}</td>
                      <td className="px-6 py-4">
                        <Badge variant={a.status ? 'success' : 'danger'}>
                          {a.status ? 'Actif' : 'Inactif'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-300 text-sm">{fmt(a.frais_inscription)}</td>
                      <td className="px-6 py-4 text-right text-gray-300 text-sm">{fmt(a.prix_mensuel)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/activities/${a.id}/subscribe`)}
                            title="Nouvel abonnement"
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Abonnement
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => openEdit(a)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(a.id)}
                                disabled={deleteId === a.id}
                                className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
            <label className="block text-sm text-gray-400 mb-1">Nom de l'activité</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              placeholder="Ex: Musculation, Cardio..."
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {numberField('Frais inscription (FCFA)', 'frais_inscription')}
            {numberField('Prix ticket (FCFA)', 'prix_ticket')}
            {numberField('Prix hebdomadaire (FCFA)', 'prix_hebdomadaire')}
            {numberField('Prix mensuel (FCFA)', 'prix_mensuel')}
            {numberField('Prix trimestriel (FCFA)', 'prix_trimestriel')}
            {numberField('Prix annuel (FCFA)', 'prix_annuel')}
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.checked })}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-sm text-gray-300">Actif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMonthlyOnly}
                onChange={(e) => setForm({ ...form, isMonthlyOnly: e.target.checked })}
                className="accent-amber-500 w-4 h-4"
              />
              <span className="text-sm text-gray-300">Forfait mensuel uniquement</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.nom.trim()}
              className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-semibold rounded-lg transition"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
