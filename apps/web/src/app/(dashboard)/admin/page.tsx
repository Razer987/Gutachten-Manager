/**
 * @file apps/web/src/app/(dashboard)/admin/page.tsx
 * @description Admin-Panel.
 */

'use client';

import React, { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { apiClient } from '@/lib/api/client';

interface FeatureFlag {
  id: string;
  name: string;
  beschreibung: string | null;
  aktiv: boolean;
}

export default function AdminPage(): React.JSX.Element {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<FeatureFlag[]>('/admin/feature-flags')
      .then(setFlags)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async (name: string, aktiv: boolean) => {
    try {
      await apiClient.patch(`/admin/feature-flags/${encodeURIComponent(name)}`, { aktiv });
      setFlags((prev) => prev.map((f) => (f.name === name ? { ...f, aktiv } : f)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren.');
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Admin-Panel
      </Typography>

      <Card>
        <CardHeader
          title="Feature-Flags"
          subheader="Funktionen aktivieren oder deaktivieren"
        />
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ p: 3 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : flags.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <Typography color="text.secondary">Keine Feature-Flags konfiguriert.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Beschreibung</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Aktiv</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flags.map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} fontFamily="monospace">
                          {flag.name}
                        </Typography>
                      </TableCell>
                      <TableCell>{flag.beschreibung ?? '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={flag.aktiv ? 'Aktiv' : 'Inaktiv'}
                          color={flag.aktiv ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Switch
                          checked={flag.aktiv}
                          onChange={(e) => handleToggle(flag.name, e.target.checked)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
