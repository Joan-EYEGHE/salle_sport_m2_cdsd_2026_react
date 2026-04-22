import { createContext } from 'react';

export type Role = 'ADMIN' | 'CASHIER' | 'CONTROLLER';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
