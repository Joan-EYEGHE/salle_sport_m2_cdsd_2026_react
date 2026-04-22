/*
AUDIT CSS GYMFLOW - TransactionsPage.tsx
Problème 1 : Filtres, champs date et cellules tableau en palette hex
Problème 2 : Inputs filtres sans focus bordure bleue explicite
Total : 2 problèmes trouvés
*/
import { useEffect, useState, useCallback } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import api from '../api/axios';
import type { Member, Transaction } from '../types';

/** Sequelize peut sérialiser le include sous `member` (as explicite) ou `Member` (défaut). */
function normalizeTransactionRow(raw: unknown): Transaction {
  const r = raw as Transaction & { Member?: Member };
  return {
    ...r,
    member: r.member ?? r.Member,
  };
}

// ─── constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type TypeFilter = 'ALL' | 'REVENU' | 'DEPENSE';
type PeriodFilter = 'today' | 'week' | 'month' | 'custom';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtMontant(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getDateRange(period: PeriodFilter): { date_start?: string; date_end?: string } {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'today') {
    const s = fmt(today);
    return { date_start: s, date_end: s };
  }
  if (period === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return { date_start: fmt(start), date_end: fmt(today) };
  }
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { date_start: fmt(start), date_end: fmt(today) };
  }
  return {};
}

function filterLocal(txs: Transaction[], type: TypeFilter, period: PeriodFilter, dateStart: string, dateEnd: string): Transaction[] {
  let result = txs;

  if (type !== 'ALL') {
    result = result.filter((t) => t.type === type);
  }

  const range = period === 'custom'
    ? { date_start: dateStart, date_end: dateEnd }
    : getDateRange(period);

  if (range.date_start) {
    const from = new Date(range.date_start);
    result = result.filter((t) => new Date(t.date) >= from);
  }
  if (range.date_end) {
    const to = new Date(range.date_end);
    to.setHours(23, 59, 59, 999);
    result = result.filter((t) => new Date(t.date) <= to);
  }

  return result;
}

function exportCsv(txs: Transaction[]) {
  const header = 'id,date,membre,type,description,montant';
  const rows = txs.map((t) => {
    const membre = t.member ? `${t.member.prenom} ${t.member.nom}` : '';
    const desc = (t.libelle ?? '').replace(/,/g, ';');
    return [t.id, t.date, membre, t.type, desc, t.montant].join(',');
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const n = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  link.download = `transactions_${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── SVG icons (inline, no extra dep) ────────────────────────────────────────

function IconTrending() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gf-white)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconHash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gf-white)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  // raw data from API (unfiltered)
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [period, setPeriod] = useState<PeriodFilter>('month');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // pagination
  const [page, setPage] = useState(1);

  // modale nouvelle dépense
  const [depenseOpen, setDepenseOpen] = useState(false);
  const [depenseLibelle, setDepenseLibelle] = useState('');
  const [depenseMontant, setDepenseMontant] = useState('');
  const [depenseMethode, setDepenseMethode] = useState<'CASH' | 'WAVE' | 'ORANGE'>('CASH');
  const [depenseSubmitting, setDepenseSubmitting] = useState(false);
  const [depenseError, setDepenseError] = useState('');

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // build params for server-side filtering (supported or ignored by backend)
      const params: Record<string, string> = {};
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (period !== 'custom') {
        params.period = period;
      } else {
        if (dateStart) params.date_start = dateStart;
        if (dateEnd) params.date_end = dateEnd;
      }

      const res = await api.get('/transactions', { params });
      const raw = res.data?.data ?? res.data;
      const rawList: unknown[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
      const list: Transaction[] = rawList.map((row) => normalizeTransactionRow(row));
      setAllTransactions(list);
    } catch {
      setError('Impossible de charger les transactions.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, period, dateStart, dateEnd]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [typeFilter, period, dateStart, dateEnd]);

  // ── derived data ───────────────────────────────────────────────────────────

  // apply local filtering on top (handles backends that ignore query params)
  const transactions = filterLocal(allTransactions, typeFilter, period, dateStart, dateEnd);

  const totalRevenus = transactions
    .filter((t) => t.type === 'REVENU')
    .reduce((acc, t) => acc + Number(t.montant), 0);

  const nbTransactions = transactions.length;

  const totalDepenses = transactions
    .filter((t) => t.type === 'DEPENSE')
    .reduce((acc, t) => acc + Number(t.montant), 0);

  // pagination
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + PAGE_SIZE, transactions.length);
  const pageRows = transactions.slice(pageStart, pageEnd);

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleExport = () => {
    exportCsv(transactions);
  };

  const handleTypeFilter = (v: TypeFilter) => {
    setTypeFilter(v);
  };

  const handlePeriod = (v: PeriodFilter) => {
    setPeriod(v);
    if (v !== 'custom') {
      setDateStart('');
      setDateEnd('');
    }
  };

  const handleDepenseSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!depenseLibelle.trim() || !depenseMontant) return;
    setDepenseSubmitting(true);
    setDepenseError('');
    try {
      await api.post('/transactions', {
        type: 'DEPENSE',
        libelle: depenseLibelle.trim(),
        montant: Number(depenseMontant),
        methode_paiement: depenseMethode,
        date: new Date().toISOString(),
      });
      setDepenseOpen(false);
      setDepenseLibelle('');
      setDepenseMontant('');
      setDepenseMethode('CASH');
      await fetchTransactions();
    } catch {
      setDepenseError('Erreur lors de l\'enregistrement. Veuillez réessayer.');
    } finally {
      setDepenseSubmitting(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  const kpis = [
    {
      label: 'Total revenus',
      value: fmtMontant(totalRevenus),
      icon: <IconTrending />,
      gradient: 'linear-gradient(135deg,#66BB6A,#43A047)',
    },
    {
      label: 'Nb transactions',
      value: String(nbTransactions),
      icon: <IconHash />,
      gradient: 'linear-gradient(135deg,#49a3f1,#1A73E8)',
    },
    {
      label: 'Total dépenses',
      value: fmtMontant(totalDepenses),
      icon: <IconTrending />,
      gradient: 'linear-gradient(135deg,#ef5350,#F44335)',
    },
  ];

  const typePills: { label: string; value: TypeFilter }[] = [
    { label: 'Tout', value: 'ALL' },
    { label: 'Revenu', value: 'REVENU' },
    { label: 'Dépenses', value: 'DEPENSE' },
  ];

  const periodOptions: { label: string; value: PeriodFilter }[] = [
    { label: "Aujourd'hui", value: 'today' },
    { label: 'Cette semaine', value: 'week' },
    { label: 'Ce mois', value: 'month' },
    { label: 'Personnalisé', value: 'custom' },
  ];

  const thCols = ['Date', 'Type', 'Description', 'Montant'];

  return (
    <>
      <div className="gf-page">
        {/* ── KPI mini-row ──────────────────────────────────────────────── */}
        <div className="gf-kpi-grid-3 gf-page-top">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="gf-kpi-card"
              style={{
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#f8f9fa',
                boxShadow: 'none',
              }}
            >
              {/* icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: kpi.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {kpi.icon}
              </div>
              {/* text */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--gf-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    marginBottom: 2,
                  }}
                >
                  {kpi.label}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--gf-dark)',
                    lineHeight: 1.2,
                  }}
                >
                  {loading ? '—' : kpi.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── card wrapper ──────────────────────────────────────────────── */}
        <div className="gf-card-outer">
          <div className="gf-card">
          {/* ── floating header ─────────────────────────────────────────── */}
          <div className="gf-card-header gf-card-header--info">
            <div>
              <p className="gf-card-header__title">Transactions</p>
              <p className="gf-card-header__sub">Historique des paiements et mouvements</p>
            </div>
            <button
              type="button"
              className="gf-btn-header"
              onClick={() => setDepenseOpen(true)}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
              Nouvelle dépense
            </button>
          </div>

          {/* ── toolbar ─────────────────────────────────────────────────── */}
          <div className="gf-toolbar">
            <div style={{ display: 'flex', gap: 6 }}>
              {typePills.map((pill) => {
                const active = typeFilter === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => handleTypeFilter(pill.value)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: `1px solid ${active ? '#1A73E8' : 'var(--gf-border)'}`,
                      background: active ? '#1A73E8' : 'var(--gf-white)',
                      color: active ? 'var(--gf-white)' : 'var(--gf-muted)',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* period select */}
              <select
                value={period}
                onChange={(e) => handlePeriod(e.target.value as PeriodFilter)}
                style={{
                  border: '1px solid var(--gf-border)',
                  borderRadius: 8,
                  padding: '7px 10px',
                  fontSize: 12,
                  color: 'var(--gf-dark)',
                  background: 'var(--gf-white)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#1A73E8';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--gf-border)';
                }}
              >
                {periodOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* custom date range */}
              {period === 'custom' && (
                <>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    style={{
                      border: '1px solid var(--gf-border)',
                      borderRadius: 8,
                      padding: '7px 10px',
                      fontSize: 12,
                      color: 'var(--gf-dark)',
                      background: 'var(--gf-white)',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--gf-border)';
                    }}
                  />
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    style={{
                      border: '1px solid var(--gf-border)',
                      borderRadius: 8,
                      padding: '7px 10px',
                      fontSize: 12,
                      color: 'var(--gf-dark)',
                      background: 'var(--gf-white)',
                      outline: 'none',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1A73E8';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'var(--gf-border)';
                    }}
                  />
                </>
              )}

              {/* export button */}
              <button
                type="button"
                onClick={handleExport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid var(--gf-border)',
                  borderRadius: 8,
                  background: 'var(--gf-white)',
                  color: 'var(--gf-dark)',
                  fontSize: 12,
                  fontWeight: 700,
                  padding: '7px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--gf-white)')}
              >
                <IconDownload />
                Exporter
              </button>
            </div>
          </div>

          {/* ── error ───────────────────────────────────────────────────── */}
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

          {/* ── table ───────────────────────────────────────────────────── */}
          <div className="gf-card-body--table">
            <table className="gf-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  {thCols.map((col) => (
                    <th
                      key={col}
                      style={col === 'Montant' ? { textAlign: 'right' } : undefined}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gf-muted)', fontSize: 13 }}
                    >
                      Chargement…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gf-muted)', fontSize: 13 }}
                    >
                      Aucune transaction trouvée.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((tx) => {
                    const isRevenu = tx.type === 'REVENU';

                    return (
                      <TxRow
                        key={tx.id}
                        tx={tx}
                        isRevenu={isRevenu}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── pagination ──────────────────────────────────────────────── */}
          {!loading && transactions.length > 0 && (
            <div className="gf-pagination">
              <span className="gf-pagination__info">
                Affichage {pageStart + 1}–{pageEnd} sur {transactions.length}
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

      {depenseOpen && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000, padding: 24,
          }}
          onClick={() => setDepenseOpen(false)}
        >
          <div
            style={{
              background: 'var(--gf-white)',
              borderRadius: 12,
              boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
              width: '100%', maxWidth: 440,
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              background: 'var(--gf-grad-error)',
              borderRadius: '12px 12px 0 0',
              padding: '14px 20px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
            }}
            >
              <div>
                <p style={{ color: 'var(--gf-white)', fontSize: 14, fontWeight: 700, margin: 0 }}>
                  Nouvelle dépense
                </p>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: '3px 0 0' }}>
                  Enregistrer une sortie de caisse
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDepenseOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  color: 'var(--gf-white)', width: 28, height: 28,
                  borderRadius: 6, cursor: 'pointer', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            <form
              onSubmit={handleDepenseSubmit}
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--gf-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}
                >
                  Description <span style={{ color: '#F44335' }}>*</span>
                </label>
                <input
                  type="text"
                  value={depenseLibelle}
                  onChange={(e) => setDepenseLibelle(e.target.value)}
                  placeholder="Ex: Achat matériel, loyer, entretien..."
                  required
                  style={{
                    border: '1px solid var(--gf-border)', borderRadius: 8,
                    padding: '10px 14px', fontSize: 13, color: 'var(--gf-dark)',
                    outline: 'none', fontFamily: 'inherit', width: '100%',
                    boxSizing: 'border-box' as const,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#F44335'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--gf-border)'; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--gf-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}
                >
                  Montant (FCFA) <span style={{ color: '#F44335' }}>*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  value={depenseMontant}
                  onChange={(e) => setDepenseMontant(e.target.value)}
                  placeholder="Ex: 25000"
                  required
                  style={{
                    border: '1px solid var(--gf-border)', borderRadius: 8,
                    padding: '10px 14px', fontSize: 13, color: 'var(--gf-dark)',
                    outline: 'none', fontFamily: 'inherit', width: '100%',
                    boxSizing: 'border-box' as const,
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#F44335'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--gf-border)'; }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--gf-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                }}
                >
                  Méthode de paiement
                </label>
                <select
                  value={depenseMethode}
                  onChange={(e) => setDepenseMethode(e.target.value as 'CASH' | 'WAVE' | 'ORANGE')}
                  style={{
                    border: '1px solid var(--gf-border)', borderRadius: 8,
                    padding: '10px 14px', fontSize: 13, color: 'var(--gf-dark)',
                    outline: 'none', fontFamily: 'inherit', width: '100%',
                    boxSizing: 'border-box' as const, background: 'var(--gf-white)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="CASH">Cash</option>
                  <option value="WAVE">Wave</option>
                  <option value="ORANGE">Orange Money</option>
                </select>
              </div>

              {depenseError && (
                <p style={{ fontSize: 13, color: '#F44335', margin: 0 }}>{depenseError}</p>
              )}

              <div style={{
                display: 'flex', gap: 10, paddingTop: 8,
                borderTop: '1px solid var(--gf-bg)',
              }}
              >
                <button
                  type="button"
                  onClick={() => setDepenseOpen(false)}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: '1px solid var(--gf-border)',
                    background: 'var(--gf-white)', color: 'var(--gf-muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}
                >Annuler</button>
                <button
                  type="submit"
                  disabled={depenseSubmitting || !depenseLibelle.trim() || !depenseMontant}
                  style={{
                    flex: 2, padding: '10px 0', borderRadius: 8, border: 'none',
                    background: depenseSubmitting || !depenseLibelle.trim() || !depenseMontant
                      ? '#a0aec0'
                      : 'var(--gf-grad-error)',
                    color: 'var(--gf-white)', fontSize: 13, fontWeight: 600,
                    cursor: depenseSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {depenseSubmitting ? 'Enregistrement…' : 'Enregistrer la dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── row sub-component ────────────────────────────────────────────────────────

interface TxRowProps {
  tx: Transaction;
  isRevenu: boolean;
}

function TxRow({ tx, isRevenu }: TxRowProps) {
  const tdBase: CSSProperties = {
    fontSize: 13,
  };

  return (
    <tr>
      {/* Date */}
      <td style={{ ...tdBase, color: 'var(--gf-muted)', whiteSpace: 'nowrap' }}>
        {fmtDate(tx.date)}
      </td>

      {/* Type badge */}
      <td style={tdBase}>
        <span
          className={`gf-badge ${isRevenu ? 'gf-badge--active' : 'gf-badge--inactive'}`}
        >
          {isRevenu ? 'Revenu' : 'Dépense'}
        </span>
      </td>

      {/* Description */}
      <td style={{ ...tdBase, color: 'var(--gf-dark)', maxWidth: 260 }}>
        {tx.libelle ?? '—'}
      </td>

      {/* Montant */}
      <td
        style={{
          ...tdBase,
          textAlign: 'right',
          fontWeight: 700,
          color: isRevenu ? '#43A047' : '#F44335',
          whiteSpace: 'nowrap',
        }}
      >
        {isRevenu ? '+' : '−'}{fmtMontant(Number(tx.montant))}
      </td>
    </tr>
  );
}
