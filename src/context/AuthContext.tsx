import { useState, type ReactNode } from 'react';
import { AuthContext, type AuthUser } from './auth-context';
import api from '../api/axios';

function decodeJWT(token: string): AuthUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

function readAuthFromStorage(): { token: string | null; user: AuthUser | null } {
  const t = localStorage.getItem('token');
  const u = localStorage.getItem('user');
  if (!t || !u) {
    return { token: null, user: null };
  }
  try {
    return { token: t, user: JSON.parse(u) as AuthUser };
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readAuthFromStorage();
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [token, setToken] = useState<string | null>(initial.token);
  const [isLoading] = useState(false);

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const data = response.data?.data ?? response.data;
    const receivedToken: string = data.token;
    const decoded = decodeJWT(receivedToken);
    const receivedUser: AuthUser = data.user ?? decoded ?? { id: 0, email, role: 'CASHIER' };

    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
