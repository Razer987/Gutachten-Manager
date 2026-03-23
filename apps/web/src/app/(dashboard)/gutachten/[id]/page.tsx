/**
 * @file apps/web/src/app/(dashboard)/gutachten/[id]/page.tsx
 * @description Gutachten-Detailansicht.
 */

'use client';

import React, { useEffect, useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { gutachtenApi, type GutachtenDetail, type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_LABELS: Record<GutachtenStatus, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const STATUS_COLORS: Record<GutachtenStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'info',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'secondary',
  FERTIG: 'success',
  ARCHIV: 'default',
};

// Erlaubte Status-Übergänge
const STATUS_UEBERGAENGE: Record<GutachtenStatus, GutachtenStatus[]> = {
  AUFGENOMMEN: ['BEAUFTRAGT'],
  BEAUFTRAGT: ['AUFGENOMMEN', 'BESICHTIGUNG'],
  BESICHTIGUNG: ['ENTWURF'],
  ENTWURF: ['BESICHTIGUNG', 'FREIGABE'],
  FREIGABE: ['ENTWURF', 'FERTIG'],
  FERTIG: ['ARCHIV'],
  ARCHIV: [],
};

export default function GutachtenDetailPage(): React.JSX.Element {
  const params = useParams();
  const id = params.id as string;

  const [gutachten, setGutachten] = useState<GutachtenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => {
    gutachtenApi
      .findById(id)
      .then(setGutachten)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: GutachtenStatus) => {
    if (!gutachten) { return; }
    setStatusChanging(true);
    try {
      const updated = await gutachtenApi.updateStatus(id, newStatus);
      setGutachten((prev) => prev ? { ...prev, status: updated.status } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden.');
    } finally {
      setStatusChanging(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !gutachten) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">{error ?? 'Gutachten nicht gefunden.'}</Typography>
        <Button component={Link} href="/gutachten" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Zurück zur Liste
        </Button>
      </Box>
    );
  }

  const erlaubteStatus = STATUS_UEBERGAENGE[gutachten.status];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            component={Link}
            href="/gutachten"
            color="inherit"
            sx={{ mb: 1 }}
          >
            Alle Gutachten
          </Button>
          <Typography variant="h4" fontWeight={700}>
            {gutachten.aktenzeichen}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {gutachten.titel}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip
            label={STATUS_LABELS[gutachten.status]}
            color={STATUS_COLORS[gutachten.status]}
          />
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            component={Link}
            href={`/gutachten/${id}/edit`}
          >
            Bearbeiten
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Stammdaten */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Stammdaten" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Aktenzeichen</Typography>
                  <Typography variant="body1" fontWeight={600}>{gutachten.aktenzeichen}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="body1">{STATUS_LABELS[gutachten.status]}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Auftraggeber</Typography>
                  <Typography variant="body1">
                    {gutachten.kunde
                      ? `${gutachten.kunde.vorname ?? ''} ${gutachten.kunde.nachname}`.trim()
                      : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Gutachter</Typography>
                  <Typography variant="body1">
                    {gutachten.gutachter
                      ? `${gutachten.gutachter.vorname} ${gutachten.gutachter.nachname}`
                      : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Auftragsdatum</Typography>
                  <Typography variant="body1">
                    {gutachten.auftragsdatum
                      ? new Date(gutachten.auftragsdatum).toLocaleDateString('de-DE')
                      : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Frist</Typography>
                  <Typography variant="body1" color={gutachten.frist && new Date(gutachten.frist) < new Date() ? 'error' : 'text.primary'}>
                    {gutachten.frist
                      ? new Date(gutachten.frist).toLocaleDateString('de-DE')
                      : '—'}
                  </Typography>
                </Grid>
                {gutachten.beschreibung && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">Beschreibung</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {gutachten.beschreibung}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Workflow */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Workflow" />
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Aktueller Status:
              </Typography>
              <Chip
                label={STATUS_LABELS[gutachten.status]}
                color={STATUS_COLORS[gutachten.status]}
                sx={{ mb: 2 }}
              />

              {erlaubteStatus.length > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status ändern zu:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {erlaubteStatus.map((status) => (
                      <Button
                        key={status}
                        variant="outlined"
                        size="small"
                        disabled={statusChanging}
                        onClick={() => handleStatusChange(status)}
                      >
                        {STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="body2" color="text.secondary">
                Erstellt: {new Date(gutachten.createdAt).toLocaleDateString('de-DE')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Geändert: {new Date(gutachten.updatedAt).toLocaleDateString('de-DE')}
              </Typography>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Offene Aufgaben: {gutachten._count.aufgaben}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dateien: {gutachten._count.dateien}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
