import apiClient from '@services/apiClient';

// Matches backend/ARCHITECTURE.md Part 3.5 — admin login may return either
// { accessToken, user, permissions } or { requires2FA: true, preAuthToken } when
// two-factor is enabled on the account.
export const login = (credentials) => apiClient.post('/admin/auth/login', credentials).then((r) => r.data.data);

export const verifyTwoFactor = ({ preAuthToken, code }) =>
  apiClient.post('/admin/auth/2fa/verify', { preAuthToken, code }).then((r) => r.data.data);

export const refresh = () => apiClient.post('/admin/auth/refresh').then((r) => r.data.data);

export const logout = () => apiClient.post('/admin/auth/logout').then((r) => r.data.data);

export const fetchCurrentUser = () => apiClient.get('/admin/auth/me').then((r) => r.data.data);

// Same response shape as login ({ accessToken, user, permissions }) — the backend issues
// a fresh session in the same call, so this doubles as the "auto-login" step after a
// forced or voluntary password change.
export const changePassword = ({ currentPassword, newPassword }) =>
  apiClient.post('/admin/auth/change-password', { currentPassword, newPassword }).then((r) => r.data.data);
