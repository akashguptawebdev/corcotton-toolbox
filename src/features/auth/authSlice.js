import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as authApi from './auth.api';
import { setAccessToken, clearAccessToken } from '@services/tokenStore';

// status: 'idle' (not yet checked) -> 'checking' -> 'authenticated' | 'unauthenticated'
const initialState = {
  status: 'idle',
  user: null,
  permissions: [],
  pendingTwoFactor: null, // { preAuthToken } while a 2FA challenge is in progress
  error: null,
};

const normalizePermissions = (payload = {}) => {
  const nested = payload.user?.permissions || payload.user?.role?.permissions;
  const permissions = payload.permissions || nested || [];
  return Array.isArray(permissions)
    ? permissions.map((permission) => (typeof permission === 'string' ? permission : permission.key)).filter(Boolean)
    : [];
};

const normalizeUser = (user = null) => {
  if (!user) return null;
  const roleValue = typeof user.role === 'object' ? user.role.slug || user.role.name : user.role;
  return {
    ...user,
    role: String(roleValue || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/-/g, '_'),
  };
};

const applyCredentials = (state, payload = {}) => {
  const { accessToken = null } = payload;
  if (accessToken) setAccessToken(accessToken);
  state.status = 'authenticated';
  state.user = normalizeUser(payload.user);
  state.permissions = normalizePermissions(payload);
  state.pendingTwoFactor = null;
  state.error = null;
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  try {
    return await authApi.refresh();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authApi.login(credentials);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed');
  }
});

export const sendLoginOtp = createAsyncThunk('auth/sendLoginOtp', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.sendLoginOtp(payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Unable to send OTP');
  }
});

export const verifyLoginOtp = createAsyncThunk('auth/verifyLoginOtp', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.verifyLoginOtp(payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Invalid OTP');
  }
});

export const googleLogin = createAsyncThunk('auth/googleLogin', async (credential, { rejectWithValue }) => {
  try {
    return await authApi.googleLogin(credential);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Google sign-in failed');
  }
});

export const verifyTwoFactor = createAsyncThunk('auth/verifyTwoFactor', async (code, { getState, rejectWithValue }) => {
  const { pendingTwoFactor } = getState().auth;
  try {
    return await authApi.verifyTwoFactor({ preAuthToken: pendingTwoFactor.preAuthToken, code });
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Invalid code');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await authApi.logout();
  } finally {
    clearAccessToken();
  }
});

// Response shape matches login — applyCredentials below re-authenticates the session
// in place, so the caller can navigate straight to /dashboard with no second sign-in.
export const changePassword = createAsyncThunk('auth/changePassword', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.changePassword(payload);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Unable to change password');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired: (state) => {
      clearAccessToken();
      state.status = 'unauthenticated';
      state.user = null;
      state.permissions = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.status = 'checking';
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        applyCredentials(state, action.payload);
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.status = 'unauthenticated';
      })
      .addCase(login.pending, (state) => {
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        if (action.payload.requires2FA) {
          state.pendingTwoFactor = { preAuthToken: action.payload.preAuthToken };
        } else {
          applyCredentials(state, action.payload);
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(sendLoginOtp.pending, (state) => {
        state.error = null;
      })
      .addCase(sendLoginOtp.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(verifyLoginOtp.pending, (state) => {
        state.error = null;
      })
      .addCase(verifyLoginOtp.fulfilled, (state, action) => {
        applyCredentials(state, action.payload);
      })
      .addCase(verifyLoginOtp.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(googleLogin.pending, (state) => {
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        applyCredentials(state, action.payload);
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(verifyTwoFactor.fulfilled, (state, action) => {
        applyCredentials(state, action.payload);
      })
      .addCase(verifyTwoFactor.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.status = 'unauthenticated';
        state.user = null;
        state.permissions = [];
        state.pendingTwoFactor = null;
      })
      .addCase(changePassword.pending, (state) => {
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        applyCredentials(state, action.payload);
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;
