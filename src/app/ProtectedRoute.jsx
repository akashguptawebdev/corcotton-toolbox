import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { usePermission } from '@hooks/usePermission';

// Route-level guard: unauthenticated -> /login (remembers where they were headed),
// authenticated but missing the permission -> /403, authenticated with a pending forced
// password change -> /change-password (and the reverse, once cleared, off of it). Every
// admin route is wrapped with this, so an unguarded route is structurally impossible
// (backend/ARCHITECTURE.md Part 13's "namespace mounts auth" rule, mirrored on the
// client) and so is a route that's reachable mid-forced-change — this is the single
// chokepoint, no page needs its own mustChangePassword check.
const ProtectedRoute = ({ permission, children }) => {
  const location = useLocation();
  const status = useSelector((state) => state.auth.status);
  const mustChangePassword = useSelector((state) => state.auth.user?.mustChangePassword);
  const { can } = usePermission();

  if (status === 'idle' || status === 'checking') return null; // AppBootstrap covers the spinner

  if (status !== 'authenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (!mustChangePassword && location.pathname === '/change-password') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!can(permission)) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default ProtectedRoute;
