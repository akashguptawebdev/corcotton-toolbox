import { configureStore } from '@reduxjs/toolkit';
import authReducer, { sessionExpired } from '@features/auth/authSlice';
import ordersReducer from '@features/orders/ordersSlice';
import returnsReducer from '@features/returns/returnsSlice';
import uiReducer from './uiSlice';
import brandingReducer from './brandingSlice';
import { attachAuthHandlers } from '@services/apiClient';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    branding: brandingReducer,
    orders: ordersReducer,
    returns: returnsReducer,
  },
});

// Wired after store creation (not at apiClient's module scope) so apiClient never
// imports the store directly — avoids a store -> authSlice -> apiClient -> store cycle.
attachAuthHandlers({
  onSessionExpired: () => store.dispatch(sessionExpired()),
});
