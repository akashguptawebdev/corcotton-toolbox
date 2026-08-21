import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const rbacApi = {
  listRoles: () => unwrap(apiClient.get('/admin/rbac/roles')),
  matrix: () => unwrap(apiClient.get('/admin/rbac/permissions-matrix')),
  updateRolePermission: (payload) => unwrap(apiClient.put('/admin/rbac/role-permissions', payload)),
  createRole: (payload) => unwrap(apiClient.post('/admin/rbac/roles', payload)),
  updateRole: (id, payload) => unwrap(apiClient.put(`/admin/rbac/roles/${id}`, payload)),
  removeRole: (id) => unwrap(apiClient.delete(`/admin/rbac/roles/${id}`)),
};
