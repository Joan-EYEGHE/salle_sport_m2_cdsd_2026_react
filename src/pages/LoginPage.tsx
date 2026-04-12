import { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
      className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(195deg, #42424a, #191919)',
        padding: '40px 16px 16px',
      }}
    >
      {/* Wrapper — padding-top makes room for the floating header */}
      <div style={{ width: 380, paddingTop: 40 }}>
        {/* Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            overflow: 'visible',
            boxShadow:
              '0 20px 27px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {/* Floating header */}
          <div
            style={{
              marginTop: -28,
              marginLeft: 24,
              marginRight: 24,
              background: 'linear-gradient(195deg, #49a3f1, #1A73E8)',
              borderRadius: 10,
              padding: '20px 24px',
              boxShadow:
                '0 4px 20px rgba(0,0,0,0.14), 0 7px 10px rgba(26,115,232,0.4)',
            }}
          >
            <p
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Connexion
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 13,
                margin: '4px 0 0',
              }}
            >
              Entrez vos identifiants pour accéder à GymFlow
            </p>
          </div>

          {/* Form body */}
          <div style={{ padding: '28px 32px 24px' }}>
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
                    color: '#7b809a',
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
                    border: '1px solid #d2d6da',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 14,
                    color: '#344767',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = '#1A73E8')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = '#d2d6da')}
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
                    color: '#7b809a',
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
                      border: '1px solid #d2d6da',
                      borderRadius: 8,
                      padding: '10px 42px 10px 14px',
                      fontSize: 14,
                      color: '#344767',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#1A73E8')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#d2d6da')}
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
                      color: '#7b809a',
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
                  color: '#fff',
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

            {/* Demo accounts */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #f0f2f5',
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#7b809a',
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
                      border: '1px solid #f0f2f5',
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
                      e.currentTarget.style.borderColor = '#f0f2f5';
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
                        color: '#344767',
                        minWidth: 68,
                      }}
                    >
                      {u.role}
                    </span>
                    {/* Email */}
                    <span
                      style={{
                        fontSize: 12,
                        color: '#7b809a',
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
      </div>
    </div>
  );
}
