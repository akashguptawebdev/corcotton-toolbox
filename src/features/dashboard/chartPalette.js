// Values from the dataviz skill's reference palette (references/palette.md), validated
// via scripts/validate_palette.js. Hardcoded per-mode (not CSS custom properties) because
// recharts renders SVG presentation attributes, where var() resolution is inconsistent
// across browsers — the light/dark arrays are selected explicitly by the current theme.
export const CATEGORICAL = {
  light: ['#2a78d6', '#1baf7a', '#eda100', '#008300', '#4a3aa7', '#e34948', '#e87ba4', '#eb6834'],
  dark: ['#3987e5', '#199e70', '#c98500', '#008300', '#9085e9', '#e66767', '#d55181', '#d95926'],
};

export const SEQUENTIAL_BLUE = { light: '#2a78d6', dark: '#3987e5' };
export const SEQUENTIAL_BLUE_FILL = { light: 'rgba(42,120,214,0.14)', dark: 'rgba(57,135,229,0.18)' };

export const CHART_INK = {
  light: { grid: '#e1e0d9', axis: '#c3c2b7', text: '#898781', tooltipBg: '#ffffff', tooltipBorder: '#e1e0d9' },
  dark: { grid: '#2c2c2a', axis: '#383835', text: '#898781', tooltipBg: '#1a1a19', tooltipBorder: '#2c2c2a' },
};
