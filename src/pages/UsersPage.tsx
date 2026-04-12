import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

// ─── types ───────────────────────────────────────────────────────────────────

type ExtUser = User & { createdAt?: string };

type UserFormData = {
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'CASHIER' | 'CONTROLLER';
  status: string;
  password: string;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function avatarGradient(role: User['role']): string {
  switch (role) {
    case 'ADMIN':      return 'linear-gradient(135deg,#CE93D8,#8e24aa)';
    case 'CASHIER':    return 'linear-gradient(135deg,#49a3f1,#1A73E8)';
    case 'CONTROLLER': return 'linear-gradient(135deg,#66BB6A,#43A047)';
  }
}

function roleBadgeStyle(role: User['role']): { bg: string; color: string; label: string } {
  switch (role) {
    case 'ADMIN':      return { bg: '#fde8ff', color: '#8e24aa', label: 'Admin' };
    case 'CASHIER':    return { bg: '#e8f4fd', color: '#1A73E8', label: 'Caissier' };
    case 'CONTROLLER': return { bg: '#eaf7ea', color: '#43A047', label: 'Contrôleur' };
  }
}

function fmtDate(str: string | undefined): string {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateTime(str: string | undefined): string {
  if (!str) return 'Jamais';
  return new Date(str).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(u: ExtUser): string {
  const first = (u.firstName ?? '').charAt(0);
  const last  = (u.lastName  ?? '').charAt(0);
  if (first || last) return `${first}${last}`.toUpperCase();
  return u.email.charAt(0).toUpperCase();
}

function fullName(u: ExtUser): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return name || u.email;
}

function isActive(u: ExtUser): boolean {
  return u.status === 'ACTIVE' || u.status === 'active';
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        background: active ? '#eaf7ea' : '#fde8e8',
        color:      active ? '#43A047' : '#F44335',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

// ─── ActionBtn ───────────────────────────────────────────────────────────────

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
        color:      hovered ? hoverColor : color,
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

// ─── SkeletonRow ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[200, 110, 100, 110, 80, 70].map((w, i) => (
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

// ─── UserRow ─────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: ExtUser;
  isLast: boolean;
  isAdmin: boolean;
  isSelf: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function UserRow({ user: u, isLast, isAdmin, isSelf, onEdit, onDelete }: UserRowProps) {
  const [hovered, setHovered] = useState(false);
  const badge = roleBadgeStyle(u.role);
  const active = isActive(u);
  const initials = getInitials(u);
  const name = fullName(u);

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
      {/* Utilisateur */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: avatarGradient(u.role),
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
              {name}
            </div>
            <div style={{ fontSize: 11, color: '#7b809a' }}>{u.email}</div>
          </div>
        </div>
      </td>

      {/* Rôle */}
      <td style={{ padding: '12px 14px' }}>
        <span
          style={{
            background: badge.bg,
            color: badge.color,
            padding: '3px 10px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          {badge.label}
        </span>
      </td>

      {/* Date de création */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: '#344767' }}>
        {fmtDate(u.createdAt)}
      </td>

      {/* Dernière connexion */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: '#7b809a' }}>
        {fmtDateTime(u.lastLogin)}
      </td>

      {/* Statut */}
      <td style={{ padding: '12px 14px' }}>
        <StatusBadge active={active} />
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 14px' }}>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Modifier */}
            <ActionBtn
              title="Modifier"
              bg="#e8f4fd"
              hoverBg="#1A73E8"
              color="#1A73E8"
              hoverColor="#fff"
              onClick={onEdit}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </ActionBtn>

            {/* Supprimer */}
            <ActionBtn
              title={isSelf ? 'Impossible de supprimer votre propre compte' : 'Supprimer'}
              bg={isSelf ? '#f5f5f5' : '#fde8e8'}
              hoverBg={isSelf ? '#f5f5f5' : '#F44335'}
              color={isSelf ? '#c0c4cc' : '#F44335'}
              hoverColor={isSelf ? '#c0c4cc' : '#fff'}
              onClick={onDelete}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </ActionBtn>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#c0c4cc' }}>—</span>
        )}
      </td>
    </tr>
  );
}

// ─── UserModal ───────────────────────────────────────────────────────────────

interface UserModalProps {
  editTarget: ExtUser | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM: UserFormData = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'CASHIER',
  status: 'ACTIVE',
  password: '',
};

function UserModal({ editTarget, onClose, onSaved }: UserModalProps) {
  const isEdit = editTarget !== null;

  const [form, setForm] = useState<UserFormData>(() =>
    isEdit
      ? {
          firstName: editTarget.firstName ?? '',
          lastName:  editTarget.lastName  ?? '',
          email:     editTarget.email,
          role:      editTarget.role,
          status:    editTarget.status,
          password:  '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const inputStyle: React.CSSProperties = {
    border: '1px solid #d2d6da',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#344767',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#7b809a',
    textTransform: 'uppercase',
    marginBottom: 4,
    display: 'block',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) { setErr("L'email est obligatoire."); return; }
    if (!isEdit && !form.password.trim()) { setErr('Le mot de passe est obligatoire.'); return; }
    setSaving(true);
    setErr('');
    try {
      if (isEdit) {
        const { password: _pw, ...payload } = form;
        await api.put(`/users/${editTarget.id}`, payload);
      } else {
        await api.post('/users', form);
      }
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
          width: 460,
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#344767' }}>
          {isEdit ? "Modifier l'utilisateur" : 'Ajouter un utilisateur'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Prénom + Nom */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            <div>
              <label style={labelStyle}>Prénom</label>
              <input
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Jean"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Nom</label>
              <input
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Dupont"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={labelStyle}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="jean.dupont@exemple.com"
              style={inputStyle}
            />
          </div>

          {/* Mot de passe (création uniquement) */}
          {!isEdit && (
            <div>
              <label style={labelStyle}>Mot de passe *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
          )}

          {/* Rôle */}
          <div>
            <label style={labelStyle}>Rôle</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserFormData['role'] }))}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              <option value="ADMIN">Admin</option>
              <option value="CASHIER">Caissier</option>
              <option value="CONTROLLER">Contrôleur</option>
            </select>
          </div>

          {/* Statut */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#344767' }}>
            <input
              type="checkbox"
              checked={form.status === 'ACTIVE' || form.status === 'active'}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' }))}
              style={{ width: 15, height: 15, accentColor: '#1A73E8' }}
            />
            Compte actif
          </label>

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

// ─── page principale ──────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const COLUMNS = ['Utilisateur', 'Rôle', 'Date de création', 'Dernière connexion', 'Statut', 'Actions'];

export default function UsersPage() {
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === 'ADMIN';

  const [users, setUsers] = useState<ExtUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExtUser | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/users');
      const data = res.data?.data ?? res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (u: ExtUser) => {
    setEditTarget(u);
    setModalOpen(true);
  };

  const handleDelete = async (u: ExtUser) => {
    if (u.id === authUser?.id) {
      window.alert('Vous ne pouvez pas supprimer votre propre compte.');
      return;
    }
    const name = fullName(u);
    if (!window.confirm(`Supprimer l'utilisateur "${name}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      await fetchUsers();
    } catch {
      window.alert('Impossible de supprimer cet utilisateur.');
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * PAGE_SIZE;
  const pageEnd    = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageRows   = filtered.slice(pageStart, pageEnd);

  return (
    <>
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
          {/* ── header flottant ── */}
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
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Utilisateurs</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
                Gestion des comptes utilisateurs
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={openCreate}
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
                placeholder="Rechercher un utilisateur…"
                style={{
                  border: '1px solid #d2d6da',
                  borderRadius: 8,
                  padding: '8px 12px 8px 34px',
                  fontSize: 13,
                  color: '#344767',
                  width: 240,
                  outline: 'none',
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: '#7b809a' }}>
              {filtered.length} utilisateur{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* ── erreur ── */}
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  {COLUMNS.map((col, i, arr) => (
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
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      style={{
                        textAlign: 'center',
                        padding: '48px 0',
                        color: '#7b809a',
                        fontSize: 13,
                      }}
                    >
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((u, idx) => (
                    <UserRow
                      key={u.id}
                      user={u}
                      isLast={idx === pageRows.length - 1}
                      isAdmin={isAdmin}
                      isSelf={u.id === authUser?.id}
                      onEdit={() => openEdit(u)}
                      onDelete={() => handleDelete(u)}
                    />
                  ))
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

      {/* ── modal ── */}
      {modalOpen && (
        <UserModal
          editTarget={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchUsers();
          }}
        />
      )}
    </>
  );
}
