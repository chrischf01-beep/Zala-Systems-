import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n, { setDocumentLang } from '../lib/i18n';
import type { Language, Profile, Theme } from '../lib/types';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('theme-light', theme === 'light');
  document.documentElement.style.colorScheme = theme;
}

interface SettingsState {
  language: Language;
  theme: Theme;
  profile: Profile;
  notifyPredict: boolean;
  notifySystem: boolean;
  setLanguage: (l: Language) => void;
  setTheme: (t: Theme) => void;
  setProfile: (p: Profile) => void;
  setNotifyPredict: (v: boolean) => void;
  setNotifySystem: (v: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: (i18n.language?.startsWith('sw') ? 'sw' : 'en') as Language,
      theme: 'dark',
      profile: 'balanced',
      notifyPredict: true,
      notifySystem: true,
      setLanguage: (l) => {
        set({ language: l });
        void i18n.changeLanguage(l);
        setDocumentLang(l);
        try {
          localStorage.setItem('zala.lang', l);
        } catch {
          /* noop */
        }
      },
      setTheme: (t) => {
        set({ theme: t });
        applyTheme(t);
      },
      setProfile: (p) => set({ profile: p }),
      setNotifyPredict: (v) => set({ notifyPredict: v }),
      setNotifySystem: (v) => set({ notifySystem: v }),
    }),
    {
      name: 'zala.settings',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyTheme(state.theme);
        void i18n.changeLanguage(state.language);
        setDocumentLang(state.language);
      },
    }
  )
);

export function currentLanguage(): Language {
  return get().language ?? 'en';
}

function get() {
  return useSettingsStore.getState();
}
