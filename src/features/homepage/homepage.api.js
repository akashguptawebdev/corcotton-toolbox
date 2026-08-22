import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const homepageApi = {
  list: () => unwrap(apiClient.get('/admin/homepage-sections')),
  get: (id) => unwrap(apiClient.get(`/admin/homepage-sections/${id}`)),
  create: (payload) => unwrap(apiClient.post('/admin/homepage-sections', payload)),
  update: (id, payload) => unwrap(apiClient.put(`/admin/homepage-sections/${id}`, payload)),
  remove: (id) => unwrap(apiClient.delete(`/admin/homepage-sections/${id}`)),
  reorder: (sections) => unwrap(apiClient.put('/admin/homepage-sections/reorder', { sections })),
};

export default homepageApi;
