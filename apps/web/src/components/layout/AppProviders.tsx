'use client';

/**
 * @file apps/web/src/components/layout/AppProviders.tsx
 * @description Client-Component das alle Provider für die App bereitstellt.
 *
 * WICHTIG: QueryClient wird per useState initialisiert (nicht global).
 * Ein global definierter QueryClient würde bei SSR den Cache zwischen
 * verschiedenen User-Requests teilen (Cache-Leaking / Sicherheitsproblem).
 *
 * Provider-Hierarchie:
 *   QueryClientProvider → React Query (API-Caching & Zustandsverwaltung)
 *   ThemeProvider       → MUI Theme (Light/Dark Mode)
 *   CssBaseline         → Globale CSS-Normalisierung
 */

import React, { useMemo, useState } from 'react';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { useThemeStore } from '@/store/theme.store';
import { darkTheme, lightTheme } from '@/styles/theme';

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  const { mode } = useThemeStore();

  /**
   * QueryClient MUSS per useState erstellt werden — nicht als Modul-Variable.
   * In Next.js App Router mit SSR würde ein globaler QueryClient seinen Cache
   * über verschiedene User-Requests hinweg teilen (Security-Bug / Cache-Leaking).
   * useState() mit Factory-Funktion erstellt pro Komponenteninstanz eine neue Instanz.
   */
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,      // Daten 5 Min frisch halten
            refetchOnWindowFocus: false,    // Kein Neuladen bei Fensterfokus
            retry: 2,                       // 2 Wiederholungsversuche bei Fehler
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
