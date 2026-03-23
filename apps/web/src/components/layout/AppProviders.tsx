/**
 * @file apps/web/src/components/layout/AppProviders.tsx
 * @description Client-Component das alle Provider für die App bereitstellt.
 *
 * Provider-Hierarchie (innen nach außen):
 *   QueryClientProvider → React Query (API-Caching)
 *   ThemeProvider       → MUI Theme (Light/Dark Mode)
 *   CssBaseline         → Globale CSS-Normalisierung
 *
 * Als 'use client' Komponente umschließt es den Server-Component-Baum.
 */

'use client';

import React, { useMemo } from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { useThemeStore } from '@/store/theme.store';
import { darkTheme, lightTheme } from '@/styles/theme';

/** React Query Client-Konfiguration */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Daten werden nach 5 Minuten als veraltet betrachtet
      staleTime: 5 * 60 * 1000,
      // Automatisch im Hintergrund neu laden wenn Fenster fokussiert wird
      refetchOnWindowFocus: false,
      // Bei Fehler: 2 Wiederholungsversuche
      retry: 2,
    },
    mutations: {
      // Mutations nicht automatisch wiederholen
      retry: false,
    },
  },
});

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  const { mode } = useThemeStore();

  // Theme-Objekt wird nur neu erstellt wenn sich der Modus ändert
  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        {/* React Query Devtools — nur in Entwicklung sichtbar */}
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
