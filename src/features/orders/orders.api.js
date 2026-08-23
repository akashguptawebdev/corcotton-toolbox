import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const ordersApi = {
  list: ({ status, paymentMethod, search, page, limit } = {}) =>
    unwrap(apiClient.get('/admin/orders', { params: { status, paymentMethod, search, page, limit } })),
  summary: () => unwrap(apiClient.get('/admin/orders/summary')),
  get: (id) => unwrap(apiClient.get(`/admin/orders/${id}`)),
  ship: (id) => unwrap(apiClient.post(`/admin/orders/${id}/ship`)),
  cancel: (id, reason) => unwrap(apiClient.post(`/admin/orders/${id}/cancel`, { reason })),
  // Raw PDF bytes, not the usual JSON envelope — apiClient's response interceptor only
  // unwraps `.data.data` for JSON, so this one bypasses `unwrap` and asks for a blob.
  label: (id) => apiClient.get(`/admin/orders/${id}/label`, { responseType: 'blob' }).then((res) => res.data),
};
