import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleAction = () => {
    navigate(isAuthenticated ? '/dashboard' : '/login');
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          maxWidth: '440px',
          width: '100%',
          padding: '48px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          textAlign: 'center',
        }}
      >
        {/* Chiffre 404 avec dégradé */}
        <span
          style={{
            fontSize: '96px',
            fontWeight: 700,
            lineHeight: 1,
            background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          404
        </span>

        {/* Divider */}
        <hr
          style={{
            border: 'none',
            borderTop: '2px solid #f0f2f5',
            width: '60px',
            margin: '0 auto',
          }}
        />

        {/* Titre */}
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#344767',
            margin: 0,
          }}
        >
          Page introuvable
        </h1>

        {/* Sous-titre */}
        <p
          style={{
            fontSize: '13px',
            color: '#7b809a',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>

        {/* Bouton action */}
        <button
          onClick={handleAction}
          style={{
            background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            padding: '11px 28px',
            borderRadius: '8px',
            border: 'none',
            boxShadow: '0 3px 10px rgba(26,115,232,0.3)',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = '1';
          }}
        >
          {isAuthenticated ? 'Retour au Dashboard' : 'Se connecter'}
        </button>
      </div>
    </div>
  );
}
