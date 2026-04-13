/*
AUDIT CSS GYMFLOW - QRControlPage.tsx
Problème 1 : Couleurs palette et bordures en dur (zone scan, saisie manuelle, liste)
Problème 2 : onBlur sur champ manuel utilisait hex bordure
Total : 2 problèmes trouvés
*/
import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Users, Ticket } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import type { AccessLog } from '../types';

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
    };
  }, []);

  // ── Camera ──────────────────────────────────────────────────────────────────

  const handleToggleCamera = async () => {
    if (cameraActive) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraActive(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      // Bug B10 — caméra non fonctionnelle dans cet environnement
      setCameraActive(false);
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setValidating(true);
    setResult(null);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);

    try {
      const res = await api.post('/access-logs/verify', { code: code.trim() });
      const data = res.data?.data ?? res.data;

      const newResult: VerifyResult = {
        success: true,
        message: data.message ?? 'Accès autorisé',
        membre: data.membre,
        subscription: data.subscription,
        ticket: data.ticket,
      };
      setResult(newResult);

      // Optimistic prepend to history
      const optimisticEntry: AccessLog = {
        id: Date.now(),
        date_scan: new Date().toISOString(),
        resultat: 'SUCCES',
        id_controller: 0,
        id_ticket: data.ticket?.id,
        id_membre: data.membre?.id,
        membre: data.membre ? { nom: data.membre.nom, prenom: data.membre.prenom } : undefined,
        ticket: data.ticket,
      };
      setLogs((prev) => [optimisticEntry, ...prev.slice(0, 9)]);

      // Silent background refresh for accuracy
      fetchKpis(true);
      fetchLogs(true);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setResult({
        success: false,
        message: errData?.message ?? 'Code inconnu ou accès refusé.',
      });
    } finally {
      setValidating(false);
      setCode('');
      resultTimerRef.current = setTimeout(() => setResult(null), 5000);
      inputRef.current?.focus();
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
                        {result.membre && (
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
