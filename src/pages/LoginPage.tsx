/*
AUDIT CSS GYMFLOW - LoginPage.tsx
Problème 1 : Couleurs #7b809a, #344767, #d2d6da, #f0f2f5, white, #fff en inline
Problème 2 : onBlur utilisait #d2d6da — aligné sur var(--gf-border)
Total : 2 problèmes trouvés
*/
import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';

const DEMO_USERS = [
  {
    role: 'Admin',
    email: 'admin@gymflow.com',
    password: 'admin1234',
    color: '#ef4444',
  },
  {
    role: 'Caissier',
    email: 'cashier@gymflow.com',
    password: 'cashier1234',
    color: '#3b82f6',
  },
  {
    role: 'Contrôleur',
    email: 'controller@gymflow.com',
    password: 'controller1234',
    color: '#22c55e',
  },
];

export default function LoginPage() {
  const { login } = useAuth();

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
      // PublicRoute handles role-based redirect automatically
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err as { message?: string })?.message ??
        'Identifiants incorrects. Veuillez réessayer.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (user: (typeof DEMO_USERS)[number]) => {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(195deg, #42424a, #191919)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--gf-white)',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            margin: '-28px 20px 0',
            background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
            borderRadius: 10,
            padding: '20px 24px',
            boxShadow:
              '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.4)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: 'var(--gf-white)', fontSize: 18, fontWeight: 700, margin: 0 }}>
            Connexion
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: '2px 0 0' }}>
            Entrez vos identifiants pour accéder à GymFlow
          </p>
        </div>

        <div style={{ padding: '24px 24px 20px' }}>
          <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--gf-muted)',
                    marginBottom: 6,
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gymflow.com"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    border: '1px solid var(--gf-border)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    color: 'var(--gf-dark)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#1A73E8')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--gf-border)')}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--gf-muted)',
                    marginBottom: 6,
                  }}
                >
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      border: '1px solid var(--gf-border)',
                      borderRadius: 8,
                      padding: '10px 42px 10px 14px',
                      fontSize: 14,
                      color: 'var(--gf-dark)',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#1A73E8')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--gf-border)')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: 'var(--gf-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  style={{
                    background: '#fff5f5',
                    border: '1px solid #fed7d7',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 16,
                    fontSize: 13,
                    color: '#c53030',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading
                    ? '#a0aec0'
                    : 'linear-gradient(195deg, #49a3f1, #1A73E8)',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px',
                  color: 'var(--gf-white)',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading
                    ? 'none'
                    : '0 3px 12px rgba(26,115,232,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Connexion en cours…
                  </>
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
        </div>

        <div style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--gf-bg)' }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--gf-muted)',
                  textAlign: 'center',
                  marginBottom: 12,
                }}
              >
                Comptes de démonstration
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => fillDemo(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      background: 'none',
                      border: '1px solid var(--gf-bg)',
                      borderRadius: 8,
                      padding: '9px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8faff';
                      e.currentTarget.style.borderColor = '#d2e3fc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.borderColor = 'var(--gf-bg)';
                    }}
                  >
                    {/* Colored dot */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: u.color,
                        flexShrink: 0,
                      }}
                    />
                    {/* Role */}
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--gf-dark)',
                        minWidth: 68,
                      }}
                    >
                      {u.role}
                    </span>
                    {/* Email */}
                    <span
                      style={{
                        fontSize: 12,
                        color: 'var(--gf-muted)',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.email}
                    </span>
                    {/* Fill button */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#1A73E8',
                        flexShrink: 0,
                      }}
                    >
                      Remplir →
                    </span>
                  </button>
                ))}
              </div>
        </div>
      </div>
    </div>
  );
}
