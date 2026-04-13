/*
AUDIT CSS GYMFLOW - TransactionsPage.tsx
Problème 1 : Filtres, champs date et cellules tableau en palette hex
Problème 2 : Inputs filtres sans focus bordure bleue explicite
Total : 2 problèmes trouvés
*/
import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import type { Transaction } from '../types';

// ─── constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

type TypeFilter = 'ALL' | 'REVENU' | 'DEPENSE';
type PeriodFilter = 'today' | 'week' | 'month' | 'custom';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtMontant(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
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
  link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
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

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gf-white)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
      const list: Transaction[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
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
    .reduce((acc, t) => acc + t.montant, 0);

  const nbTransactions = transactions.length;

  const membresPayants = new Set(
    transactions.filter((t) => t.id_membre != null).map((t) => t.id_membre)
  ).size;

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
      label: 'Membres payants',
      value: String(membresPayants),
      icon: <IconUsers />,
      gradient: 'linear-gradient(135deg,#EC407A,#D81B60)',
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

  const thCols = ['Date', 'Membre', 'Type', 'Description', 'Montant'];

  return (
    <>
      <div className="gf-page" style={{ minHeight: 'calc(100vh - 60px)' }}>
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
                      colSpan={5}
                      style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gf-muted)', fontSize: 13 }}
                    >
                      Chargement…
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: 'center', padding: '48px 0', color: 'var(--gf-muted)', fontSize: 13 }}
                    >
                      Aucune transaction trouvée.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((tx) => {
                    const isRevenu = tx.type === 'REVENU';
                    const membre = tx.member
                      ? `${tx.member.prenom} ${tx.member.nom}`
                      : '—';

                    return (
                      <TxRow
                        key={tx.id}
                        tx={tx}
                        isRevenu={isRevenu}
                        membre={membre}
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
    </>
  );
}

// ─── row sub-component ────────────────────────────────────────────────────────

interface TxRowProps {
  tx: Transaction;
  isRevenu: boolean;
  membre: string;
}

function TxRow({ tx, isRevenu, membre }: TxRowProps) {
  const tdBase: React.CSSProperties = {
    fontSize: 13,
  };

  return (
    <tr>
      {/* Date */}
      <td style={{ ...tdBase, color: 'var(--gf-muted)', whiteSpace: 'nowrap' }}>
        {fmtDate(tx.date)}
      </td>

      {/* Membre */}
      <td style={{ ...tdBase, color: 'var(--gf-dark)' }}>
        {membre}
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
        {isRevenu ? '+' : '−'}{fmtMontant(tx.montant)}
      </td>
    </tr>
  );
}
