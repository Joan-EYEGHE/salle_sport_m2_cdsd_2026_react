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
import type { Transaction } from '../types';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function fmtCompact(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
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
    from: from.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
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

interface MemberRaw {
  subscriptions?: { date_prochain_paiement: string }[];
}

function getTxCategory(libelle: string): { label: string; bg: string; color: string } {
  const l = libelle.toLowerCase();
  if (l.includes('ticket'))      return { label: 'Ticket',      bg: '#fef3e2', color: '#fb8c00' };
  if (l.includes('inscription')) return { label: 'Inscription', bg: '#eaf7ea', color: '#43A047' };
  return                                { label: 'Abonnement',  bg: '#e8f4fd', color: '#1A73E8' };
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
    Promise.allSettled([
      api.get('/members'),
      api.get('/transactions/summary'),
      api.get('/tickets'),
      api.get('/access-logs/stats'),
      api.get('/transactions?limit=5'),
    ]).then(([membRes, sumRes, tkRes, accRes, txRes]) => {
      if (membRes.status === 'fulfilled') {
        const d = membRes.value.data?.data ?? membRes.value.data;
        const arr: MemberRaw[] = Array.isArray(d) ? d : [];
        setMembresActifs(
          arr.filter((m) => {
            const subs = m.subscriptions ?? [];
            if (!subs.length) return false;
            return new Date(subs[subs.length - 1].date_prochain_paiement) >= new Date();
          }).length
        );
      }
      if (sumRes.status === 'fulfilled') {
        const d = sumRes.value.data?.data ?? sumRes.value.data;
        setRevenusJour(d?.total_revenus ?? null);
      }
      if (tkRes.status === 'fulfilled') {
        const d = tkRes.value.data?.data ?? tkRes.value.data;
        setTicketsJour(Array.isArray(d) ? d.length : d?.total ?? null);
      }
      if (accRes.status === 'fulfilled') {
        const d = accRes.value.data?.data ?? accRes.value.data;
        setEntreesJour(d?.total_scans ?? null);
      }
      if (txRes.status === 'fulfilled') {
        const d = txRes.value.data?.data ?? txRes.value.data;
        setRecentTx(Array.isArray(d) ? d.slice(0, 5) : d?.items?.slice(0, 5) ?? []);
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
          revenueByDay[d.toISOString().split('T')[0]] = 0;
        });

        for (const tx of rows) {
          if (tx.type === 'REVENU') {
            const day = new Date(tx.date).toISOString().split('T')[0];
            if (day in revenueByDay) {
              revenueByDay[day] = (revenueByDay[day] ?? 0) + tx.montant;
            }
          }
        }

        setWeeklyData(
          labels.map((label, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return { day: label, revenue: revenueByDay[d.toISOString().split('T')[0]] ?? 0 };
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
      .get('/subscriptions/expiring-soon?days=30')
      .then((res) => {
        const d = res.data?.data ?? res.data;
        const arr = (Array.isArray(d) ? d : []).map(
          (s: { date_prochain_paiement: string } & Record<string, unknown>) => ({
            ...s,
            daysLeft: Math.ceil(
              (new Date(s.date_prochain_paiement).getTime() - Date.now()) / 86400000
            ),
          })
        ) as ExpiringSub[];
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
      gradient: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.3)',
      footer: 'Abonnements en cours',
    },
    {
      label: 'Revenus du jour',
      value: revenusJour !== null ? fmt(revenusJour) : null,
      Icon: DollarSign,
      gradient: 'linear-gradient(195deg, #66BB6A, #43A047)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(76,175,80,0.3)',
      footer: 'Total cumulé',
    },
    {
      label: 'Tickets vendus',
      value: ticketsJour !== null ? String(ticketsJour) : null,
      Icon: Ticket,
      gradient: 'linear-gradient(195deg, #FFA726, #fb8c00)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(251,140,0,0.3)',
      footer: 'Tickets en circulation',
    },
    {
      label: 'Entrées du jour',
      value: entreesJour !== null ? String(entreesJour) : null,
      Icon: TrendingUp,
      gradient: 'linear-gradient(195deg, #EC407A, #D81B60)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(233,30,99,0.3)',
      footer: 'Scans validés',
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        padding: '20px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
        background: '#f0f2f5',
      }}
    >
      {/* ── BLOC 1 — KPI cards ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
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
                {kpiLoading ? '--' : (kpi.value ?? '--')}
              </p>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 6, marginTop: 10 }}>
              <p style={{ fontSize: 11, color: '#7b809a', margin: 0 }}>{kpi.footer}</p>
            </div>
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
        <div style={{ paddingTop: 20 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              overflow: 'visible',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            {/* Floating blue header */}
            <div
              style={{
                margin: '-20px 16px 0',
                background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                borderRadius: 10,
                padding: '16px 20px',
                boxShadow:
                  '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.4)',
              }}
            >
              <p
                style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Revenus — 7 derniers jours
              </p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '3px 0 0' }}>
                Connecté à /api/transactions
              </p>
            </div>

            {/* Chart body */}
            <div style={{ padding: '28px 20px 16px' }}>
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
        <div style={{ paddingTop: 20 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              overflow: 'visible',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}
          >
            {/* Floating orange header */}
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
              <p
                style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Expirations imminentes
              </p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '3px 0 0' }}>
                Abonnements à renouveler
              </p>
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
              ) : expirError || expirations.length === 0 ? (
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
                    Endpoint à connecter
                  </p>
                  <p style={{ fontSize: 11, color: '#7b809a', margin: '2px 0 0' }}>
                    GET /api/subscriptions/expiring-soon
                  </p>
                </div>
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
                    const isUrgent = sub.daysLeft <= 7;
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
                              color: '#344767',
                              margin: 0,
                            }}
                          >
                            {memberName}
                          </p>
                          <p style={{ fontSize: 11, color: '#7b809a', margin: '2px 0 0' }}>
                            Expire dans {sub.daysLeft}j
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
                style={{
                  width: '100%',
                  background: 'linear-gradient(195deg, #FFA726, #fb8c00)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px',
                  color: '#fff',
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

      {/* ── BLOC 3 — Recent transactions (preserved exactly) ───────────────── */}
      <div style={{ paddingTop: 20 }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            overflow: 'visible',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          {/* Floating header */}
          <div
            style={{
              margin: '-20px 16px 0',
              background: 'linear-gradient(195deg, #42424a, #191919)',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(0,0,0,0.3)',
            }}
          >
            <p
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Transactions récentes
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, margin: '3px 0 0' }}>
              Dernières ventes et activités
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 20px 16px' }}>
            {recentTx.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#7b809a', fontSize: 13, margin: 0 }}>
                Aucune transaction récente.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr
                      style={{
                        background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                        borderRadius: 8,
                      }}
                    >
                      {(['Date', 'Membre', 'Type', 'Activité', 'Montant'] as const).map(
                        (col, idx, arr) => (
                          <th
                            key={col}
                            style={{
                              textAlign: col === 'Montant' ? 'right' : 'left',
                              padding: '10px 14px',
                              fontSize: 11,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: '#fff',
                              borderRadius:
                                idx === 0
                                  ? '8px 0 0 8px'
                                  : idx === arr.length - 1
                                  ? '0 8px 8px 0'
                                  : undefined,
                            }}
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {recentTx.map((tx) => {
                      const memberName = tx.member
                        ? `${tx.member.prenom} ${tx.member.nom}`
                        : '—';
                      const cat = getTxCategory(tx.libelle);
                      return (
                        <tr
                          key={tx.id}
                          style={{ borderBottom: '1px solid #f0f2f5', cursor: 'default' }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = '#fafafa')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = 'transparent')
                          }
                        >
                          <td
                            style={{ padding: '12px 14px', fontSize: 13, color: '#7b809a' }}
                          >
                            {new Date(tx.date).toLocaleDateString('fr-FR')}
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              fontSize: 13,
                              color: '#344767',
                              fontWeight: 500,
                            }}
                          >
                            {memberName}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: 10,
                                fontSize: 10,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: cat.bg,
                                color: cat.color,
                              }}
                            >
                              {cat.label}
                            </span>
                          </td>
                          <td
                            style={{ padding: '12px 14px', fontSize: 13, color: '#344767' }}
                          >
                            {tx.libelle}
                          </td>
                          <td
                            style={{
                              padding: '12px 14px',
                              textAlign: 'right',
                              fontSize: 13,
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
                borderTop: '1px solid #f0f2f5',
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
