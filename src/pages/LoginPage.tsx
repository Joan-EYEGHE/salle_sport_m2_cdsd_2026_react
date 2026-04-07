import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Dumbbell } from 'lucide-react';
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
        navigate('/');
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
            <Dumbbell className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-3xl font-bold text-amber-500">GymFlow</h1>
          <p className="text-gray-400 mt-1 text-sm">Gestion de salle de sport</p>
        </div>

        {/* Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-6">Connexion</h2>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@gymflow.sn"
                required
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2.5 pr-11 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-gray-900 font-semibold rounded-lg px-4 py-2.5 transition"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Demo users */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <p className="text-xs text-gray-500 text-center mb-3">Comptes de démonstration</p>
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
                  className="w-full text-left px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                >
                  <span className="text-xs font-semibold text-amber-500">{u.role}</span>
                  <span className="text-xs text-gray-400 ml-2">{u.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
