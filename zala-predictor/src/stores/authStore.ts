import { create } from 'zustand';
import * as db from '../lib/db';
import { AuthError } from '../lib/db';
import type { User } from '../lib/types';

// Re-exported so existing imports (`import { AuthError } from '../stores/authStore'`) keep working.
export { AuthError };

interface AuthState {
  user: User | null;
  loading: boolean;
  bootstrapped: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: db.SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  loading: false,
  bootstrapped: false,

  hydrate: async () => {
    try {
      const user = await db.getSessionUser();
      set({ user, bootstrapped: true });
    } catch {
      set({ user: null, bootstrapped: true });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const user = await db.signIn(email, password);
      set({ user });
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (data) => {
    set({ loading: true });
    try {
      const user = await db.signUp(data);
      set({ user });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await db.signOut();
    set({ user: null });
  },

  resetPassword: async (email) => {
    set({ loading: true });
    try {
      await db.resetPassword(email);
    } finally {
      set({ loading: false });
    }
  },

  updateUser: async (patch) => {
    const u = get().user;
    if (!u) return;
    const updated = await db.updateUser(u.id, patch);
    if (updated) set({ user: updated });
  },

  refreshUser: async () => {
    const u = get().user;
    if (!u) return;
    const fresh = await db.refreshUser(u.id);
    if (fresh) set({ user: fresh });
  },

  deleteAccount: async () => {
    const u = get().user;
    if (!u) return;
    await db.deleteUser(u.id);
    await db.signOut();
    set({ user: null });
  },
}));
