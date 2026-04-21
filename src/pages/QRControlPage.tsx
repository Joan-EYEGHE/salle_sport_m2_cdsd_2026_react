/*
AUDIT CSS GYMFLOW - QRControlPage.tsx
Problème 1 : Couleurs palette et bordures en dur (zone scan, saisie manuelle, liste)
Problème 2 : onBlur sur champ manuel utilisait hex bordure
Total : 2 problèmes trouvés
*/
import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Users, Ticket } from 'lucide-react';
import jsQR from 'jsqr';
import api from '../api/axios';
import Loader from '../components/Loader';
import type { AccessLog, Activity, Batch, Ticket as TicketEntity } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface VerifyResult {
  success: boolean;
  message: string;
  membre?: { nom: string; prenom: string };
  subscription?: { type_forfait: string; date_prochain_paiement: string };
  ticket?: {
    code_ticket: string;
    activity?: { nom: string };
    date_expiration: string;
  };
  member_info?: {
    nom: string;
    prenom: string;
    subscription?: {
      type_forfait: string;
      date_prochain_paiement: string;
      activity?: { nom: string } | null;
    } | null;
  } | null;
}

/** Réponse `POST /members/validate-qr`. */
interface MemberValidateResponse {
  success: boolean;
  valid: boolean;
  reason: string | null;
  member_info: {
    id: number;
    nom: string;
    prenom: string;
    uuid_qr: string;
    subscription: {
      type_forfait: string;
      date_prochain_paiement: string;
      activity?: { nom: string } | null;
    } | null;
  } | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseMemberValidateResponse(raw: unknown): MemberValidateResponse | null {
  if (!isRecord(raw)) return null;
  if (raw.success !== true) return null;
  if (typeof raw.valid !== 'boolean') return null;
  const reason =
    raw.reason === null ? null : typeof raw.reason === 'string' ? raw.reason : null;
  if (!('member_info' in raw)) return null;
  return {
    success: true,
    valid: raw.valid,
    reason,
    member_info: raw.member_info as MemberValidateResponse['member_info'],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Corps renvoyé par `POST /tickets/validate` (TicketController + TicketService.validate). */
interface TicketValidateResponse {
  success: boolean;
  valid: boolean;
  reason: string | null;
  ticket_info: unknown;
}

function parseTicketValidateResponse(raw: unknown): TicketValidateResponse | null {
  if (!isRecord(raw)) return null;
  if (raw.success !== true) return null;
  if (typeof raw.valid !== 'boolean') return null;
  const reason =
    raw.reason === null ? null : typeof raw.reason === 'string' ? raw.reason : null;
  if (!('ticket_info' in raw)) return null;
  return { success: true, valid: raw.valid, reason, ticket_info: raw.ticket_info };
}

function extractActivityNomFromTicketRecord(info: Record<string, unknown>): string | undefined {
  const batch = info.batch ?? info.Batch;
  if (isRecord(batch)) {
    const act = batch.activity ?? batch.Activity;
    if (isRecord(act) && typeof act.nom === 'string') return act.nom;
  }
  const act = info.activity ?? info.Activity;
  if (isRecord(act) && typeof act.nom === 'string') return act.nom;
  return undefined;
}

function mapTicketInfoToVerifyTicket(info: unknown): VerifyResult['ticket'] | undefined {
  if (!isRecord(info)) return undefined;
  if (typeof info.code_ticket !== 'string') return undefined;
  let date_expiration: string;
  if (typeof info.date_expiration === 'string') date_expiration = info.date_expiration;
  else if (info.date_expiration instanceof Date) date_expiration = info.date_expiration.toISOString();
  else return undefined;
  const activityNom = extractActivityNomFromTicketRecord(info);
  return {
    code_ticket: info.code_ticket,
    date_expiration,
    ...(activityNom !== undefined ? { activity: { nom: activityNom } } : {}),
  };
}

function mapValidateResponseToVerifyResult(body: TicketValidateResponse): VerifyResult {
  return {
    success: body.valid,
    message: body.valid ? 'Accès autorisé' : (body.reason ?? 'Accès refusé.'),
    ticket: mapTicketInfoToVerifyTicket(body.ticket_info),
  };
}

function placeholderActivity(nom: string, id: number): Activity {
  return {
    id,
    nom,
    status: true,
    frais_inscription: 0,
    prix_ticket: 0,
    prix_hebdomadaire: 0,
    prix_mensuel: 0,
    prix_trimestriel: 0,
    prix_annuel: 0,
    isMonthlyOnly: false,
  };
}

/** Ticket minimal pour la ligne d’historique optimiste (liste du jour). */
function mapTicketInfoToAccessLogTicket(info: unknown): TicketEntity | undefined {
  if (!isRecord(info)) return undefined;
  if (typeof info.code_ticket !== 'string') return undefined;
  const id = typeof info.id === 'number' ? info.id : 0;
  const id_batch = typeof info.id_batch === 'number' ? info.id_batch : 0;
  let date_expiration: string;
  if (typeof info.date_expiration === 'string') date_expiration = info.date_expiration;
  else if (info.date_expiration instanceof Date) date_expiration = info.date_expiration.toISOString();
  else return undefined;
  const statusRaw = info.status;
  const status: TicketEntity['status'] =
    statusRaw === 'DISPONIBLE' || statusRaw === 'VENDU' || statusRaw === 'UTILISE' || statusRaw === 'EXPIRE'
      ? statusRaw
      : 'UTILISE';

  let batch: Batch | undefined;
  const b = info.batch ?? info.Batch;
  if (isRecord(b)) {
    const act = b.activity ?? b.Activity;
    const nom = isRecord(act) && typeof act.nom === 'string' ? act.nom : undefined;
    if (nom !== undefined) {
      const bid = typeof b.id === 'number' ? b.id : 0;
      const id_activity = typeof b.id_activity === 'number' ? b.id_activity : 0;
      const quantite = typeof b.quantite === 'number' ? b.quantite : 0;
      const prixRaw = b.prix_unitaire_applique;
      const prix =
        typeof prixRaw === 'number'
          ? prixRaw
          : typeof prixRaw === 'string'
            ? Number(prixRaw)
            : 0;
      const actId = isRecord(act) && typeof act.id === 'number' ? act.id : 0;
      batch = {
        id: bid,
        id_activity,
        quantite,
        prix_unitaire_applique: Number.isFinite(prix) ? prix : 0,
        activity: placeholderActivity(nom, actId),
      };
    }
  }

  return {
    id,
    code_ticket: info.code_ticket,
    id_batch,
    status,
    date_expiration,
    ...(batch !== undefined ? { batch } : {}),
  };
}

function readIdTicketFromPayload(ticketInfo: unknown): number | undefined {
  if (!isRecord(ticketInfo)) return undefined;
  return typeof ticketInfo.id === 'number' ? ticketInfo.id : undefined;
}

function axiosErrorMessage(err: unknown, fallback: string): string {
  if (!isRecord(err)) return fallback;
  const response = err.response;
  if (!isRecord(response)) return fallback;
  const data = response.data;
  if (!isRecord(data)) return fallback;
  const message = data.message;
  return typeof message === 'string' ? message : fallback;
}

interface KpiData {
  total: number;
  uniques: number;
  tickets: number;
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function QrIcon({ size = 48, color = '#b0b7c3' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="5" y="5" width="3" height="3" fill={color} stroke="none" />
      <rect x="16" y="5" width="3" height="3" fill={color} stroke="none" />
      <rect x="5" y="16" width="3" height="3" fill={color} stroke="none" />
      <path d="M14 14h2v2h-2z M18 14h3 M14 18h2 M18 18h3 M14 21h2 M20 21h1 M20 17v2" />
    </svg>
  );
}

// ── Camera corner decorators ──────────────────────────────────────────────────

function CameraCorners() {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 20,
    height: 20,
    border: '3px solid #1A73E8',
  };
  return (
    <>
      <span style={{ ...base, top: 0, left: 0, borderRight: 'none', borderBottom: 'none', borderRadius: '4px 0 0 0' }} />
      <span style={{ ...base, top: 0, right: 0, borderLeft: 'none', borderBottom: 'none', borderRadius: '0 4px 0 0' }} />
      <span style={{ ...base, bottom: 0, left: 0, borderRight: 'none', borderTop: 'none', borderRadius: '0 0 0 4px' }} />
      <span style={{ ...base, bottom: 0, right: 0, borderLeft: 'none', borderTop: 'none', borderRadius: '0 0 4px 0' }} />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QRControlPage() {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [kpiData, setKpiData] = useState<KpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const cameraActiveRef = useRef(false);
  const validatingRef = useRef(false);

  // ── KPI fetch (all records, no limit) ──────────────────────────────────────

  const fetchKpis = async (silent = false) => {
    if (!silent) { setKpiLoading(true); setKpiError(false); }
    try {
      const res = await api.get('/access-logs?period=today');
      const data: AccessLog[] = res.data?.data ?? res.data ?? [];
      const total = Array.isArray(data) ? data.length : 0;
      const uniques = new Set(
        Array.isArray(data) ? data.map((l) => l.id_membre ?? l.id) : []
      ).size;
      const tickets = Array.isArray(data)
        ? data.filter((l) => l.resultat === 'SUCCES' || l.resultat === 'SUCCESS').length
        : 0;
      setKpiData({ total, uniques, tickets });
    } catch {
      if (!silent) setKpiError(true);
    } finally {
      if (!silent) setKpiLoading(false);
    }
  };

  // ── History fetch (limit 10, sort desc) ────────────────────────────────────

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoadingLogs(true);
    try {
      const res = await api.get('/access-logs?period=today&limit=10&sort=desc');
      const data = res.data?.data ?? res.data;
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      // silent — keep previous state
    } finally {
      if (!silent) setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchLogs();
    inputRef.current?.focus();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // ── Validation (partagé saisie manuelle + scan caméra) ─────────────────────

  const validateCodeString = useCallback(async (rawCode: string) => {
    const trimmed = rawCode.trim();
    if (!trimmed) return;

    validatingRef.current = true;
    setValidating(true);
    setResult(null);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);

    const isMemberQr = UUID_REGEX.test(trimmed);

    try {
      if (isMemberQr) {
        const res = await api.post('/members/validate-qr', { code: trimmed });
        const parsed = parseMemberValidateResponse(res.data);
        if (!parsed) {
          setResult({
            success: false,
            message: 'Réponse serveur inattendue.',
          });
        } else {
          const mi = parsed.member_info;
          setResult({
            success: parsed.valid,
            message: parsed.valid ? 'Accès autorisé' : (parsed.reason ?? 'Accès refusé'),
            member_info: mi
              ? {
                  nom: mi.nom,
                  prenom: mi.prenom,
                  subscription: mi.subscription
                    ? {
                        type_forfait: mi.subscription.type_forfait,
                        date_prochain_paiement: mi.subscription.date_prochain_paiement,
                        activity: mi.subscription.activity ?? null,
                      }
                    : null,
                }
              : undefined,
          });

          const optimisticEntry: AccessLog = {
            id: Date.now(),
            date_scan: new Date().toISOString(),
            resultat: parsed.valid ? 'SUCCES' : 'ECHEC',
            id_controller: 0,
            id_membre: mi?.id,
            membre: mi ? { nom: mi.nom, prenom: mi.prenom } : undefined,
          };
          setLogs((prev) => [optimisticEntry, ...prev.slice(0, 9)]);

          fetchKpis(true);
          fetchLogs(true);
        }
      } else {
        const res = await api.post('/tickets/validate', { code: trimmed });
        const parsed = parseTicketValidateResponse(res.data);
        if (!parsed) {
          setResult({
            success: false,
            message: 'Réponse serveur inattendue.',
          });
        } else {
          const newResult = mapValidateResponseToVerifyResult(parsed);
          setResult(newResult);

          const optimisticEntry: AccessLog = {
            id: Date.now(),
            date_scan: new Date().toISOString(),
            resultat: parsed.valid ? 'SUCCES' : 'ECHEC',
            id_controller: 0,
            id_ticket: readIdTicketFromPayload(parsed.ticket_info),
            ticket: mapTicketInfoToAccessLogTicket(parsed.ticket_info),
          };
          setLogs((prev) => [optimisticEntry, ...prev.slice(0, 9)]);

          fetchKpis(true);
          fetchLogs(true);
        }
      }
    } catch (err: unknown) {
      setResult({
        success: false,
        message: axiosErrorMessage(err, 'Code inconnu ou accès refusé.'),
      });
    } finally {
      validatingRef.current = false;
      setValidating(false);
      setCode('');
      resultTimerRef.current = setTimeout(() => setResult(null), 5000);
      inputRef.current?.focus();
    }
  }, []);

  const handleValidate = useCallback(async (e?: React.FormEvent, scannedCode?: string) => {
    e?.preventDefault();
    const raw = (scannedCode ?? code).trim();
    if (!raw) return;
    await validateCodeString(raw);
  }, [code, validateCodeString]);

  // ── Camera ──────────────────────────────────────────────────────────────────

  const startScanning = useCallback(() => {
    const scan = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !cameraActiveRef.current) return;
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (qrResult?.data) {
        const payload = qrResult.data;
        setCode(payload);
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        cameraActiveRef.current = false;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCameraActive(false);
        setTimeout(() => {
          void handleValidate(undefined, payload);
        }, 100);
        return;
      }
      rafRef.current = requestAnimationFrame(scan);
    };
    rafRef.current = requestAnimationFrame(scan);
  }, [handleValidate]);

  useEffect(() => {
    cameraActiveRef.current = cameraActive;
  }, [cameraActive]);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => {});
      startScanning();
    }
  }, [cameraActive, startScanning]);

  const handleToggleCamera = async () => {
    if (cameraActive) {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      cameraActiveRef.current = false;
      setCameraActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      // Bug B10 — caméra non fonctionnelle dans cet environnement
      cameraActiveRef.current = false;
      setCameraActive(false);
    }
  };

  // ── KPI card definitions ────────────────────────────────────────────────────

  const kpiDefs = [
    {
      label: "Entrées aujourd'hui",
      value: kpiLoading || kpiError ? null : String(kpiData?.total ?? 0),
      Icon: CheckCircle,
      colorKey: 'success',
      footer: 'Accès enregistrés',
    },
    {
      label: 'Membres accédés',
      value: kpiLoading || kpiError ? null : String(kpiData?.uniques ?? 0),
      Icon: Users,
      colorKey: 'warning',
      footer: 'Membres uniques',
    },
    {
      label: 'Tickets validés',
      value: kpiLoading || kpiError ? null : String(kpiData?.tickets ?? 0),
      Icon: Ticket,
      colorKey: 'info',
      footer: 'Scans accordés',
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="gf-page">
      {/* ── BLOC 1 — KPI Row ─────────────────────────────────────────────── */}
      <div className="gf-kpi-grid-3 gf-page-top">
        {kpiDefs.map((kpi) => (
          <div key={kpi.label} className="gf-kpi-card">
            {/* Floating icon */}
            <div className={`gf-kpi-icon gf-kpi-icon--${kpi.colorKey}`}>
              <kpi.Icon size={22} color="#fff" />
            </div>

            {/* Right-aligned label + value */}
            <p className="gf-kpi-label">{kpi.label}</p>
            <p className="gf-kpi-value">{kpi.value ?? '--'}</p>

            {/* Footer */}
            <p className="gf-kpi-footer">{kpi.footer}</p>
          </div>
        ))}
      </div>

      {/* ── BLOC 2 — Main Grid ───────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 16,
        }}
      >
        {/* ── Colonne Gauche — Card Scanner ──────────────────────────────── */}
        <div className="gf-card-outer">
        <div className="gf-card" style={{ paddingBottom: 20 }}>
          {/* Header flottant orange */}
          <div className="gf-card-header gf-card-header--warning">
            <div>
              <p className="gf-card-header__title">Contrôle d&apos;accès QR</p>
              <p className="gf-card-header__sub">Scanner ou saisir un code manuellement</p>
            </div>
            <button
              type="button"
              onClick={handleToggleCamera}
              className="gf-btn-header"
            >
              <QrIcon size={14} color="#fff" />
              {cameraActive ? 'Arrêter' : 'Scanner le code QR'}
            </button>
          </div>

          {/* Body */}
          <div
            className="gf-card-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              alignItems: 'center',
              paddingBottom: 0,
            }}
          >
            {/* Zone caméra 200×200 */}
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: 12,
                background: 'var(--gf-bg)',
                border: '2px dashed var(--gf-border)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <CameraCorners />

              {cameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 10,
                  }}
                />
              ) : (
                <>
                  <QrIcon size={48} color="#b0b7c3" />
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--gf-muted)',
                      margin: '10px 0 0',
                      textAlign: 'center',
                      padding: '0 16px',
                      lineHeight: 1.4,
                    }}
                  >
                    Caméra inactive — Cliquer sur Scanner
                  </p>
                </>
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden />
            </div>

            {/* Saisie manuelle */}
            <div style={{ width: '100%' }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: 'var(--gf-muted)',
                  margin: '0 0 6px',
                }}
              >
                Saisie manuelle
              </p>
              <form
                onSubmit={handleValidate}
                style={{ display: 'flex', gap: 8 }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="ex: TKT-0041 ou SUB-0012"
                  style={{
                    flex: 1,
                    border: '1px solid var(--gf-border)',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: 'var(--gf-dark)',
                    outline: 'none',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1A73E8';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--gf-border)';
                  }}
                />
                <button
                  type="submit"
                  disabled={validating || !code.trim()}
                  style={{
                    background:
                      validating || !code.trim()
                        ? '#a0aec0'
                        : 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                    border: 'none',
                    borderRadius: 8,
                    padding: '9px 16px',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: validating || !code.trim() ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {validating ? '…' : 'Valider'}
                </button>
              </form>
            </div>

            {/* Zone résultat — auto-reset 5s */}
            {result && (
              <div
                style={{
                  width: '100%',
                  background: result.success ? '#eaf7ea' : '#fde8e8',
                  borderLeft: `3px solid ${result.success ? '#43A047' : '#F44335'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                {result.success ? (
                  <CheckCircle
                    size={36}
                    color="#43A047"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                ) : (
                  <XCircle
                    size={36}
                    color="#F44335"
                    style={{ flexShrink: 0, marginTop: 1 }}
                  />
                )}
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: result.success ? '#2e7d32' : '#c62828',
                      margin: 0,
                    }}
                  >
                    {result.success ? 'Accès accordé' : 'Accès refusé'}
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: result.success ? '#388e3c' : '#d32f2f',
                      margin: '3px 0 0',
                    }}
                  >
                    {result.message}
                  </p>
                  {result.success &&
                    (result.membre || result.ticket || result.subscription) && (
                      <div style={{ marginTop: 6 }}>
                        {result.membre && !result.member_info && (
                          <p style={{ fontSize: 12, color: 'var(--gf-dark)', margin: '2px 0' }}>
                            <strong>Membre :</strong>{' '}
                            {result.membre.prenom} {result.membre.nom}
                          </p>
                        )}
                        {result.ticket && (
                          <>
                            <p style={{ fontSize: 12, color: 'var(--gf-dark)', margin: '2px 0' }}>
                              <strong>Ticket :</strong>{' '}
                              <span style={{ fontFamily: 'monospace' }}>
                                {result.ticket.code_ticket}
                              </span>
                              {result.ticket.activity && ` — ${result.ticket.activity.nom}`}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--gf-dark)', margin: '2px 0' }}>
                              <strong>Expiration :</strong>{' '}
                              {new Date(result.ticket.date_expiration).toLocaleDateString('fr-FR')}
                            </p>
                          </>
                        )}
                        {result.subscription && (
                          <p style={{ fontSize: 12, color: 'var(--gf-dark)', margin: '2px 0' }}>
                            <strong>Abonnement :</strong> {result.subscription.type_forfait} —{' '}
                            {new Date(
                              result.subscription.date_prochain_paiement
                            ).toLocaleDateString('fr-FR')}
                          </p>
                        )}
                      </div>
                    )}
                  {result.member_info && (
                    <div style={{ marginTop: 6 }}>
                      <p style={{ fontSize: 12, color: 'var(--gf-dark)', margin: '2px 0' }}>
                        <strong>Membre :</strong> {result.member_info.prenom} {result.member_info.nom}
                      </p>
                      {result.member_info.subscription ? (
                        <>
                          <p style={{ fontSize: 12, color: 'var(--gf-dark)', margin: '2px 0' }}>
                            <strong>Abonnement :</strong> {result.member_info.subscription.type_forfait}
                            {result.member_info.subscription.activity?.nom
                              ? ` — ${result.member_info.subscription.activity.nom}`
                              : ''}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--gf-dark)', margin: '2px 0' }}>
                            <strong>Valide jusqu&apos;au :</strong>{' '}
                            {new Date(result.member_info.subscription.date_prochain_paiement).toLocaleDateString(
                              'fr-FR',
                            )}
                          </p>
                        </>
                      ) : (
                        <p style={{ fontSize: 12, color: '#d32f2f', margin: '2px 0' }}>
                          Aucun abonnement actif
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* ── Colonne Droite — Card Historique ───────────────────────────── */}
        <div className="gf-card-outer">
        <div className="gf-card" style={{ paddingBottom: 16 }}>
          {/* Header flottant sombre */}
          <div className="gf-card-header gf-card-header--dark">
            <div>
              <p className="gf-card-header__title">Historique du jour</p>
              <p className="gf-card-header__sub">Derniers accès scannés</p>
            </div>
          </div>

          {/* Body */}
          <div className="gf-card-body" style={{ paddingLeft: 16, paddingRight: 16, paddingBottom: 0 }}>
            {loadingLogs ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <Loader size="sm" />
              </div>
            ) : logs.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  color: 'var(--gf-muted)',
                  fontSize: 13,
                  padding: '24px 0',
                  margin: 0,
                }}
              >
                Aucun accès enregistré aujourd&apos;hui.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {logs.map((log) => {
                  const isSuccess =
                    log.resultat === 'SUCCES' || log.resultat === 'SUCCESS';
                  const nomMembre = log.membre
                    ? `${log.membre.prenom} ${log.membre.nom}`
                    : log.ticket?.code_ticket ?? `Scan #${log.id}`;
                  const detail = log.ticket?.batch?.activity?.nom
                    ?? log.ticket?.code_ticket
                    ?? `Accès #${log.id}`;
                  const heure = new Date(log.date_scan).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={log.id}
                      style={{
                        background: '#f8f9fa',
                        borderRadius: 8,
                        padding: '9px 12px',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isSuccess ? '#43A047' : '#F44335',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: 'var(--gf-dark)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {nomMembre}
                        </p>
                        <p
                          style={{
                            fontSize: 11,
                            color: 'var(--gf-muted)',
                            margin: '1px 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {detail}
                        </p>
                      </div>
                      <p
                        style={{
                          fontSize: 11,
                          color: 'var(--gf-muted)',
                          margin: 0,
                          flexShrink: 0,
                        }}
                      >
                        {heure}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
