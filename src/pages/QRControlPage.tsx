import { useEffect, useRef, useState } from 'react';
import { ScanLine, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../api/axios';
import Loader from '../components/Loader';
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

export default function QRControlPage() {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get('/access-logs?limit=10');
      const data = res.data?.data ?? res.data;
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      // silent
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    inputRef.current?.focus();
  }, []);

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
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string; data?: unknown } } })?.response?.data;
      setResult({
        success: false,
        message:
          (errData as { message?: string })?.message ??
          'Ticket invalide ou expiré.',
      });
    } finally {
      setValidating(false);
      setCode('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Contrôle QR</h1>
        <p className="text-gray-400 text-sm mt-1">Valider un ticket par code ou UUID</p>
      </div>

      {/* Input form */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <form onSubmit={handleValidate} className="flex gap-3">
          <div className="flex-1 relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code ticket ou UUID..."
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-gray-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={validating || !code.trim()}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-gray-900 font-semibold rounded-lg transition whitespace-nowrap"
          >
            {validating ? 'Validation...' : 'Valider'}
          </button>
        </form>
      </div>

      {/* Result */}
      {result && (
        <div
          className={`rounded-xl p-6 border flex items-start gap-4 ${
            result.success
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}
        >
          {result.success ? (
            <CheckCircle className="w-8 h-8 text-green-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className={`font-semibold text-lg ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.success ? 'Accès autorisé' : 'Accès refusé'}
            </p>
            <p className="text-gray-300 text-sm mt-1">{result.message}</p>
            {result.ticket && (
              <div className="mt-3 space-y-1 text-sm text-gray-400">
                <p>Code : <span className="text-white font-mono">{result.ticket.code_ticket}</span></p>
                {result.ticket.activity && (
                  <p>Activité : <span className="text-white">{result.ticket.activity.nom}</span></p>
                )}
                <p>
                  Expiration :{' '}
                  <span className="text-white">
                    {new Date(result.ticket.date_expiration).toLocaleDateString('fr-FR')}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent access logs */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-700">
          <Clock className="w-4 h-4 text-amber-500" />
          <h2 className="text-base font-semibold text-white">Scans récents</h2>
        </div>

        {loadingLogs ? (
          <Loader size="sm" />
        ) : logs.length === 0 ? (
          <p className="px-6 py-8 text-center text-gray-500 text-sm">Aucun scan récent.</p>
        ) : (
          <div className="divide-y divide-gray-700">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm text-white font-mono">
                    {log.ticket?.code_ticket ?? `#${log.id_ticket ?? log.id}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(log.date_scan).toLocaleString('fr-FR')}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    log.resultat === 'SUCCES' || log.resultat === 'SUCCESS'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {log.resultat}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
