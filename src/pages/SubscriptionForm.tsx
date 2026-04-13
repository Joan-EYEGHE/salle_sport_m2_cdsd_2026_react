/*
AUDIT CSS GYMFLOW - SubscriptionForm.tsx
Problème 1 : Objet S et nombreux blocs JSX en palette hex ; onBlur sur hex bordure
Problème 2 : Mode switcher et totaux sans variables CSS
Total : 2 problèmes trouvés
*/
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import type { Activity, MemberSearchResult, Subscription } from '../types';

type TypeForfait = Subscription['type_forfait'];

const FORFAIT_DAYS: Record<TypeForfait, number> = {
  HEBDO: 7,
  MENSUEL: 30,
  TRIMESTRIEL: 90,
  ANNUEL: 365,
};

const FORFAIT_PRICE_KEY: Record<TypeForfait, keyof Activity> = {
  HEBDO: 'prix_hebdomadaire',
  MENSUEL: 'prix_mensuel',
  TRIMESTRIEL: 'prix_trimestriel',
  ANNUEL: 'prix_annuel',
};

const FORFAIT_LABEL: Record<TypeForfait, string> = {
  HEBDO: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  ANNUEL: 'Annuel',
};

const ALL_FORFAITS: TypeForfait[] = ['HEBDO', 'MENSUEL', 'TRIMESTRIEL', 'ANNUEL'];

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function calcEndDateFromForfait(start: string, type: TypeForfait): string {
  if (!start || !type) return '';
  const [y, m, d0] = start.split('-').map(Number);
  const d = new Date(y, m - 1, d0);
  d.setDate(d.getDate() + FORFAIT_DAYS[type]);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function memberInitials(m: MemberSearchResult): string {
  return ((m.prenom?.[0] ?? '') + (m.nom?.[0] ?? '')).toUpperCase();
}

// ─── styles ─────────────────────────────────────────────────────────────────

const S = {
  label: {
    display: 'block' as const,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: 'var(--gf-muted)',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid var(--gf-border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--gf-dark)',
    outline: 'none',
    background: 'var(--gf-white)',
    transition: 'border-color 0.2s',
  },
  inputDisabled: {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid var(--gf-border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--gf-muted)',
    background: '#f8f9fa',
    outline: 'none',
  },
  inputError: {
    border: '1px solid #F44335',
  },
  select: {
    width: '100%',
    boxSizing: 'border-box' as const,
    border: '1px solid var(--gf-border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--gf-dark)',
    outline: 'none',
    background: 'var(--gf-white)',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    appearance: 'none' as const,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237b809a' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat' as const,
    backgroundPosition: 'right 12px center',
    paddingRight: 36,
  },
};

// ─── component ───────────────────────────────────────────────────────────────

type Mode = 'creation' | 'renewal';

interface RenewalContext {
  memberName: string;
  activityName: string;
  oldEndDate: string;
}

export default function SubscriptionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const qMode = searchParams.get('mode') === 'renewal' ? 'renewal' : 'creation';
  const qMemberId = searchParams.get('memberId');
  const qSubscriptionId = searchParams.get('subscriptionId');
  const hasQueryParams = Boolean(qMemberId || qSubscriptionId);

  // ── mode ──
  const [mode, setMode] = useState<Mode>(qMode);

  // ── member search (création) ──
  const [memberQuery, setMemberQuery] = useState('');
  const [memberResults, setMemberResults] = useState<MemberSearchResult[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberSearchResult | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── activities ──
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<number | ''>('');

  // ── forfait (aligné POST /api/subscriptions : type_forfait + grille tarifaire activité) ──
  const [typeForfait, setTypeForfait] = useState<TypeForfait | ''>('');

  // ── dates ──
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState('');

  // ── frais d'inscription (création uniquement ; non envoyés au backend en renouvellement) ──
  const [inscriptionFee, setInscriptionFee] = useState(0);

  // ── renewal context ──
  const [renewalCtx, setRenewalCtx] = useState<RenewalContext | null>(null);
  const [renewalLoading, setRenewalLoading] = useState(false);

  // ── warning abonnement actif ──
  const [activeSubWarning, setActiveSubWarning] = useState(false);

  // ── validation ──
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ─── load activities on mount ────────────────────────────────────────────
  useEffect(() => {
    api.get('/activities')
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setActivities(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  // ─── recalcul date de fin affichée (aperçu = même pas que le backend) ─────
  useEffect(() => {
    if (!typeForfait || !startDate) {
      setEndDate('');
      return;
    }
    setEndDate(calcEndDateFromForfait(startDate, typeForfait));
  }, [typeForfait, startDate]);

  // ─── check active subscription warning ──────────────────────────────────
  useEffect(() => {
    if (!selectedMember || !selectedActivityId || mode !== 'creation') {
      setActiveSubWarning(false);
      return;
    }
    api.get(`/subscriptions?memberId=${selectedMember.id}&activityId=${selectedActivityId}&status=active`)
      .then((res) => {
        const data = res.data?.data ?? res.data;
        setActiveSubWarning(Array.isArray(data) ? data.length > 0 : false);
      })
      .catch(() => setActiveSubWarning(false));
  }, [selectedMember, selectedActivityId, mode]);

  // ─── load renewal data from query params ─────────────────────────────────
  useEffect(() => {
    if (mode !== 'renewal' || !qMemberId || !qSubscriptionId) return;
    setRenewalLoading(true);

    Promise.all([
      api.get(`/members/${qMemberId}`),
      api.get(`/subscriptions/${qSubscriptionId}`),
    ])
      .then(([mRes, sRes]) => {
        const member = mRes.data?.data ?? mRes.data;
        const sub = sRes.data?.data ?? sRes.data;

        const memberResult: MemberSearchResult = {
          id: member.id,
          nom: member.nom,
          prenom: member.prenom,
          email: member.email,
          initials: member.initials,
        };
        setSelectedMember(memberResult);

        const actId = sub.id_activity ?? sub.activity_id;
        if (actId) setSelectedActivityId(actId);
        if (sub.type_forfait) setTypeForfait(sub.type_forfait as TypeForfait);

        const oldEnd = sub.date_prochain_paiement ?? sub.end_date ?? sub.date_fin ?? '';
        let newStart: string;
        if (oldEnd) {
          const ancienneExpiration = new Date(oldEnd);
          const aujourdHui = new Date();
          aujourdHui.setHours(0, 0, 0, 0);
          ancienneExpiration.setHours(0, 0, 0, 0);
          newStart = ancienneExpiration < aujourdHui
            ? today()
            : addDays(oldEnd, 1);
        } else {
          newStart = today();
        }
        setStartDate(newStart);
        setInscriptionFee(0);

        const subRec = sub as Record<string, unknown>;
        const actNested = (subRec.activity ?? subRec.Activity) as { nom?: string } | undefined;

        setRenewalCtx({
          memberName: `${member.prenom} ${member.nom}`,
          activityName: actNested?.nom ?? '',
          oldEndDate: oldEnd,
        });
      })
      .catch(() => {})
      .finally(() => setRenewalLoading(false));
  }, [mode, qMemberId, qSubscriptionId]);

  // ─── member search debounce ──────────────────────────────────────────────
  const handleMemberQueryChange = useCallback((val: string) => {
    setMemberQuery(val);
    setShowDropdown(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!val.trim()) { setMemberResults([]); return; }
    searchTimer.current = setTimeout(() => {
      setMemberSearching(true);
      api.get(`/members?search=${encodeURIComponent(val)}`)
        .then((res) => {
          const data = res.data?.data ?? res.data;
          setMemberResults(Array.isArray(data) ? data.slice(0, 5) : []);
        })
        .catch(() => setMemberResults([]))
        .finally(() => setMemberSearching(false));
    }, 350);
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── mode switch ─────────────────────────────────────────────────────────
  function switchMode(m: Mode) {
    if (m === mode) return;
    setMode(m);
    // reset form unless pre-filled via query params
    if (!hasQueryParams) {
      setSelectedMember(null);
      setMemberQuery('');
      setMemberResults([]);
      setSelectedActivityId('');
      setTypeForfait('');
      setStartDate(today());
      setEndDate('');
      setInscriptionFee(0);
      setActiveSubWarning(false);
      setRenewalCtx(null);
      setFieldErrors({});
      setSubmitError('');
    }
  }

  // ─── derived ─────────────────────────────────────────────────────────────
  const selectedActivity = activities.find((a) => a.id === selectedActivityId) ?? null;
  const forfaitOptions: TypeForfait[] = selectedActivity?.isMonthlyOnly
    ? ALL_FORFAITS.filter((t) => t !== 'HEBDO')
    : ALL_FORFAITS;
  const subscriptionAmount =
    selectedActivity && typeForfait
      ? Number(selectedActivity[FORFAIT_PRICE_KEY[typeForfait]]) || 0
      : 0;
  const feeAmount = mode === 'renewal' ? 0 : inscriptionFee;
  const total = subscriptionAmount + feeAmount;

  const isFormValid =
    Boolean(selectedMember) &&
    Boolean(selectedActivityId) &&
    Boolean(typeForfait) &&
    Boolean(startDate);

  // ─── validation ──────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!selectedMember) errs.member = 'Veuillez sélectionner un membre';
    if (!selectedActivityId) errs.activity = 'Veuillez sélectionner une activité';
    if (!typeForfait) errs.typeForfait = 'Veuillez sélectionner un forfait';
    if (!startDate) errs.startDate = 'La date de début est requise';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ─── submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const body: {
        id_membre: number;
        id_activity: number;
        type_forfait: TypeForfait;
        date_debut: string;
        frais_inscription_payes?: number;
      } = {
        id_membre: selectedMember!.id,
        id_activity: Number(selectedActivityId),
        type_forfait: typeForfait as TypeForfait,
        date_debut: startDate,
      };
      if (mode === 'creation' && feeAmount > 0) {
        body.frais_inscription_payes = feeAmount;
      }
      await api.post('/subscriptions', body);
      const msg = mode === 'renewal' ? 'Abonnement renouvelé avec succès' : 'Abonnement créé avec succès';
      setToastMsg(msg);
      setTimeout(() => navigate('/subscriptions'), 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Une erreur est survenue. Veuillez réessayer.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── focus/blur helpers ──────────────────────────────────────────────────
  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = mode === 'renewal' ? '#43A047' : '#1A73E8';
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    e.currentTarget.style.borderColor = 'var(--gf-border)';
  }

  // ─── render ──────────────────────────────────────────────────────────────
  if (renewalLoading) {
    return (
      <div
        className="gf-page"
        style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100%' }}
      >
        <div style={{ color: 'var(--gf-muted)', fontSize: 14 }}>Chargement…</div>
      </div>
    );
  }

  const accentColor = mode === 'renewal' ? '#43A047' : '#1A73E8';
  const btnGradient = mode === 'renewal'
    ? 'linear-gradient(195deg, #66BB6A, #43A047)'
    : 'linear-gradient(195deg, #49a3f1, #1A73E8)';
  const btnShadow = mode === 'renewal'
    ? '0 3px 12px rgba(67,160,71,0.35)'
    : '0 3px 12px rgba(26,115,232,0.35)';

  return (
    <div className="gf-page" style={{ minHeight: '100%' }}>
      {/* ── switcher de mode ─────────────────────────────────────────── */}
      <div style={{ display: 'flex' }}>
        <div style={{ display: 'flex', border: '1px solid var(--gf-border)', borderRadius: 8, overflow: 'hidden' }}>
          {(['creation', 'renewal'] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                style={{
                  padding: '8px 18px',
                  fontSize: 13,
                  fontWeight: active ? 700 : 400,
                  color: active ? 'var(--gf-white)' : 'var(--gf-muted)',
                  background: active ? '#1A73E8' : 'var(--gf-white)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
              >
                {m === 'creation' ? 'Nouvel abonnement' : 'Renouvellement'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── card formulaire ──────────────────────────────────────────── */}
      <div className="gf-card-outer">
        <div className="gf-card">
          <div
            className={
              mode === 'renewal'
                ? 'gf-card-header gf-card-header--success'
                : 'gf-card-header gf-card-header--info'
            }
          >
            <div>
              <p className="gf-card-header__title">
                {mode === 'creation' ? 'Nouvel abonnement' : 'Renouvellement d\'abonnement'}
              </p>
              <p className="gf-card-header__sub">
                {mode === 'creation'
                  ? 'Créer un abonnement pour un membre'
                  : 'Prolonger un abonnement existant'}
              </p>
            </div>
          </div>

        <form onSubmit={handleSubmit}>
          <div className="gf-card-body" style={{ padding: '28px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── bannière renouvellement ─────────────────────────────── */}
            {mode === 'renewal' && renewalCtx && (
              <div style={{
                background: '#eaf7ea',
                borderLeft: '4px solid #43A047',
                borderRadius: 8,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#43A047" strokeWidth="2"/>
                  <path d="M9 12L11 14L15 10" stroke="#43A047" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize: 13, color: '#2e7d32', lineHeight: 1.5 }}>
                  Renouvellement de <strong>{renewalCtx.memberName}</strong>{renewalCtx.activityName ? ` — ${renewalCtx.activityName}` : ''}.
                  {renewalCtx.oldEndDate && (
                    <> Ancien abonnement expiré le{' '}
                      <strong>
                        {new Date(renewalCtx.oldEndDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>.
                    </>
                  )}
                  {' '}La nouvelle date de début est calculée automatiquement.
                </div>
              </div>
            )}

            {/* ── membre ─────────────────────────────────────────────── */}
            <div>
              <label style={S.label}>Membre</label>
              {mode === 'renewal' && selectedMember ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 14px',
                  border: '1px solid var(--gf-border)',
                  borderRadius: 8,
                  background: '#f8f9fa',
                }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--gf-white)',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {memberInitials(selectedMember)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gf-dark)' }}>
                      {selectedMember.prenom} {selectedMember.nom}
                    </div>
                    {selectedMember.email && (
                      <div style={{ fontSize: 12, color: 'var(--gf-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedMember.email}
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedMember ? (
                /* membre sélectionné en mode création */
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 14px',
                  border: '1px solid var(--gf-border)',
                  borderRadius: 8,
                  background: '#f8f9fa',
                }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--gf-white)',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {memberInitials(selectedMember)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gf-dark)' }}>
                      {selectedMember.prenom} {selectedMember.nom}
                    </div>
                    {selectedMember.email && (
                      <div style={{ fontSize: 12, color: 'var(--gf-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedMember.email}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMember(null);
                      setMemberQuery('');
                      setMemberResults([]);
                      setActiveSubWarning(false);
                      setFieldErrors((prev) => { const n = { ...prev }; delete n.member; return n; });
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#1A73E8',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      padding: '2px 0',
                    }}
                  >
                    Changer →
                  </button>
                </div>
              ) : (
                /* champ recherche autocomplete */
                <div ref={searchRef} style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => handleMemberQueryChange(e.target.value)}
                    onFocus={(e) => { setShowDropdown(true); onFocus(e); }}
                    onBlur={onBlur}
                    placeholder="Rechercher un membre…"
                    style={{
                      ...S.input,
                      ...(fieldErrors.member ? S.inputError : {}),
                    }}
                  />
                  {showDropdown && (memberResults.length > 0 || memberSearching) && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--gf-white)',
                      border: '1px solid var(--gf-border)',
                      borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      zIndex: 100,
                      marginTop: 4,
                      overflow: 'hidden',
                    }}>
                      {memberSearching ? (
                        <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--gf-muted)' }}>Recherche…</div>
                      ) : memberResults.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedMember(m);
                            setMemberQuery('');
                            setMemberResults([]);
                            setShowDropdown(false);
                            setFieldErrors((prev) => { const n = { ...prev }; delete n.member; return n; });
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '10px 14px',
                            background: 'none',
                            border: 'none',
                            borderBottom: '1px solid var(--gf-bg)',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#f8faff'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                        >
                          <div style={{
                            width: 30,
                            height: 30,
                            borderRadius: '50%',
                            background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--gf-white)',
                            fontSize: 11,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {memberInitials(m)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gf-dark)' }}>
                              {m.prenom} {m.nom}
                            </div>
                            {m.email && (
                              <div style={{ fontSize: 11, color: 'var(--gf-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.email}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {fieldErrors.member && (
                <p style={{ fontSize: 11, color: '#F44335', marginTop: 4 }}>{fieldErrors.member}</p>
              )}
            </div>

            {/* ── grid 2 colonnes ────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* activité */}
              <div>
                <label style={S.label}>Activité</label>
                {mode === 'renewal' && renewalCtx?.activityName ? (
                  <input
                    type="text"
                    value={renewalCtx.activityName}
                    disabled
                    style={S.inputDisabled}
                  />
                ) : (
                  <select
                    value={selectedActivityId}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setSelectedActivityId(val as number | '');
                      setTypeForfait('');
                      setFieldErrors((prev) => { const n = { ...prev }; delete n.activity; return n; });
                    }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    style={{
                      ...S.select,
                      ...(fieldErrors.activity ? S.inputError : {}),
                    }}
                  >
                    <option value="">Sélectionner une activité</option>
                    {activities.map((a) => (
                      <option key={a.id} value={a.id}>{a.nom}</option>
                    ))}
                  </select>
                )}
                {fieldErrors.activity && (
                  <p style={{ fontSize: 11, color: '#F44335', marginTop: 4 }}>{fieldErrors.activity}</p>
                )}
              </div>

              {/* forfait (type_forfait API) */}
              <div>
                <label style={S.label}>Forfait</label>
                <select
                  value={typeForfait}
                  onChange={(e) => {
                    const v = e.target.value as TypeForfait | '';
                    setTypeForfait(v);
                    setFieldErrors((prev) => { const n = { ...prev }; delete n.typeForfait; return n; });
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  disabled={!selectedActivityId}
                  style={{
                    ...S.select,
                    ...(!selectedActivityId ? { opacity: 0.6, cursor: 'not-allowed' } : {}),
                    ...(fieldErrors.typeForfait ? S.inputError : {}),
                  }}
                >
                  <option value="">Sélectionner un forfait</option>
                  {forfaitOptions.map((t) => {
                    const p = selectedActivity
                      ? Number(selectedActivity[FORFAIT_PRICE_KEY[t]]) || 0
                      : 0;
                    return (
                      <option key={t} value={t}>
                        {FORFAIT_LABEL[t]} — {fmt(p)}
                      </option>
                    );
                  })}
                </select>
                {fieldErrors.typeForfait && (
                  <p style={{ fontSize: 11, color: '#F44335', marginTop: 4 }}>{fieldErrors.typeForfait}</p>
                )}
              </div>

              {/* date de début */}
              <div>
                <label style={S.label}>Date de début</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setFieldErrors((prev) => { const n = { ...prev }; delete n.startDate; return n; });
                  }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  disabled={mode === 'renewal'}
                  style={{
                    ...(mode === 'renewal' ? S.inputDisabled : S.input),
                    ...(fieldErrors.startDate ? S.inputError : {}),
                  }}
                />
                {fieldErrors.startDate && (
                  <p style={{ fontSize: 11, color: '#F44335', marginTop: 4 }}>{fieldErrors.startDate}</p>
                )}
              </div>

              {/* date de fin calculée */}
              <div>
                <label style={S.label}>Date de fin (calculée)</label>
                <input
                  type="text"
                  value={
                    endDate
                      ? new Date(endDate).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'
                  }
                  disabled
                  style={S.inputDisabled}
                />
              </div>

              {/* frais d'inscription */}
              <div>
                <label style={S.label}>Frais d'inscription (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  value={mode === 'renewal' ? 0 : inscriptionFee}
                  onChange={(e) => setInscriptionFee(Math.max(0, Number(e.target.value)))}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  disabled={mode === 'renewal'}
                  style={mode === 'renewal' ? S.inputDisabled : S.input}
                />
              </div>
            </div>

            {/* ── warning abonnement actif ────────────────────────────── */}
            {activeSubWarning && (
              <div style={{
                background: '#fff8f0',
                borderLeft: '4px solid #fb8c00',
                borderRadius: 8,
                padding: '12px 16px',
                fontSize: 13,
                color: '#e65100',
                lineHeight: 1.5,
              }}>
                Ce membre a déjà un abonnement actif sur cette activité. Vous pouvez continuer pour en créer un nouveau.
              </div>
            )}

            {/* ── récapitulatif ───────────────────────────────────────── */}
            {typeForfait && selectedActivity && (
              <div style={{
                background: '#f8f9fa',
                borderRadius: 10,
                padding: '16px 18px',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gf-muted)', marginBottom: 12 }}>
                  Récapitulatif
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--gf-dark)' }}>
                    <span>Abonnement {selectedActivity.nom} ({FORFAIT_LABEL[typeForfait]})</span>
                    <span style={{ fontWeight: 600 }}>{fmt(subscriptionAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--gf-dark)' }}>
                    <span>Frais d'inscription</span>
                    <span style={{ fontWeight: 600 }}>{fmt(feeAmount)}</span>
                  </div>
                  <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 10, marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gf-dark)' }}>Total à payer</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: accentColor }}>{fmt(total)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── erreur de soumission ────────────────────────────────── */}
            {submitError && (
              <p style={{ fontSize: 12, color: '#F44335', margin: 0 }}>{submitError}</p>
            )}

            {/* ── boutons ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  padding: '10px 20px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--gf-muted)',
                  background: 'var(--gf-white)',
                  border: '1px solid var(--gf-border)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gf-white)'; }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={!isFormValid || submitting}
                style={{
                  padding: '10px 22px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'var(--gf-white)',
                  background: btnGradient,
                  border: 'none',
                  borderRadius: 8,
                  cursor: isFormValid && !submitting ? 'pointer' : 'not-allowed',
                  opacity: isFormValid && !submitting ? 1 : 0.6,
                  boxShadow: isFormValid && !submitting ? btnShadow : 'none',
                  transition: 'opacity 0.2s',
                }}
              >
                {submitting
                  ? 'Enregistrement…'
                  : mode === 'renewal'
                    ? 'Renouveler l\'abonnement'
                    : 'Créer l\'abonnement'}
              </button>
            </div>

          </div>
        </form>
        </div>
      </div>

      {/* ── toast ──────────────────────────────────────────────────────── */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: mode === 'renewal' ? '#43A047' : '#1A73E8',
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
          maxWidth: 320,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17L4 12" stroke="var(--gf-white)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {toastMsg}
        </div>
      )}
    </div>
  );
}
