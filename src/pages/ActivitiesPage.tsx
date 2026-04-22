/* Cartes activités : styles alignés sur gymflow.css (tokens --gf-*) */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Activity } from '../types';

// ─── types ───────────────────────────────────────────────────────────────────

type ExtActivity = Activity & {
  description?: string;
  capacite?: number;
  nb_membres?: number;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function activityPath(a: Activity): string {
  return a.slug ?? String(a.id);
}

/** Même logique qu’avant (tableau) ; `fmtTarifCard` sert à l’affichage des 6 tarifs en carte. */
function fmtFcfa(n: number | undefined | null): string {
  if (!n || n === 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

/** Affichage tarifs carte : 0 → « 0 FCFA » ; sinon même format que fmtFcfa. */
function fmtTarifCard(n: number | undefined | null): string {
  const v = n == null || Number.isNaN(Number(n)) ? 0 : Number(n);
  if (v === 0) return '0 FCFA';
  return fmtFcfa(v);
}

const ICON_GRADIENTS = [
  'linear-gradient(135deg,#49a3f1,#1A73E8)',
  'linear-gradient(135deg,#66BB6A,#388E3C)',
  'linear-gradient(135deg,#FFA726,#F57C00)',
  'linear-gradient(135deg,#AB47BC,#7B1FA2)',
  'linear-gradient(135deg,#26C6DA,#0097A7)',
  'linear-gradient(135deg,#EF5350,#C62828)',
];

function iconGradient(id: number) {
  return ICON_GRADIENTS[id % ICON_GRADIENTS.length];
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`gf-badge ${active ? 'gf-badge--active' : 'gf-badge--inactive'}`}>
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

// ─── skeleton carte ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        border: '1px solid var(--gf-border)',
        borderRadius: 'var(--gf-radius-card)',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--gf-white)',
        boxShadow: 'var(--gf-shadow-card)',
      }}
    >
      <div className="gf-skeleton" style={{ height: 14, width: '60%' }} />
      <div className="gf-skeleton" style={{ height: 10, width: '40%' }} />
      <div style={{ borderTop: '1px solid var(--gf-border)', margin: '0' }} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="gf-skeleton" style={{ height: 10, width: '100%' }} />
        ))}
      </div>
      <div className="gf-skeleton" style={{ height: 28, width: '100%', marginTop: 'auto' }} />
    </div>
  );
}

// ─── activity card ─────────────────────────────────────────────────────────────

interface ActivityCardProps {
  activity: ExtActivity;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSubscribe: () => void;
}

function ActivityCard({ activity: a, isAdmin, onEdit, onDelete, onSubscribe }: ActivityCardProps) {
  const sep = { borderTop: '1px solid var(--gf-border)', margin: '10px 0' } as const;

  const rows: { label: string; value: number }[] = [
    { label: 'Inscription :', value: a.frais_inscription },
    { label: 'Prix Ticket :', value: a.prix_ticket },
    { label: 'Hebdomadaire :', value: a.prix_hebdomadaire },
    { label: 'Mensuelle :', value: a.prix_mensuel },
    { label: 'Trimestrielle :', value: a.prix_trimestriel },
    { label: 'Annuelle :', value: a.prix_annuel },
  ];

  return (
    <div
      style={{
        background: 'var(--gf-white)',
        borderRadius: 'var(--gf-radius-card)',
        boxShadow: 'var(--gf-shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--gf-border)',
      }}
    >
      <div
        style={{ height: 3, width: '100%', background: iconGradient(a.id) }}
        aria-hidden
      />
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: 'var(--gf-dark)',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}
          >
            {a.nom.toUpperCase()}
          </div>
          <div style={{ flexShrink: 0 }}>
            <StatusBadge active={a.status} />
          </div>
        </div>

        <div style={sep} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(({ label, value }) => (
            <div
              key={label}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--gf-muted)',
                }}
              >
                {label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gf-dark)' }}>
                {fmtTarifCard(value)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--gf-border)',
          display: 'flex',
          gap: 6,
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={onSubscribe}
          style={{
            flex: 1,
            background: 'var(--gf-grad-info)',
            color: 'var(--gf-white)',
            boxShadow: 'var(--gf-shadow-kpi-info)',
            border: 'none',
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 700,
            padding: '8px 10px',
            cursor: 'pointer',
          }}
        >
          Nouvel abonnement
        </button>
        {isAdmin && (
          <>
            <button type="button" title="Modifier" className="gf-btn-action gf-btn-action--edit" onClick={onEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button type="button" title="Supprimer" className="gf-btn-action gf-btn-action--delete" onClick={onDelete}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? 'CONTROLLER';
  const isAdmin = role === 'ADMIN';

  const [activities, setActivities] = useState<ExtActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/activities');
      const data = res.data?.data ?? res.data;
      const rows = Array.isArray(data) ? data : [];
      setActivities(
        rows.map((row) => {
          const r = row as ExtActivity;
          const t = r.slug;
          return {
            ...r,
            slug: typeof t === 'string' && t.trim() !== '' ? t.trim() : undefined,
          };
        }),
      );
    } catch {
      setError('Impossible de charger les activités.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivities(); }, []);

  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    if (user?.role !== 'ADMIN') return;
    navigate('/activities/new');
  };

  const openEdit = (a: Activity) => {
    navigate(`/activities/${activityPath(a)}/edit`);
  };

  const handleDelete = async (a: ExtActivity) => {
    if (!window.confirm(`Supprimer l'activité "${a.nom}" ? Cette action est irréversible.`)) return;
    const deletedId = Number(a.id);
    try {
      await api.delete(`/activities/${encodeURIComponent(activityPath(a))}`);
      setActivities((prev) => prev.filter((x) => Number(x.id) !== deletedId));
    } catch {
      alert('Impossible de supprimer cette activité.');
    }
  };

  const filtered = activities.filter((a) =>
    a.nom.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  return (
    <div className="gf-page">
        {/* ── card wrapper ── */}
        <div className="gf-card-outer">
          <div className="gf-card">
            {/* ── floating header ── */}
            <div className="gf-card-header gf-card-header--info">
              <div>
                <p className="gf-card-header__title">Activités</p>
                <p className="gf-card-header__sub">Gestion des activités proposées</p>
              </div>
              {user?.role === 'ADMIN' && (
                <button type="button" className="gf-btn-header" onClick={openCreate}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                  Créer une activité
                </button>
              )}
            </div>

            {/* ── toolbar ── */}
            <div className="gf-toolbar">
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
                  placeholder="Rechercher une activité…"
                />
              </div>
              <span className="gf-count-label">
                {filtered.length} activité{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* ── error ── */}
            {error && (
              <div
                style={{
                  margin: '12px 20px 0',
                  background: 'var(--gf-alert-error-bg)',
                  color: 'var(--gf-alert-error-text)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
                padding: '16px 20px 20px',
              }}
            >
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : pageRows.length === 0
                  ? (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '48px 0',
                        color: 'var(--gf-muted)',
                        fontSize: 13,
                      }}
                    >
                      Aucune activité trouvée.
                    </div>
                    )
                  : pageRows.map((a) => (
                      <ActivityCard
                        key={a.id}
                        activity={a}
                        isAdmin={isAdmin}
                        onEdit={() => openEdit(a)}
                        onDelete={() => handleDelete(a)}
                        onSubscribe={() => navigate(`/members/new?activityId=${a.id}`)}
                      />
                    ))}
            </div>

            {!loading && filtered.length > 0 && (
              <div className="gf-pagination">
                <span className="gf-pagination__info">
                  Affichage {pageStart + 1}–{pageEnd} sur {filtered.length}
                </span>
                <div className="gf-pagination__btns">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p)}
                        className={`gf-page-btn${p === safePage ? ' gf-page-btn--active' : ''}`}
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
