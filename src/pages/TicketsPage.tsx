/*
AUDIT CSS GYMFLOW - TicketsPage.tsx
Problème 1 : @keyframes shimmer dupliqués (inline + balise style) — L48-66, L287-291
Problème 2 : Couleurs hex en inline (#f0f2f5, #344767, #7b809a, #d2d6da, white, #fff) — multiples lignes
Problème 3 : Focus modale génération — onBlur utilisait #d2d6da au lieu de var(--gf-border)
Total : 3 problèmes trouvés
*/
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
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

const CARD_BG_BY_STATUS: Record<TicketType['status'], string> = {
  DISPONIBLE: '#eaf7ea',
  VENDU: '#e8f4fd',
  UTILISE: '#eceff1',
  EXPIRE: '#fde8e8',
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

function ticketExt(t: TicketType) {
  return t as TicketType & Record<string, unknown>;
}

function ticketCreatedAtStr(t: TicketType): string | undefined {
  const ext = ticketExt(t);
  if (typeof t.createdAt === 'string') return t.createdAt;
  return (ext.created_at as string | undefined) ?? (ext.createdAt as string | undefined);
}

function ticketActivityNom(t: TicketType): string {
  return t.activity?.nom ?? t.batch?.activity?.nom ?? '—';
}

function ticketPriceDisplay(t: TicketType): string {
  const p = t.batch?.prix_unitaire_applique;
  if (p == null || Number.isNaN(Number(p))) return '—';
  return `${p} FCFA`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Corps axios après `PUT /tickets/:id/sell` : `{ success, data }` ou données brutes. */
function payloadFromSellResponse(data: unknown): unknown {
  if (!isRecord(data)) return data;
  if (data.data !== undefined) return data.data;
  return data;
}

function openWhatsAppTicket(t: TicketType) {
  const lines = [
    'Ticket GymFlow',
    `Code: ${t.code_ticket}`,
    `Activité: ${ticketActivityNom(t)}`,
    `Prix: ${ticketPriceDisplay(t)}`,
    `Expire le: ${fmtDate(t.date_expiration)}`,
  ];
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE_CLASS[status] ?? 'gf-badge';
  return <span className={cls}>{STATUS_LABELS[status] ?? status}</span>;
}

function SkeletonCard() {
  return (
    <div
      className="gf-card"
      style={{
        padding: 14,
        boxShadow: 'var(--gf-shadow-card)',
        border: '1px solid var(--gf-border)',
        background: 'var(--gf-white)',
      }}
    >
      <div className="gf-skeleton" style={{ width: '70%', height: 14, marginBottom: 10 }} />
      <div className="gf-skeleton" style={{ width: '90%', height: 12, marginBottom: 12 }} />
      <div className="gf-skeleton" style={{ width: '100%', height: 1, marginBottom: 10 }} />
      <div className="gf-skeleton" style={{ width: '85%', height: 11, marginBottom: 6 }} />
      <div className="gf-skeleton" style={{ width: '80%', height: 11, marginBottom: 6 }} />
      <div className="gf-skeleton" style={{ width: '75%', height: 11, marginBottom: 12 }} />
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <div className="gf-skeleton" style={{ width: 96, height: 96, borderRadius: 8 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="gf-skeleton" style={{ flex: 1, height: 40, borderRadius: 8 }} />
        <div className="gf-skeleton" style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0 }} />
      </div>
    </div>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

interface ReceiptTicketPanelProps {
  t: TicketType;
  onClose: () => void;
}

function ReceiptTicketPanel({ t, onClose }: ReceiptTicketPanelProps) {
  const codeLong = t.code_ticket.length > 24;
  const codeBlockStyle: CSSProperties = {
    width: '100%',
    fontFamily: 'monospace',
    fontSize: codeLong ? 11 : 12,
    fontWeight: 700,
    color: 'var(--gf-dark)',
    background: '#f0f2f5',
    borderRadius: 8,
    padding: '10px 12px',
    textAlign: 'center',
    wordBreak: 'break-all',
    whiteSpace: 'normal',
    ...(codeLong ? { letterSpacing: '-0.3px' } : {}),
  };
  const infoRow: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  };
  const infoLabel: CSSProperties = {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  };
  const infoValue: CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#111',
  };
  return (
    <>
      <div
        style={{
          background: 'var(--gf-grad-info)',
          padding: '16px 44px 16px 18px',
          position: 'relative',
          borderRadius: '12px 12px 0 0',
          boxShadow: 'var(--gf-shadow-header-info)',
        }}
      >
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          style={{
            position: 'absolute',
            right: 10,
            top: 10,
            width: 30,
            height: 30,
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.45)',
            background: 'rgba(255,255,255,0.2)',
            color: 'var(--gf-white)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
        <p style={{ color: 'var(--gf-white)', fontSize: 18, fontWeight: 700, margin: 0 }}>GymFlow</p>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 12, margin: '5px 0 0' }}>Ticket d&apos;accès séance</p>
      </div>
      <div style={{ padding: '20px 18px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ background: 'var(--gf-white)', padding: 10, borderRadius: 12, border: '1px solid var(--gf-border)' }}>
          <QRCode value={t.code_ticket} size={160} />
        </div>
        <div style={codeBlockStyle}>{t.code_ticket}</div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={infoRow}>
            <span style={infoLabel}>Activité</span>
            <span style={infoValue}>{ticketActivityNom(t)}</span>
          </div>
          <div style={infoRow}>
            <span style={infoLabel}>Prix</span>
            <span style={infoValue}>{ticketPriceDisplay(t)}</span>
          </div>
          <div style={infoRow}>
            <span style={infoLabel}>Généré le</span>
            <span style={infoValue}>{fmtDate(ticketCreatedAtStr(t))}</span>
          </div>
          <div style={infoRow}>
            <span style={infoLabel}>Expire le</span>
            <span style={{ ...infoValue, color: '#e53935' }}>{fmtDate(t.date_expiration)}</span>
          </div>
        </div>
        <p
          style={{
            fontSize: 11,
            color: 'var(--gf-muted)',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.45,
          }}
        >
          Présentez ce QR code à l&apos;entrée · Valable 24h · Non remboursable
        </p>
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
          <button
            type="button"
            onClick={() => openWhatsAppTicket(t)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#25D366',
              color: 'var(--gf-white)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <IconWhatsApp />
            Envoyer
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '11px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#B8860B',
              color: 'var(--gf-white)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Printer size={18} strokeWidth={2} />
            Imprimer
          </button>
        </div>
      </div>
    </>
  );
}

// ─── KPI card ────────────────────────────────────────────────────────────────

interface KpiMiniProps {
  label: string;
  value: number;
  gradient: string;
  icon: ReactNode;
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

// ─── Ticket card ─────────────────────────────────────────────────────────────

interface TicketCardProps {
  ticket: TicketType;
  onOpenQr: () => void;
  canSell: boolean;
  onSell: (ticket: TicketType) => void | Promise<void>;
  onOpenReceipt: (ticket: TicketType) => void;
  isSelling: boolean;
}

function TicketCard({ ticket: t, onOpenQr, canSell, onSell, onOpenReceipt, isSelling }: TicketCardProps) {
  const bg = CARD_BG_BY_STATUS[t.status] ?? 'var(--gf-white)';
  const activityNom = ticketActivityNom(t);
  const sep = { borderTop: '1px solid var(--gf-border)', margin: '10px 0' } as const;
  const statusDisponible = t.status === 'DISPONIBLE';
  const canVendre = statusDisponible && canSell;
  const sellDisabled = !canVendre || isSelling;
  const showReceiptBtn =
    t.status === 'VENDU' || t.status === 'UTILISE' || t.status === 'EXPIRE';

  return (
    <div
      className="gf-card"
      style={{
        padding: 14,
        boxShadow: 'var(--gf-shadow-card)',
        border: '1px solid var(--gf-border)',
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--gf-dark)',
            lineHeight: 1.35,
            maxWidth: 'calc(100% - 70px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {t.code_ticket}
        </span>
        <StatusBadge status={t.status} />
      </div>

      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gf-dark)', margin: '10px 0 0', lineHeight: 1.35 }}>
        {activityNom}
      </p>

      <div style={sep} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gf-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Prix</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gf-dark)' }}>{ticketPriceDisplay(t)}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gf-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Généré le</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gf-dark)' }}>{fmtDate(ticketCreatedAtStr(t))}</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--gf-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Expire le</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gf-dark)' }}>{fmtDate(t.date_expiration)}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, marginBottom: 4 }}>
        <div style={{ background: 'var(--gf-white)', padding: 6, borderRadius: 8, border: '1px solid var(--gf-border)' }}>
          <QRCode value={t.code_ticket} size={96} />
        </div>
      </div>

      <div style={sep} />

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          type="button"
          onClick={onOpenQr}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--gf-grad-info)',
            color: 'var(--gf-white)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--gf-shadow-kpi-info)',
          }}
        >
          <QrCode size={18} strokeWidth={2} />
          Voir le code QR
        </button>
        {showReceiptBtn ? (
          <button
            type="button"
            title="Bon de ticket"
            onClick={() => onOpenReceipt(t)}
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 8,
              border: 'none',
              background: '#eceff1',
              color: 'var(--gf-dark)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            <Printer size={18} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            title={canVendre ? 'Vendre ce ticket' : 'Vendre (réservé caisse / admin)'}
            disabled={sellDisabled}
            onClick={() => {
              if (canVendre) void onSell(t);
            }}
            style={{
              width: 44,
              height: 44,
              flexShrink: 0,
              borderRadius: 8,
              border: 'none',
              background: canVendre ? '#e91e63' : '#eceff1',
              color: canVendre ? 'var(--gf-white)' : 'var(--gf-dark)',
              fontSize: 9,
              fontWeight: 700,
              lineHeight: 1.1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: sellDisabled ? 'not-allowed' : 'pointer',
              opacity: canVendre ? 1 : 0.5,
              padding: 2,
            }}
          >
            Vendre
          </button>
        )}
      </div>
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
  const [sellTicket, setSellTicket] = useState<TicketType | null>(null);
  const [sellError, setSellError] = useState('');
  const [sellingId, setSellingId] = useState<number | null>(null);

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

  useEffect(() => {
    if (!sellTicket) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sellTicket]);

  useEffect(() => {
    if (!sellError) return;
    const tid = window.setTimeout(() => setSellError(''), 4000);
    return () => window.clearTimeout(tid);
  }, [sellError]);

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

  const sellTicketFlow = async (id: number): Promise<TicketType | null> => {
    setSellError('');
    setSellingId(id);
    try {
      const res = await api.put(`/tickets/${id}/sell`);
      const raw = payloadFromSellResponse(res.data);
      const normalized = normalizeTicketRow(raw);
      setTickets((prev) => prev.map((x) => (x.id === id ? normalized : x)));
      setViewTicket((vt) => (vt?.id === id ? normalized : vt));
      return normalized;
    } catch {
      setSellError('La vente du ticket a échoué.');
      return null;
    } finally {
      setSellingId(null);
    }
  };

  const handleSellFromCard = async (t: TicketType) => {
    const updated = await sellTicketFlow(t.id);
    if (updated) setSellTicket(updated);
  };

  const handleSellFromQrModal = async () => {
    if (!viewTicket) return;
    const updated = await sellTicketFlow(viewTicket.id);
    if (updated) {
      setViewTicket(null);
      setSellTicket(updated);
    }
  };

  const handleGenerateBatch = async (e: FormEvent) => {
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
          {sellError && (
            <div
              style={{
                margin: '8px 20px 0',
                background: '#fde8e8',
                color: '#F44335',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
              }}
            >
              {sellError}
            </div>
          )}

          {/* ── Grille cartes tickets ── */}
          <div className="gf-card-body--table">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
              ) : pageRows.length === 0 ? (
                <div
                  className="col-span-full"
                  style={{
                    textAlign: 'center',
                    padding: '48px 0',
                    color: 'var(--gf-muted)',
                    fontSize: 13,
                  }}
                >
                  Aucun ticket trouvé.
                </div>
              ) : (
                pageRows.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    onOpenQr={() => setViewTicket(t)}
                    canSell={canWrite}
                    onSell={handleSellFromCard}
                    onOpenReceipt={(ticket) => setSellTicket(ticket)}
                    isSelling={sellingId === t.id}
                  />
                ))
              )}
            </div>
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

      {/* ── Modale : QR ticket ── */}
      <Modal
        isOpen={!!viewTicket}
        onClose={() => setViewTicket(null)}
        title="Ticket QR Code"
        size="md"
      >
        {viewTicket && (() => {
          const qrDispo = viewTicket.status === 'DISPONIBLE' && canWrite;
          const qrWaPrint = viewTicket.status === 'VENDU';
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ background: 'var(--gf-white)', padding: 12, borderRadius: 12, border: '1px solid var(--gf-border)' }}>
                <QRCode value={viewTicket.code_ticket} size={200} />
              </div>
              <div
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 13,
                  color: 'var(--gf-dark)',
                  lineHeight: 1.6,
                  padding: '0 4px',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{viewTicket.code_ticket}</span>
                <span style={{ color: 'var(--gf-muted)', margin: '0 6px' }}>·</span>
                <span>{ticketActivityNom(viewTicket)}</span>
                <span style={{ color: 'var(--gf-muted)', margin: '0 6px' }}>·</span>
                <span style={{ fontWeight: 600 }}>{ticketPriceDisplay(viewTicket)}</span>
              </div>
              <button
                type="button"
                disabled={!qrDispo || sellingId === viewTicket.id}
                onClick={() => void handleSellFromQrModal()}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: qrDispo ? '#e91e63' : '#eceff1',
                  color: qrDispo ? 'var(--gf-white)' : 'var(--gf-dark)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: qrDispo && sellingId !== viewTicket.id ? 'pointer' : 'not-allowed',
                  opacity: qrDispo ? 1 : 0.5,
                }}
              >
                {qrDispo ? 'Vendre ce ticket' : 'Vendu ✓'}
              </button>
              <button
                type="button"
                disabled={!qrWaPrint}
                onClick={() => openWhatsAppTicket(viewTicket)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#25D366',
                  color: 'white',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: qrWaPrint ? 'pointer' : 'not-allowed',
                  opacity: qrWaPrint ? 1 : 0.45,
                }}
              >
                <IconWhatsApp />
                Partager
              </button>
              <button
                type="button"
                disabled={!qrWaPrint}
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
                  background: 'linear-gradient(195deg, #FFA726, #fb8c00)',
                  color: 'var(--gf-white)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: qrWaPrint ? 'pointer' : 'not-allowed',
                  opacity: qrWaPrint ? 1 : 0.45,
                  boxShadow: qrWaPrint ? '0 3px 10px rgba(251,140,0,0.3)' : 'none',
                }}
              >
                <Printer size={20} strokeWidth={2} />
                Imprimer
              </button>
            </div>
          );
        })()}
      </Modal>

      {typeof document !== 'undefined' && sellTicket != null && createPortal(
        <div
          className="gf-receipt-backdrop"
          role="presentation"
          onClick={() => {
            setSellTicket(null);
            setSellError('');
          }}
        >
          <div
            id="gf-receipt-print"
            className="gf-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gf-receipt-title"
            style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--gf-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              id="gf-receipt-title"
              style={{
                position: 'absolute',
                width: 1,
                height: 1,
                padding: 0,
                margin: -1,
                overflow: 'hidden',
                clip: 'rect(0,0,0,0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              Bon ticket {sellTicket.code_ticket}
            </span>
            <ReceiptTicketPanel
              t={sellTicket}
              onClose={() => {
                setSellTicket(null);
                setSellError('');
              }}
            />
          </div>
        </div>,
        document.body,
      )}

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
