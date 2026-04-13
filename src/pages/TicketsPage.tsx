/*
AUDIT CSS GYMFLOW - TicketsPage.tsx
Problème 1 : @keyframes shimmer dupliqués (inline + balise style) — L48-66, L287-291
Problème 2 : Couleurs hex en inline (#f0f2f5, #344767, #7b809a, #d2d6da, white, #fff) — multiples lignes
Problème 3 : Focus modale génération — onBlur utilisait #d2d6da au lieu de var(--gf-border)
Total : 3 problèmes trouvés
*/
import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import type { Activity, Batch, Member, Ticket as TicketType } from '../types';

/** Sérialisation Sequelize : clés camelCase ou PascalCase pour les includes. */
function normalizeTicketRow(raw: unknown): TicketType {
  const r = raw as TicketType & {
    Member?: Member;
    Batch?: Batch;
    Activity?: Activity;
  };
  const batchSrc = r.batch ?? r.Batch;
  let batch: Batch | undefined;
  if (batchSrc != null && typeof batchSrc === 'object') {
    const b = batchSrc as Batch & { Activity?: Activity };
    batch = { ...b, activity: b.activity ?? b.Activity };
  }
  return {
    ...r,
    member: r.member ?? r.Member,
    activity: r.activity ?? r.Activity,
    batch,
  };
}

// ─── constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type TicketStatus = TicketType['status'] | 'ALL';

const STATUS_LABELS: Record<string, string> = {
  ALL: 'Tout',
  DISPONIBLE: 'Disponible',
  VENDU: 'Vendu',
  UTILISE: 'Utilisé',
  EXPIRE: 'Expiré',
};

const STATUSES: TicketStatus[] = ['ALL', 'DISPONIBLE', 'VENDU', 'UTILISE', 'EXPIRE'];

const STATUS_BADGE_CLASS: Record<string, string> = {
  DISPONIBLE: 'gf-badge gf-badge--active',
  VENDU: 'gf-badge gf-badge--info',
  UTILISE: 'gf-badge gf-badge--purple',
  EXPIRE: 'gf-badge gf-badge--inactive',
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(val: string | undefined | null): string {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status] ?? 'gf-badge';
  return <span className={cls}>{STATUS_LABELS[status] ?? status}</span>;
}

function SkeletonRow() {
  return (
    <tr>
      {[100, 140, 120, 100, 100, 80, 72].map((w, i) => (
        <td key={i} style={{ padding: '14px 14px' }}>
          <div className="gf-skeleton" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

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

// ─── View detail modal ────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: '1px solid var(--gf-bg)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--gf-muted)', fontWeight: 500 }}>{label}</span>
      <span style={{ color: 'var(--gf-dark)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function TicketsPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'CONTROLLER';
  const canWrite = role === 'ADMIN' || role === 'CASHIER';

  // data
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus>('ALL');
  const [page, setPage] = useState(1);

  // modals
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewTicket, setViewTicket] = useState<TicketType | null>(null);

  // generate form
  const [batchActivityId, setBatchActivityId] = useState<number | ''>('');
  const [batchQty, setBatchQty] = useState(10);
  const [batchPrice, setBatchPrice] = useState('');
  const [customPrice, setCustomPrice] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [batchMsg, setBatchMsg] = useState('');

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchTickets = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tickets');
      const data = res.data?.data ?? res.data;
      const rawList: unknown[] = Array.isArray(data) ? data : ((data as { items?: unknown[] })?.items ?? []);
      setTickets(rawList.map((row) => normalizeTicketRow(row)));
    } catch {
      setError('Impossible de charger les tickets.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await api.get('/activities');
      const data = res.data?.data ?? res.data;
      const rawActs: unknown[] = Array.isArray(data) ? data : ((data as { items?: unknown[] })?.items ?? []);
      setActivities(rawActs as Activity[]);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchTickets();
    fetchActivities();
  }, []);

  // reset page on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  // ── derived ────────────────────────────────────────────────────────────────

  const disponibles = tickets.filter((t) => t.status === 'DISPONIBLE').length;
  const utilises   = tickets.filter((t) => t.status === 'UTILISE').length;
  const expires    = tickets.filter((t) => t.status === 'EXPIRE').length;

  const filtered = tickets
    .filter((t) => statusFilter === 'ALL' || t.status === statusFilter)
    .filter((t) =>
      search === '' || t.code_ticket.toLowerCase().includes(search.toLowerCase())
    );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * PAGE_SIZE;
  const pageRows   = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // ── actions ────────────────────────────────────────────────────────────────

  const handleDelete = async (t: TicketType) => {
    if (!window.confirm(`Supprimer le ticket "${t.code_ticket}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/tickets/${t.id}`);
      await fetchTickets();
    } catch {
      alert('Impossible de supprimer ce ticket.');
    }
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchActivityId) return;
    setGenerating(true);
    setBatchMsg('');
    try {
      const payload: Record<string, unknown> = {
        id_activity: Number(batchActivityId),
        quantite: batchQty,
      };
      if (customPrice && batchPrice) payload.prix_unitaire_applique = Number(batchPrice);
      await api.post('/batches/generate', payload);
      setBatchMsg(`${batchQty} ticket(s) générés avec succès !`);
      fetchTickets();
    } catch {
      setBatchMsg('Erreur lors de la génération.');
    } finally {
      setGenerating(false);
    }
  };

  // ── SVG icons ──────────────────────────────────────────────────────────────

  const iconInfo = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
  const iconCheck = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
  const iconClock = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
  const iconX = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
  const iconEye = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
  const iconTrash = (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="gf-page" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {/* ── BLOC 1 : KPI mini row ── */}
        <div className="gf-kpi-grid-4 gf-page-top">
          <KpiMini
            label="Total tickets"
            value={tickets.length}
            gradient="linear-gradient(195deg, #49a3f1, #1A73E8)"
            icon={iconInfo}
          />
          <KpiMini
            label="Disponibles"
            value={disponibles}
            gradient="linear-gradient(195deg, #66BB6A, #43A047)"
            icon={iconCheck}
          />
          <KpiMini
            label="Utilisés"
            value={utilises}
            gradient="linear-gradient(195deg, #FFA726, #fb8c00)"
            icon={iconClock}
          />
          <KpiMini
            label="Expirés"
            value={expires}
            gradient="linear-gradient(195deg, #ef5350, #F44335)"
            icon={iconX}
          />
        </div>

        {/* ── BLOC 2 : Card table ── */}
        <div className="gf-card-outer">
          <div className="gf-card">
          {/* ── Header flottant ── */}
          <div className="gf-card-header gf-card-header--info">
            <div>
              <p className="gf-card-header__title">Tickets</p>
              <p className="gf-card-header__sub">Gestion des tickets d&apos;accès</p>
            </div>
            {canWrite && (
              <button
                type="button"
                className="gf-btn-header"
                onClick={() => { setGenerateOpen(true); setBatchMsg(''); }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                Générer ticket
              </button>
            )}
          </div>

          {/* ── Toolbar ── */}
          <div className="gf-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
                  placeholder="Rechercher un code..."
                />
              </div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {STATUSES.map((s) => {
                  const active = s === statusFilter;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        border: active ? 'none' : '1px solid var(--gf-border)',
                        background: active ? 'var(--gf-dark)' : 'transparent',
                        color: active ? 'var(--gf-white)' : 'var(--gf-muted)',
                      }}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            <span className="gf-count-label">
              {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── Erreur ── */}
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

          {/* ── Tableau ── */}
          <div className="gf-card-body--table">
            <table className="gf-table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  {['Code', 'Membre', 'Activité', 'Date achat', 'Date utilisation', 'Statut', 'Actions'].map(
                    (col) => (
                      <th key={col}>{col}</th>
                    )
                  )}
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
                      Aucun ticket trouvé.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((t) => (
                    <TicketRow
                      key={t.id}
                      ticket={t}
                      canWrite={canWrite}
                      onView={() => setViewTicket(t)}
                      onDelete={() => handleDelete(t)}
                      iconEye={iconEye}
                      iconTrash={iconTrash}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {!loading && filtered.length > 0 && (
            <div className="gf-pagination">
              <span className="gf-pagination__info">
                Affichage {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} sur {filtered.length}
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

      {/* ── Modale : Voir détail ── */}
      <Modal
        isOpen={!!viewTicket}
        onClose={() => setViewTicket(null)}
        title="Détail du ticket"
        size="sm"
      >
        {viewTicket && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ marginBottom: 12, textAlign: 'center' }}>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--gf-dark)',
                  background: 'var(--gf-bg)',
                  borderRadius: 6,
                  padding: '4px 12px',
                  display: 'inline-block',
                }}
              >
                {viewTicket.code_ticket}
              </span>
            </div>
            <DetailRow label="Statut" value={<StatusBadge status={viewTicket.status} />} />
            <DetailRow
              label="Activité"
              value={viewTicket.activity?.nom ?? viewTicket.batch?.activity?.nom ?? '—'}
            />
            <DetailRow
              label="Membre"
              value={
                viewTicket.member
                  ? `${viewTicket.member.prenom ?? ''} ${viewTicket.member.nom ?? ''}`.trim() || '—'
                  : '—'
              }
            />
            <DetailRow
              label="Date achat"
              value={fmtDate(
                typeof viewTicket.createdAt === 'string'
                  ? viewTicket.createdAt
                  : ((viewTicket as unknown as Record<string, unknown>).created_at as string | undefined) ??
                      ((viewTicket as unknown as Record<string, unknown>).createdAt as string | undefined),
              )}
            />
            <DetailRow
              label="Date utilisation"
              value={fmtDate(
                (viewTicket as unknown as Record<string, unknown>).date_utilisation as string | undefined,
              )}
            />
            <DetailRow label="Expiration" value={fmtDate(viewTicket.date_expiration)} />
          </div>
        )}
      </Modal>

      {/* ── Modale : Générer ticket (Material Dashboard) ── */}
      {generateOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px',
          }}
          onClick={() => setGenerateOpen(false)}
        >
          <div
            style={{
              background: 'var(--gf-white)',
              borderRadius: 12,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              width: '100%',
              maxWidth: 440,
              maxHeight: '90vh',
              overflowY: 'auto',
              paddingTop: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                margin: '-20px 16px 0',
                background: 'linear-gradient(195deg, #FFA726, #fb8c00)',
                borderRadius: 10,
                padding: '14px 20px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(251,140,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <p style={{ color: 'var(--gf-white)', fontSize: 14, fontWeight: 700, margin: 0 }}>Générer des tickets</p>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '3px 0 0' }}>
                  Créer des tickets d&apos;accès séance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGenerateOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: 'var(--gf-white)',
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleGenerateBatch}
              style={{ padding: '28px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gf-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Activité <span style={{ color: '#F44335' }}>*</span>
                </label>
                <select
                  value={batchActivityId}
                  onChange={(e) =>
                    setBatchActivityId(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  required
                  style={{
                    border: '1px solid var(--gf-border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--gf-dark)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    background: 'var(--gf-white)',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1A73E8';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gf-border)';
                  }}
                >
                  <option value="">-- Sélectionner une activité --</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nom}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gf-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Nombre de tickets <span style={{ color: '#F44335' }}>*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={batchQty}
                  onChange={(e) => setBatchQty(Number(e.target.value))}
                  style={{
                    border: '1px solid var(--gf-border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--gf-dark)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1A73E8';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gf-border)';
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--gf-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Prix
                </span>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--gf-dark)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={customPrice}
                    onChange={(e) => setCustomPrice(e.target.checked)}
                    style={{ width: 15, height: 15, accentColor: '#1A73E8' }}
                  />
                  Prix personnalisé
                </label>
              </div>

              {customPrice && (
                <input
                  type="number"
                  min={0}
                  value={batchPrice}
                  onChange={(e) => setBatchPrice(e.target.value)}
                  placeholder="Prix unitaire (FCFA)"
                  style={{
                    border: '1px solid var(--gf-border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    color: 'var(--gf-dark)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1A73E8';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gf-border)';
                  }}
                />
              )}

              {batchMsg && (
                <p
                  style={{
                    fontSize: 13,
                    margin: 0,
                    color: batchMsg.includes('Erreur') ? '#F44335' : '#43A047',
                  }}
                >
                  {batchMsg}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--gf-bg)' }}>
                <button
                  type="button"
                  onClick={() => setGenerateOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px 0',
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
                  disabled={generating || !batchActivityId}
                  style={{
                    flex: 2,
                    padding: '10px 0',
                    borderRadius: 8,
                    border: 'none',
                    background:
                      generating || !batchActivityId
                        ? '#a0aec0'
                        : 'linear-gradient(195deg, #FFA726, #fb8c00)',
                    color: 'var(--gf-white)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: generating || !batchActivityId ? 'not-allowed' : 'pointer',
                    boxShadow:
                      generating || !batchActivityId ? 'none' : '0 3px 10px rgba(251,140,0,0.3)',
                  }}
                >
                  {generating
                    ? 'Génération…'
                    : `+ Générer ${batchQty} ticket${batchQty > 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── TicketRow ────────────────────────────────────────────────────────────────

interface TicketRowProps {
  ticket: TicketType;
  canWrite: boolean;
  onView: () => void;
  onDelete: () => void;
  iconEye: React.ReactNode;
  iconTrash: React.ReactNode;
}

function TicketRow({ ticket: t, canWrite, onView, onDelete, iconEye, iconTrash }: TicketRowProps) {
  const ext = t as TicketType & Record<string, unknown>;
  const memberName = t.member
    ? `${t.member.prenom ?? ''} ${t.member.nom ?? ''}`.trim() || '—'
    : '—';
  const activityNom = t.activity?.nom ?? t.batch?.activity?.nom ?? '—';

  return (
    <tr>
      {/* Code */}
      <td>
        <span
          style={{
            background: 'var(--gf-bg)',
            borderRadius: 6,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--gf-dark)',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
          }}
        >
          {t.code_ticket}
        </span>
      </td>

      {/* Membre */}
      <td style={{ fontSize: 13, color: 'var(--gf-dark)' }}>
        {memberName}
      </td>

      {/* Activité */}
      <td style={{ fontSize: 13, color: 'var(--gf-dark)' }}>
        {activityNom}
      </td>

      {/* Date achat */}
      <td style={{ fontSize: 13, color: 'var(--gf-dark)' }}>
        {fmtDate(
          typeof t.createdAt === 'string'
            ? t.createdAt
            : (ext.created_at as string | undefined) ?? (ext.createdAt as string | undefined),
        )}
      </td>

      {/* Date utilisation */}
      <td style={{ fontSize: 13, color: 'var(--gf-dark)' }}>
        {fmtDate(ext.date_utilisation as string | undefined)}
      </td>

      {/* Statut */}
      <td>
        <StatusBadge status={t.status} />
      </td>

      {/* Actions */}
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            className="gf-btn-action gf-btn-action--view"
            title="Voir"
            onClick={onView}
          >
            {iconEye}
          </button>
          {canWrite && (
            <button
              type="button"
              className="gf-btn-action gf-btn-action--delete"
              title="Supprimer"
              onClick={onDelete}
            >
              {iconTrash}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
