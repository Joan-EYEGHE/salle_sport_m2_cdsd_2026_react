/*
AUDIT CSS GYMFLOW - MembersPage.tsx
Problème 1 : stroke/icône recherche et textes en #7b809a / #344767 / #fff en dur
Total : 1 problème trouvé
*/
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { Mail, Phone, Printer, QrCode as QrCodeIcon } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import type { Member } from '../types';
import { normalizeMemberFromApi } from '../utils/memberApiNormalize';

// ─── helpers ────────────────────────────────────────────────────────────────

type MemberStatus = 'ACTIF' | 'INACTIF' | 'EN_ATTENTE';

function getMemberStatus(member: Member): MemberStatus {
  const subs = member.subscriptions ?? [];
  if (subs.length === 0) return 'EN_ATTENTE';
  const last = subs[0];
  return new Date(last.date_prochain_paiement) >= new Date() ? 'ACTIF' : 'INACTIF';
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

function memberWhatsAppUrl(m: Member): string {
  const msg = `GymFlow — Carte membre\nNom : ${m.prenom} ${m.nom}\nTéléphone : ${m.phone ?? '—'}\nCode QR : ${m.uuid_qr}`;
  const text = encodeURIComponent(msg);
  const digits = (m.phone ?? '').replace(/\D/g, '');
  if (digits.length >= 8) return `https://wa.me/${digits}?text=${text}`;
  return `https://wa.me/?text=${text}`;
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function MemberQrModalInner({ vm }: { vm: Member }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          background: 'var(--gf-white)',
          padding: 12,
          borderRadius: 12,
          border: '1px solid var(--gf-border)',
          lineHeight: 0,
        }}
      >
        <QRCode value={vm.uuid_qr} size={200} />
      </div>
      <p
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: 'var(--gf-muted)',
          textAlign: 'center',
          wordBreak: 'break-all',
          maxWidth: 260,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        {vm.uuid_qr}
      </p>
      <div style={{ fontWeight: 700, textAlign: 'center', color: 'var(--gf-dark)', fontSize: 15 }}>
        {vm.prenom} {vm.nom}
      </div>
      <a
        href={memberWhatsAppUrl(vm)}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--gf-whatsapp)',
          color: 'var(--gf-white)',
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
          boxSizing: 'border-box',
        }}
      >
        <IconWhatsApp />
        WhatsApp
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '12px 16px',
          borderRadius: 8,
          border: 'none',
          background: 'var(--gf-grad-warning)',
          color: 'var(--gf-white)',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Printer size={20} strokeWidth={2} aria-hidden />
        Imprimer
      </button>
    </div>
  );
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

function SkeletonMemberCard() {
  return (
    <div
      className="gf-card"
      style={{
        padding: 14,
        boxShadow: 'var(--gf-shadow-card)',
        border: '1px solid var(--gf-border)',
        background: 'var(--gf-white)',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div className="gf-skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 6,
          }}
        >
          <div className="gf-skeleton" style={{ width: '85%', height: 14, alignSelf: 'stretch' }} />
          <div className="gf-skeleton" style={{ width: 64, height: 18, borderRadius: 6 }} />
          <div className="gf-skeleton" style={{ width: '55%', height: 10, alignSelf: 'stretch' }} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="gf-skeleton" style={{ width: '100%', height: 12 }} />
        <div className="gf-skeleton" style={{ width: '100%', height: 12 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
        <div className="gf-skeleton" style={{ width: 90, height: 90, borderRadius: 8 }} />
      </div>
      <div className="gf-skeleton" style={{ width: '100%', height: 36, borderRadius: 8 }} />
    </div>
  );
}

// ─── member card ─────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: Member;
  status: MemberStatus;
  initials: string;
  avatarBg: string;
  canEditOrAdd: boolean;
  canDelete: boolean;
  onView: () => void;
  onOpenQr: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function MemberCard({
  member: m,
  status,
  initials,
  avatarBg,
  canEditOrAdd,
  canDelete,
  onView,
  onOpenQr,
  onEdit,
  onDelete,
}: MemberCardProps) {
  const fullName = `${m.prenom} ${m.nom}`.toUpperCase();

  return (
    <div
      className="gf-card"
      style={{
        padding: 0,
        boxShadow: 'var(--gf-shadow-card)',
        border: '1px solid var(--gf-border)',
        background: 'var(--gf-white)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div className="mc-top" style={{ padding: '16px 14px 14px' }}>
        {/* Identité */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: avatarBg,
              color: 'var(--gf-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
            }}
          >
            <div
              style={{
                width: '100%',
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--gf-dark)',
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}
            >
              {fullName}
            </div>
            <div style={{ fontSize: 10, color: 'var(--gf-muted)', marginTop: 3 }}>
              Membre depuis {fmtDate(m.date_inscription ?? m.createdAt)}
            </div>
          </div>
          <div style={{ position: 'absolute', top: -5, right: 10 }}>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f0f2f5', margin: '4px 0' }} />

      {/* Coordonnées */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gf-dark)' }}>
          <Phone size={14} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--gf-muted)' }} aria-hidden />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.phone ?? '—'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gf-dark)' }}>
          <Mail size={14} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--gf-muted)' }} aria-hidden />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email ?? '—'}</span>
        </div>
        <div
          className="ir"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: 12,
            color: 'var(--gf-dark)',
            lineHeight: 1.35,
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7b809a"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: 2 }}
            aria-hidden
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9,22 9,12 15,12 15,22" />
          </svg>
          <span style={{ wordBreak: 'break-word' }}>{m.adresse ?? '—'}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f0f2f5', margin: '4px 0' }} />

      {/* QR */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 14px 10px' }}>
        <div
          style={{
            background: 'var(--gf-white)',
            padding: 6,
            borderRadius: 8,
            border: '1px solid var(--gf-border)',
            lineHeight: 0,
          }}
        >
          <QRCode value={m.uuid_qr} size={90} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid #f0f2f5', margin: '4px 0' }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 'auto', padding: '12px 14px 16px' }}>
        <button
          type="button"
          title="Afficher"
          onClick={onView}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 36,
            padding: '0 10px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--gf-grad-info)',
            color: 'var(--gf-white)',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        <button
          type="button"
          title="QR"
          onClick={onOpenQr}
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 8,
            border: 'none',
            background: 'var(--gf-grad-info)',
            color: 'var(--gf-white)',
            cursor: 'pointer',
          }}
        >
          <QrCodeIcon size={18} strokeWidth={2} aria-hidden />
        </button>
        {canEditOrAdd && (
          <button
            type="button"
            title="Modifier"
            className="gf-btn-action gf-btn-action--edit"
            onClick={onEdit}
            style={{
              width: 36,
              height: 36,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            title="Supprimer"
            className="gf-btn-action gf-btn-action--delete"
            onClick={onDelete}
            style={{
              width: 36,
              height: 36,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
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
  const [viewMember, setViewMember] = useState<Member | null>(null);

  const fetchMembers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/members');
      const data = res.data?.data ?? res.data;
      setMembers(
        Array.isArray(data) ? data.map((row: unknown) => normalizeMemberFromApi(row)) : [],
      );
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
    const deletedId = Number(m.id);
    try {
      await api.delete(`/members/${deletedId}`);
      setMembers((prev) => prev.filter((x) => Number(x.id) !== deletedId));
    } catch {
      alert('Impossible de supprimer ce membre.');
    }
  };

  const canEditOrAdd = role === 'ADMIN' || role === 'CASHIER';
  const canDelete = role === 'ADMIN';

  return (
    <>
      <div className="gf-page">
        <div className="gf-card-outer">
          <div className="gf-card">
            <div className="gf-card-header gf-card-header--info">
              <div>
                <p className="gf-card-header__title">Liste des membres</p>
                <p className="gf-card-header__sub">Gestion des membres inscrits</p>
              </div>
              {canEditOrAdd && (
                <button type="button" className="gf-btn-header" onClick={() => navigate('/members/new')}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                  Ajouter
                </button>
              )}
            </div>

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
                  placeholder="Rechercher un membre..."
                />
              </div>
              <span className="gf-count-label">
                {filtered.length} membre{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

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

            <div className="gf-card-body--table">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonMemberCard key={i} />)
                ) : pageRows.length === 0 ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '48px 0',
                      color: 'var(--gf-muted)',
                      fontSize: 13,
                    }}
                  >
                    Aucun membre trouvé.
                  </div>
                ) : (
                  pageRows.map((m) => {
                    const status = getMemberStatus(m);
                    const initials = getInitials(m);
                    return (
                      <MemberCard
                        key={m.id}
                        member={m}
                        status={status}
                        initials={initials}
                        avatarBg={avatarGradient(m.id)}
                        canEditOrAdd={canEditOrAdd}
                        canDelete={canDelete}
                        onView={() => navigate(`/members/${m.id}`)}
                        onOpenQr={() => setViewMember(m)}
                        onEdit={() => navigate(`/members/${m.id}/edit`)}
                        onDelete={() => handleDelete(m)}
                      />
                    );
                  })
                )}
              </div>
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

      <Modal
        isOpen={!!viewMember}
        onClose={() => setViewMember(null)}
        title="QR Code membre"
        size="md"
      >
        {viewMember && (
          <div id="gf-member-qr-print">
            <MemberQrModalInner vm={viewMember} />
          </div>
        )}
      </Modal>
      {viewMember &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="gf-member-qr-print--portal" aria-hidden>
            <MemberQrModalInner vm={viewMember} />
          </div>,
          document.body,
        )}
    </>
  );
}
