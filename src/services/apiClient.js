import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from './tokenStore';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5003/api/v1';

const apiClient = axios.create({
  baseURL,
  withCredentials: true, // sends the httpOnly refresh cookie
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Deferred so store.js can register a logout handler without apiClient importing
// the store directly (see app/store.js -> attachAuthHandlers).
let onSessionExpired = () => {};
export const attachAuthHandlers = ({ onSessionExpired: handler }) => {
  onSessionExpired = handler;
};

let refreshPromise = null;

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post('/admin/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.data.accessToken);
        return data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthEndpoint = config?.url?.includes('/admin/auth/');

    if (response?.status === 401 && !config._retried && !isAuthEndpoint) {
      config._retried = true;
      try {
        await refreshAccessToken();
        return apiClient(config);
      } catch (refreshError) {
        clearAccessToken();
        onSessionExpired();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
