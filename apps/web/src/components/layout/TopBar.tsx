/**
 * @file apps/web/src/components/layout/TopBar.tsx
 * @description Obere Navigationsleiste mit Hamburger-Menü und Theme-Toggle.
 */

'use client';

import React from 'react';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { usePathname } from 'next/navigation';

import { useThemeStore } from '@/store/theme.store';

import { SIDEBAR_WIDTH } from './Sidebar';

/** Seitentitel aus URL ableiten */
function getTitel(pathname: string): string {
  if (pathname.startsWith('/dashboard')) { return 'Dashboard'; }
  if (pathname.startsWith('/gutachten/neu')) { return 'Neues Gutachten'; }
  if (pathname.includes('/gutachten/')) { return 'Gutachten-Details'; }
  if (pathname.startsWith('/gutachten')) { return 'Gutachten'; }
  if (pathname.startsWith('/kunden')) { return 'Kundenverwaltung'; }
  if (pathname.startsWith('/kalender')) { return 'Kalender'; }
  if (pathname.startsWith('/admin')) { return 'Administration'; }
  return 'Gutachten-Manager';
}

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps): React.JSX.Element {
  const { mode, toggleTheme } = useThemeStore();
  const pathname = usePathname();
  const titel = getTitel(pathname);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        ml: { md: `${SIDEBAR_WIDTH}px` },
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        {/* Hamburger-Menü (nur Mobile) */}
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: 'none' } }}
          aria-label="Navigation öffnen"
        >
          <MenuIcon />
        </IconButton>

        {/* Seitentitel */}
        <Typography variant="h6" component="h1" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {titel}
        </Typography>

        {/* Dark/Light Mode Toggle */}
        <IconButton
          onClick={toggleTheme}
          aria-label={mode === 'dark' ? 'Light Mode aktivieren' : 'Dark Mode aktivieren'}
        >
          {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
