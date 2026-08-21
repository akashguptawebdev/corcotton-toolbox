import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storeSettingsApi } from '@features/settings/storeSettings.api';

// displayName is the one app name shown everywhere post-login (sidebar, browser tab) —
// it comes from Settings → Store Settings, not a hardcoded string. Fetched once per
// session via the unpermissioned /branding endpoint (any authenticated staff member,
// not just settings.view holders — see storeSettings.controller.js).
const DEFAULT_DISPLAY_NAME = 'Ecomm Engine';

const initialState = {
  displayName: DEFAULT_DISPLAY_NAME,
  logo: null,
  favicon: null,
  status: 'idle', // 'idle' -> 'loading' -> 'loaded' | 'failed'
};

export const fetchBranding = createAsyncThunk('branding/fetch', async () => storeSettingsApi.getBranding());

const brandingSlice = createSlice({
  name: 'branding',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBranding.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchBranding.fulfilled, (state, action) => {
        state.status = 'loaded';
        state.displayName = action.payload.displayName?.trim() || DEFAULT_DISPLAY_NAME;
        state.logo = action.payload.logo || null;
        state.favicon = action.payload.favicon || null;
      })
      .addCase(fetchBranding.rejected, (state) => {
        state.status = 'failed';
      });
  },
});

export default brandingSlice.reducer;
