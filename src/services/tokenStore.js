// Access token lives in memory only — never localStorage (backend/ARCHITECTURE.md Part 3.2).
// A plain module singleton, not Redux state, so apiClient's interceptor can read it
// without importing the store (which would create apiClient <-> store <-> authSlice
// <-> apiClient circular imports).
let accessToken = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token) => {
  accessToken = token;
};
export const clearAccessToken = () => {
  accessToken = null;
};
