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

function StatusBadge({ status }: { status: MemberStatus }) {
  const styles: Record<MemberStatus, { bg: string; color: string; label: string }> = {
    ACTIF:      { bg: '#eaf7ea', color: '#43A047', label: 'Actif' },
    INACTIF:    { bg: '#fde8e8', color: '#F44335', label: 'Inactif' },
    EN_ATTENTE: { bg: '#fef3e2', color: '#fb8c00', label: 'En attente' },
  };
  const s = styles[status];
  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

interface ActionBtnProps {
  title: string;
  bg: string;
  hoverBg: string;
  color: string;
  hoverColor: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ActionBtn({ title, bg, hoverBg, color, hoverColor, onClick, children }: ActionBtnProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: hovered ? hoverBg : bg,
        color: hovered ? hoverColor : color,
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ─── edit modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ member, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    prenom: member.prenom,
    nom: member.nom,
    email: member.email ?? '',
    phone: member.phone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await api.put(`/members/${member.id}`, form);
      onSaved();
    } catch {
      setErr('Impossible de sauvegarder les modifications.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '28px 32px',
          width: 420,
          maxWidth: '90vw',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#344767' }}>
          Modifier le membre
        </h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(['prenom', 'nom', 'email', 'phone'] as const).map((field) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#7b809a', textTransform: 'uppercase' }}>
                {field === 'prenom' ? 'Prénom' : field === 'nom' ? 'Nom' : field === 'email' ? 'Email' : 'Téléphone'}
              </label>
              <input
                type={field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                style={{
                  border: '1px solid #d2d6da',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  color: '#344767',
                  outline: 'none',
                }}
              />
            </div>
          ))}
          {err && <p style={{ color: '#F44335', fontSize: 12, margin: 0 }}>{err}</p>}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 8,
                border: '1px solid #d2d6da',
                background: '#fff',
                color: '#7b809a',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(195deg,#49a3f1,#1A73E8)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[200, 120, 110, 80, 90, 80].map((w, i) => (
        <td key={i} style={{ padding: '14px 14px' }}>
          <div
            style={{
              height: 14,
              width: w,
              borderRadius: 4,
              background: 'linear-gradient(90deg,#f0f2f5 25%,#e8ebf0 50%,#f0f2f5 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s infinite',
            }}
          />
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
  const [editTarget, setEditTarget] = useState<Member | null>(null);

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
      {/* shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      <div
        style={{
          padding: '20px 24px 24px',
          marginTop: 14,
          background: '#f0f2f5',
          minHeight: 'calc(100vh - 60px)',
        }}
      >
        {/* ── card wrapper ── */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          }}
        >
          {/* ── floating header ── */}
          <div
            style={{
              margin: '-20px 16px 0',
              background: 'linear-gradient(195deg,#49a3f1,#1A73E8)',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Liste des membres</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
                Gestion des membres inscrits
              </div>
            </div>
            {canEditOrAdd && (
              <button
                onClick={() => navigate('/members/subscribe')}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '7px 14px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                Ajouter
              </button>
            )}
          </div>

          {/* ── toolbar ── */}
          <div
            style={{
              padding: '16px 20px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* search */}
            <div style={{ position: 'relative' }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7b809a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                style={{
                  border: '1px solid #d2d6da',
                  borderRadius: 8,
                  padding: '8px 12px 8px 34px',
                  fontSize: 13,
                  color: '#344767',
                  width: 220,
                  outline: 'none',
                }}
              />
            </div>
            {/* counter */}
            <span style={{ fontSize: 12, color: '#7b809a' }}>
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
          <div style={{ padding: '16px 20px 8px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['Membre', 'Téléphone', 'Abonnement', 'Statut', 'Inscription', 'Actions'].map(
                    (col, i, arr) => (
                      <th
                        key={col}
                        style={{
                          background: 'linear-gradient(195deg,#49a3f1,#1A73E8)',
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          padding: '10px 14px',
                          textAlign: 'left',
                          borderRadius:
                            i === 0
                              ? '8px 0 0 8px'
                              : i === arr.length - 1
                              ? '0 8px 8px 0'
                              : 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col}
                      </th>
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
                  pageRows.map((m, idx) => {
                    const sub = lastSub(m);
                    const status = getMemberStatus(m);
                    const initials = getInitials(m);
                    const inscriptionDate = m.date_inscription ?? sub?.date_debut;
                    const isLast = idx === pageRows.length - 1;

                    return (
                      <MemberRow
                        key={m.id}
                        member={m}
                        sub={sub}
                        status={status}
                        initials={initials}
                        inscriptionDate={inscriptionDate}
                        isLast={isLast}
                        canEditOrAdd={canEditOrAdd}
                        canDelete={canDelete}
                        onView={() => navigate(`/members/${m.id}`)}
                        onEdit={() => setEditTarget(m)}
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
            <div
              style={{
                padding: '12px 20px 16px',
                borderTop: '1px solid #f0f2f5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: 12, color: '#7b809a' }}>
                Affichage {pageStart + 1}–{pageEnd} sur {filtered.length}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const p = i + 1;
                  const active = p === safePage;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        border: active ? 'none' : '0.5px solid #d2d6da',
                        background: active ? '#1A73E8' : '#fff',
                        color: active ? '#fff' : '#344767',
                        fontSize: 12,
                        fontWeight: active ? 700 : 400,
                        cursor: 'pointer',
                      }}
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

      {/* ── edit modal ── */}
      {editTarget && (
        <EditModal
          member={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            fetchMembers();
          }}
        />
      )}
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
  isLast: boolean;
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
  isLast,
  canEditOrAdd,
  canDelete,
  onView,
  onEdit,
  onDelete,
  avatarBg,
}: MemberRowProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: isLast ? 'none' : '1px solid #f0f2f5',
        background: hovered ? '#fafafa' : '#fff',
        transition: 'background 0.1s',
      }}
    >
      {/* Membre */}
      <td style={{ padding: '12px 14px' }}>
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
      <td style={{ padding: '12px 14px', fontSize: 13, color: '#344767' }}>
        {m.phone ?? '—'}
      </td>

      {/* Abonnement */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: '#344767' }}>
        {sub?.activity?.nom ?? (sub ? sub.type_forfait : '—')}
      </td>

      {/* Statut */}
      <td style={{ padding: '12px 14px' }}>
        <StatusBadge status={status} />
      </td>

      {/* Inscription */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: '#344767' }}>
        {fmtDate(inscriptionDate)}
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Voir */}
          <ActionBtn
            title="Voir le détail"
            bg="#eaf7ea"
            hoverBg="#43A047"
            color="#43A047"
            hoverColor="#fff"
            onClick={onView}
          >
            {/* eye icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </ActionBtn>

          {/* Modifier */}
          {canEditOrAdd && (
            <ActionBtn
              title="Modifier"
              bg="#e8f4fd"
              hoverBg="#1A73E8"
              color="#1A73E8"
              hoverColor="#fff"
              onClick={onEdit}
            >
              {/* pencil icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </ActionBtn>
          )}

          {/* Supprimer */}
          {canDelete && (
            <ActionBtn
              title="Supprimer"
              bg="#fde8e8"
              hoverBg="#F44335"
              color="#F44335"
              hoverColor="#fff"
              onClick={onDelete}
            >
              {/* trash icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </ActionBtn>
          )}
        </div>
      </td>
    </tr>
  );
}
