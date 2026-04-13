/*
AUDIT CSS GYMFLOW - MemberFormPage.tsx
Problème 1 : Styles partagés et inline en palette hex (#7b809a, #344767, #d2d6da, #f0f2f5, #fff)
Problème 2 : Inputs sans onFocus bordure #1A73E8 (blur existant + borderFor)
Total : 2 problèmes trouvés
*/
import { useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import type { Member } from '../types';
import Loader from '../components/Loader';

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

function unwrapData<T>(res: { data?: { data?: T } }): T {
  const d = res.data as { data?: T };
  return (d?.data ?? res.data) as T;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function inscriptionDateFromApi(m: Member & { createdAt?: string }): string {
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

type FieldKey = 'prenom' | 'nom' | 'email' | 'phone' | 'date_naissance' | 'date_inscription';

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--gf-muted)',
  marginBottom: 6,
};

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: 'var(--gf-muted)',
  margin: '4px 0 0',
};

const errStyle: CSSProperties = {
  fontSize: 11,
  color: '#F44335',
  margin: '4px 0 0',
};

function borderFor(field: FieldKey, errors: Partial<Record<FieldKey, string>>): CSSProperties {
  return { border: errors[field] ? '1px solid #F44335' : '1px solid var(--gf-border)' };
}

const baseInput: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  color: 'var(--gf-dark)',
  outline: 'none',
  background: 'var(--gf-white)',
};

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
  const [dateInscription, setDateInscription] = useState(() => (isEdit ? '' : todayIsoDate()));

  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'error' | 'ready'>(
    isEdit ? 'loading' : 'ready',
  );
  const [loadErrorKind, setLoadErrorKind] = useState<'notfound' | 'network'>('notfound');
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const validateField = useCallback((key: FieldKey, values: Record<FieldKey, string>) => {
    let msg = '';
    const v = values[key];
    switch (key) {
      case 'prenom':
        if (!v.trim()) msg = 'Le prénom est obligatoire';
        break;
      case 'nom':
        if (!v.trim()) msg = 'Le nom est obligatoire';
        break;
      case 'email':
        if (v.trim() && !EMAIL_RE.test(v.trim())) msg = 'Format email invalide';
        break;
      case 'phone':
        if (!v.trim()) msg = 'Le téléphone est obligatoire';
        break;
      case 'date_inscription':
        if (!v.trim()) msg = "La date d'inscription est obligatoire";
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

  const values = useMemo(
    () => ({
      prenom,
      nom,
      email,
      phone,
      date_naissance: dateNaissance,
      date_inscription: dateInscription,
    }),
    [prenom, nom, email, phone, dateNaissance, dateInscription],
  );

  const blur = (key: FieldKey) => {
    setTouched((t) => ({ ...t, [key]: true }));
    validateField(key, values);
  };

  const runSubmitValidation = (): boolean => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!prenom.trim()) next.prenom = 'Le prénom est obligatoire';
    if (!nom.trim()) next.nom = 'Le nom est obligatoire';
    if (email.trim() && !EMAIL_RE.test(email.trim())) next.email = 'Format email invalide';
    if (!phone.trim()) next.phone = 'Le téléphone est obligatoire';
    if (!dateInscription.trim()) next.date_inscription = "La date d'inscription est obligatoire";
    setErrors(next);
    setTouched({
      prenom: true,
      nom: true,
      email: true,
      phone: true,
      date_naissance: true,
      date_inscription: true,
    });
    return Object.keys(next).length === 0;
  };

  const requiredBlocking =
    !prenom.trim() || !nom.trim() || !phone.trim() || !dateInscription.trim();
  const submitDisabled = requiredBlocking || submitting;

  useEffect(() => {
    if (!isEdit || memberId == null) return;

    let cancelled = false;
    (async () => {
      setLoadState('loading');
      try {
        const res = await api.get(`/members/${memberId}`);
        const m = unwrapData<Member & { createdAt?: string }>(res);
        if (cancelled) return;
        setPrenom(m.prenom ?? '');
        setNom(m.nom ?? '');
        setEmail(m.email ?? '');
        setPhone(m.phone ?? '');
        setDateNaissance(m.date_naissance ? String(m.date_naissance).slice(0, 10) : '');
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

    const body = {
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email.trim() || null,
      phone: phone.trim(),
      date_naissance: dateNaissance.trim() || null,
      date_inscription: dateInscription.trim(),
    };

    try {
      if (isEdit && memberId != null) {
        await api.put(`/members/${memberId}`, body);
        setToastMsg('Membre mis à jour avec succès');
      } else {
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
                  : 'Créer un nouveau profil membre'}
              </p>
            </div>
            <button type="button" className="gf-btn-header" onClick={() => navigate(-1)}>
              ← Retour
            </button>
          </div>

          <div className="gf-card-body">
            <form onSubmit={handleSubmit} noValidate>
              {/* Aperçu avatar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 28,
                  paddingBottom: 20,
                  borderBottom: '1px solid var(--gf-bg)',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: avatarBg,
                    color: 'var(--gf-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
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

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: '18px 20px',
                }}
              >
                <p
                  style={{
                    gridColumn: '1 / -1',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gf-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: 0,
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--gf-bg)',
                  }}
                >
                  Informations personnelles
                </p>

                <div>
                  <label style={labelStyle}>Prénom *</label>
                  <input
                    type="text"
                    placeholder="ex: Kouassi"
                    value={prenom}
                    onChange={(e) => {
                      setPrenom(e.target.value);
                      if (touched.prenom) validateField('prenom', { ...values, prenom: e.target.value });
                    }}
                    onBlur={() => blur('prenom')}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                    }}
                    style={{ ...baseInput, ...borderFor('prenom', errors) }}
                  />
                  {touched.prenom && errors.prenom && <p style={errStyle}>{errors.prenom}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Nom *</label>
                  <input
                    type="text"
                    placeholder="ex: Aimé"
                    value={nom}
                    onChange={(e) => {
                      setNom(e.target.value);
                      if (touched.nom) validateField('nom', { ...values, nom: e.target.value });
                    }}
                    onBlur={() => blur('nom')}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                    }}
                    style={{ ...baseInput, ...borderFor('nom', errors) }}
                  />
                  {touched.nom && errors.nom && <p style={errStyle}>{errors.nom}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    placeholder="ex: membre@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (touched.email) validateField('email', { ...values, email: e.target.value });
                    }}
                    onBlur={() => blur('email')}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                    }}
                    style={{ ...baseInput, ...borderFor('email', errors) }}
                  />
                  <p style={hintStyle}>Optionnel — pour les notifications</p>
                  {touched.email && errors.email && <p style={errStyle}>{errors.email}</p>}
                </div>

                <div>
                  <label style={labelStyle}>Téléphone *</label>
                  <input
                    type="tel"
                    placeholder="ex: +225 07 00 00 01"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (touched.phone) validateField('phone', { ...values, phone: e.target.value });
                    }}
                    onBlur={() => blur('phone')}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                    }}
                    style={{ ...baseInput, ...borderFor('phone', errors) }}
                  />
                  {touched.phone && errors.phone && <p style={errStyle}>{errors.phone}</p>}
                </div>

                <p
                  style={{
                    gridColumn: '1 / -1',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gf-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '8px 0 0',
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--gf-bg)',
                  }}
                >
                  Informations complémentaires
                </p>

                <div>
                  <label style={labelStyle}>Date de naissance</label>
                  <input
                    type="date"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                    onBlur={() => blur('date_naissance')}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                    }}
                    style={{ ...baseInput, ...borderFor('date_naissance', errors) }}
                  />
                  <p style={hintStyle}>Optionnel</p>
                </div>

                <div>
                  <label style={labelStyle}>Date d&apos;inscription *</label>
                  <input
                    type="date"
                    value={dateInscription}
                    onChange={(e) => {
                      setDateInscription(e.target.value);
                      if (touched.date_inscription)
                        validateField('date_inscription', { ...values, date_inscription: e.target.value });
                    }}
                    onBlur={() => blur('date_inscription')}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                    }}
                    style={{ ...baseInput, ...borderFor('date_inscription', errors) }}
                  />
                  {touched.date_inscription && errors.date_inscription && (
                    <p style={errStyle}>{errors.date_inscription}</p>
                  )}
                </div>
              </div>

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
                  onClick={() => navigate(-1)}
                  style={{
                    padding: '10px 20px',
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
                  disabled={submitDisabled}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    border: 'none',
                    background: isEdit ? GRAD_SUCCESS : GRAD_INFO,
                    color: 'var(--gf-white)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: submitDisabled ? 'not-allowed' : 'pointer',
                    opacity: submitDisabled ? 0.6 : 1,
                  }}
                >
                  {submitting
                    ? 'Enregistrement…'
                    : isEdit
                      ? 'Enregistrer les modifications'
                      : 'Créer le membre'}
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
