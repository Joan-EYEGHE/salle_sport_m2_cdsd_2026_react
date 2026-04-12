import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Member, Subscription } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

type MemberStatus = 'ACTIF' | 'INACTIF' | 'EN_ATTENTE';

function getMemberStatus(member: Member): MemberStatus {
  const subs = member.subscriptions ?? [];
  if (subs.length === 0) return 'EN_ATTENTE';
  const last = subs[subs.length - 1];
  return new Date(last.date_prochain_paiement) >= new Date() ? 'ACTIF' : 'INACTIF';
}

function lastSub(m: Member): Subscription | undefined {
  return (m.subscriptions ?? []).slice(-1)[0];
}

function fmtDate(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(m: Member): string {
  if (m.initials) return m.initials;
  return `${(m.prenom ?? '?').charAt(0)}${(m.nom ?? '?').charAt(0)}`.toUpperCase();
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

// ─── sub-components ──────────────────────────────────────────────────────────

const STATUS_MAP: Record<MemberStatus, { label: string; badgeClass: string }> = {
  ACTIF:      { label: 'Actif',       badgeClass: 'active' },
  INACTIF:    { label: 'Inactif',     badgeClass: 'inactive' },
  EN_ATTENTE: { label: 'En attente',  badgeClass: 'pending' },
};

function StatusBadge({ status }: { status: MemberStatus }) {
  const { label, badgeClass } = STATUS_MAP[status];
  return <span className={`gf-badge gf-badge--${badgeClass}`}>{label}</span>;
}


// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[200, 120, 110, 80, 90, 80].map((w, i) => (
        <td key={i} style={{ padding: '14px 14px' }}>
          <div className="gf-skeleton" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function MembersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role ?? 'CONTROLLER';

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/members');
      const data = res.data?.data ?? res.data;
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les membres.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // reset page on search change
  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = members.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.prenom.toLowerCase().includes(q) ||
      m.nom.toLowerCase().includes(q) ||
      (m.email ?? '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const handleDelete = async (m: Member) => {
    if (!window.confirm(`Supprimer le membre "${m.prenom} ${m.nom}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/members/${m.id}`);
      await fetchMembers();
    } catch {
      alert('Impossible de supprimer ce membre.');
    }
  };

  const canEditOrAdd = role === 'ADMIN' || role === 'CASHIER';
  const canDelete = role === 'ADMIN';

  return (
    <>
      <div className="gf-page gf-page-top" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {/* ── card wrapper ── */}
        <div className="gf-card-outer">
        <div className="gf-card">
          {/* ── floating header ── */}
          <div className="gf-card-header gf-card-header--info">
            <div>
              <p className="gf-card-header__title">Liste des membres</p>
              <p className="gf-card-header__sub">Gestion des membres inscrits</p>
            </div>
            {canEditOrAdd && (
              <button className="gf-btn-header" onClick={() => navigate('/members/new')}>
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                Ajouter
              </button>
            )}
          </div>

          {/* ── toolbar ── */}
          <div className="gf-toolbar">
            {/* search */}
            <div className="gf-search-wrap">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7b809a"
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
            {/* counter */}
            <span className="gf-count-label">
              {filtered.length} membre{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── error ── */}
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

          {/* ── table ── */}
          <div className="gf-card-body--table">
            <table className="gf-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Téléphone</th>
                  <th>Abonnement</th>
                  <th>Statut</th>
                  <th>Inscription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        textAlign: 'center',
                        padding: '48px 0',
                        color: '#7b809a',
                        fontSize: 13,
                      }}
                    >
                      Aucun membre trouvé.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((m) => {
                    const sub = lastSub(m);
                    const status = getMemberStatus(m);
                    const initials = getInitials(m);
                    const inscriptionDate = m.date_inscription ?? sub?.date_debut;

                    return (
                      <MemberRow
                        key={m.id}
                        member={m}
                        sub={sub}
                        status={status}
                        initials={initials}
                        inscriptionDate={inscriptionDate}
                        canEditOrAdd={canEditOrAdd}
                        canDelete={canDelete}
                        onView={() => navigate(`/members/${m.id}`)}
                        onEdit={() => navigate(`/members/${m.id}/edit`)}
                        onDelete={() => handleDelete(m)}
                        avatarBg={avatarGradient(m.id)}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── pagination ── */}
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
    </>
  );

}

// ─── row component ───────────────────────────────────────────────────────────

interface MemberRowProps {
  member: Member;
  sub: Subscription | undefined;
  status: MemberStatus;
  initials: string;
  inscriptionDate: string | undefined;
  canEditOrAdd: boolean;
  canDelete: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  avatarBg: string;
}

function MemberRow({
  member: m,
  sub,
  status,
  initials,
  inscriptionDate,
  canEditOrAdd,
  canDelete,
  onView,
  onEdit,
  onDelete,
  avatarBg,
}: MemberRowProps) {
  return (
    <tr>
      {/* Membre */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: avatarBg,
              color: '#fff',
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
            <div style={{ fontSize: 13, fontWeight: 700, color: '#344767' }}>
              {m.prenom} {m.nom}
            </div>
            <div style={{ fontSize: 11, color: '#7b809a' }}>{m.email ?? '—'}</div>
          </div>
        </div>
      </td>

      {/* Téléphone */}
      <td>{m.phone ?? '—'}</td>

      {/* Abonnement */}
      <td>{sub?.activity?.nom ?? (sub ? sub.type_forfait : '—')}</td>

      {/* Statut */}
      <td><StatusBadge status={status} /></td>

      {/* Inscription */}
      <td>{fmtDate(inscriptionDate)}</td>

      {/* Actions */}
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Voir */}
          <button className="gf-btn-action gf-btn-action--view" title="Voir le détail" onClick={onView}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* Modifier */}
          {canEditOrAdd && (
            <button className="gf-btn-action gf-btn-action--edit" title="Modifier" onClick={onEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}

          {/* Supprimer */}
          {canDelete && (
            <button className="gf-btn-action gf-btn-action--delete" title="Supprimer" onClick={onDelete}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
}
