import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-gray-700 rounded-lg transition"
    >
      Déconnexion
    </button>
  );
}
