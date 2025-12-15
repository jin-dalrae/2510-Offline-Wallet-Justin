import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedAdminRouteProps {
  children: ReactNode;
}

export function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const isAdminAuthenticated = localStorage.getItem('admin_auth') === 'true';

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
