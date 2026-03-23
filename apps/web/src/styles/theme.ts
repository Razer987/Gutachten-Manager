/**
 * @file apps/web/src/styles/theme.ts
 * @description Material UI Theme-Konfiguration für den Gutachten-Manager.
 *
 * Definiert Farben, Typographie und Komponentenstile für Light und Dark Mode.
 * Das Theme wird in layout.tsx via ThemeProvider bereitgestellt.
 *
 * Primärfarbe: Professionelles Blau (gerichtlich, seriös)
 * Sekundärfarbe: Gedämpftes Blaugrau
 */

import { createTheme } from '@mui/material/styles';

// Gemeinsame Theme-Optionen für Light und Dark Mode
const commonTheme = {
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontSize: '2rem', fontWeight: 600 },
    h2: { fontSize: '1.75rem', fontWeight: 600 },
    h3: { fontSize: '1.5rem', fontWeight: 600 },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.1rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none' as const, // Keine Großbuchstaben bei Buttons
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Kein Gradient-Overlay im Dark Mode
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
        },
      },
    },
  },
};

/** Light Mode Theme */
export const lightTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: 'light',
    primary: {
      main: '#1565C0',     // Dunkles Blau — seriös, professionell
      light: '#1976D2',
      dark: '#0D47A1',
    },
    secondary: {
      main: '#455A64',     // Blaugrau
      light: '#607D8B',
      dark: '#37474F',
    },
    background: {
      default: '#F5F7FA',  // Sehr helles Grau (kein reines Weiß)
      paper: '#FFFFFF',
    },
    error: { main: '#D32F2F' },
    warning: { main: '#F57C00' },
    success: { main: '#388E3C' },
    info: { main: '#0288D1' },
  },
});

/** Dark Mode Theme */
export const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#42A5F5',     // Helleres Blau im Dark Mode (bessere Lesbarkeit)
      light: '#64B5F6',
      dark: '#1E88E5',
    },
    secondary: {
      main: '#78909C',
      light: '#90A4AE',
      dark: '#607D8B',
    },
    background: {
      default: '#121212',   // Echtes Material Dark Background
      paper: '#1E1E1E',
    },
    error: { main: '#EF5350' },
    warning: { main: '#FFA726' },
    success: { main: '#66BB6A' },
    info: { main: '#29B6F6' },
  },
});
