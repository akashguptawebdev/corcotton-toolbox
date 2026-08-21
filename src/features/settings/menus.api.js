import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const menusApi = {
  list: () => unwrap(apiClient.get('/admin/menus')),
  get: (id) => unwrap(apiClient.get(`/admin/menus/${id}`)),
  create: (payload) => unwrap(apiClient.post('/admin/menus', payload)),
  update: (id, payload) => unwrap(apiClient.put(`/admin/menus/${id}`, payload)),
  remove: (id) => unwrap(apiClient.delete(`/admin/menus/${id}`)),
};

export const megaMenuConfigApi = {
  list: (params = {}) => unwrap(apiClient.get('/admin/mega-menu-configs', { params })),
  get: (id) => unwrap(apiClient.get(`/admin/mega-menu-configs/${id}`)),
  create: (payload) => unwrap(apiClient.post('/admin/mega-menu-configs', payload)),
  update: (id, payload) => unwrap(apiClient.put(`/admin/mega-menu-configs/${id}`, payload)),
  remove: (id) => unwrap(apiClient.delete(`/admin/mega-menu-configs/${id}`)),
};
