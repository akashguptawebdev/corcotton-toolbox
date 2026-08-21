import { useState } from 'react';
import { usePermission } from './usePermission';

// Standard "view mode -> Edit -> Save/Cancel" toggle for update forms. Fields stay
// disabled until the admin both HAS the permission and has clicked Edit — clicking Edit
// without permission is a no-op, so there's no client-side path to an editable field
// without it. The backend re-checks the same permission on submit regardless (this is
// UX convenience only, per usePermission's own contract).
export const useEditGuard = (permissionKey) => {
  const { can } = usePermission();
  const canEdit = can(permissionKey);
  const [isEditing, setIsEditing] = useState(false);

  const startEdit = () => {
    if (canEdit) setIsEditing(true);
  };
  const stopEdit = () => setIsEditing(false);

  return { canEdit, isEditing, startEdit, stopEdit, setIsEditing };
};
