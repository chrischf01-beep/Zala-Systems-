import { create } from 'zustand';
import * as db from '../lib/db';
import { SITE_DEFAULTS } from '../lib/db';
import type { SiteSettings } from '../lib/types';

interface SiteState extends SiteSettings {
  loaded: boolean;
  set: (patch: Partial<SiteSettings>) => void;
  load: () => Promise<void>;
  reset: () => Promise<void>;
}

export const useSiteStore = create<SiteState>()((set, get) => ({
  ...SITE_DEFAULTS,
  loaded: false,

  load: async () => {
    try {
      const s = await db.getSettings();
      set({ ...s, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  // Optimistic local update, then persist to Supabase (admin-only write; the
  // RLS policy silently rejects non-admins, so we re-sync from the server).
  set: (patch) => {
    set(patch);
    void db
      .saveSettings(patch)
      .then((s) => set(s))
      .catch(() => set({ ...get() }));
  },

  reset: async () => {
    set({ ...SITE_DEFAULTS });
    try {
      const s = await db.saveSettings(SITE_DEFAULTS);
      set(s);
    } catch {
      /* keep local defaults */
    }
  },
}));

export { SITE_DEFAULTS };
