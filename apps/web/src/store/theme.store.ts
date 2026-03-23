/**
 * @file apps/web/src/store/theme.store.ts
 * @description Zustand-Store für Theme (Light/Dark Mode).
 *
 * Speichert die Theme-Präferenz im localStorage damit sie nach
 * einem Neuladen erhalten bleibt.
 *
 * Verwendung:
 *   const { mode, toggleTheme } = useThemeStore()
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

interface ThemeStore {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'light',

      toggleTheme: () =>
        set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),

      setMode: (mode: ThemeMode) => set({ mode }),
    }),
    {
      name: 'gutachten-theme', // localStorage-Key
    },
  ),
);
