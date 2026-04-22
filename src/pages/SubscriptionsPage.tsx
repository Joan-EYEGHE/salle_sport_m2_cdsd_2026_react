/*
AUDIT CSS GYMFLOW - SubscriptionsPage.tsx
Problème 1 : PILL_INACTIVE, KPI, tableau et filtres en palette hex
Problème 2 : stroke recherche et avatars texte blanc en dur
Problème 3 : Conteneur page — gap 20px et doublons gf-page-top / KPI
Total : 3 problèmes trouvés
*/
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CircleCheck, Info, XCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Activity, Member, Subscription } from '../types';

function normalizeSubscriptionRow(raw: Subscription & Record<string, unknown>): Subscription {
  const member = (raw.member ?? raw.Member) as Member | undefined;
  const activity = (raw.activity ?? raw.Activity) as Activity | undefined;
  return { ...raw, member, activity };
}

const PAGE_SIZE = 10;

type RowStatus = 'ACTIF' | 'EXPIRE' | 'BIENTOT';
type StatusFilter = 'ALL' | RowStatus;

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysYmd(base: string, days: number): string {
  const [y, mo, da] = base.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  d.setDate(d.getDate() + days);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function rowStatus(endDate: string): RowStatus {
  const t = todayYmd();
  if (endDate < t) return 'EXPIRE';
  const limit = addDaysYmd(t, 3);
  if (endDate <= limit) return 'BIENTOT';
  return 'ACTIF';
}

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getMember(sub: Subscription): Member | null {
  return sub.member ?? null;
}

function getInitials(m: Member | null): string {
  if (m?.initials) return m.initials;
  if (m) return `${(m.prenom ?? '?').charAt(0)}${(m.nom ?? '?').charAt(0)}`.toUpperCase();
  return '??';
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#49a3f1,#1A73E8)',
  'linear-gradient(135deg,#66BB6A,#388E3C)',
  'linear-gradient(135deg,#FFA726,#F57C00)',
  'linear-gradient(135deg,#AB47BC,#7B1FA2)',
  'linear-gradient(135deg,#26C6DA,#0097A7)',
  'linear-gradient(135deg,#EF5350,#C62828)',
];

function avatarGradient(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

const FORFAIT_LABEL: Record<Subscription['type_forfait'], string> = {
  HEBDO: 'Hebdomadaire',
  MENSUEL: 'Mensuel',
  TRIMESTRIEL: 'Trimestriel',
  ANNUEL: 'Annuel',
};

function ForfaitBadge({ type }: { type: Subscription['type_forfait'] }) {
  const label = FORFAIT_LABEL[type];
  if (type === 'MENSUEL' || type === 'HEBDO') {
    return <span className="gf-badge gf-badge--info">{label}</span>;
  }
  if (type === 'TRIMESTRIEL') {
    return <span className="gf-badge gf-badge--purple">{label}</span>;
  }
  return (
    <span className="gf-badge gf-badge--active" style={{ color: '#2e7d32' }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: RowStatus }) {
  if (status === 'EXPIRE') return <span className="gf-badge gf-badge--inactive">Expiré</span>;
  if (status === 'BIENTOT') return <span className="gf-badge gf-badge--pending">Bientôt</span>;
  return <span className="gf-badge gf-badge--active">Actif</span>;
}

const PILL_BASE: React.CSSProperties = {
  borderRadius: 20,
  padding: '6px 12px',
  fontSize: 12,
  fontWeight: 700,
  border: '1px solid transparent',
  cursor: 'pointer',
  lineHeight: 1.2,
};

const PILL_INACTIVE: React.CSSProperties = {
  ...PILL_BASE,
  background: 'var(--gf-white)',
  borderColor: 'var(--gf-border)',
  color: 'var(--gf-muted)',
};

function filterPillStyle(active: boolean, color: string): React.CSSProperties {
  if (!active) return PILL_INACTIVE;
  return {
    ...PILL_BASE,
    background: color,
    color: 'var(--gf-white)',
    borderColor: color,
  };
}

interface KpiMiniProps {
  label: string;
  value: number;
  gradient: string;
  icon: React.ReactNode;
}

function KpiMini({ label, value, gradient, icon }: KpiMiniProps) {
  return (
    <div
      className="gf-kpi-card"
      style={{
        padding: '12px 14px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        background: '#f8f9fa',
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--gf-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {label}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gf-dark)' }}>{value}</div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[160, 120, 90, 80, 80, 80, 100].map((w, i) => (
        <td key={i} style={{ padding: '14px 14px' }}>
          <div className="gf-skeleton" style={{ width: w, height: 14, borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  );
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? 'CONTROLLER';

  const canRenew = role === 'ADMIN' || role === 'CASHIER';
  const canDelete = role === 'ADMIN';

  const [rows, setRows] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const fetchSubs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/subscriptions');
      const data = res.data?.data ?? res.data;
      const arr = Array.isArray(data) ? data : [];
      setRows(arr.map((item) => normalizeSubscriptionRow(item as Subscription & Record<string, unknown>)));
    } catch {
      setError('Impossible de charger les abonnements.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubs();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const kpi = useMemo(() => {
    let total = 0;
    let actifs = 0;
    let expires = 0;
    let bientot = 0;
    for (const s of rows) {
      const end = s.date_prochain_paiement;
      if (!end) continue;
      total += 1;
      const st = rowStatus(end);
      if (st === 'EXPIRE') expires += 1;
      else if (st === 'BIENTOT') bientot += 1;
      else actifs += 1;
    }
    return { total, actifs, expires, bientot };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((s) => {
      const end = s.date_prochain_paiement;
      if (!end) return false;
      const st = rowStatus(end);
      if (statusFilter !== 'ALL' && st !== statusFilter) return false;
      if (!q) return true;
      const m = getMember(s);
      if (!m) return false;
      const hay = `${m.prenom} ${m.nom} ${m.email ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const handleDelete = async (sub: Subscription) => {
    const m = getMember(sub);
    const name = m ? `${m.prenom} ${m.nom}` : `abonnement #${sub.id}`;
    if (!window.confirm(`Supprimer l'abonnement de ${name} ? Cette action est irréversible.`)) return;
    const deletedId = Number(sub.id);
    try {
      await api.delete(`/subscriptions/${deletedId}`);
      setRows((prev) => prev.filter((x) => Number(x.id) !== deletedId));
    } catch {
      alert('Impossible de supprimer cet abonnement.');
    }
  };

  return (
    <div className="gf-page">
      {/* KPI */}
      <div className="gf-kpi-grid-4 gf-page-top">
        <KpiMini
          label="Total"
          value={kpi.total}
          gradient="linear-gradient(195deg, #49a3f1, #1A73E8)"
          icon={<Info size={18} color="var(--gf-white)" />}
        />
        <KpiMini
          label="Actifs"
          value={kpi.actifs}
          gradient="linear-gradient(195deg, #66BB6A, #43A047)"
          icon={<CircleCheck size={18} color="var(--gf-white)" />}
        />
        <KpiMini
          label="Expirés"
          value={kpi.expires}
          gradient="linear-gradient(195deg, #ef5350, #F44335)"
          icon={<XCircle size={18} color="var(--gf-white)" />}
        />
        <KpiMini
          label="Expirent bientôt"
          value={kpi.bientot}
          gradient="linear-gradient(195deg, #FFA726, #fb8c00)"
          icon={<AlertTriangle size={18} color="var(--gf-white)" />}
        />
      </div>

      <div className="gf-card-outer">
        <div className="gf-card">
          <div className="gf-card-header gf-card-header--info">
            <div>
              <p className="gf-card-header__title">Abonnements</p>
              <p className="gf-card-header__sub">Gestion de tous les abonnements membres</p>
            </div>
          </div>

          <div className="gf-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="gf-search-wrap">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gf-muted)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="gf-search-icon"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un membre..."
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  style={filterPillStyle(statusFilter === 'ALL', 'var(--gf-dark)')}
                  onClick={() => setStatusFilter('ALL')}
                >
                  Tous
                </button>
                <button
                  type="button"
                  style={filterPillStyle(statusFilter === 'ACTIF', '#43A047')}
                  onClick={() => setStatusFilter('ACTIF')}
                >
                  Actifs
                </button>
                <button
                  type="button"
                  style={filterPillStyle(statusFilter === 'EXPIRE', '#F44335')}
                  onClick={() => setStatusFilter('EXPIRE')}
                >
                  Expirés
                </button>
                <button
                  type="button"
                  style={filterPillStyle(statusFilter === 'BIENTOT', '#fb8c00')}
                  onClick={() => setStatusFilter('BIENTOT')}
                >
                  Bientôt
                </button>
              </div>
            </div>
            <span className="gf-count-label">
              {filtered.length} abonnement{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {error && (
            <div
              style={{
                margin: '12px 20px 0',
                background: '#fde8e8',
                color: '#F44335',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div className="gf-card-body--table">
            <table className="gf-table" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Activité</th>
                  <th>Forfait</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: 'center',
                        padding: '48px 0',
                        color: 'var(--gf-muted)',
                        fontSize: 13,
                      }}
                    >
                      Aucun abonnement trouvé.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((sub) => {
                    const m = getMember(sub);
                    const end = sub.date_prochain_paiement;
                    const st = rowStatus(end);
                    const memberId = m?.id ?? sub.id_membre;
                    const memberPathSeg = m?.slug ?? String(memberId);
                    const initials = getInitials(m);
                    const gradId = m?.id ?? sub.id_membre;

                    return (
                      <tr key={sub.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: avatarGradient(gradId),
                                color: 'var(--gf-white)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {initials}
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gf-dark)' }}>
                                {m ? `${m.prenom} ${m.nom}` : `Membre #${sub.id_membre}`}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--gf-muted)' }}>{m?.email ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td>{sub.activity?.nom ?? '—'}</td>
                        <td>
                          <ForfaitBadge type={sub.type_forfait} />
                        </td>
                        <td>{fmtDate(sub.date_debut)}</td>
                        <td>{fmtDate(end)}</td>
                        <td>
                          <StatusBadge status={st} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button
                              type="button"
                              className="gf-btn-action gf-btn-action--view"
                              title="Voir le membre"
                              onClick={() => navigate(`/members/${memberPathSeg}`)}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </button>
                            {canRenew && (
                              <button
                                type="button"
                                title="Renouveler"
                                onClick={() =>
                                  navigate(
                                    `/subscriptions/form?mode=renewal&subscriptionId=${sub.id}&member=${encodeURIComponent(
                                      m?.slug ?? String(memberId),
                                    )}`
                                  )
                                }
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  border: 'none',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#fef3e2',
                                  color: '#fb8c00',
                                  transition: 'background 0.15s, color 0.15s',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = '#fb8c00';
                                  e.currentTarget.style.color = 'var(--gf-white)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = '#fef3e2';
                                  e.currentTarget.style.color = '#fb8c00';
                                }}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                  <path d="M21 3v5h-5" />
                                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                  <path d="M3 21v-5h5" />
                                </svg>
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="gf-btn-action gf-btn-action--delete"
                                title="Supprimer"
                                onClick={() => handleDelete(sub)}
                              >
                                <svg
                                  width="13"
                                  height="13"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="gf-pagination">
              <span className="gf-pagination__info">
                Affichage {pageStart + 1}–{pageEnd} sur {filtered.length}
              </span>
              <div className="gf-pagination__btns">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  const active = p === safePage;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`gf-page-btn${active ? ' gf-page-btn--active' : ''}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
