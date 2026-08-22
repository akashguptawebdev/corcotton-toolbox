import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const bannersApi = {
  list: (params = {}) => unwrap(apiClient.get('/admin/banners', { params })),
  get: (id) => unwrap(apiClient.get(`/admin/banners/${id}`)),
  create: (payload) => unwrap(apiClient.post('/admin/banners', payload)),
  update: (id, payload) => unwrap(apiClient.put(`/admin/banners/${id}`, payload)),
  remove: (id) => unwrap(apiClient.delete(`/admin/banners/${id}`)),
  reorder: (banners) => unwrap(apiClient.put('/admin/banners/reorder', { banners })),
  placements: () => unwrap(apiClient.get('/admin/banners/placements')),
};

export default bannersApi;
