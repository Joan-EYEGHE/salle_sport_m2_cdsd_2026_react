import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Loader from '../components/Loader';

interface PublicRouteProps {
  children: ReactNode;
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <Loader size="lg" />;

  if (isAuthenticated) {
    const dest =
      user?.role === 'CONTROLLER' ? '/qr-control' :
      user?.role === 'CASHIER'    ? '/members'    :
      '/dashboard';
    return <Navigate to={dest} replace />;
  }

  return <>{children}</>;
}
