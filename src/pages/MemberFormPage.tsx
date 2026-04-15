import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import type { Activity, Member, Subscription } from '../types';
import Loader from '../components/Loader';

type TypeForfait = Subscription['type_forfait'];
type MethodePaiement = 'CASH' | 'WAVE' | 'ORANGE';

type MemberFromApi = Member & { createdAt?: string; lieu_naissance?: string | null; adresse?: string | null };

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FORFAIT_PRICE_KEY: Record<TypeForfait, keyof Activity> = {
  HEBDO: 'prix_hebdomadaire',
  MENSUEL: 'prix_mensuel',
  TRIMESTRIEL: 'prix_trimestriel',
  ANNUEL: 'prix_annuel',
};

const FORFAIT_CARD_LABEL: Record<TypeForfait, string> = {
  HEBDO: 'Hebdomadaire',
  MENSUEL: 'Mensuelle',
  TRIMESTRIEL: 'Trimestrielle',
  ANNUEL: 'Annuelle',
};

function forfaitOptionsFromActivity(a: Activity): { type: TypeForfait; label: string; price: number }[] {
  const out: { type: TypeForfait; label: string; price: number }[] = [];
  const pushIf = (t: TypeForfait) => {
    const p = Number(a[FORFAIT_PRICE_KEY[t]]) || 0;
    if (p > 0) out.push({ type: t, label: FORFAIT_CARD_LABEL[t], price: p });
  };
  pushIf('HEBDO');
  pushIf('MENSUEL');
  pushIf('TRIMESTRIEL');
  pushIf('ANNUEL');
  return out;
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#49a3f1,#1A73E8)',
  'linear-gradient(135deg,#66BB6A,#388E3C)',
  'linear-gradient(135deg,#FFA726,#F57C00)',
  'linear-gradient(135deg,#AB47BC,#7B1FA2)',
  'linear-gradient(135deg,#26C6DA,#0097A7)',
  'linear-gradient(135deg,#EF5350,#C62828)',
];

function avatarGradientById(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const GRAD_INFO = 'linear-gradient(195deg,#49a3f1,#1A73E8)';
const GRAD_SUCCESS = 'linear-gradient(195deg,#66BB6A,#43A047)';

function initialsFrom(prenom: string, nom: string): string {
  const p = (prenom.trim()[0] ?? '').toUpperCase();
  const n = (nom.trim()[0] ?? '').toUpperCase();
  return (p + n) || '?';
}

function inscriptionDateFromApi(m: MemberFromApi): string {
  if (m.date_inscription) return m.date_inscription.slice(0, 10);
  if (m.createdAt) return String(m.createdAt).slice(0, 10);
  return todayIsoDate();
}

function fmtLongDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type FieldKey = 'prenom' | 'nom' | 'email' | 'date_naissance';

const grid2: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#7b809a',
  marginBottom: 4,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d2d6da',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
  outline: 'none',
  color: 'var(--gf-dark)',
  background: '#fff',
};

const errStyle: CSSProperties = {
  fontSize: 11,
  color: '#F44335',
  margin: '4px 0 0',
};

const btnActionOverrides: CSSProperties = {
  width: 'auto',
  minWidth: 120,
  height: 'auto',
  minHeight: 40,
  padding: '10px 20px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 8,
};

function borderErr(hasErr: boolean): CSSProperties {
  return { border: hasErr ? '1px solid #F44335' : '1px solid #d2d6da' };
}

export default function MemberFormPage() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id?: string }>();
  const isEdit = Boolean(idParam && !Number.isNaN(Number(idParam)));
  const memberId = isEdit ? Number(idParam) : undefined;

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateNaissance, setDateNaissance] = useState('');
  const [lieuNaissance, setLieuNaissance] = useState('');
  const [adresse, setAdresse] = useState('');
  const [dateInscription, setDateInscription] = useState('');

  const [activities, setActivities] = useState<Activity[]>([]);
  const [idActivity, setIdActivity] = useState<number | ''>('');
  const [activityDetail, setActivityDetail] = useState<Activity | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);

  const [dateDebut, setDateDebut] = useState(todayIsoDate);
  const [typeForfait, setTypeForfait] = useState<TypeForfait | null>(null);
  const [useStandardFrais, setUseStandardFrais] = useState(true);
  const [customFraisInscription, setCustomFraisInscription] = useState('');
  const [fraisSeulement, setFraisSeulement] = useState(false);
  const [methodePaiement, setMethodePaiement] = useState<MethodePaiement>('CASH');

  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error' | 'ready'>(
    isEdit ? 'loading' : 'ready',
  );
  const [loadErrorKind, setLoadErrorKind] = useState<'notfound' | 'network'>('notfound');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const forfaitOptions = useMemo(
    () => (activityDetail ? forfaitOptionsFromActivity(activityDetail) : []),
    [activityDetail],
  );

  useEffect(() => {
    if (isEdit) return;
    let cancelled = false;
    api
      .get('/activities')
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (!cancelled) setActivities(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setActivities([]);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit]);

  useEffect(() => {
    if (isEdit || idActivity === '') {
      setActivityDetail(null);
      setActivityLoading(false);
      return;
    }
    let cancelled = false;
    setActivityLoading(true);
    api
      .get(`/activities/${idActivity}`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        if (cancelled) return;
        setActivityDetail(data as Activity);
        const fi = Number((data as Activity).frais_inscription) || 0;
        setUseStandardFrais(fi > 0);
        setCustomFraisInscription('');
        setFraisSeulement(false);
      })
      .catch(() => {
        if (!cancelled) {
          setActivityDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idActivity, isEdit]);

  useEffect(() => {
    if (!activityDetail || forfaitOptions.length === 0) {
      setTypeForfait(null);
      return;
    }
    setTypeForfait((prev) =>
      prev && forfaitOptions.some((o) => o.type === prev) ? prev : forfaitOptions[0].type,
    );
  }, [activityDetail, forfaitOptions]);

  const validateField = useCallback((key: FieldKey, v: Record<FieldKey, string>) => {
    let msg = '';
    const val = v[key];
    switch (key) {
      case 'prenom':
        if (!val.trim()) msg = 'Le prénom est obligatoire';
        break;
      case 'nom':
        if (!val.trim()) msg = 'Le nom est obligatoire';
        break;
      case 'email':
        if (val.trim() && !EMAIL_RE.test(val.trim())) msg = 'Format email invalide';
        break;
      default:
        break;
    }
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });
  }, []);

  const identityValues = useMemo(
    () => ({
      prenom,
      nom,
      email,
      date_naissance: dateNaissance,
    }),
    [prenom, nom, email, dateNaissance],
  );

  const blur = (key: FieldKey) => {
    setTouched((t) => ({ ...t, [key]: true }));
    validateField(key, identityValues);
  };

  const runSubmitValidation = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!prenom.trim()) next.prenom = 'Le prénom est obligatoire';
    if (!nom.trim()) next.nom = 'Le nom est obligatoire';
    if (email.trim() && !EMAIL_RE.test(email.trim())) next.email = 'Format email invalide';
    setErrors(next);
    setTouched({
      prenom: true,
      nom: true,
      email: true,
      date_naissance: true,
    });
    return Object.keys(next).length === 0;
  };

  const nominalFraisInscription = activityDetail ? Number(activityDetail.frais_inscription) || 0 : 0;

  const fraisInscriptionPayes = useMemo(() => {
    if (!activityDetail) return 0;
    if (useStandardFrais) return nominalFraisInscription;
    return Number(customFraisInscription.replace(/\s/g, '').replace(',', '.')) || 0;
  }, [activityDetail, useStandardFrais, customFraisInscription, nominalFraisInscription]);

  const prixForfait = useMemo(() => {
    if (!activityDetail || !typeForfait) return 0;
    return Number(activityDetail[FORFAIT_PRICE_KEY[typeForfait]]) || 0;
  }, [activityDetail, typeForfait]);

  const total = fraisSeulement ? fraisInscriptionPayes : prixForfait + fraisInscriptionPayes;

  const createSubmitBlocked =
    !prenom.trim() ||
    !nom.trim() ||
    idActivity === '' ||
    !activityDetail ||
    forfaitOptions.length === 0 ||
    typeForfait == null;

  const editSubmitBlocked = !prenom.trim() || !nom.trim();

  const submitDisabled =
    submitting || (isEdit ? editSubmitBlocked : createSubmitBlocked);

  useEffect(() => {
    if (!isEdit || memberId == null) return;

    let cancelled = false;
    (async () => {
      setLoadState('loading');
      try {
        const res = await api.get(`/members/${memberId}`);
        const m = (res.data?.data ?? res.data) as MemberFromApi;
        if (cancelled) return;
        setPrenom(m.prenom ?? '');
        setNom(m.nom ?? '');
        setEmail(m.email ?? '');
        setPhone(m.phone ?? '');
        setDateNaissance(m.date_naissance ? String(m.date_naissance).slice(0, 10) : '');
        setLieuNaissance(m.lieu_naissance != null ? String(m.lieu_naissance) : '');
        setAdresse(m.adresse != null ? String(m.adresse) : '');
        setDateInscription(inscriptionDateFromApi(m));
        setLoadState('ready');
      } catch (e) {
        if (cancelled) return;
        const nf = axios.isAxiosError(e) && e.response?.status === 404;
        setLoadErrorKind(nf ? 'notfound' : 'network');
        setLoadState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, memberId]);

  const avatarBg = isEdit && memberId != null ? avatarGradientById(memberId) : GRAD_INFO;
  const initials = initialsFrom(prenom, nom);
  const fullName = `${prenom.trim()} ${nom.trim()}`.trim() || '—';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!runSubmitValidation()) return;
    setSubmitError('');
    setSubmitting(true);

    try {
      if (isEdit && memberId != null) {
        const body = {
          prenom: prenom.trim(),
          nom: nom.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          date_naissance: dateNaissance.trim() || null,
          lieu_naissance: lieuNaissance.trim() || null,
          adresse: adresse.trim() || null,
          date_inscription: dateInscription.trim() || inscriptionDateFromApi({} as MemberFromApi),
        };
        await api.put(`/members/${memberId}`, body);
        setToastMsg('Membre mis à jour avec succès');
      } else {
        if (idActivity === '' || !typeForfait || !activityDetail) {
          setSubmitting(false);
          return;
        }
        const body = {
          prenom: prenom.trim(),
          nom: nom.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          date_naissance: dateNaissance.trim() || null,
          lieu_naissance: lieuNaissance.trim() || null,
          adresse: adresse.trim() || null,
          id_activity: idActivity,
          date_debut: dateDebut,
          type_forfait: typeForfait,
          frais_inscription_payes: fraisInscriptionPayes,
          frais_uniquement: fraisSeulement,
          methode_paiement: methodePaiement,
        };
        await api.post('/members', body);
        setToastMsg('Membre créé avec succès');
      }
      setTimeout(() => navigate('/members'), 1500);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object'
          ? String((err.response.data as { message?: string }).message ?? '')
          : '';
      setSubmitError(msg || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  if (isEdit && loadState === 'loading') {
    return (
      <div className="gf-page" style={{ padding: '20px 24px 24px', minHeight: 'calc(100vh - 60px)' }}>
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
      <div className="gf-page" style={{ padding: '20px 24px 24px', minHeight: 'calc(100vh - 60px)' }}>
        <div className="gf-card-outer">
          <div className="gf-card">
            <div className="gf-card-body" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ color: '#F44335', fontSize: 14, marginBottom: 16 }}>
                {loadErrorKind === 'notfound' ? 'Membre introuvable.' : 'Impossible de charger le membre.'}
              </p>
              <button type="button" className="gf-btn-header" style={{ background: '#1A73E8', border: 'none' }} onClick={() => navigate(-1)}>
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sectionTitle = (title: string) => (
    <p
      style={{
        gridColumn: '1 / -1',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--gf-dark)',
        margin: '0 0 4px',
        letterSpacing: '0.02em',
      }}
    >
      {title}
    </p>
  );

  return (
    <div className="gf-page" style={{ padding: '20px 24px 24px', minHeight: 'calc(100vh - 60px)' }}>
      <div className="gf-card-outer">
        <div className="gf-card">
          <div className={`gf-card-header ${isEdit ? 'gf-card-header--success' : 'gf-card-header--info'}`}>
            <div>
              <p className="gf-card-header__title">{isEdit ? 'Modifier le membre' : 'Nouveau membre'}</p>
              <p className="gf-card-header__sub">
                {isEdit
                  ? `Mettre à jour le profil de ${prenom.trim() || '…'} ${nom.trim() || '…'}`
                  : 'Créer un membre et son abonnement'}
              </p>
            </div>
            <button type="button" className="gf-btn-header" onClick={() => navigate(-1)}>
              ← Retour
            </button>
          </div>

          <div className="gf-card-body">
            <form onSubmit={handleSubmit} noValidate>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: '1px solid var(--gf-bg)',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: avatarBg,
                    color: 'var(--gf-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gf-dark)' }}>{fullName}</div>
                  {isEdit && dateInscription && (
                    <p style={{ fontSize: 12, color: 'var(--gf-muted)', margin: '6px 0 0' }}>
                      Membre depuis le {fmtLongDate(dateInscription)}
                    </p>
                  )}
                </div>
              </div>

              {/* Bloc 1 — Identité */}
              <div style={{ ...grid2, marginBottom: 28 }}>
                {sectionTitle('Identité membre')}
                <div>
                  <label style={labelStyle}>Prénom *</label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => {
                      setPrenom(e.target.value);
                      if (touched.prenom) validateField('prenom', { ...identityValues, prenom: e.target.value });
                    }}
                    onBlur={() => blur('prenom')}
                    style={{ ...inputStyle, ...borderErr(Boolean(touched.prenom && errors.prenom)) }}
                  />
                  {touched.prenom && errors.prenom && <p style={errStyle}>{errors.prenom}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => {
                      setNom(e.target.value);
                      if (touched.nom) validateField('nom', { ...identityValues, nom: e.target.value });
                    }}
                    onBlur={() => blur('nom')}
                    style={{ ...inputStyle, ...borderErr(Boolean(touched.nom && errors.nom)) }}
                  />
                  {touched.nom && errors.nom && <p style={errStyle}>{errors.nom}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (touched.email) validateField('email', { ...identityValues, email: e.target.value });
                    }}
                    onBlur={() => blur('email')}
                    style={{ ...inputStyle, ...borderErr(Boolean(touched.email && errors.email)) }}
                  />
                  {touched.email && errors.email && <p style={errStyle}>{errors.email}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Date de naissance</label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Lieu de naissance</label>
                  <input
                    type="text"
                    value={lieuNaissance}
                    onChange={(e) => setLieuNaissance(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Adresse</label>
                  <input
                    type="text"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>

              {!isEdit && (
                <>
                  {/* Bloc 2 — Abonnement */}
                  <div style={{ ...grid2, marginBottom: 28, paddingTop: 8, borderTop: '1px solid var(--gf-bg)' }}>
                    {sectionTitle('Abonnement')}
                    <div>
                      <label style={labelStyle}>Activité *</label>
                      <select
                        value={idActivity === '' ? '' : String(idActivity)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setIdActivity(v === '' ? '' : Number(v));
                        }}
                        style={{
                          ...inputStyle,
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237b809a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: 36,
                        }}
                      >
                        <option value="">Choisir une activité</option>
                        {activities.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.nom}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Date de début *</label>
                      <input
                        type="date"
                        value={dateDebut}
                        onChange={(e) => setDateDebut(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Type d&apos;adhésion *</label>
                      {activityLoading && <p style={{ fontSize: 13, color: 'var(--gf-muted)' }}>Chargement des tarifs…</p>}
                      {!activityLoading && idActivity !== '' && forfaitOptions.length === 0 && (
                        <p style={{ fontSize: 13, color: '#F44335' }}>Aucun tarif disponible pour cette activité.</p>
                      )}
                      {!activityLoading && forfaitOptions.length > 0 && (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: 12,
                            marginTop: 8,
                          }}
                        >
                          {forfaitOptions.map((opt) => {
                            const sel = typeForfait === opt.type;
                            return (
                              <button
                                key={opt.type}
                                type="button"
                                onClick={() => setTypeForfait(opt.type)}
                                style={{
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  padding: '14px 16px',
                                  borderRadius: 8,
                                  border: sel ? '2px solid #e91e63' : '1px solid #d2d6da',
                                  background: sel ? 'rgba(233, 30, 99, 0.06)' : '#fff',
                                  transition: 'border-color 0.15s, background 0.15s',
                                }}
                              >
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gf-dark)' }}>{opt.label}</div>
                                <div style={{ fontSize: 14, color: '#7b809a', marginTop: 6 }}>{fmtMoney(opt.price)}</div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloc 3 — Paiement */}
                  <div
                    style={{
                      ...grid2,
                      marginBottom: 28,
                      paddingTop: 8,
                      borderTop: '1px solid var(--gf-bg)',
                      alignItems: 'start',
                    }}
                  >
                    {sectionTitle('Paiement')}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {activityDetail && (
                        <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 0 }}>
                          <input
                            type="checkbox"
                            checked={useStandardFrais}
                            onChange={(e) => setUseStandardFrais(e.target.checked)}
                          />
                          <span>
                            Avec {fmtMoney(nominalFraisInscription)} Inscription
                          </span>
                        </label>
                      )}
                      {activityDetail && !useStandardFrais && (
                        <div>
                          <label style={labelStyle}>Frais d&apos;inscription différent</label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={customFraisInscription}
                            onChange={(e) => setCustomFraisInscription(e.target.value)}
                            placeholder="0"
                            style={inputStyle}
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Méthode de paiement</label>
                      <select
                        value={methodePaiement}
                        onChange={(e) => setMethodePaiement(e.target.value as MethodePaiement)}
                        style={{
                          ...inputStyle,
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237b809a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 12px center',
                          paddingRight: 36,
                        }}
                      >
                        <option value="CASH">Cash</option>
                        <option value="WAVE">Wave</option>
                        <option value="ORANGE">Orange</option>
                      </select>
                    </div>
                  </div>

                  {/* Bloc 4 — Récapitulatif */}
                  {activityDetail && typeForfait && (
                    <div style={{ marginBottom: 24, paddingTop: 8, borderTop: '1px solid var(--gf-bg)' }}>
                      {sectionTitle('Récapitulatif')}
                      <div
                        style={{
                          background: '#fff3e0',
                          borderLeft: '4px solid #fb8c00',
                          padding: '12px 16px',
                          borderRadius: 8,
                          marginBottom: 12,
                          fontSize: 14,
                          color: 'var(--gf-dark)',
                        }}
                      >
                        Montant Total + Frais D&apos;inscription ({fmtMoney(nominalFraisInscription)}) :{' '}
                        <strong>{fmtMoney(total)}</strong>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--gf-dark)' }}>
                        <input
                          type="checkbox"
                          checked={fraisSeulement}
                          onChange={(e) => setFraisSeulement(e.target.checked)}
                        />
                        Prendre seulement les frais d&apos;inscription
                      </label>
                    </div>
                  )}
                </>
              )}

              <div
                style={{
                  marginTop: 8,
                  paddingTop: 16,
                  borderTop: '1px solid var(--gf-bg)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <button
                  type="button"
                  className="gf-btn-action gf-btn-action--view"
                  style={btnActionOverrides}
                  onClick={() => navigate(-1)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="gf-btn-action gf-btn-action--edit"
                  style={{
                    ...btnActionOverrides,
                    cursor: submitDisabled ? 'not-allowed' : 'pointer',
                    opacity: submitDisabled ? 0.55 : 1,
                  }}
                  disabled={submitDisabled}
                >
                  {submitting
                    ? 'Enregistrement…'
                    : isEdit
                      ? 'Enregistrer'
                      : 'Ajouter un membre'}
                </button>
              </div>

              {submitError && (
                <p style={{ ...errStyle, marginTop: 12, textAlign: 'right' }}>{submitError}</p>
              )}
            </form>
          </div>
        </div>
      </div>

      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#43A047',
            color: 'var(--gf-white)',
            borderRadius: 10,
            padding: '14px 20px',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: 360,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17L4 12"
              stroke="var(--gf-white)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
