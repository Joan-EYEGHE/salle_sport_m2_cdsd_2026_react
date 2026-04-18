/*
AUDIT CSS GYMFLOW - UsersPage.tsx
Problème 1 : Palette GymFlow en hex et white en inline (toolbar, modale, tableau) + blur sur #d2d6da
Total : 1 problème trouvé
*/
import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';

// ─── types ───────────────────────────────────────────────────────────────────

type ExtUser = User & { createdAt?: string };

type UserFormData = {
  fullName: string;
  email: string;
  role: 'ADMIN' | 'CASHIER' | 'CONTROLLER';
  active: boolean;
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

const ROLE_BADGE: Record<User['role'], { cls: string; label: string }> = {
  ADMIN:      { cls: 'gf-badge--purple', label: 'Admin' },
  CASHIER:    { cls: 'gf-badge--info',   label: 'Caissier' },
  CONTROLLER: { cls: 'gf-badge--active', label: 'Contrôleur' },
};

function fmtDate(str: string | undefined): string {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInitials(u: ExtUser): string {
  const name = (u.fullName ?? '').trim();
  if (!name) return u.email.charAt(0).toUpperCase();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function displayFullName(u: ExtUser): string {
  return (u.fullName ?? '').trim() || u.email;
}

function userIsActive(u: ExtUser): boolean {
  return u.active === true;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`gf-badge ${active ? 'gf-badge--active' : 'gf-badge--inactive'}`}>
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

// ─── SkeletonRow ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[200, 110, 100, 80, 70].map((w, i) => (
        <td key={i}>
          <div className="gf-skeleton" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── UserRow ─────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: ExtUser;
  isAdmin: boolean;
  isSelf: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function UserRow({ user: u, isAdmin, isSelf, onEdit, onDelete }: UserRowProps) {
  const roleBadge = ROLE_BADGE[u.role];
  const active = userIsActive(u);
  const initials = getInitials(u);
  const name = displayFullName(u);

  return (
    <tr>
      {/* Utilisateur */}
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: avatarGradient(u.role),
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
              {name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gf-muted)' }}>{u.email}</div>
          </div>
        </div>
      </td>

      {/* Rôle */}
      <td>
        <span className={`gf-badge ${roleBadge.cls}`}>{roleBadge.label}</span>
      </td>

      {/* Date de création */}
      <td>{fmtDate(u.createdAt)}</td>

      {/* Statut */}
      <td><StatusBadge active={active} /></td>

      {/* Actions */}
      <td>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: 6 }}>
            {/* Modifier */}
            <button className="gf-btn-action gf-btn-action--edit" title="Modifier" onClick={onEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>

            {/* Supprimer — Bug B3 : anti-auto-suppression */}
            <button
              className="gf-btn-action gf-btn-action--delete"
              title={isSelf ? 'Impossible de supprimer votre propre compte' : 'Supprimer'}
              onClick={onDelete}
              disabled={isSelf}
              style={isSelf ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
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
  fullName: '',
  email: '',
  role: 'CASHIER',
  active: true,
  password: '',
};

function UserModal({ editTarget, onClose, onSaved }: UserModalProps) {
  const isEdit = editTarget !== null;

  const [form, setForm] = useState<UserFormData>(() =>
    isEdit
      ? {
          fullName: editTarget.fullName ?? '',
          email: editTarget.email,
          role: editTarget.role,
          active: editTarget.active !== false,
          password: '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--gf-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const inputBaseStyle: React.CSSProperties = {
    border: '1px solid var(--gf-border)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: 'var(--gf-dark)',
    outline: 'none',
    fontFamily: 'inherit',
    width: '100%',
    boxSizing: 'border-box',
  };

  const inputFocusBlur = {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = '#1A73E8';
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = 'var(--gf-border)';
    },
  };

  const selectFocusBlur = {
    onFocus: (e: React.FocusEvent<HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = '#1A73E8';
    },
    onBlur: (e: React.FocusEvent<HTMLSelectElement>) => {
      e.currentTarget.style.borderColor = 'var(--gf-border)';
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) { setErr("L'email est obligatoire."); return; }
    if (!form.fullName.trim()) { setErr('Le nom complet est obligatoire.'); return; }
    if (!isEdit && !form.password.trim()) { setErr('Le mot de passe est obligatoire.'); return; }
    setSaving(true);
    setErr('');
    try {
      if (isEdit) {
        const { password: _pw, ...payload } = form;
        await api.put(`/users/${editTarget.id}`, payload);
      } else {
        const { password, ...rest } = form;
        await api.post('/users', {
          fullName: rest.fullName.trim(),
          email: rest.email.trim(),
          role: rest.role,
          password,
          active: rest.active,
        });
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
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--gf-white)',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: 'linear-gradient(195deg, #EC407A, #D81B60)',
            borderRadius: '12px 12px 0 0',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: 0,
          }}
        >
          <div>
            <p style={{ color: 'var(--gf-white)', fontSize: 14, fontWeight: 700, margin: 0 }}>
              {isEdit ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '3px 0 0' }}>
              {isEdit ? 'Mettre à jour le compte' : "Créer un compte d'accès GymFlow"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
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

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <form
          onSubmit={handleSubmit}
          style={{ padding: '20px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={fieldLabelStyle}>
              Nom complet <span style={{ color: '#F44335' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Jean Dupont"
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              style={inputBaseStyle}
              {...inputFocusBlur}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={fieldLabelStyle}>
              Email <span style={{ color: '#F44335' }}>*</span>
            </label>
            <input
              type="email"
              placeholder="jean.dupont@exemple.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              style={inputBaseStyle}
              {...inputFocusBlur}
            />
          </div>

          {!isEdit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={fieldLabelStyle}>
                Mot de passe <span style={{ color: '#F44335' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  style={{
                    ...inputBaseStyle,
                    padding: '10px 42px 10px 14px',
                  }}
                  {...inputFocusBlur}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--gf-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={fieldLabelStyle}>Rôle</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserFormData['role'] }))}
              style={{
                ...inputBaseStyle,
                cursor: 'pointer',
                background: 'var(--gf-white)',
              }}
              {...selectFocusBlur}
            >
              <option value="CASHIER">Caissier</option>
              <option value="ADMIN">Admin</option>
              <option value="CONTROLLER">Contrôleur</option>
            </select>
          </div>

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
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              style={{ width: 15, height: 15, accentColor: '#1A73E8' }}
            />
            Compte actif
          </label>

          {err && <p style={{ color: '#F44335', fontSize: 12, margin: 0 }}>{err}</p>}

          <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--gf-bg)' }}>
            <button
              type="button"
              onClick={onClose}
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
              disabled={saving}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: saving ? '#a0aec0' : 'linear-gradient(195deg, #EC407A, #D81B60)',
                color: 'var(--gf-white)',
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                boxShadow: saving ? 'none' : '0 3px 10px rgba(233,30,99,0.3)',
              }}
            >
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : "Créer l'utilisateur"}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}

// ─── page principale ──────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const COLUMNS = ['Utilisateur', 'Rôle', 'Date de création', 'Statut', 'Actions'];

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/users', {
        params: { includeInactive: 'true' },
      });
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : (payload?.items ?? []);
      const arr = Array.isArray(list) ? list : [];
      setUsers(
        arr.map((raw: ExtUser & { isActive?: boolean }) => ({
          ...raw,
          active: raw.active ?? raw.isActive ?? true,
        })),
      );
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

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
    const name = displayFullName(u);
    if (!window.confirm(`Supprimer l'utilisateur "${name}" ? Cette action est irréversible.`)) return;
    const deletedId = Number(u.id);
    try {
      await api.delete(`/users/${deletedId}`);
      setUsers((prev) => prev.filter((x) => Number(x.id) !== deletedId));
    } catch {
      window.alert('Impossible de supprimer cet utilisateur.');
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const name = (u.fullName ?? '').toLowerCase();
    return name.includes(q) || u.email.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * PAGE_SIZE;
  const pageEnd    = Math.min(pageStart + PAGE_SIZE, filtered.length);
  const pageRows   = filtered.slice(pageStart, pageEnd);

  return (
    <>
      <div className="gf-page">
        {/* ── card wrapper ── */}
        <div className="gf-card-outer">
          <div className="gf-card">
            {/* ── header flottant ── */}
            <div className="gf-card-header gf-card-header--info">
              <div>
                <p className="gf-card-header__title">Utilisateurs</p>
                <p className="gf-card-header__sub">Gestion des comptes utilisateurs</p>
              </div>
              {isAdmin && (
                <button className="gf-btn-header" onClick={openCreate}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                  Ajouter
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
                  placeholder="Rechercher un utilisateur…"
                />
              </div>
              <span className="gf-count-label">
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
            <div className="gf-card-body--table">
              <table className="gf-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    {COLUMNS.map((col) => (
                      <th key={col}>{col}</th>
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
                          color: 'var(--gf-muted)',
                          fontSize: 13,
                        }}
                      >
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((u) => (
                      <UserRow
                        key={u.id}
                        user={u}
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
