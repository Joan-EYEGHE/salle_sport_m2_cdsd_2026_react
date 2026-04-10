import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
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

const inputClass =
  'w-full bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition';

const labelClass = 'block text-gray-500 text-sm font-medium mb-1.5';

export default function SubscriptionForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isActivityMode = Boolean(id);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [lieuNaissance, setLieuNaissance] = useState('');
  const [adresse, setAdresse] = useState('');

  const [selectedActivityId, setSelectedActivityId] = useState<number | ''>('');
  const [forfait, setForfait] = useState<ForfaitType>('MENSUEL');
  const [fraisInscription, setFraisInscription] = useState(0);
  const [fraisUniquement, setFraisUniquement] = useState(false);
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [avecInscription, setAvecInscription] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isActivityMode || !id) return;
    setLoadingActivity(true);
    api.get(`/activities/${id}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setSelectedActivity(data);
        setFraisInscription(data.frais_inscription ?? 0);
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

  const availableForfaits = selectedActivity
    ? (selectedActivity.isMonthlyOnly
        ? forfaitOptions.filter((f) => f.type === 'MENSUEL')
        : forfaitOptions.filter((f) => (selectedActivity[f.priceKey] as number) > 0))
    : [];

  const forfaitPrice = useMemo(() => {
    if (!selectedActivity || fraisUniquement) return 0;
    const key = forfaitOptions.find((f) => f.type === forfait)?.priceKey ?? 'prix_mensuel';
    return (selectedActivity[key] as number) ?? 0;
  }, [selectedActivity, fraisUniquement, forfait]);

  const fraisToApply = useMemo(
    () => (avecInscription ? fraisInscription : 0),
    [avecInscription, fraisInscription],
  );

  const total = useMemo(() => forfaitPrice + fraisToApply, [forfaitPrice, fraisToApply]);

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
        lieu_naissance: lieuNaissance || undefined,
        adresse: adresse || undefined,
        id_activity: selectedActivity.id,
        type_forfait: forfait,
        frais_inscription_payes: fraisToApply,
        frais_uniquement: fraisUniquement,
        date_debut: dateDebut,
      });
      setSuccess('Client créé avec succès !');
      setTimeout(() => navigate('/members'), 1200);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Erreur lors de la création.";
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
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nouveau Client</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isActivityMode && selectedActivity
              ? `Activité : ${selectedActivity.nom}`
              : 'Sélectionnez une activité et renseignez les informations du membre'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-4">{error}</div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg p-4">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Member info */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
          <h2 className="text-gray-900 font-semibold text-base mb-4">Informations du membre</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Prénom *</label>
              <input
                type="text"
                required
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className={inputClass}
                placeholder="Mamadou"
              />
            </div>
            <div>
              <label className={labelClass}>Nom *</label>
              <input
                type="text"
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className={inputClass}
                placeholder="Diallo"
              />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+221 77 123 45 67"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="mamadou@email.com"
              />
            </div>
            <div>
              <label className={labelClass}>Date de naissance</label>
              <input
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Lieu de naissance</label>
              <input
                type="text"
                value={lieuNaissance}
                onChange={(e) => setLieuNaissance(e.target.value)}
                className={inputClass}
                placeholder="Dakar"
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Adresse</label>
              <input
                type="text"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className={inputClass}
                placeholder="Dakar, Sénégal"
              />
            </div>
          </div>
        </div>

        {/* Subscription section */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          <h2 className="text-gray-900 font-semibold text-base">Abonnement</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Activity */}
            <div>
              <label className={labelClass}>Activité *</label>
              {isActivityMode ? (
                <div className="bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 text-sm">
                  {selectedActivity?.nom ?? '...'}
                </div>
              ) : loadingActivities ? (
                <Loader size="sm" />
              ) : (
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value === '' ? '' : Number(e.target.value))}
                  className={inputClass}
                >
                  <option value="">-- Sélectionner une activité --</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Date debut */}
            <div>
              <label className={labelClass}>Date de début *</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Forfaits — masqués si "frais uniquement" est actif */}
          {selectedActivity && availableForfaits.length > 0 && !fraisUniquement && (
            <div>
              <label className={labelClass}>Type d'adhésion *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {availableForfaits.map((f) => {
                  const price = selectedActivity[f.priceKey] as number;
                  const isSelected = forfait === f.type;
                  return (
                    <button
                      key={f.type}
                      type="button"
                      onClick={() => setForfait(f.type)}
                      className={`rounded-xl p-3 border-2 text-center transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <p className={`text-xs font-semibold ${isSelected ? 'text-amber-700' : 'text-gray-500'}`}>
                        {f.label}
                      </p>
                      <p className={`text-sm font-bold mt-1 ${isSelected ? 'text-amber-600' : 'text-gray-900'}`}>
                        {fmt(price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Frais & options */}
          {selectedActivity && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={avecInscription}
                  onChange={(e) => setAvecInscription(e.target.checked)}
                  className="accent-amber-500 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  Modifier les frais d'inscription
                  <span className="text-gray-400 ml-1">(défaut : {fmt(selectedActivity?.frais_inscription ?? 0)})</span>
                </span>
              </label>

              {avecInscription && (
                <div>
                  <label className={labelClass}>Montant des frais d'inscription (FCFA)</label>
                  <input
                    type="number"
                    min={0}
                    value={fraisInscription}
                    onChange={(e) => setFraisInscription(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className={labelClass}>Méthode de paiement</label>
                <select className={inputClass}>
                  <option>Cash</option>
                  <option>Virement</option>
                  <option>Mobile Money</option>
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fraisUniquement}
                  onChange={(e) => setFraisUniquement(e.target.checked)}
                  className="accent-amber-500 w-4 h-4"
                />
                <span className="text-sm text-gray-700">
                  Prendre seulement les frais d'inscription
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Recap */}
        {selectedActivity && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Récapitulatif</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Prix forfait</span>
                <span>{fmt(forfaitPrice)}</span>
              </div>
              {avecInscription && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Frais d'inscription</span>
                  <span>{fmt(fraisToApply)}</span>
                </div>
              )}
              <div className="border-t border-amber-200 pt-2 mt-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">Montant Total :</span>
                <span className="text-2xl font-bold text-amber-600">
                  {new Intl.NumberFormat('fr-FR').format(total)}{' '}
                  <span className="text-base font-semibold">FCFA</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !selectedActivity || !prenom.trim() || !nom.trim()}
            style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
            className="px-6 py-2.5 text-sm text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {saving ? 'Enregistrement...' : 'Créer un client'}
          </button>
        </div>
      </form>
    </div>
  );
}
