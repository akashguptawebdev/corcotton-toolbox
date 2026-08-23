import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const inventoryApi = {
  list: (params = {}) => unwrap(apiClient.get('/admin/inventory', { params })),
  adjustments: (variantId) => unwrap(apiClient.get(`/admin/inventory/${variantId}/adjustments`)),
  update: (variantId, payload) => unwrap(apiClient.patch(`/admin/inventory/${variantId}`, payload)),
  adjust: (variantId, payload) => unwrap(apiClient.post(`/admin/inventory/${variantId}/adjust`, payload)),
};
