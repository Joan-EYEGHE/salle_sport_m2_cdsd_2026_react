import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Dumbbell, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const demoUsers = [
  { email: 'admin@gymflow.sn', password: 'admin1234', role: 'ADMIN' },
  { email: 'cashier@gymflow.sn', password: 'cashier1234', role: 'CASHIER' },
  { email: 'controller@gymflow.sn', password: 'controller1234', role: 'CONTROLLER' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const storedUser = JSON.parse(localStorage.getItem('user') ?? '{}');
      if (storedUser?.role === 'CONTROLLER') {
        navigate('/qr-control');
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (err as { message?: string })?.message ??
        'Erreur lors de la connexion.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Logo section */}
          <div
            className="flex flex-col items-center justify-center py-8 px-8"
            style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
          >
            <div className="bg-white/20 rounded-2xl p-3 mb-3">
              <Dumbbell className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-white text-3xl font-bold tracking-tight">GymFlow</h1>
            <p className="text-white/70 text-sm mt-0.5">Fitness</p>
          </div>

          {/* Form section */}
          <div className="px-8 py-8">
            <h2 className="text-gray-900 font-semibold text-xl mb-6">Se connecter</h2>

            {error && (
              <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-gray-500 text-sm font-medium mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gymflow.com"
                    required
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-10 pr-4 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-500 text-sm font-medium mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-white border border-gray-300 text-gray-900 rounded-lg pl-10 pr-11 py-3 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me + forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="accent-amber-500 w-4 h-4 rounded"
                  />
                  <span className="text-sm text-gray-600">Souviens-toi de moi</span>
                </label>
                <button type="button" className="text-sm text-amber-600 hover:text-amber-700 transition">
                  Mot de passe oublié ?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
                className="w-full flex items-center justify-center gap-2 text-white font-medium rounded-lg px-4 py-3 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Se connecter
                  </>
                )}
              </button>
            </form>

            {/* Demo users */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">Comptes de démonstration</p>
              <div className="space-y-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword(u.password);
                      setError('');
                    }}
                    className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-amber-50 border border-gray-200 hover:border-amber-200 rounded-lg transition"
                  >
                    <span className="text-xs font-semibold text-amber-600">{u.role}</span>
                    <span className="text-xs text-gray-500 ml-2">{u.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-gray-400 text-xs text-center mt-6">
          © 2026 GymFlow. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
