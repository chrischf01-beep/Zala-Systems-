import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './lib/i18n';
import './styles/globals.css';
import { useAuthStore } from './stores/authStore';
import { useSettingsStore } from './stores/settingsStore';
import { useSiteStore } from './stores/siteStore';
import { setDocumentLang } from './lib/i18n';

// Restore the Supabase session and global site settings (both async), and apply
// the persisted theme/language before first paint.
void useAuthStore.getState().hydrate();
void useSiteStore.getState().load();
const s = useSettingsStore.getState();
document.documentElement.classList.toggle('theme-light', s.theme === 'light');
document.documentElement.style.colorScheme = s.theme;
void setDocumentLang(s.language);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
