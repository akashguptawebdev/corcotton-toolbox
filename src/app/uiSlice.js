import { createSlice } from '@reduxjs/toolkit';

const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('toolbox-theme') : null;

const initialState = {
  theme: storedTheme || 'light', // 'light' | 'dark' — user-selected, persisted
  sidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('toolbox-theme', state.theme);
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { toggleTheme, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
