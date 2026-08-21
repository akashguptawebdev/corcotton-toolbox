import apiClient from '@services/apiClient';

const unwrap = (promise) => promise.then((res) => res.data.data);

export const storeSettingsApi = {
  get: () => unwrap(apiClient.get('/admin/store-settings')),
  update: (payload) => unwrap(apiClient.put('/admin/store-settings', payload)),
  getBranding: () => unwrap(apiClient.get('/admin/store-settings/branding')),
};
