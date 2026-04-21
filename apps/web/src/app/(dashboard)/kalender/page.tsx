/**
 * @file apps/web/src/app/(dashboard)/kalender/page.tsx
 * @description Kalender-Ansicht mit Terminen.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { termineApi, type Termin } from '@/lib/api/termine.api';

export default function KalenderPage(): React.JSX.Element {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newTermin, setNewTermin] = useState({
    titel: '',
    start: '',
    ende: '',
    ort: '',
    beschreibung: '',
  });

  const loadTermine = useCallback(() => {
    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    setLoading(true);
    termineApi
      .list({ von: now.toISOString(), bis: in90Days.toISOString() })
      .then(setTermine)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(loadTermine, [loadTermine]);

  const handleSave = async () => {
    if (!newTermin.titel || !newTermin.start || !newTermin.ende) { return; }
    setSaving(true);
    try {
      await termineApi.create({
        titel: newTermin.titel,
        start: new Date(newTermin.start).toISOString(),
        ende: new Date(newTermin.ende).toISOString(),
        ort: newTermin.ort || undefined,
        beschreibung: newTermin.beschreibung || undefined,
      });
      setDialogOpen(false);
      setNewTermin({ titel: '', start: '', ende: '', ort: '', beschreibung: '' });
      loadTermine();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  // Termine nach Datum gruppieren
  const termineByDate = termine.reduce<Record<string, Termin[]>>((acc, t) => {
    const date = new Date(t.start).toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) { acc[date] = []; }
    acc[date].push(t);
    return acc;
  }, {});

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Kalender
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Neuer Termin
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : termine.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary">
              Keine Termine in den nächsten 90 Tagen.
            </Typography>
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setDialogOpen(true)}>
              Ersten Termin erstellen
            </Button>
          </CardContent>
        </Card>
      ) : (
        Object.entries(termineByDate).map(([date, tList]) => (
          <Box key={date} sx={{ mb: 3 }}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              {date}
            </Typography>
            <Card>
              <List dense>
                {tList.map((t, idx) => (
                  <ListItem
                    key={t.id}
                    sx={{
                      borderBottom: idx < tList.length - 1 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Box
                      sx={{
                        width: 4,
                        height: 40,
                        borderRadius: 1,
                        bgcolor: t.farbe ?? 'primary.main',
                        mr: 2,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1" fontWeight={600}>
                            {t.titel}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(t.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            {t.ende && (
                              <>
                                {' – '}
                                {new Date(t.ende).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </>
                            )}
                          </Typography>
                          {t.gutachten && (
                            <Chip
                              label={t.gutachten.aktenzeichen}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          {t.ort && <span>Ort: {t.ort}</span>}
                          {t.beschreibung && <span> — {t.beschreibung}</span>}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Card>
          </Box>
        ))
      )}

      {/* Neuer Termin Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuer Termin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Titel *"
              value={newTermin.titel}
              onChange={(e) => setNewTermin((p) => ({ ...p, titel: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Start *"
              type="datetime-local"
              value={newTermin.start}
              onChange={(e) => setNewTermin((p) => ({ ...p, start: e.target.value }))}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Ende *"
              type="datetime-local"
              value={newTermin.ende}
              onChange={(e) => setNewTermin((p) => ({ ...p, ende: e.target.value }))}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Ort"
              value={newTermin.ort}
              onChange={(e) => setNewTermin((p) => ({ ...p, ort: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Beschreibung"
              value={newTermin.beschreibung}
              onChange={(e) => setNewTermin((p) => ({ ...p, beschreibung: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !newTermin.titel || !newTermin.start || !newTermin.ende}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
