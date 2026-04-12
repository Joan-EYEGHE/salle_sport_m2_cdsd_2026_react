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
  membre_id?: number;
  membre?: Membre;
  activite?: Activite;
  type_abonnement?: string;
  date_prochain_paiement: string;
  daysLeft: number;
}

type Filter = 'all' | 'urgent' | 'soon';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>
          {getInitiales(sub.membre)}
        </span>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#344767',
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
            color: '#7b809a',
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
            color: '#fff',
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
        const arr: ExpiringSub[] = (Array.isArray(raw) ? raw : []).map(
          (s: Record<string, unknown>) => ({
            ...s,
            daysLeft: Math.max(
              0,
              Math.ceil(
                (new Date(s.date_prochain_paiement as string).getTime() - Date.now()) / 86400000
              )
            ),
          })
        ) as ExpiringSub[];
        setSubs(arr.sort((a, b) => a.daysLeft - b.daysLeft));
      } else {
        setError(true);
      }

      if (renewedRes.status === 'fulfilled') {
        const d = renewedRes.value.data?.data ?? renewedRes.value.data;
        const count = d?.count ?? d?.total ?? (Array.isArray(d) ? d.length : null);
        setKpiRenewed(typeof count === 'number' ? count : null);
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
    const memberId = sub.membre_id ?? sub.membre?.id ?? '';
    navigate(
      `/subscriptions/form?memberId=${memberId}&subscriptionId=${sub.id}&mode=renewal`
    );
  };

  // ── KPI definitions ───────────────────────────────────────────────────────────
  const kpiDefs = [
    {
      label: 'Expirent dans 7j',
      value: loading ? null : urgent.length,
      Icon: AlertTriangle,
      gradient: 'linear-gradient(195deg, #ef5350, #F44335)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(244,67,53,0.3)',
      footer: (
        <p style={{ fontSize: 11, color: '#7b809a', margin: 0 }}>
          <span style={{ color: '#fb8c00', fontWeight: 700 }}>Urgent</span>
          {' — action requise'}
        </p>
      ),
    },
    {
      label: 'Expirent dans 30j',
      value: loading ? null : allSubs.length,
      Icon: Clock,
      gradient: 'linear-gradient(195deg, #FFA726, #fb8c00)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(251,140,0,0.3)',
      footer: (
        <p style={{ fontSize: 11, color: '#7b809a', margin: 0 }}>
          {'À contacter '}
          <span style={{ color: '#fb8c00', fontWeight: 700 }}>bientôt</span>
        </p>
      ),
    },
    {
      label: 'Renouvelés ce mois',
      value: loading ? null : kpiRenewed,
      Icon: RefreshCw,
      gradient: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.3)',
      footer: (
        <p style={{ fontSize: 11, color: '#7b809a', margin: 0 }}>Ce mois-ci</p>
      ),
    },
  ];

  // ── Filter pill config ────────────────────────────────────────────────────────
  const pillConfig: { key: Filter; label: string; activeColor: string }[] = [
    { key: 'all',    label: `Tous (${allSubs.length})`,        activeColor: '#344767' },
    { key: 'urgent', label: `Urgent — 7j (${urgent.length})`,  activeColor: '#F44335' },
    { key: 'soon',   label: `Bientôt — 30j (${soon.length})`,  activeColor: '#fb8c00' },
  ];

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#7b809a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '4px 0 2px',
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: '20px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        background: '#f0f2f5',
      }}
    >
      {/* ── BLOC 1 — KPI cards ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 16,
          marginTop: 14,
        }}
      >
        {kpiDefs.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              padding: '14px 16px 12px',
              position: 'relative',
            }}
          >
            {/* Floating icon */}
            <div
              style={{
                position: 'absolute',
                top: -14,
                left: 16,
                width: 48,
                height: 48,
                borderRadius: 10,
                background: kpi.gradient,
                boxShadow: kpi.shadow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <kpi.Icon size={22} color="#fff" />
            </div>

            {/* Right-aligned label + value */}
            <div style={{ textAlign: 'right', paddingTop: 6 }}>
              <p
                style={{
                  fontSize: 11,
                  color: '#7b809a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: 0,
                }}
              >
                {kpi.label}
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#344767', margin: '4px 0 0' }}>
                {loading ? '--' : kpi.value !== null ? String(kpi.value) : '--'}
              </p>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 6, marginTop: 10 }}>
              {kpi.footer}
            </div>
          </div>
        ))}
      </div>

      {/* ── BLOC 2 — Card liste ─────────────────────────────────────────────── */}
      <div style={{ paddingTop: 20 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            overflow: 'visible',
          }}
        >
          {/* Floating header */}
          <div
            style={{
              margin: '-20px 16px 0',
              background: 'linear-gradient(195deg, #FFA726, #fb8c00)',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow:
                '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(251,140,0,0.4)',
            }}
          >
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
              Expirations imminentes
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '3px 0 0' }}>
              Abonnements à renouveler — triés par urgence
            </p>
          </div>

          {/* Loading state */}
          {loading && (
            <div
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
                  border: '3px solid #f0f2f5',
                  borderTopColor: '#fb8c00',
                  borderRadius: '50%',
                }}
              />
            </div>
          )}

          {/* Error / endpoint not found */}
          {!loading && error && (
            <div style={{ padding: '28px 20px' }}>
              <div
                style={{
                  background: '#fff8f0',
                  borderLeft: '4px solid #fb8c00',
                  borderRadius: 8,
                  padding: '12px 16px',
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fb8c00', margin: 0 }}>
                  Endpoint à connecter
                </p>
                <p style={{ fontSize: 11, color: '#7b809a', margin: '4px 0 0' }}>
                  GET /api/subscriptions/expiring-soon — vérifiez que l&apos;endpoint est disponible.
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          {!loading && !error && (
            <>
              {/* Toolbar */}
              <div
                style={{
                  padding: '28px 20px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                {/* Filter pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
                        border: filter === key ? 'none' : '1px solid #d2d6da',
                        background: filter === key ? activeColor : '#fff',
                        color: filter === key ? '#fff' : '#7b809a',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* Counter */}
                <span style={{ fontSize: 12, color: '#7b809a', whiteSpace: 'nowrap' }}>
                  {filtered.length} abonnement{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Alert list */}
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
                      color: '#7b809a',
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    padding: '12px 20px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f0f2f5',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#7b809a' }}>
                    Affichage {pageStart + 1}–{pageEnd} sur {filtered.length}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: 'none',
                          background: p === safePage ? '#fb8c00' : '#f0f2f5',
                          color: p === safePage ? '#fff' : '#344767',
                          fontWeight: p === safePage ? 700 : 400,
                          fontSize: 12,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {p}
                      </button>
                    ))}
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
