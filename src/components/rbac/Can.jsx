import { usePermission } from '@hooks/usePermission';

// <Can permission="product.create"><Button>New product</Button></Can>
// Renders children only if the current admin holds the permission. UI convenience
// only — never a substitute for the backend's own authorization check.
const Can = ({ permission, any, fallback = null, children }) => {
  const { can, canAny } = usePermission();
  const allowed = any ? canAny(any) : can(permission);
  return allowed ? children : fallback;
};

export default Can;
