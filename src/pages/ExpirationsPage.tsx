/*
AUDIT CSS GYMFLOW - ExpirationsPage.tsx
Problème 1 : KPI, cartes membre et filtres en palette hex (blanc, gris, bordures)
Total : 1 problème trouvé
*/
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import api from '../api/axios';

const PAGE_SIZE = 10;

interface Membre {
  id?: number;
  nom: string;
  prenom: string;
}

interface Activite {
  nom?: string;
}

interface ExpiringSub {
  id: number;
  id_membre?: number;
  membre_id?: number;
  membre?: Membre;
  activite?: Activite;
  type_abonnement?: string;
  date_prochain_paiement: string;
  daysLeft: number;
}

function normalizeExpiringApiRow(raw: Record<string, unknown>): ExpiringSub {
  const membre = (raw.membre ?? raw.member ?? raw.Member) as Membre | undefined;
  const activite = (raw.activite ?? raw.activity ?? raw.Activity) as Activite | undefined;
  const date_prochain_paiement = String(raw.date_prochain_paiement ?? '');
  const id = Number(raw.id);
  const idMembre = raw.id_membre != null ? Number(raw.id_membre) : undefined;
  return {
    id,
    id_membre: idMembre,
    membre_id: idMembre,
    membre,
    activite,
    type_abonnement: (raw.type_forfait as string) ?? undefined,
    date_prochain_paiement,
    daysLeft: daysLeftFromDateOnly(date_prochain_paiement),
  };
}

type Filter = 'all' | 'urgent' | 'soon';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** DATEONLY YYYY-MM-DD en calendrier local (évite décalage UTC / jours restants faux). */
function daysLeftFromDateOnly(ymd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return 0;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const target = new Date(y, mo - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / 86400000));
}

function joursLabel(n: number) {
  if (n === 0) return "Expire aujourd'hui";
  return `${n} jour${n > 1 ? 's' : ''}`;
}

function getInitiales(membre?: Membre) {
  if (!membre) return '?';
  const p = (membre.prenom?.[0] ?? '').toUpperCase();
  const n = (membre.nom?.[0] ?? '').toUpperCase();
  return p + n;
}

// ── AlertRow ──────────────────────────────────────────────────────────────────

interface AlertRowProps {
  sub: ExpiringSub;
  isUrgent: boolean;
  onDismiss: (id: number) => void;
  onRenew: (sub: ExpiringSub) => void;
}

function AlertRow({ sub, isUrgent, onDismiss, onRenew }: AlertRowProps) {
  const memberName = sub.membre
    ? `${sub.membre.prenom} ${sub.membre.nom}`
    : `Abonnement #${sub.id}`;
  const activiteLabel = sub.activite?.nom ?? sub.type_abonnement ?? 'Abonnement';
  const expireLabel = `${activiteLabel} · expire le ${fmtDate(sub.date_prochain_paiement)}`;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 10,
        padding: '14px 16px',
        paddingRight: 36,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: isUrgent ? '#fff5f5' : '#fff8f0',
        borderLeft: `4px solid ${isUrgent ? '#F44335' : '#fb8c00'}`,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          flexShrink: 0,
          background: isUrgent
            ? 'linear-gradient(135deg, #ef5350, #F44335)'
            : 'linear-gradient(135deg, #FFA726, #fb8c00)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: 'var(--gf-white)', fontSize: 12, fontWeight: 700 }}>
          {getInitiales(sub.membre)}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--gf-dark)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {memberName}
        </p>
        <p
          style={{
            fontSize: 11,
            color: 'var(--gf-muted)',
            margin: '3px 0 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {expireLabel}
        </p>
      </div>

      {/* Meta */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            background: isUrgent ? '#fde8e8' : '#fef3e2',
            color: isUrgent ? '#F44335' : '#fb8c00',
          }}
        >
          {joursLabel(sub.daysLeft)}
        </span>
        <button
          type="button"
          onClick={() => onRenew(sub)}
          style={{
            background: isUrgent ? '#F44335' : '#fb8c00',
            color: 'var(--gf-white)',
            border: 'none',
            borderRadius: 7,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Renouveler →
        </button>
      </div>

      {/* Dismiss ✕ */}
      <button
        type="button"
        onClick={() => onDismiss(sub.id)}
        title="Ignorer"
        style={{
          position: 'absolute',
          top: 8,
          right: 10,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#b0b0b0',
          fontSize: 13,
          lineHeight: 1,
          padding: '2px 4px',
          borderRadius: 4,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── ExpirationsPage ────────────────────────────────────────────────────────────

export default function ExpirationsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [subs, setSubs] = useState<ExpiringSub[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [kpiRenewed, setKpiRenewed] = useState<number | null>(null);

  // ── Fetch data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.allSettled([
      api.get('/subscriptions/expiring-soon?days=30'),
      api.get('/subscriptions?renewed=true&period=month'),
    ]).then(([subsRes, renewedRes]) => {
      if (subsRes.status === 'fulfilled') {
        const raw = subsRes.value.data?.data ?? subsRes.value.data;
        const arr: ExpiringSub[] = (Array.isArray(raw) ? raw : [])
          .map((s) => normalizeExpiringApiRow(s as Record<string, unknown>))
          .filter((s) => Number.isFinite(s.id) && s.id > 0 && Boolean(s.date_prochain_paiement));
        setSubs(arr.sort((a, b) => a.daysLeft - b.daysLeft));
      } else {
        setError(true);
      }

      if (renewedRes.status === 'fulfilled') {
        const d = renewedRes.value.data?.data ?? renewedRes.value.data;
        const count = d?.count ?? d?.total ?? (Array.isArray(d) ? d.length : undefined);
        setKpiRenewed(typeof count === 'number' ? count : 0);
      } else {
        setKpiRenewed(0);
      }
    }).finally(() => setLoading(false));
  }, []);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [filter]);

  // ── Derived lists ────────────────────────────────────────────────────────────
  const allSubs = subs.filter((s) => !dismissed.has(s.id));
  const urgent = allSubs.filter((s) => s.daysLeft <= 7);
  const soon = allSubs.filter((s) => s.daysLeft > 7 && s.daysLeft <= 30);
  const filtered = filter === 'urgent' ? urgent : filter === 'soon' ? soon : allSubs;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const pageUrgent = pageRows.filter((s) => s.daysLeft <= 7);
  const pageSoon = pageRows.filter((s) => s.daysLeft > 7);
  const showUrgentSection = filter !== 'soon' && pageUrgent.length > 0;
  const showSoonSection = filter !== 'urgent' && pageSoon.length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const dismiss = (id: number) =>
    setDismissed((prev) => new Set([...prev, id]));

  const handleRenew = (sub: ExpiringSub) => {
    const memberId = sub.id_membre ?? sub.membre_id ?? sub.membre?.id ?? '';
    navigate(
      `/subscriptions/form?mode=renewal&memberId=${memberId}&subscriptionId=${sub.id}`
    );
  };

  // ── KPI definitions ───────────────────────────────────────────────────────────
  type KpiIconClass = 'gf-kpi-icon--error' | 'gf-kpi-icon--warning' | 'gf-kpi-icon--info';

  const kpiDefs: {
    label: string;
    value: number | null;
    Icon: typeof AlertTriangle;
    iconClass: KpiIconClass;
    footer: React.ReactNode;
  }[] = [
    {
      label: 'Expirent dans 7j',
      value: loading ? null : urgent.length,
      Icon: AlertTriangle,
      iconClass: 'gf-kpi-icon--error',
      footer: (
        <div className="gf-kpi-footer">
          <span style={{ color: '#fb8c00', fontWeight: 600 }}>Urgent</span>
          {' — action requise'}
        </div>
      ),
    },
    {
      label: 'Expirent dans 30j',
      value: loading ? null : allSubs.length,
      Icon: Clock,
      iconClass: 'gf-kpi-icon--warning',
      footer: (
        <div className="gf-kpi-footer">
          {'À contacter '}
          <span style={{ color: '#fb8c00', fontWeight: 600 }}>bientôt</span>
        </div>
      ),
    },
    {
      label: 'Renouvelés ce mois',
      value: loading ? null : kpiRenewed,
      Icon: RefreshCw,
      iconClass: 'gf-kpi-icon--info',
      footer: <div className="gf-kpi-footer">Ce mois-ci</div>,
    },
  ];

  // ── Filter pill config ────────────────────────────────────────────────────────
  const pillConfig: { key: Filter; label: string; activeColor: string }[] = [
    { key: 'all',    label: `Tous (${allSubs.length})`,        activeColor: 'var(--gf-dark)' },
    { key: 'urgent', label: `Urgent — 7j (${urgent.length})`,  activeColor: '#F44335' },
    { key: 'soon',   label: `Bientôt — 30j (${soon.length})`,  activeColor: '#fb8c00' },
  ];

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--gf-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '4px 0 2px',
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="gf-page">
      {/* ── BLOC 1 — KPI cards ─────────────────────────────────────────────── */}
      <div className="gf-kpi-grid-3 gf-page-top">
        {kpiDefs.map((kpi) => (
          <div key={kpi.label} className="gf-kpi-card">
            <div className={`gf-kpi-icon ${kpi.iconClass}`}>
              <kpi.Icon size={22} color="var(--gf-white)" />
            </div>
            <p className="gf-kpi-label">{kpi.label}</p>
            <p className="gf-kpi-value">
              {loading ? '--' : kpi.value !== null ? String(kpi.value) : '--'}
            </p>
            {kpi.footer}
          </div>
        ))}
      </div>

      {/* ── BLOC 2 — Card liste ─────────────────────────────────────────────── */}
      <div className="gf-card-outer">
        <div className="gf-card">
          <div className="gf-card-header gf-card-header--warning">
            <div>
              <p className="gf-card-header__title">Expirations imminentes</p>
              <p className="gf-card-header__sub">Abonnements à renouveler — triés par urgence</p>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div
              className="gf-card-body"
              style={{
                padding: '60px 20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <div
                className="animate-spin"
                style={{
                  width: 36,
                  height: 36,
                  border: '3px solid var(--gf-bg)',
                  borderTopColor: '#fb8c00',
                  borderRadius: '50%',
                }}
              />
            </div>
          )}

          {/* Error / endpoint not found */}
          {!loading && error && (
            <div className="gf-card-body" style={{ padding: '28px 20px' }}>
              <div
                style={{
                  background: '#fff8f0',
                  borderLeft: '4px solid #fb8c00',
                  borderRadius: 8,
                  padding: '12px 16px',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fb8c00', margin: 0 }}>
                  Impossible de charger les expirations
                </p>
                <p style={{ fontSize: 11, color: 'var(--gf-muted)', margin: '4px 0 0' }}>
                  GET /api/subscriptions/expiring-soon?days=30
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              <div className="gf-card-body" style={{ padding: '28px 0 0' }}>
                <div className="gf-toolbar">
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {pillConfig.map(({ key, label, activeColor }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          border: filter === key ? 'none' : '1px solid var(--gf-border)',
                          background: filter === key ? activeColor : 'var(--gf-white)',
                          color: filter === key ? 'var(--gf-white)' : 'var(--gf-muted)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <span className="gf-count-label">
                    {filtered.length} abonnement{filtered.length !== 1 ? 's' : ''}
                  </span>
                </div>

              <div
                style={{
                  padding: '20px 20px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {filtered.length === 0 ? (
                  <p
                    style={{
                      textAlign: 'center',
                      color: 'var(--gf-muted)',
                      fontSize: 13,
                      margin: '16px 0',
                    }}
                  >
                    Aucun abonnement n&apos;expire dans les 30 prochains jours.
                  </p>
                ) : (
                  <>
                    {/* Urgent section */}
                    {showUrgentSection && (
                      <>
                        <p style={sectionLabelStyle}>
                          ⚠ Expirent dans moins de 7 jours
                        </p>
                        {pageUrgent.map((sub) => (
                          <AlertRow
                            key={sub.id}
                            sub={sub}
                            isUrgent
                            onDismiss={dismiss}
                            onRenew={handleRenew}
                          />
                        ))}
                      </>
                    )}

                    {/* Soon section */}
                    {showSoonSection && (
                      <>
                        <p
                          style={{
                            ...sectionLabelStyle,
                            marginTop: showUrgentSection ? 8 : 4,
                          }}
                        >
                          ◎ Expirent dans moins de 30 jours
                        </p>
                        {pageSoon.map((sub) => (
                          <AlertRow
                            key={sub.id}
                            sub={sub}
                            isUrgent={false}
                            onDismiss={dismiss}
                            onRenew={handleRenew}
                          />
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
              </div>

              {totalPages > 1 && (
                <div className="gf-pagination">
                  <span className="gf-pagination__info">
                    Affichage {pageStart + 1}–{pageEnd} sur {filtered.length}
                  </span>
                  <div className="gf-pagination__btns">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      const active = p === safePage;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`gf-page-btn${active ? ' gf-page-btn--active' : ''}`}
                          style={
                            active
                              ? { background: '#fb8c00', borderColor: '#fb8c00' }
                              : {}
                          }
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
