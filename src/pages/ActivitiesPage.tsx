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
    <span className={`gf-badge ${active ? 'gf-badge--active' : 'gf-badge--inactive'}`}>
      {active ? 'Actif' : 'Inactif'}
    </span>
  );
}

// ─── skeleton ────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[200, 110, 110, 80, 90, 70, 80].map((w, i) => (
        <td key={i}>
          <div className="gf-skeleton" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

// ─── activity row ────────────────────────────────────────────────────────────

interface ActivityRowProps {
  activity: ExtActivity;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function ActivityRow({ activity: a, isAdmin, onEdit, onDelete }: ActivityRowProps) {
  const subLabel =
    a.description ??
    (a.prix_mensuel > 0
      ? `Mensuel : ${new Intl.NumberFormat('fr-FR').format(a.prix_mensuel)} FCFA`
      : a.prix_hebdomadaire > 0
      ? `Hebdo : ${new Intl.NumberFormat('fr-FR').format(a.prix_hebdomadaire)} FCFA`
      : '');

  return (
    <tr>
      {/* Activité */}
      <td>
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
      <td style={{ fontWeight: 700 }}>{fmtFcfa(a.prix_mensuel)}</td>

      {/* Tarif ticket */}
      <td>{fmtFcfa(a.prix_ticket)}</td>

      {/* Capacité */}
      <td>{a.capacite != null ? a.capacite : '—'}</td>

      {/* Membres inscrits */}
      <td>{a.nb_membres != null ? a.nb_membres : '—'}</td>

      {/* Statut */}
      <td><StatusBadge active={a.status} /></td>

      {/* Actions */}
      <td>
        {isAdmin ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="gf-btn-action gf-btn-action--edit" title="Modifier" onClick={onEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button className="gf-btn-action gf-btn-action--delete" title="Supprimer" onClick={onDelete}>
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

  const isEdit = Boolean(editTarget);

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

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#7b809a',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  const inputBaseStyle: React.CSSProperties = {
    border: '1px solid #d2d6da',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#344767',
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
      e.currentTarget.style.borderColor = '#d2d6da';
    },
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
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          paddingTop: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            margin: '-20px 16px 0',
            background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
            borderRadius: 10,
            padding: '14px 20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <p style={{ color: 'white', fontSize: 14, fontWeight: 700, margin: 0 }}>
              {isEdit ? "Modifier l'activité" : 'Nouvelle activité'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '3px 0 0' }}>
              {isEdit ? 'Mettre à jour les informations' : 'Ajouter une activité au catalogue'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.4)',
              color: 'white',
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
          onSubmit={handleSubmit}
          style={{ padding: '28px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={fieldLabelStyle}>
              Nom de l&apos;activité <span style={{ color: '#F44335' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Ex : Musculation, Cardio..."
              value={form.nom}
              onChange={(e) => onChange({ ...form, nom: e.target.value })}
              style={inputBaseStyle}
              {...inputFocusBlur}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {PRICE_FIELDS.map(({ key, label }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={fieldLabelStyle}>{label} (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  value={(form[key as keyof ActivityForm] as number) ?? 0}
                  onChange={(e) => onChange({ ...form, [key]: Number(e.target.value) })}
                  style={inputBaseStyle}
                  {...inputFocusBlur}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#344767',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={form.status}
                onChange={(e) => onChange({ ...form, status: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: '#1A73E8' }}
              />
              Actif
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#344767',
                cursor: 'pointer',
              }}
            >
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

          <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid #f0f2f5' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 0',
                borderRadius: 8,
                border: '1px solid #d2d6da',
                background: 'white',
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
                padding: '10px 0',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                color: 'white',
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: saving ? 'none' : '0 3px 10px rgba(26,115,232,0.3)',
              }}
            >
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : "Créer l'activité"}
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
      <div className="gf-page gf-page-top" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {/* ── card wrapper ── */}
        <div className="gf-card-outer">
          <div className="gf-card">
            {/* ── floating header ── */}
            <div className="gf-card-header gf-card-header--info">
              <div>
                <p className="gf-card-header__title">Activités</p>
                <p className="gf-card-header__sub">Gestion des activités proposées</p>
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
              <table className="gf-table" style={{ minWidth: 820 }}>
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
                          color: '#7b809a',
                          fontSize: 13,
                        }}
                      >
                        Aucune activité trouvée.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((a) => (
                      <ActivityRow
                        key={a.id}
                        activity={a}
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
