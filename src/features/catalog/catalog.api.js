import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const catalogApi = {
  categories: {
    list: (params = {}) => unwrap(apiClient.get('/admin/categories', { params: { flat: true, ...params } })),
    create: (payload) => unwrap(apiClient.post('/admin/categories', payload)),
    update: (id, payload) => unwrap(apiClient.put(`/admin/categories/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/admin/categories/${id}`)),
  },
  brands: {
    list: (params = {}) => unwrap(apiClient.get('/admin/brands', { params })),
    create: (payload) => unwrap(apiClient.post('/admin/brands', payload)),
    update: (id, payload) => unwrap(apiClient.put(`/admin/brands/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/admin/brands/${id}`)),
  },
  attributes: {
    list: (params = {}) => unwrap(apiClient.get('/admin/attributes', { params: { withValues: true, ...params } })),
    create: (payload) => unwrap(apiClient.post('/admin/attributes', payload)),
    update: (id, payload) => unwrap(apiClient.put(`/admin/attributes/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/admin/attributes/${id}`)),
    createValue: (id, payload) => unwrap(apiClient.post(`/admin/attributes/${id}/values`, payload)),
    updateValue: (id, payload) => unwrap(apiClient.put(`/admin/attributes/values/${id}`, payload)),
    removeValue: (id) => unwrap(apiClient.delete(`/admin/attributes/values/${id}`)),
  },
  tags: {
    list: (params = {}) => unwrap(apiClient.get('/admin/tags', { params })),
    create: (payload) => unwrap(apiClient.post('/admin/tags', payload)),
    update: (id, payload) => unwrap(apiClient.put(`/admin/tags/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/admin/tags/${id}`)),
  },
  products: {
    list: (params = {}) => unwrap(apiClient.get('/admin/products', { params })),
    get: (id) => unwrap(apiClient.get(`/admin/products/${id}`)),
    create: (payload) => unwrap(apiClient.post('/admin/products', payload)),
    update: (id, payload) => unwrap(apiClient.put(`/admin/products/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/admin/products/${id}`)),
  },
  taxCategories: {
    list: (params = {}) => unwrap(apiClient.get('/admin/tax-categories', { params: { limit: 100, ...params } })),
    get: (id) => unwrap(apiClient.get(`/admin/tax-categories/${id}`)),
    create: (payload) => unwrap(apiClient.post('/admin/tax-categories', payload)),
    update: (id, payload) => unwrap(apiClient.put(`/admin/tax-categories/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/admin/tax-categories/${id}`)),
    calculate: (id, params = {}) => unwrap(apiClient.get(`/admin/tax-categories/${id}/calculate`, { params })),
    listRates: (id) => unwrap(apiClient.get(`/admin/tax-categories/${id}/rates`)),
    createRate: (id, payload) => unwrap(apiClient.post(`/admin/tax-categories/${id}/rates`, payload)),
    updateRate: (rateId, payload) => unwrap(apiClient.put(`/admin/tax-categories/rates/${rateId}`, payload)),
    removeRate: (rateId) => unwrap(apiClient.delete(`/admin/tax-categories/rates/${rateId}`)),
  },
  collections: {
    list: (params = {}) => unwrap(apiClient.get('/admin/collections', { params })),
    get: (id) => unwrap(apiClient.get(`/admin/collections/${id}`)),
    create: (payload) => unwrap(apiClient.post('/admin/collections', payload)),
    update: (id, payload) => unwrap(apiClient.put(`/admin/collections/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/admin/collections/${id}`)),
    searchItems: (params = {}) => unwrap(apiClient.get('/admin/collections/search-items', { params })),
    setItems: (id, payload) => unwrap(apiClient.put(`/admin/collections/${id}/items`, payload)),
  },
  media: {
    upload: (file, folder, extra = {}) => {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('folder', folder);
      if (extra.folderId) formData.append('folderId', extra.folderId);
      if (extra.altText) formData.append('altText', extra.altText);
      return unwrap(apiClient.post('/admin/media/upload', formData));
    },
    uploadMultiple: (files, folder, extra = {}) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => formData.append('files', file));
      if (folder) formData.append('folder', folder);
      if (extra.folderId) formData.append('folderId', extra.folderId);
      return unwrap(apiClient.post('/admin/media/upload-multiple', formData));
    },
    list: (params = {}) => apiClient.get('/admin/media', { params }).then((res) => ({ files: res.data.data.files, pagination: res.data.meta?.pagination })),
    get: (id) => unwrap(apiClient.get(`/admin/media/${id}`)),
    update: (id, payload) => unwrap(apiClient.put(`/admin/media/${id}`, payload)),
    trash: (id) => unwrap(apiClient.delete(`/admin/media/${id}`)),
    restore: (id) => unwrap(apiClient.post(`/admin/media/${id}/restore`)),
    purge: (id) => unwrap(apiClient.delete(`/admin/media/${id}/purge`)),
    usages: (id) => unwrap(apiClient.get(`/admin/media/${id}/usages`)),
    listFolders: () => unwrap(apiClient.get('/admin/media/folders')),
    createFolder: (payload) => unwrap(apiClient.post('/admin/media/folders', payload)),
    updateFolder: (id, payload) => unwrap(apiClient.put(`/admin/media/folders/${id}`, payload)),
    deleteFolder: (id) => unwrap(apiClient.delete(`/admin/media/folders/${id}`)),
  },
};
