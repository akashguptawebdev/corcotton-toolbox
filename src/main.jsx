import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import '@styles/main.scss';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const withGoogleOAuth = (children) =>
  googleClientId ? <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider> : children;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {withGoogleOAuth(<App />)}
  </StrictMode>
);
