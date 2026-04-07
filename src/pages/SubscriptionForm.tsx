import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import type { Activity } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

type ForfaitType = 'HEBDO' | 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';

interface ForfaitOption {
  type: ForfaitType;
  label: string;
  priceKey: keyof Activity;
}

const forfaitOptions: ForfaitOption[] = [
  { type: 'HEBDO', label: 'Hebdomadaire', priceKey: 'prix_hebdomadaire' },
  { type: 'MENSUEL', label: 'Mensuel', priceKey: 'prix_mensuel' },
  { type: 'TRIMESTRIEL', label: 'Trimestriel', priceKey: 'prix_trimestriel' },
  { type: 'ANNUEL', label: 'Annuel', priceKey: 'prix_annuel' },
];

export default function SubscriptionForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isActivityMode = Boolean(id);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Member fields
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [adresse, setAdresse] = useState('');

  // Subscription fields
  const [selectedActivityId, setSelectedActivityId] = useState<number | ''>('');
  const [forfait, setForfait] = useState<ForfaitType>('MENSUEL');
  const [fraisInscription, setFraisInscription] = useState(0);
  const [fraisUniquement, setFraisUniquement] = useState(false);
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load activity for activity mode
  useEffect(() => {
    if (!isActivityMode || !id) return;
    setLoadingActivity(true);
    api.get(`/activities/${id}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setSelectedActivity(data);
        setFraisInscription(data.frais_inscription ?? 0);
        // auto-select default forfait
        if (data.isMonthlyOnly) {
          setForfait('MENSUEL');
        } else {
          const first = forfaitOptions.find((f) => (data[f.priceKey] as number) > 0);
          if (first) setForfait(first.type);
        }
      })
      .catch(() => setError("Impossible de charger l'activité."))
      .finally(() => setLoadingActivity(false));
  }, [id, isActivityMode]);

  // Load activities for client mode
  useEffect(() => {
    if (isActivityMode) return;
    setLoadingActivities(true);
    api.get('/activities')
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setActivities(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Impossible de charger les activités.'))
      .finally(() => setLoadingActivities(false));
  }, [isActivityMode]);

  // When activity selected in client mode
  useEffect(() => {
    if (isActivityMode || !selectedActivityId) return;
    const act = activities.find((a) => a.id === Number(selectedActivityId));
    if (act) {
      setSelectedActivity(act);
      setFraisInscription(act.frais_inscription ?? 0);
      if (act.isMonthlyOnly) {
        setForfait('MENSUEL');
      } else {
        const first = forfaitOptions.find((f) => (act[f.priceKey] as number) > 0);
        if (first) setForfait(first.type);
      }
    }
  }, [selectedActivityId, activities, isActivityMode]);

  // Compute available forfaits
  const availableForfaits = selectedActivity
    ? (selectedActivity.isMonthlyOnly
        ? forfaitOptions.filter((f) => f.type === 'MENSUEL')
        : forfaitOptions.filter((f) => (selectedActivity[f.priceKey] as number) > 0))
    : [];

  // Price calculation
  const forfaitPrice = selectedActivity && !fraisUniquement
    ? ((selectedActivity[forfaitOptions.find((f) => f.type === forfait)?.priceKey ?? 'prix_mensuel'] as number) ?? 0)
    : 0;
  const total = forfaitPrice + fraisInscription;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivity) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/members/subscribe', {
        nom,
        prenom,
        email: email || undefined,
        phone: phone || undefined,
        date_naissance: dateNaissance || undefined,
        adresse: adresse || undefined,
        id_activity: selectedActivity.id,
        type_forfait: forfait,
        frais_inscription_payes: fraisInscription,
        frais_uniquement: fraisUniquement,
        date_debut: dateDebut,
      });
      setSuccess('Abonnement créé avec succès !');
      setTimeout(() => navigate('/members'), 1200);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de la création de l'abonnement.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingActivity) return <Loader size="lg" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Nouvel abonnement</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isActivityMode && selectedActivity
              ? `Activité : ${selectedActivity.nom}`
              : 'Sélectionnez une activité et renseignez les informations du membre'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section Membre */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Informations du membre</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500"
                placeholder="Mamadou"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500"
                placeholder="Diallo"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500"
                placeholder="77 123 45 67"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500"
                placeholder="mamadou@email.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Date de naissance</label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Adresse</label>
              <input
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500"
                placeholder="Dakar, Sénégal"
              />
            </div>
          </div>
        </div>

        {/* Section Abonnement */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Abonnement</h2>

          {/* Activity selection */}
          {isActivityMode ? (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Activité</label>
              <div className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 text-sm">
                {selectedActivity?.nom ?? '...'}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Activité *</label>
              {loadingActivities ? (
                <Loader size="sm" />
              ) : (
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">-- Sélectionner une activité --</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Forfaits — only shown when an activity is selected */}
          {selectedActivity && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Forfait *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {availableForfaits.map((f) => {
                    const price = selectedActivity[f.priceKey] as number;
                    const isSelected = forfait === f.type;
                    return (
                      <button
                        key={f.type}
                        type="button"
                        onClick={() => setForfait(f.type)}
                        className={`rounded-xl p-3 border text-center transition ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                            : 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        <p className="text-xs font-semibold">{f.label}</p>
                        <p className={`text-sm font-bold mt-1 ${isSelected ? 'text-amber-500' : 'text-white'}`}>
                          {fmt(price)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Frais d'inscription (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={fraisInscription}
                    onChange={(e) => setFraisInscription(Number(e.target.value))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Date de début *</label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fraisUniquement}
                  onChange={(e) => setFraisUniquement(e.target.checked)}
                  className="accent-amber-500 w-4 h-4"
                />
                <span className="text-sm text-gray-300">
                  Frais uniquement (prix du forfait = 0)
                </span>
              </label>
            </>
          )}
        </div>

        {/* Calculator */}
        {selectedActivity && (
          <div className="bg-gray-800 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-amber-500">Récapitulatif</h2>
            </div>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Prix forfait :</span>
                <span>{fmt(forfaitPrice)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Frais d'inscription :</span>
                <span>{fmt(fraisInscription)}</span>
              </div>
              <div className="border-t border-gray-700 my-2" />
              <div className="flex justify-between text-lg font-bold text-white">
                <span>TOTAL :</span>
                <span className="text-amber-500">{fmt(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !selectedActivity || !prenom.trim() || !nom.trim()}
            className="px-6 py-2.5 text-sm bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-lg transition"
          >
            {saving ? 'Enregistrement...' : 'Créer l\'abonnement'}
          </button>
        </div>
      </form>
    </div>
  );
}
