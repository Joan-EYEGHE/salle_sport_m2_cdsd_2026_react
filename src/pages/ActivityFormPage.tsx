import axios from 'axios';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Loader from '../components/Loader';
import type { Activity } from '../types';

type ActivityForm = Omit<Activity, 'id'>;

const EMPTY_FORM: ActivityForm = {
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

const PRICE_FIELDS: { key: keyof ActivityForm & string; label: string }[] = [
  { key: 'frais_inscription', label: "Frais d'inscription" },
  { key: 'prix_ticket', label: 'Prix ticket' },
  { key: 'prix_hebdomadaire', label: 'Tarif hebdomadaire' },
  { key: 'prix_mensuel', label: 'Tarif mensuel' },
  { key: 'prix_trimestriel', label: 'Tarif trimestriel' },
  { key: 'prix_annuel', label: 'Tarif annuel' },
];

function decodeSegment(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

export default function ActivityFormPage() {
  const navigate = useNavigate();
  const { slug: slugParam } = useParams<{ slug?: string }>();
  const slug = slugParam ? decodeSegment(slugParam) : undefined;
  const isEdit = Boolean(slug && slug !== 'new');
  const activitySlug = isEdit ? slug! : null;

  const [form, setForm] = useState<ActivityForm>(EMPTY_FORM);
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ready' | 'error'>(isEdit ? 'loading' : 'ready');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!isEdit || !activitySlug) {
      setLoadState('ready');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadState('loading');
      try {
        const res = await api.get(`/activities/${encodeURIComponent(activitySlug)}`);
        const raw = res.data?.data ?? res.data;
        if (cancelled) return;
        const { id: _id, ...rest } = raw as Activity;
        setForm({
          nom: rest.nom ?? '',
          status: rest.status ?? true,
          frais_inscription: Number(rest.frais_inscription) || 0,
          prix_ticket: Number(rest.prix_ticket) || 0,
          prix_hebdomadaire: Number(rest.prix_hebdomadaire) || 0,
          prix_mensuel: Number(rest.prix_mensuel) || 0,
          prix_trimestriel: Number(rest.prix_trimestriel) || 0,
          prix_annuel: Number(rest.prix_annuel) || 0,
          isMonthlyOnly: Boolean(rest.isMonthlyOnly),
        });
        setLoadState('ready');

        const resolvedSlug =
          typeof rest.slug === 'string' && rest.slug.trim() ? rest.slug.trim() : '';
        if (
          resolvedSlug &&
          activitySlug &&
          (activitySlug !== resolvedSlug || /^\d+$/.test(activitySlug))
        ) {
          navigate(`/activities/${encodeURIComponent(resolvedSlug)}/edit`, { replace: true });
        }
      } catch (e) {
        if (cancelled) return;
        setLoadState(axios.isAxiosError(e) && e.response?.status === 404 ? 'error' : 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, activitySlug, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) {
      setErr('Le nom est obligatoire.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      if (isEdit && activitySlug) {
        await api.put(`/activities/${encodeURIComponent(activitySlug)}`, form);
      } else {
        await api.post('/activities', form);
      }
      navigate('/activities');
    } catch {
      setErr('Impossible de sauvegarder les modifications.');
    } finally {
      setSaving(false);
    }
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--gf-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const inputBaseStyle: React.CSSProperties = {
    border: '1px solid var(--gf-border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--gf-dark)',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };

  const inputFocusBlur = {
    onFocus: (ev: React.FocusEvent<HTMLInputElement>) => {
      ev.currentTarget.style.borderColor = '#1A73E8';
    },
    onBlur: (ev: React.FocusEvent<HTMLInputElement>) => {
      ev.currentTarget.style.borderColor = 'var(--gf-border)';
    },
  };

  if (isEdit && loadState === 'loading') {
    return (
      <div className="gf-page" style={{ padding: '20px 24px 24px' }}>
        <div className="gf-card-outer">
          <div className="gf-card">
            <div className="gf-card-body" style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px' }}>
              <Loader size="lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isEdit && loadState === 'error') {
    return (
      <div className="gf-page" style={{ padding: '20px 24px 24px' }}>
        <div className="gf-card-outer">
          <div className="gf-card">
            <div className="gf-card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ color: 'var(--gf-muted)', marginBottom: 16 }}>Activité introuvable.</p>
              <button type="button" className="gf-btn-header" onClick={() => navigate('/activities')}>
                Retour à la liste
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gf-page" style={{ padding: '20px 24px 24px' }}>
      <div className="gf-card-outer">
        <div className="gf-card">
          <div
            style={{
              background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
              borderRadius: '12px 12px 0 0',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <p style={{ color: 'var(--gf-white)', fontSize: 14, fontWeight: 700, margin: 0 }}>
                {isEdit ? "Modifier l'activité" : 'Nouvelle activité'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '3px 0 0' }}>
                {isEdit ? 'Mettre à jour les informations' : 'Ajouter une activité au catalogue'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/activities')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.4)',
                color: 'var(--gf-white)',
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Fermer
            </button>
          </div>

          <div className="gf-card-body">
            <form
              onSubmit={handleSubmit}
              style={{ padding: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={fieldLabelStyle}>
                  Nom de l&apos;activité <span style={{ color: '#F44335' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : Musculation, Cardio..."
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  style={inputBaseStyle}
                  {...inputFocusBlur}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {PRICE_FIELDS.map(({ key, label }) => (
                  <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={fieldLabelStyle}>{label} (FCFA)</label>
                    <input
                      type="number"
                      min={0}
                      value={(form[key as keyof ActivityForm] as number) ?? 0}
                      onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                      style={inputBaseStyle}
                      {...inputFocusBlur}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--gf-dark)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.checked })}
                    style={{ width: 15, height: 15, accentColor: '#1A73E8' }}
                  />
                  Actif
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--gf-dark)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.isMonthlyOnly}
                    onChange={(e) => setForm({ ...form, isMonthlyOnly: e.target.checked })}
                    style={{ width: 15, height: 15, accentColor: '#1A73E8' }}
                  />
                  Forfait mensuel uniquement
                </label>
              </div>

              {err && <p style={{ color: '#F44335', fontSize: 12, margin: 0 }}>{err}</p>}

              <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--gf-bg)' }}>
                <button
                  type="button"
                  onClick={() => navigate('/activities')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 8,
                    border: '1px solid var(--gf-border)',
                    background: 'var(--gf-white)',
                    color: 'var(--gf-muted)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    color: 'var(--gf-white)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    boxShadow: saving ? 'none' : '0 3px 10px rgba(26,115,232,0.3)',
                  }}
                >
                  {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : "Créer l'activité"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
