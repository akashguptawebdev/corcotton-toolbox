import { useEffect } from 'react';
import { useSelector } from 'react-redux';

// Stamps data-theme on <html> so CSS custom properties (styles/base/_tokens.scss)
// resolve to the light or dark set. The toggle lives in Redux (ui.theme); this
// component's only job is to sync that state onto the DOM.
const ThemeProvider = ({ children }) => {
  const theme = useSelector((state) => state.ui.theme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return children;
};

export default ThemeProvider;
