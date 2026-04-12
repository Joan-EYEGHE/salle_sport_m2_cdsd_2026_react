import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Activity } from '../types';

// ─── types ───────────────────────────────────────────────────────────────────

type ExtActivity = Activity & {
  description?: string;
  capacite?: number;
  nb_membres?: number;
};

type ActivityForm = Omit<Activity, 'id'>;

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtFcfa(n: number | undefined | null): string {
  if (!n || n === 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
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

const EMPTY_FORM: ActivityForm = {
  nom: '',
  status: true,
  frais_inscription: 0,
  prix_ticket: 0,
  prix_hebdomadaire: 0,
  prix_mensuel: 0,
  prix_trimestriel: 0,
  prix_annuel: 0,
  isMonthlyOnly: false,
};

// ─── sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        background: active ? '#eaf7ea' : '#fde8e8',
        color: active ? '#43A047' : '#F44335',
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

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[200, 110, 110, 80, 90, 70, 80].map((w, i) => (
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

// ─── activity row ────────────────────────────────────────────────────────────

interface ActivityRowProps {
  activity: ExtActivity;
  isLast: boolean;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function ActivityRow({ activity: a, isLast, isAdmin, onEdit, onDelete }: ActivityRowProps) {
  const [hovered, setHovered] = useState(false);

  const subLabel =
    a.description ??
    (a.prix_mensuel > 0
      ? `Mensuel : ${new Intl.NumberFormat('fr-FR').format(a.prix_mensuel)} FCFA`
      : a.prix_hebdomadaire > 0
      ? `Hebdo : ${new Intl.NumberFormat('fr-FR').format(a.prix_hebdomadaire)} FCFA`
      : '');

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
      {/* Activité */}
      <td style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: iconGradient(a.id),
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {a.nom.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#344767' }}>{a.nom}</div>
            {subLabel && (
              <div style={{ fontSize: 11, color: '#7b809a' }}>{subLabel}</div>
            )}
          </div>
        </div>
      </td>

      {/* Tarif abonnement */}
      <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#344767' }}>
        {fmtFcfa(a.prix_mensuel)}
      </td>

      {/* Tarif ticket */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: '#344767' }}>
        {fmtFcfa(a.prix_ticket)}
      </td>

      {/* Capacité */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: '#344767' }}>
        {a.capacite != null ? a.capacite : '—'}
      </td>

      {/* Membres inscrits */}
      <td style={{ padding: '12px 14px', fontSize: 13, color: '#344767' }}>
        {a.nb_membres != null ? a.nb_membres : '—'}
      </td>

      {/* Statut */}
      <td style={{ padding: '12px 14px' }}>
        <StatusBadge active={a.status} />
      </td>

      {/* Actions */}
      <td style={{ padding: '12px 14px' }}>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: 6 }}>
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
            <ActionBtn
              title="Supprimer"
              bg="#fde8e8"
              hoverBg="#F44335"
              color="#F44335"
              hoverColor="#fff"
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

// ─── add / edit modal ────────────────────────────────────────────────────────

const PRICE_FIELDS: { key: keyof ActivityForm & string; label: string }[] = [
  { key: 'frais_inscription', label: "Frais d'inscription" },
  { key: 'prix_ticket',       label: 'Prix ticket' },
  { key: 'prix_hebdomadaire', label: 'Tarif hebdomadaire' },
  { key: 'prix_mensuel',      label: 'Tarif mensuel' },
  { key: 'prix_trimestriel',  label: 'Tarif trimestriel' },
  { key: 'prix_annuel',       label: 'Tarif annuel' },
];

interface ActivityModalProps {
  editTarget: Activity | null;
  form: ActivityForm;
  onChange: (form: ActivityForm) => void;
  onClose: () => void;
  onSaved: () => void;
}

function ActivityModal({ editTarget, form, onChange, onClose, onSaved }: ActivityModalProps) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim()) { setErr('Le nom est obligatoire.'); return; }
    setSaving(true);
    setErr('');
    try {
      if (editTarget) {
        await api.put(`/activities/${editTarget.id}`, form);
      } else {
        await api.post('/activities', form);
      }
      onSaved();
    } catch {
      setErr('Impossible de sauvegarder les modifications.');
    } finally {
      setSaving(false);
    }
  };

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
          width: 520,
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#344767' }}>
          {editTarget ? "Modifier l'activité" : 'Ajouter une activité'}
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nom */}
          <div>
            <label style={labelStyle}>Nom de l'activité *</label>
            <input
              type="text"
              value={form.nom}
              onChange={(e) => onChange({ ...form, nom: e.target.value })}
              placeholder="Ex : Musculation, Cardio…"
              style={inputStyle}
            />
          </div>

          {/* Prix grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
            {PRICE_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label style={labelStyle}>{label} (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  value={(form[key as keyof ActivityForm] as number) ?? 0}
                  onChange={(e) => onChange({ ...form, [key]: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          {/* Checkboxes */}
          <div style={{ display: 'flex', gap: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#344767' }}>
              <input
                type="checkbox"
                checked={form.status}
                onChange={(e) => onChange({ ...form, status: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: '#1A73E8' }}
              />
              Actif
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#344767' }}>
              <input
                type="checkbox"
                checked={form.isMonthlyOnly}
                onChange={(e) => onChange({ ...form, isMonthlyOnly: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: '#1A73E8' }}
              />
              Forfait mensuel uniquement
            </label>
          </div>

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

// ─── main page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const COLUMNS = [
  'Activité',
  'Tarif abonnement',
  'Tarif ticket',
  'Capacité',
  'Membres inscrits',
  'Statut',
  'Actions',
];

export default function ActivitiesPage() {
  const { user } = useAuth();
  const role = user?.role ?? 'CONTROLLER';
  const isAdmin = role === 'ADMIN';

  const [activities, setActivities] = useState<ExtActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Activity | null>(null);
  const [form, setForm] = useState<ActivityForm>(EMPTY_FORM);

  const fetchActivities = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/activities');
      const data = res.data?.data ?? res.data;
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setError('Impossible de charger les activités.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActivities(); }, []);

  useEffect(() => { setPage(1); }, [search]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (a: Activity) => {
    setEditTarget(a);
    const { id: _id, ...rest } = a;
    setForm(rest);
    setModalOpen(true);
  };

  const handleDelete = async (a: ExtActivity) => {
    if (!window.confirm(`Supprimer l'activité "${a.nom}" ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/activities/${a.id}`);
      await fetchActivities();
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
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Activités</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>
                Gestion des activités proposées
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
                placeholder="Rechercher une activité…"
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
              {filtered.length} activité{filtered.length !== 1 ? 's' : ''}
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
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
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
                      Aucune activité trouvée.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((a, idx) => (
                    <ActivityRow
                      key={a.id}
                      activity={a}
                      isLast={idx === pageRows.length - 1}
                      isAdmin={isAdmin}
                      onEdit={() => openEdit(a)}
                      onDelete={() => handleDelete(a)}
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
        <ActivityModal
          editTarget={editTarget}
          form={form}
          onChange={setForm}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchActivities();
          }}
        />
      )}
    </>
  );
}
