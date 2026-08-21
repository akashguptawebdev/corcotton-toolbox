import { useSelector } from 'react-redux';
import { ROLES } from '@constants/roles';

// The single source of truth for "can this admin do X" on the client. Mirrors the
// backend's can('resource.action') middleware (backend/ARCHITECTURE.md Part 4.4):
// super admin bypasses all checks, everyone else is checked against their loaded
// permission set. This is a UX convenience only — the backend re-checks every
// request regardless, so a stale/tampered client-side check can never grant access.
export const usePermission = () => {
  const { user, permissions } = useSelector((state) => state.auth);
  const roleValue = typeof user?.role === 'object' ? user?.role?.slug || user?.role?.name : user?.role;
  const normalizedRole = String(roleValue || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  const isSuperAdmin = normalizedRole === ROLES.SUPER_ADMIN;
  const nestedPermissions = user?.permissions || user?.role?.permissions;
  const permissionSet = Array.isArray(permissions)
    ? permissions
    : Array.isArray(nestedPermissions)
      ? nestedPermissions.map((permission) => (typeof permission === 'string' ? permission : permission.key)).filter(Boolean)
      : [];

  const can = (permissionKey) => {
    if (!permissionKey) return true;
    if (isSuperAdmin) return true;
    return permissionSet.includes(permissionKey);
  };

  const canAny = (permissionKeys = []) => permissionKeys.some((key) => can(key));

  return { can, canAny, isSuperAdmin };
};
