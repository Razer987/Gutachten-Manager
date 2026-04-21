/**
 * @file apps/web/src/app/(dashboard)/gutachter/[id]/page.tsx
 * @description Gutachter-Detailansicht.
 */

'use client';

import React, { useEffect, useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WorkIcon from '@mui/icons-material/Work';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { gutachterApi, type Gutachter } from '@/lib/api/gutachter.api';
import { gutachtenApi, type Gutachten, type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_COLORS: Record<GutachtenStatus, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'primary',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'warning',
  FERTIG: 'success',
  ARCHIV: 'default',
};

const STATUS_LABELS: Record<GutachtenStatus, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiviert',
};

export default function GutachterDetailPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [gutachter, setGutachter] = useState<Gutachter | null>(null);
  const [gutachten, setGutachten] = useState<Gutachten[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      gutachterApi.findById(id),
      gutachtenApi.list({ gutachterId: id, pageSize: 50 }),
    ])
      .then(([g, gList]) => {
        setGutachter(g);
        setGutachten(gList.gutachten);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await gutachterApi.delete(id);
      router.push('/gutachter');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen.');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !gutachter) {
    return (
      <Box>
        <Typography color="error">{error ?? 'Gutachter nicht gefunden.'}</Typography>
        <Button startIcon={<ArrowBackIcon />} component={Link} href="/gutachter" sx={{ mt: 2 }}>
          Zurück
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} component={Link} href="/gutachter" color="inherit">
            Zurück
          </Button>
          <Typography variant="h4" fontWeight={700}>
            {gutachter.vorname} {gutachter.nachname}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            component={Link}
            href={`/gutachter/${id}/edit`}
          >
            Bearbeiten
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteOpen(true)}
          >
            Löschen
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Stammdaten */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Kontaktdaten" />
            <CardContent>
              {gutachter.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    <a href={`mailto:${gutachter.email}`} style={{ color: 'inherit' }}>
                      {gutachter.email}
                    </a>
                  </Typography>
                </Box>
              )}
              {gutachter.telefon && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2">{gutachter.telefon}</Typography>
                </Box>
              )}
              {gutachter.fachgebiet && (
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <WorkIcon fontSize="small" color="action" sx={{ mt: 0.3 }} />
                  <Typography variant="body2">{gutachter.fachgebiet}</Typography>
                </Box>
              )}
              {!gutachter.email && !gutachter.telefon && !gutachter.fachgebiet && (
                <Typography variant="body2" color="text.secondary">Keine Kontaktdaten hinterlegt.</Typography>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Erstellt</Typography>
              <Typography variant="body2">
                {new Date(gutachter.createdAt).toLocaleDateString('de-DE', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Gutachten-Liste */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader
              title={`Gutachten (${gutachten.length})`}
              action={
                <Button
                  size="small"
                  variant="outlined"
                  component={Link}
                  href={`/gutachten/new?gutachterId=${id}`}
                >
                  Neues Gutachten
                </Button>
              }
            />
            <Divider />
            {gutachten.length === 0 ? (
              <CardContent>
                <Typography color="text.secondary" variant="body2">
                  Noch keine Gutachten für diesen Gutachter.
                </Typography>
              </CardContent>
            ) : (
              <List disablePadding>
                {gutachten.map((g, i) => (
                  <React.Fragment key={g.id}>
                    {i > 0 && <Divider component="li" />}
                    <ListItem
                      component={Link}
                      href={`/gutachten/${g.id}`}
                      sx={{ '&:hover': { bgcolor: 'action.hover' }, textDecoration: 'none', color: 'inherit' }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography fontWeight={600}>{g.titel}</Typography>
                            <Chip
                              label={STATUS_LABELS[g.status] ?? g.status}
                              color={STATUS_COLORS[g.status] ?? 'default'}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={g.aktenzeichen}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Löschen-Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Gutachter löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Soll <strong>{gutachter.vorname} {gutachter.nachname}</strong> wirklich gelöscht werden?
            {gutachten.length > 0 && (
              <> Es sind noch <strong>{gutachten.length} Gutachten</strong> diesem Gutachter zugeordnet.</>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Abbrechen</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
