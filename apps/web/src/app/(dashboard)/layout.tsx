'use client';

// Alle Dashboard-Seiten dynamisch rendern (keine statische Generierung)
// noetig weil Seiten API-Calls und useSearchParams verwenden
export const dynamic = 'force-dynamic';

/**
 * @file apps/web/src/app/(dashboard)/layout.tsx
 * @description Layout für alle Dashboard-Seiten.
 *
 * Enthält: TopBar (oben) + Sidebar (links) + Hauptinhalt (rechts)
 * Dieses Layout gilt für alle Seiten unter (dashboard)/.
 */

import React, { useState } from 'react';

import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';

import { Sidebar, SIDEBAR_WIDTH } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps): React.JSX.Element {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Obere Leiste */}
      <TopBar onMenuClick={() => setMobileOpen(true)} />

      {/* Seitenleiste */}
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Hauptinhalt */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          ml: { md: `${SIDEBAR_WIDTH}px` },
          backgroundColor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {/* Platzhalter für die fixierte TopBar */}
        <Toolbar />

        {/* Seiteninhalt mit Padding */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
