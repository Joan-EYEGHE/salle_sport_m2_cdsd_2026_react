import { useEffect, useRef, useState } from 'react';
import { ScanLine, CheckCircle, XCircle, Users, Ticket } from 'lucide-react';
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

interface KpiDef {
  label: string;
  value: string | null;
  Icon: React.ElementType;
  gradient: string;
  shadow: string;
  footer: string;
}

// ── SVG QR placeholder ────────────────────────────────────────────────────────

function QrIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#b0b7c3"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="5" y="5" width="3" height="3" fill="#b0b7c3" stroke="none" />
      <rect x="16" y="5" width="3" height="3" fill="#b0b7c3" stroke="none" />
      <rect x="5" y="16" width="3" height="3" fill="#b0b7c3" stroke="none" />
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

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/access-logs?period=today&sort=desc');
      const data = res.data?.data ?? res.data;
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      // silent — keep previous state
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    inputRef.current?.focus();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
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
    try {
      const res = await api.post('/access-logs/verify', { code: code.trim() });
      const data = res.data?.data ?? res.data;
      setResult({
        success: true,
        message: data.message ?? 'Accès autorisé',
        membre: data.membre,
        subscription: data.subscription,
        ticket: data.ticket,
      });
      fetchLogs();
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setResult({
        success: false,
        message: errData?.message ?? 'Code inconnu ou accès refusé.',
      });
    } finally {
      setValidating(false);
      setCode('');
      inputRef.current?.focus();
    }
  };

  // ── KPI computation ─────────────────────────────────────────────────────────

  const totalEntrees = logs.length;
  const membresUniques = new Set(
    logs.map((l) => (l as AccessLog & { id_membre?: number }).id_membre ?? l.id)
  ).size;
  const ticketsValides = logs.filter(
    (l) => l.resultat === 'SUCCES' || l.resultat === 'SUCCESS'
  ).length;

  const kpiDefs: KpiDef[] = [
    {
      label: "Entrées aujourd'hui",
      value: loadingLogs ? null : String(totalEntrees),
      Icon: CheckCircle,
      gradient: 'linear-gradient(195deg, #66BB6A, #43A047)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(76,175,80,0.3)',
      footer: 'Accès enregistrés',
    },
    {
      label: 'Membres accédés',
      value: loadingLogs ? null : String(membresUniques),
      Icon: Users,
      gradient: 'linear-gradient(195deg, #FFA726, #fb8c00)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(251,140,0,0.3)',
      footer: 'Membres uniques',
    },
    {
      label: 'Tickets validés',
      value: loadingLogs ? null : String(ticketsValides),
      Icon: Ticket,
      gradient: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
      shadow: '0 4px 15px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.3)',
      footer: 'Scans accordés',
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        background: '#f0f2f5',
        padding: '20px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* ── BLOC 1 — KPI Row ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 16,
          marginTop: 14,
        }}
      >
        {kpiDefs.map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
              padding: '14px 16px 12px',
              position: 'relative',
            }}
          >
            {/* Floating icon */}
            <div
              style={{
                position: 'absolute',
                top: -14,
                left: 16,
                width: 48,
                height: 48,
                borderRadius: 10,
                background: kpi.gradient,
                boxShadow: kpi.shadow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <kpi.Icon size={22} color="#fff" />
            </div>

            {/* Right-aligned label + value */}
            <div style={{ textAlign: 'right', paddingTop: 6 }}>
              <p
                style={{
                  fontSize: 11,
                  color: '#7b809a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: 0,
                }}
              >
                {kpi.label}
              </p>
              <p
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#344767',
                  margin: '4px 0 0',
                }}
              >
                {kpi.value ?? '--'}
              </p>
            </div>

            {/* Footer */}
            <div
              style={{
                borderTop: '1px solid #f0f2f5',
                paddingTop: 6,
                marginTop: 10,
              }}
            >
              <p style={{ fontSize: 11, color: '#7b809a', margin: 0 }}>
                {kpi.footer}
              </p>
            </div>
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
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            paddingBottom: 20,
          }}
        >
          {/* Header flottant orange */}
          <div
            style={{
              margin: '-20px 16px 0',
              background: 'linear-gradient(195deg, #FFA726, #fb8c00)',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow:
                '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(251,140,0,0.4)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <p
                style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                  margin: 0,
                }}
              >
                Contrôle d&apos;accès QR
              </p>
              <p
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: 11,
                  margin: '3px 0 0',
                }}
              >
                Scanner ou saisir un code manuellement
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleCamera}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: 8,
                padding: '7px 14px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              }}
            >
              <ScanLine size={14} />
              {cameraActive ? 'Arrêter' : 'Scanner le code QR'}
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              padding: '28px 20px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              alignItems: 'center',
            }}
          >
            {/* Zone caméra 200×200 */}
            <div
              style={{
                width: 200,
                height: 200,
                borderRadius: 12,
                background: '#f0f2f5',
                border: '2px dashed #d2d6da',
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
                  <QrIcon />
                  <p
                    style={{
                      fontSize: 12,
                      color: '#7b809a',
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
                  color: '#7b809a',
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
                    border: '1px solid #d2d6da',
                    borderRadius: 8,
                    padding: '9px 12px',
                    fontSize: 13,
                    fontFamily: 'monospace',
                    color: '#344767',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1A73E8';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d2d6da';
                  }}
                />
                <button
                  type="submit"
                  disabled={validating || !code.trim()}
                  style={{
                    background: validating || !code.trim()
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
                    transition: 'opacity 0.2s',
                  }}
                >
                  {validating ? '…' : 'Valider'}
                </button>
              </form>
            </div>

            {/* Zone résultat */}
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
                  <CheckCircle size={20} color="#43A047" style={{ flexShrink: 0, marginTop: 1 }} />
                ) : (
                  <XCircle size={20} color="#F44335" style={{ flexShrink: 0, marginTop: 1 }} />
                )}
                <div>
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
                  {result.success && (result.membre || result.ticket || result.subscription) && (
                    <div style={{ marginTop: 6 }}>
                      {result.membre && (
                        <p style={{ fontSize: 12, color: '#344767', margin: '2px 0' }}>
                          <strong>Membre :</strong>{' '}
                          {result.membre.prenom} {result.membre.nom}
                        </p>
                      )}
                      {result.ticket && (
                        <>
                          <p style={{ fontSize: 12, color: '#344767', margin: '2px 0' }}>
                            <strong>Ticket :</strong>{' '}
                            <span style={{ fontFamily: 'monospace' }}>
                              {result.ticket.code_ticket}
                            </span>
                            {result.ticket.activity && ` — ${result.ticket.activity.nom}`}
                          </p>
                          <p style={{ fontSize: 12, color: '#344767', margin: '2px 0' }}>
                            <strong>Expiration :</strong>{' '}
                            {new Date(result.ticket.date_expiration).toLocaleDateString('fr-FR')}
                          </p>
                        </>
                      )}
                      {result.subscription && (
                        <p style={{ fontSize: 12, color: '#344767', margin: '2px 0' }}>
                          <strong>Abonnement :</strong> {result.subscription.type_forfait} —{' '}
                          {new Date(result.subscription.date_prochain_paiement).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Colonne Droite — Card Historique ───────────────────────────── */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            paddingBottom: 16,
          }}
        >
          {/* Header flottant sombre */}
          <div
            style={{
              margin: '-20px 16px 0',
              background: 'linear-gradient(195deg, #42424a, #191919)',
              borderRadius: 10,
              padding: '16px 20px',
              boxShadow:
                '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(0,0,0,0.3)',
            }}
          >
            <p
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Historique du jour
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 11,
                margin: '3px 0 0',
              }}
            >
              Derniers accès scannés
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '28px 16px 0' }}>
            {loadingLogs ? (
              <Loader size="sm" />
            ) : logs.length === 0 ? (
              <p
                style={{
                  textAlign: 'center',
                  color: '#7b809a',
                  fontSize: 13,
                  padding: '24px 0',
                  margin: 0,
                }}
              >
                Aucun accès enregistré aujourd&apos;hui.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {logs.slice(0, 10).map((log) => {
                  const isSuccess =
                    log.resultat === 'SUCCES' || log.resultat === 'SUCCESS';
                  const nomMembre =
                    (log as AccessLog & { membre?: { nom: string; prenom: string } }).membre
                      ? `${(log as AccessLog & { membre?: { nom: string; prenom: string } }).membre!.prenom} ${(log as AccessLog & { membre?: { nom: string; prenom: string } }).membre!.nom}`
                      : log.ticket?.code_ticket ?? `Scan #${log.id}`;
                  const detail = log.ticket?.code_ticket
                    ? log.ticket.batch?.activity?.nom ?? log.ticket.code_ticket
                    : `ID ${log.id}`;
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
                      {/* Status dot */}
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: isSuccess ? '#43A047' : '#F44335',
                          flexShrink: 0,
                        }}
                      />

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#344767',
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
                            color: '#7b809a',
                            margin: '1px 0 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {detail}
                        </p>
                      </div>

                      {/* Heure */}
                      <p
                        style={{
                          fontSize: 11,
                          color: '#7b809a',
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
  );
}
