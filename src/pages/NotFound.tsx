import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, AlertTriangle } from 'lucide-react';

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-10 max-w-md w-full">
        <div className="flex justify-center mb-4">
          <div className="bg-amber-100 rounded-full p-4">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
        </div>
        <h1 className="text-6xl font-extrabold text-amber-500 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Page introuvable</h2>
        <p className="text-gray-500 text-sm mb-8">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'linear-gradient(135deg, #D4A843 0%, #C49B38 100%)' }}
          className="inline-flex items-center gap-2 px-6 py-3 text-white font-medium rounded-lg hover:opacity-90 transition"
        >
          <Home className="w-4 h-4" />
          Retour au tableau de bord
        </button>
      </div>
    </div>
  );
}
