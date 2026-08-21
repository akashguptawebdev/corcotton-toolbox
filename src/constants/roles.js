// Display-only reference of the seeded backend roles (backend/ARCHITECTURE.md Part 4).
// Role → permission assignment is fully data-driven on the backend; the toolbox never
// hardcodes "if role === X" checks — it always checks permission keys via usePermission().
export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
});
