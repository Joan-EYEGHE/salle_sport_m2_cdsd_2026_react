/*
AUDIT CSS GYMFLOW - DashboardPage.tsx
Problème 1 : overflow visible redondant sur .gf-card (déjà en CSS)
Problème 2 : Couleurs #7b809a, #344767, #f0f2f5, #fff en inline
Total : 2 problèmes trouvés
*/
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, DollarSign, Ticket, TrendingUp } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/axios';
import type { Member, Transaction } from '../types';
import { normalizeMemberFromApi } from '../utils/memberApiNormalize';

/** Sequelize : include sous `member` (as) ou `Member` (sérialisation). */
function normalizeTransactionRow(raw: unknown): Transaction {
  const r = raw as Transaction & { Member?: Member };
  return {
    ...r,
    member: r.member ?? r.Member,
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

/** YYYY-MM-DD en calendrier local (évite le décalage UTC de toISOString().split('T')[0]). */
function getLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtTableDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function countTicketsVendusToday(rows: unknown, todayYmd: string): number {
  if (!Array.isArray(rows)) return 0;
  let n = 0;
  for (const raw of rows) {
    const t = raw as Record<string, unknown>;
    if (t.status !== 'VENDU') continue;
    const updated = (t.updatedAt ?? t.updated_at) as string | undefined;
    if (!updated) continue;
    if (getLocalYmd(new Date(updated)) === todayYmd) n += 1;
  }
  return n;
}

function getLast7Days(): { from: string; to: string; labels: string[] } {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 6);
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    labels.push(days[d.getDay()]);
  }
  return {
    from: getLocalYmd(from),
    to: getLocalYmd(today),
    labels,
  };
}

interface WeeklyEntry {
  day: string;
  revenue: number;
}

interface ExpiringSub {
  id: number;
  membre?: { nom: string; prenom: string };
  date_prochain_paiement: string;
  daysLeft: number;
}

function normalizeDashboardExpiring(raw: Record<string, unknown>): ExpiringSub {
  const m = (raw.membre ?? raw.member ?? raw.Member) as { nom: string; prenom: string } | undefined;
  const date_prochain_paiement = String(raw.date_prochain_paiement ?? '');
  return {
    id: Number(raw.id),
    membre: m,
    date_prochain_paiement,
    daysLeft: Math.max(
      0,
      Math.ceil(
        (new Date(date_prochain_paiement).getTime() - Date.now()) / 86400000
      )
    ),
  };
}

interface MemberRaw {
  subscriptions?: { date_prochain_paiement: string }[];
}

function getTxCategory(libelle: string): { label: string; badgeClass: string } {
  const l = libelle.toLowerCase();
  if (l.includes('ticket'))      return { label: 'Ticket',      badgeClass: 'pending' };
  if (l.includes('inscription')) return { label: 'Inscription', badgeClass: 'active' };
  return                                { label: 'Abonnement',  badgeClass: 'info' };
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // KPI state
  const [membresActifs, setMembresActifs] = useState<number | null>(null);
  const [revenusJour, setRevenusJour]     = useState<number | null>(null);
  const [ticketsJour, setTicketsJour]     = useState<number | null>(null);
  const [entreesJour, setEntreesJour]     = useState<number | null>(null);
  const [kpiLoading, setKpiLoading]       = useState(true);

  // Recent transactions (for bloc 3)
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);

  // Weekly chart
  const [weeklyData, setWeeklyData]     = useState<WeeklyEntry[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);

  // Expirations
  const [expirations, setExpirations]   = useState<ExpiringSub[]>([]);
  const [expirLoading, setExpirLoading] = useState(true);
  const [expirError, setExpirError]     = useState(false);

  // ── Fetch KPI + recent transactions ────────────────────────────────────────
  useEffect(() => {
    setKpiLoading(true);
    const today = getLocalYmd(new Date());
    Promise.allSettled([
      api.get('/members'),
      api.get(`/transactions/summary?date_debut=${today}&date_fin=${today}`),
      api.get('/tickets'),
      api.get(`/access-logs/stats?date_debut=${today}&date_fin=${today}&resultat=SUCCES`),
      api.get('/transactions?limit=5'),
    ]).then(([membRes, sumRes, tkRes, accRes, txRes]) => {
      if (membRes.status === 'fulfilled') {
        const d = membRes.value.data?.data ?? membRes.value.data;
        const arr: MemberRaw[] = Array.isArray(d) ? d.map((row) => normalizeMemberFromApi(row)) : [];
        setMembresActifs(
          arr.filter((m) => {
            const subs = m.subscriptions ?? [];
            if (!subs.length) return false;
            return new Date(subs[0].date_prochain_paiement) >= new Date();
          }).length
        );
      }
      if (sumRes.status === 'fulfilled') {
        const d = sumRes.value.data?.data ?? sumRes.value.data;
        setRevenusJour(d?.total_revenus ?? null);
      }
      if (tkRes.status === 'fulfilled') {
        const d = tkRes.value.data?.data ?? tkRes.value.data;
        const list = Array.isArray(d) ? d : [];
        setTicketsJour(countTicketsVendusToday(list, today));
      }
      if (accRes.status === 'fulfilled') {
        const d = accRes.value.data?.data ?? accRes.value.data;
        setEntreesJour(d?.total_scans ?? null);
      }
      if (txRes.status === 'fulfilled') {
        const d = txRes.value.data?.data ?? txRes.value.data;
        const slice = Array.isArray(d) ? d.slice(0, 5) : d?.items?.slice(0, 5) ?? [];
        setRecentTx(slice.map((row: unknown) => normalizeTransactionRow(row)));
      }
    }).finally(() => setKpiLoading(false));
  }, []);

  // ── Fetch weekly chart ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchWeekly = async () => {
      setWeeklyLoading(true);
      try {
        const { from, to, labels } = getLast7Days();
        const res = await api.get(`/transactions?date_debut=${from}&date_fin=${to}`);
        const rows: Transaction[] = (() => {
          const d = res.data?.data ?? res.data;
          return Array.isArray(d) ? d : [];
        })();

        const revenueByDay: Record<string, number> = {};
        labels.forEach((_label, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          revenueByDay[getLocalYmd(d)] = 0;
        });

        for (const tx of rows) {
          if (tx.type === 'REVENU') {
            const day = getLocalYmd(new Date(tx.date));
            if (day in revenueByDay) {
              revenueByDay[day] = (revenueByDay[day] ?? 0) + tx.montant;
            }
          }
        }

        setWeeklyData(
          labels.map((label, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return { day: label, revenue: revenueByDay[getLocalYmd(d)] ?? 0 };
          })
        );
      } catch {
        // leave weeklyData empty — chart will render flat
      } finally {
        setWeeklyLoading(false);
      }
    };
    fetchWeekly();
  }, []);

  // ── Fetch expirations ──────────────────────────────────────────────────────
  useEffect(() => {
    setExpirLoading(true);
    api
      .get('/subscriptions/expiring-soon?days=3')
      .then((res) => {
        const d = res.data?.data ?? res.data;
        const arr = (Array.isArray(d) ? d : []).map((s) =>
          normalizeDashboardExpiring(s as Record<string, unknown>)
        );
        setExpirations(arr.sort((a, b) => a.daysLeft - b.daysLeft));
      })
      .catch(() => setExpirError(true))
      .finally(() => setExpirLoading(false));
  }, []);

  // ── KPI definitions ────────────────────────────────────────────────────────
  const kpiDefs = [
    {
      label: 'Membres actifs',
      value: membresActifs !== null ? String(membresActifs) : null,
      Icon: Users,
      colorKey: 'info',
      footer: 'Abonnements en cours',
    },
    {
      label: 'Revenus du jour',
      value: revenusJour !== null ? fmt(revenusJour) : null,
      Icon: DollarSign,
      colorKey: 'success',
      footer: 'Revenus (transactions du jour)',
    },
    {
      label: 'Tickets vendus',
      value: ticketsJour !== null ? String(ticketsJour) : null,
      Icon: Ticket,
      colorKey: 'warning',
      footer: 'Passés en « Vendu » aujourd’hui',
    },
    {
      label: 'Entrées du jour',
      value: entreesJour !== null ? String(entreesJour) : null,
      Icon: TrendingUp,
      colorKey: 'primary',
      footer: 'Scans réussis (jour)',
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="gf-page">
      {/* ── BLOC 1 — KPI cards ─────────────────────────────────────────────── */}
      <div className="gf-kpi-grid-4 gf-page-top">
        {kpiDefs.map((kpi) => (
          <div key={kpi.label} className="gf-kpi-card">
            {/* Floating icon */}
            <div className={`gf-kpi-icon gf-kpi-icon--${kpi.colorKey}`}>
              <kpi.Icon size={22} color="#fff" />
            </div>

            {/* Right-aligned label + value */}
            <p className="gf-kpi-label">{kpi.label}</p>
            <p className="gf-kpi-value">{kpiLoading ? '--' : (kpi.value ?? '--')}</p>

            {/* Footer */}
            <p className="gf-kpi-footer">{kpi.footer}</p>
          </div>
        ))}
      </div>

      {/* ── BLOC 2 — Bottom grid: chart + expirations ──────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 16,
        }}
      >
        {/* Left — Revenue AreaChart */}
        <div className="gf-card-outer">
          <div className="gf-card">
            {/* Floating blue header */}
            <div className="gf-card-header gf-card-header--info">
              <div>
                <p className="gf-card-header__title">Revenus — 7 derniers jours</p>
                <p className="gf-card-header__sub">Connecté à /api/transactions</p>
              </div>
            </div>

            {/* Chart body */}
            <div className="gf-card-body">
              {weeklyLoading ? (
                <div
                  className="animate-pulse"
                  style={{ height: 200, background: '#f3f4f6', borderRadius: 8 }}
                />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1A73E8" stopOpacity={0.08} />
                        <stop offset="95%" stopColor="#1A73E8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={fmtCompact}
                      tick={{ fontSize: 12, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v) => [fmt(Number(v)), 'Revenu']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#1A73E8"
                      strokeWidth={2}
                      fill="url(#revenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right — Expirations imminentes */}
        <div className="gf-card-outer">
          <div className="gf-card">
            {/* Floating orange header */}
            <div className="gf-card-header gf-card-header--warning">
              <div>
                <p className="gf-card-header__title">Expirations imminentes</p>
                <p className="gf-card-header__sub">Abonnements à renouveler</p>
              </div>
            </div>

            {/* Expirations body */}
            <div style={{ padding: '28px 16px 16px' }}>
              {expirLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse"
                      style={{ height: 40, background: '#f3f4f6', borderRadius: 6 }}
                    />
                  ))}
                </div>
              ) : expirError ? (
                <div
                  style={{
                    background: '#fff8f0',
                    borderLeft: '3px solid #fb8c00',
                    borderRadius: 6,
                    padding: '10px 12px',
                    marginBottom: 12,
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      color: '#fb8c00',
                      fontWeight: 600,
                      margin: 0,
                    }}
                  >
                    Impossible de charger les expirations
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--gf-muted)', margin: '2px 0 0' }}>
                    GET /api/subscriptions/expiring-soon?days=30
                  </p>
                </div>
              ) : expirations.length === 0 ? (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--gf-muted)',
                    margin: '0 0 12px',
                    textAlign: 'center',
                  }}
                >
                  Aucune expiration dans les 30 prochains jours.
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {expirations.slice(0, 5).map((sub) => {
                    const isUrgent = sub.daysLeft <= 3;
                    const memberName = sub.membre
                      ? `${sub.membre.prenom} ${sub.membre.nom}`
                      : `Abonnement #${sub.id}`;
                    return (
                      <div
                        key={sub.id}
                        style={{
                          background: isUrgent ? '#fff5f5' : '#fff8f0',
                          borderLeft: `3px solid ${isUrgent ? '#F44335' : '#fb8c00'}`,
                          borderRadius: 6,
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--gf-dark)',
                              margin: 0,
                            }}
                          >
                            {memberName}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--gf-muted)', margin: '2px 0 0' }}>
                            {sub.date_prochain_paiement
                              ? `Expire le ${fmtTableDate(sub.date_prochain_paiement)}`
                              : '—'}
                          </p>
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 7px',
                            borderRadius: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            background: isUrgent ? '#fff5f5' : '#fff8f0',
                            color: isUrgent ? '#F44335' : '#fb8c00',
                            border: `1px solid ${isUrgent ? '#F44335' : '#fb8c00'}`,
                            flexShrink: 0,
                          }}
                        >
                          {isUrgent ? '7j' : '30j'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/subscriptions?filter=bientot')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(195deg, #FFA726, #fb8c00)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px',
                  color: 'var(--gf-white)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(251,140,0,0.3)',
                }}
              >
                Voir tous les renouvellements →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BLOC 3 — Recent transactions ───────────────────────────────────── */}
      <div className="gf-card-outer">
        <div className="gf-card">
          {/* Floating header */}
          <div className="gf-card-header gf-card-header--dark">
            <div>
              <p className="gf-card-header__title">Transactions récentes</p>
              <p className="gf-card-header__sub">Dernières ventes et activités</p>
            </div>
          </div>

          {/* Body */}
          <div className="gf-card-body">
            {recentTx.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--gf-muted)', fontSize: 13, margin: 0 }}>
                Aucune transaction récente.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="gf-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTx.map((tx) => {
                      const cat = getTxCategory(tx.libelle);
                      return (
                        <tr key={tx.id}>
                          <td style={{ color: 'var(--gf-muted)' }}>{fmtTableDate(tx.date)}</td>
                          <td>
                            <span className={`gf-badge gf-badge--${cat.badgeClass}`}>
                              {cat.label}
                            </span>
                          </td>
                          <td>{tx.libelle}</td>
                          <td
                            style={{
                              textAlign: 'right',
                              fontWeight: 700,
                              color: tx.type === 'REVENU' ? '#059669' : '#dc2626',
                            }}
                          >
                            {tx.type === 'DEPENSE' ? '−' : '+'}
                            {fmt(tx.montant)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer link */}
            <div
              style={{
                marginTop: 14,
                borderTop: '1px solid var(--gf-bg)',
                paddingTop: 12,
                textAlign: 'right',
              }}
            >
              <button
                type="button"
                onClick={() => navigate('/transactions')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#1A73E8',
                  cursor: 'pointer',
                }}
              >
                Voir toutes les transactions →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
