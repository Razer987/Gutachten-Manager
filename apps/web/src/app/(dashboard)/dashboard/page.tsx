/**
 * @file apps/web/src/app/(dashboard)/dashboard/page.tsx
 * @description Dashboard-Übersichtsseite.
 *
 * Wird in Patch 0011 mit Charts und Statistiken befüllt.
 * Hier vorerst Platzhalter-Inhalt.
 */

import type { Metadata } from 'next';

import Typography from '@mui/material/Typography';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage(): React.JSX.Element {
  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary">
        Statistiken und Übersichten werden in Patch 0011 hinzugefügt.
      </Typography>
    </div>
  );
}
