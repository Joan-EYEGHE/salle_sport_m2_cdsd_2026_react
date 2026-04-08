import { useEffect, useRef, useState } from 'react';
import {
  ScanLine,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Ticket,
  Camera,
} from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
import Modal from '../components/Modal';
import type { AccessLog } from '../types';

interface ValidationResult {
  success: boolean;
  message: string;
  ticket?: {
    code_ticket: string;
    activity?: { nom: string };
    date_expiration: string;
  };
}

interface KpiCard {
  label: string;
  value: number | null;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

export default function QRControlPage() {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/access-logs?limit=10');
      const data = res.data?.data ?? res.data;
      setLogs(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    finally { setLoadingLogs(false); }
  };

  useEffect(() => {
    fetchLogs();
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scanModalOpen) {
      setTimeout(() => modalInputRef.current?.focus(), 100);
    }
  }, [scanModalOpen]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setValidating(true);
    setResult(null);
    try {
      const res = await api.post('/tickets/validate', { code: code.trim() });
      const data = res.data?.data ?? res.data;
      setResult({
        success: true,
        message: data.message ?? 'Accès autorisé',
        ticket: data.ticket,
      });
      fetchLogs();
      setScanModalOpen(false);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string } } })?.response?.data;
      setResult({
        success: false,
        message: errData?.message ?? 'Ticket invalide ou expiré.',
      });
      setScanModalOpen(false);
    } finally {
      setValidating(false);
      setCode('');
      inputRef.current?.focus();
    }
  };

  const todaySuccesses = logs.filter(
    (l) => l.resultat === 'SUCCES' || l.resultat === 'SUCCESS'
  ).length;

  const kpiCards: KpiCard[] = [
    {
      label: "Entrées aujourd'hui",
      value: todaySuccesses,
      icon: CheckCircle,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Membres accédés',
      value: logs.length,
      icon: Users,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Tickets validés',
      value: logs.filter((l) => l.resultat === 'SUCCES' || l.resultat === 'SUCCESS').length,
      icon: Ticket,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrôle d'accès par QR code</h1>
          <p className="text-gray-500 text-sm mt-0.5">Scanner et valider l'accès client</p>
        </div>
        <button
          onClick={() => setScanModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
          className="flex items-center gap-2 text-white font-medium rounded-lg px-4 py-2.5 text-sm hover:opacity-90 transition"
        >
          <ScanLine className="w-4 h-4" />
          Scanner le code QR
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${card.iconBg}`}>
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">{card.label}</p>
                <p className="text-gray-900 font-bold text-2xl">{card.value ?? '—'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Scan card */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-10 flex flex-col items-center text-center">
        <div className="w-24 h-24 border-4 border-amber-500 rounded-2xl flex items-center justify-center mb-5">
          <ScanLine className="w-12 h-12 text-amber-500" />
        </div>
        <h2 className="text-gray-900 font-bold text-xl mb-2">Scan QR Code</h2>
        <p className="text-gray-500 text-sm max-w-sm mb-6">
          Cliquez sur le bouton ci-dessous pour scanner les codes QR des clients pour la validation d'accès
        </p>
        <button
          onClick={() => setScanModalOpen(true)}
          style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
          className="flex items-center gap-2 text-white font-medium rounded-lg px-6 py-3 hover:opacity-90 transition"
        >
          <ScanLine className="w-4 h-4" />
          Démarrer la session
        </button>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-xl p-6 border flex items-start gap-4 ${
            result.success
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          {result.success ? (
            <CheckCircle className="w-8 h-8 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-8 h-8 text-red-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-bold text-lg ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
              {result.success ? 'Accès autorisé' : 'Accès refusé'}
            </p>
            <p className="text-gray-600 text-sm mt-1">{result.message}</p>
            {result.ticket && (
              <div className="mt-3 space-y-1 text-sm text-gray-500">
                <p>Code : <span className="text-gray-900 font-mono font-medium">{result.ticket.code_ticket}</span></p>
                {result.ticket.activity && (
                  <p>Activité : <span className="text-gray-900">{result.ticket.activity.nom}</span></p>
                )}
                <p>
                  Expiration :{' '}
                  <span className="text-gray-900">
                    {new Date(result.ticket.date_expiration).toLocaleDateString('fr-FR')}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent access logs */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-base font-semibold text-gray-900">Historique des scans</h2>
        </div>

        {loadingLogs ? (
          <Loader size="sm" />
        ) : logs.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-400 text-sm">Aucun scan récent.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm text-gray-900 font-mono font-medium">
                    {log.ticket?.code_ticket ?? `#${log.id_ticket ?? log.id}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(log.date_scan).toLocaleString('fr-FR')}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    log.resultat === 'SUCCES' || log.resultat === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}
                >
                  {log.resultat}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scan Modal */}
      <Modal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title="Scanner le code QR"
        size="md"
      >
        <div className="space-y-5">
          {/* Camera placeholder */}
          <div
            className="rounded-xl overflow-hidden h-52 flex items-center justify-center relative"
            style={{ background: '#111' }}
          >
            <div
              className="absolute inset-4 rounded-lg"
              style={{
                border: '2px dashed #D4A843',
              }}
            />
            <div className="flex flex-col items-center gap-2 z-10">
              <Camera className="w-10 h-10 text-amber-400" />
              <p className="text-gray-400 text-sm">Cliquez sur Démarrer pour scanner le code QR</p>
            </div>
          </div>

          <button
            type="button"
            style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
            className="w-full flex items-center justify-center gap-2 text-white font-medium rounded-lg py-2.5 text-sm hover:opacity-90 transition"
          >
            <Camera className="w-4 h-4" />
            Démarrer la caméra
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">Ou entrez le code manuellement</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleValidate} className="flex gap-2">
            <input
              ref={modalInputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter QR code"
              className="flex-1 bg-white border border-gray-300 text-gray-900 rounded-lg px-4 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition font-mono"
            />
            <button
              type="submit"
              disabled={validating || !code.trim()}
              style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
              className="px-5 py-2.5 text-white font-semibold rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap"
            >
              {validating ? '...' : 'Verify'}
            </button>
          </form>

          <button
            onClick={() => setScanModalOpen(false)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Annuler
          </button>
        </div>
      </Modal>
    </div>
  );
}
