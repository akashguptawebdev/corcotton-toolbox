import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const usersApi = {
  list: () => unwrap(apiClient.get('/admin/users')),
  get: (id) => unwrap(apiClient.get(`/admin/users/${id}`)),
  create: (payload) => unwrap(apiClient.post('/admin/users', payload)),
  update: (id, payload) => unwrap(apiClient.put(`/admin/users/${id}`, payload)),
  remove: (id) => unwrap(apiClient.delete(`/admin/users/${id}`)),
  regenerateCredentials: (id) => unwrap(apiClient.post(`/admin/users/${id}/regenerate-credentials`)),
};
