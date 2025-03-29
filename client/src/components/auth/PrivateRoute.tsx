import { Route, useLocation } from 'wouter';
import { api } from '@/lib/api';

interface PrivateRouteProps {
  component: React.ComponentType;
  path: string;
}

export const PrivateRoute = ({ component: Component, path }: PrivateRouteProps) => {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem('token');

  if (!token) {
    setLocation('/login');
    return null;
  }

  return <Route path={path} component={Component} />;
}; 