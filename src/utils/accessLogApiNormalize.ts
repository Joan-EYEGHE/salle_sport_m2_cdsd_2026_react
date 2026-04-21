import type { AccessLog } from '../types';

function pickDateScan(r: Record<string, unknown>): string | undefined {
  const v = r.date_scan ?? r.dateScan ?? r.DateScan;
  if (v == null || v === '') return undefined;
  if (typeof v === 'string') return v;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/**
 * Sérialisation Sequelize / proxies : dates et enums parfois sous d’autres clés.
 */
export function normalizeAccessLogFromApi(raw: unknown): AccessLog {
  const r = raw as AccessLog & Record<string, unknown>;
  const date_scan = pickDateScan(r as Record<string, unknown>) ?? (r.date_scan != null ? String(r.date_scan) : '');
  const rawRes = String(r.resultat ?? '').trim().toUpperCase();
  const resultat =
    rawRes === 'SUCCES' || rawRes === 'SUCCESS' ? 'SUCCES' : rawRes === 'ECHEC' ? 'ECHEC' : rawRes || 'ECHEC';
  return { ...r, date_scan, resultat };
}
