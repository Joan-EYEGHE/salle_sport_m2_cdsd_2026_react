/*
AUDIT CSS GYMFLOW - MemberDetailPage.tsx
Problème 1 : Nombreux textes, bordures et fonds en palette hex (tableaux, fiches, boutons)
Total : 1 problème trouvé
*/
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import type { AccessLog, Activity, Member, Subscription } from '../types';
import { normalizeAccessLogFromApi } from '../utils/accessLogApiNormalize';
import { normalizeMemberFromApi } from '../utils/memberApiNormalize';

// ─── helpers ────────────────────────────────────────────────────────────────

function normalizeSubscription(raw: unknown): Subscription {
  const r = raw as Subscription & { Activity?: Activity; activite?: Activity };
  return {
    ...r,
    activity: r.activity ?? r.Activity ?? r.activite,
  };
}

type MemberStatus = 'ACTIF' | 'INACTIF' | 'EN_ATTENTE';

/** Aligné sur MembersPage : dernier élément de la liste API (createdAt DESC) = abonnement le plus ancien ≈ id minimal. */
function getMemberStatusFromSubscriptions(subs: Subscription[]): MemberStatus {
  if (subs.length === 0) return 'EN_ATTENTE';
  const oldest = subs.reduce((a, b) => (a.id < b.id ? a : b));
  return new Date(oldest.date_prochain_paiement) >= new Date() ? 'ACTIF' : 'INACTIF';
}

function isSubActive(sub: Subscription): boolean {
  return new Date(sub.date_prochain_paiement) >= new Date();
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr);
  return Math.ceil((end.getTime() - Date.now()) / 86400000);
}

function getActiveSubscriptions(subs: Subscription[]): Subscription[] {
  return subs.filter(isSubActive);
}

/** Abonnement actif affiché : date de fin la plus lointaine parmi les actifs */
function pickPrimaryActive(subs: Subscription[]): Subscription | undefined {
  const actives = getActiveSubscriptions(subs);
  if (actives.length === 0) return undefined;
  return [...actives].sort(
    (a, b) => new Date(b.date_prochain_paiement).getTime() - new Date(a.date_prochain_paiement).getTime(),
  )[0];
}

function subscriptionRowStatus(sub: Subscription): 'active' | 'expired' | 'soon' {
  if (!isSubActive(sub)) return 'expired';
  const d = daysUntil(sub.date_prochain_paiement);
  if (d <= 30) return 'soon';
  return 'active';
}

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtAmount(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function getInitials(m: Member): string {
  if (m.initials) return m.initials;
  return `${(m.prenom ?? '?').charAt(0)}${(m.nom ?? '?').charAt(0)}`.toUpperCase();
}

function unwrapData<T>(res: { data?: { data?: T; success?: boolean } & T }): T {
  const d = res.data as { data?: T };
  return (d?.data ?? res.data) as T;
}

function unwrapList<T>(res: { data?: { data?: T[] } & { data?: T[] } }): T[] {
  const raw = unwrapData<unknown>(res);
  if (Array.isArray(raw)) return raw as T[];
  return [];
}

function sortSubsByEndDesc(subs: Subscription[]): Subscription[] {
  return [...subs].sort(
    (a, b) => new Date(b.date_prochain_paiement).getTime() - new Date(a.date_prochain_paiement).getTime(),
  );
}

function lastSuccessfulAccessDate(logs: AccessLog[]): string | undefined {
  const ok = logs.filter((l) => l.resultat === 'SUCCES' || l.resultat === 'SUCCESS');
  if (ok.length === 0) return undefined;
  return [...ok].sort((a, b) => new Date(b.date_scan).getTime() - new Date(a.date_scan).getTime())[0]?.date_scan;
}

/** Dernier scan réussi : requête dédiée (limit 1) ou repli sur les logs déjà chargés. */
function computeLastVisitFromLogs(logs: AccessLog[], lastOkRows: AccessLog[]): string | undefined {
  const direct = lastOkRows[0]?.date_scan?.trim();
  if (direct) return direct;
  return lastSuccessfulAccessDate(logs);
}

function logIsSuccess(log: AccessLog): boolean {
  return log.resultat === 'SUCCES' || log.resultat === 'SUCCESS';
}

function logDetailLine(log: AccessLog): string {
  const act = log.ticket?.batch?.activity?.nom;
  if (act) return act;
  if (log.ticket?.code_ticket) return log.ticket.code_ticket;
  return '—';
}

const STATUS_MAP: Record<MemberStatus, { label: string; badgeClass: string }> = {
  ACTIF: { label: 'Actif', badgeClass: 'active' },
  INACTIF: { label: 'Inactif', badgeClass: 'inactive' },
  EN_ATTENTE: { label: 'En attente', badgeClass: 'pending' },
};

function MemberStatusBadge({ status }: { status: MemberStatus }) {
  const { label, badgeClass } = STATUS_MAP[status];
  return <span className={`gf-badge gf-badge--${badgeClass}`}>{label}</span>;
}

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  gap: 20,
  alignItems: 'start',
};

const infoRow: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid var(--gf-bg)',
  gap: 12,
};

// ─── page ───────────────────────────────────────────────────────────────────

export default function MemberDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? 'CONTROLLER';
  const canAct = role === 'ADMIN' || role === 'CASHIER';

  const [member, setMember] = useState<Member | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [lastSuccessScanAt, setLastSuccessScanAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!slug?.trim()) {
      setNotFound(true);
      setAccessLogs([]);
      setLastSuccessScanAt(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotFound(false);

    try {
      const mRes = await api.get(`/members/${encodeURIComponent(slug)}`);
      const m = normalizeMemberFromApi(unwrapData<Member>(mRes));
      setMember(m);

      const subsFromMember = m.subscriptions ?? [];
      const financial = role === 'ADMIN' || role === 'CASHIER';
      const memberNumericId = m.id;

      const logsReq = api
        .get('/access-logs', { params: { memberId: memberNumericId, limit: 10, sort: 'desc' } })
        .then((r) => unwrapList<AccessLog>(r).map(normalizeAccessLogFromApi))
        .catch(() => [] as AccessLog[]);
      const lastOkReq = api
        .get('/access-logs', {
          params: { memberId: memberNumericId, resultat: 'SUCCES', limit: 1, sort: 'desc' },
        })
        .then((r) => unwrapList<AccessLog>(r).map(normalizeAccessLogFromApi))
        .catch(() => [] as AccessLog[]);

      if (financial) {
        const [logs, lastOk, sRes] = await Promise.all([
          logsReq,
          lastOkReq,
          api
            .get('/subscriptions', { params: { memberId: memberNumericId } })
            .catch(() => ({ data: { data: [] } })),
        ]);
        setAccessLogs(logs);
        setLastSuccessScanAt(computeLastVisitFromLogs(logs, lastOk));
        setSubscriptions(
          sortSubsByEndDesc(unwrapList<Subscription>(sRes as never).map((s) => normalizeSubscription(s))),
        );
      } else {
        const [logs, lastOk] = await Promise.all([logsReq, lastOkReq]);
        setAccessLogs(logs);
        setLastSuccessScanAt(computeLastVisitFromLogs(logs, lastOk));
        setSubscriptions(sortSubsByEndDesc(subsFromMember.map((s) => normalizeSubscription(s))));
      }
    } catch (e: unknown) {
      setAccessLogs([]);
      setLastSuccessScanAt(undefined);
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        setNotFound(true);
      } else {
        setError('Impossible de charger ce membre.');
      }
    } finally {
      setLoading(false);
    }
  }, [slug, role]);

  useEffect(() => {
    load();
  }, [load]);

  const pageStyle: React.CSSProperties = {
    background: 'var(--gf-bg)',
    padding: '20px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  };

  if (loading) {
    return (
      <div style={{ ...pageStyle, justifyContent: 'center', alignItems: 'center' }}>
        <Loader size="lg" />
      </div>
    );
  }

  if (notFound || !member) {
    return (
      <div style={pageStyle}>
        <div className="gf-card-outer">
          <div className="gf-card">
            <div className="gf-card-header gf-card-header--info">
              <div>
                <p className="gf-card-header__title">Membre introuvable</p>
                <p className="gf-card-header__sub">Aucune fiche ne correspond à cet identifiant</p>
              </div>
              <button type="button" className="gf-btn-header" onClick={() => navigate(-1)}>
                ← Retour
              </button>
            </div>
            <div className="gf-card-body" style={{ textAlign: 'center', paddingBottom: 28 }}>
              <p style={{ color: 'var(--gf-muted)', fontSize: 14, marginBottom: 16 }}>Erreur 404</p>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  border: '1px solid var(--gf-border)',
                  background: '#fff',
                  color: 'var(--gf-dark)',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div className="gf-card-outer">
          <div className="gf-card">
            <div className="gf-card-header gf-card-header--info">
              <div>
                <p className="gf-card-header__title">Erreur</p>
                <p className="gf-card-header__sub">Chargement interrompu</p>
              </div>
              <button type="button" className="gf-btn-header" onClick={() => navigate(-1)}>
                ← Retour
              </button>
            </div>
            <div className="gf-card-body">
              <p style={{ color: '#F44335', fontSize: 14 }}>{error}</p>
              <button
                type="button"
                onClick={() => navigate(-1)}
                style={{
                  marginTop: 16,
                  border: '1px solid var(--gf-border)',
                  background: '#fff',
                  color: 'var(--gf-dark)',
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const subsForStatus = subscriptions.length ? subscriptions : member.subscriptions ?? [];
  const displayStatus = getMemberStatusFromSubscriptions(subsForStatus);
  const primaryActive = pickPrimaryActive(subsForStatus);
  const daysLeftPrimary = primaryActive ? daysUntil(primaryActive.date_prochain_paiement) : null;
  const showExpireBadge =
    primaryActive && daysLeftPrimary != null && daysLeftPrimary <= 30 && daysLeftPrimary >= 0;

  const lastVisit = lastSuccessScanAt;

  const btnRenew: React.CSSProperties = {
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    background: 'linear-gradient(195deg, #FFA726, #fb8c00)',
    boxShadow: '0 4px 12px rgba(251,140,0,0.35)',
  };

  const btnEdit: React.CSSProperties = {
    border: '1px solid var(--gf-border)',
    background: '#fff',
    color: 'var(--gf-dark)',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={pageStyle}>
      {/* BLOC 1 — Hero */}
      <div className="gf-card-outer">
        <div className="gf-card">
          <div className="gf-card-header gf-card-header--info">
            <div>
              <p className="gf-card-header__title">Détail membre</p>
              <p className="gf-card-header__sub">Fiche complète et historique</p>
            </div>
            <button type="button" className="gf-btn-header" onClick={() => navigate(-1)}>
              ← Retour
            </button>
          </div>
          <div className="gf-card-body">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 20,
              }}
            >
              <div style={{ display: 'flex', gap: 18, flex: '1 1 280px', minWidth: 0 }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: '0 4px 15px rgba(26,115,232,0.3)',
                  }}
                >
                  {getInitials(member)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--gf-dark)' }}>
                    {member.prenom} {member.nom}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--gf-muted)' }}>
                    {member.email ?? '—'} · {member.phone ?? '—'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    <MemberStatusBadge status={displayStatus} />
                    {primaryActive && (
                      <span className="gf-badge gf-badge--active">
                        {primaryActive.activity?.nom ?? primaryActive.type_forfait}
                      </span>
                    )}
                    {showExpireBadge && (
                      <span className="gf-badge gf-badge--pending">Expire dans {daysLeftPrimary}j</span>
                    )}
                  </div>
                </div>
              </div>
              {canAct && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    style={btnEdit}
                    onClick={() => navigate(`/members/${member.slug ?? String(member.id)}/edit`)}
                  >
                    ✏️ Modifier
                  </button>
                  {primaryActive && (
                    <button
                      type="button"
                      style={btnRenew}
                      onClick={() =>
                        navigate(
                          `/subscriptions/form?mode=renewal&member=${encodeURIComponent(
                            member.slug ?? String(member.id),
                          )}&subscriptionId=${primaryActive.id}`,
                        )
                      }
                    >
                      🔄 Renouveler
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BLOC 2 */}
      <div style={grid2}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="gf-card-outer">
            <div className="gf-card">
              <div className="gf-card-header gf-card-header--dark">
                <div>
                  <p className="gf-card-header__title">Informations</p>
                  <p className="gf-card-header__sub">Données d&apos;identification</p>
                </div>
              </div>
              <div className="gf-card-body">
                {(
                  [
                    { label: 'Prénom', value: member.prenom },
                    { label: 'Nom', value: member.nom },
                    { label: 'Email', value: member.email ?? '—' },
                    { label: 'Téléphone', value: member.phone ?? '—' },
                    { label: 'Date inscription', value: fmtDate(member.date_inscription) },
                    { label: 'Dernière visite', value: fmtDateTime(lastVisit) },
                  ] as const
                ).map((row) => (
                  <div key={row.label} style={infoRow}>
                    <span style={{ fontSize: 12, color: 'var(--gf-muted)' }}>{row.label}</span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--gf-dark)',
                        textAlign: 'right',
                        wordBreak: 'break-word',
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
                <hr style={{ border: 'none', borderTop: '1px solid var(--gf-bg)', margin: '12px 0' }} />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                    paddingTop: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--gf-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Code QR membre
                  </span>
                  <div
                    style={{
                      background: 'var(--gf-white)',
                      border: '1px solid var(--gf-border)',
                      borderRadius: 8,
                      padding: 8,
                    }}
                  >
                    <QRCode value={member.uuid_qr} size={120} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: 10,
                      color: 'var(--gf-muted)',
                      textAlign: 'center',
                      wordBreak: 'break-all',
                      maxWidth: 200,
                      lineHeight: 1.5,
                    }}
                  >
                    {member.uuid_qr}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="gf-card-outer">
            <div className="gf-card">
              <div className="gf-card-header gf-card-header--success">
                <div>
                  <p className="gf-card-header__title">Abonnement actif</p>
                  <p className="gf-card-header__sub">Forfait en cours</p>
                </div>
              </div>
              <div className="gf-card-body">
                {primaryActive ? (
                  <div
                    style={{
                      background: '#eaf7ea',
                      borderLeft: '4px solid #43A047',
                      borderRadius: 8,
                      padding: '14px 16px',
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--gf-dark)' }}>
                      {primaryActive.activity?.nom ?? 'Activité'}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--gf-muted)' }}>
                      Forfait {primaryActive.type_forfait} · Du {fmtDate(primaryActive.date_debut)} au{' '}
                      {fmtDate(primaryActive.date_prochain_paiement)}
                    </p>
                    <div style={{ marginTop: 10 }}>
                      <span className="gf-badge gf-badge--active">
                        {daysLeftPrimary != null && daysLeftPrimary >= 0
                          ? `${daysLeftPrimary} jour${daysLeftPrimary > 1 ? 's' : ''} restant${daysLeftPrimary > 1 ? 's' : ''}`
                          : 'Actif'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p style={{ color: 'var(--gf-muted)', fontSize: 13, margin: '0 0 12px' }}>
                      Aucun abonnement actif.
                    </p>
                    {canAct && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/subscriptions/form?member=${encodeURIComponent(
                              member.slug ?? String(member.id),
                            )}`,
                          )
                        }
                        style={{
                          border: 'none',
                          background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                          color: '#fff',
                          padding: '8px 16px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Créer un abonnement →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="gf-card-outer">
          <div className="gf-card">
            <div className="gf-card-header gf-card-header--dark">
              <div>
                <p className="gf-card-header__title">Accès récents</p>
                <p className="gf-card-header__sub">Dix derniers scans</p>
              </div>
            </div>
            <div className="gf-card-body">
              {accessLogs.length === 0 ? (
                <p style={{ color: 'var(--gf-muted)', fontSize: 13, margin: 0 }}>Aucun accès enregistré.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {accessLogs.map((log) => {
                    const ok = logIsSuccess(log);
                    return (
                      <div
                        key={log.id}
                        style={{
                          background: '#f8f9fa',
                          borderRadius: 8,
                          padding: '9px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: ok ? '#43A047' : '#F44335',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--gf-dark)' }}>
                            {ok ? 'Accès accordé' : 'Accès refusé'}
                          </p>
                          <p
                            style={{
                              margin: '2px 0 0',
                              fontSize: 11,
                              color: 'var(--gf-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {logDetailLine(log)}
                          </p>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--gf-muted)', flexShrink: 0 }}>
                          {fmtDateTime(log.date_scan)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BLOC 3 — Historique abonnements */}
      <div className="gf-card-outer">
        <div className="gf-card">
          <div className="gf-card-header gf-card-header--info">
            <div>
              <p className="gf-card-header__title">Historique des abonnements</p>
              <p className="gf-card-header__sub">Tous les forfaits souscrits</p>
            </div>
          </div>
          <div className="gf-card-body--table">
            <table className="gf-table">
              <thead>
                <tr>
                  <th>Activité</th>
                  <th>Forfait</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Montant</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--gf-muted)', padding: 24 }}>
                      Aucun abonnement.
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => {
                    const row = subscriptionRowStatus(sub);
                    return (
                      <tr key={sub.id}>
                        <td>{sub.activity?.nom ?? '—'}</td>
                        <td>{sub.type_forfait}</td>
                        <td>{fmtDate(sub.date_debut)}</td>
                        <td>{fmtDate(sub.date_prochain_paiement)}</td>
                        <td>{fmtAmount(Number(sub.montant_total))}</td>
                        <td>
                          {row === 'active' && <span className="gf-badge gf-badge--active">Actif</span>}
                          {row === 'expired' && <span className="gf-badge gf-badge--inactive">Expiré</span>}
                          {row === 'soon' && <span className="gf-badge gf-badge--pending">Bientôt</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
