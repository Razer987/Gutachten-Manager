/**
 * @file apps/web/src/app/layout.tsx
 * @description Root-Layout für die gesamte Next.js-Anwendung.
 *
 * Stellt bereit:
 *   - MUI ThemeProvider (Light/Dark Mode)
 *   - React Query Provider (für API-Caching)
 *   - Globale CSS-Stile
 *
 * Dieses Layout wird für ALLE Seiten verwendet.
 * Seiten-spezifische Layouts sind in (dashboard)/layout.tsx.
 */

import type { Metadata } from 'next';

import { AppProviders } from '@/components/layout/AppProviders';

export const metadata: Metadata = {
  title: {
    default: 'Gutachten-Manager',
    template: '%s | Gutachten-Manager',
  },
  description: 'Professionelles Management-System für unfallanalytische und unfalltechnische Gutachten',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps): React.JSX.Element {
  return (
    <html lang="de">
      <body suppressHydrationWarning>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
