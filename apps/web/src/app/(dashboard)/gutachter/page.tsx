/**
 * @file apps/web/src/app/(dashboard)/gutachter/page.tsx
 * @description Gutachter-Listenansicht.
 */

'use client';

import React, { useEffect, useState } from 'react';

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
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { gutachterApi, type Gutachter } from '@/lib/api/gutachter.api';

export default function GutachterPage(): React.JSX.Element {
  const [gutachter, setGutachter] = useState<Gutachter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    fachgebiet: '',
  });

  const loadGutachter = () => {
    setLoading(true);
    gutachterApi
      .list()
      .then((res) => setGutachter(res.gutachter))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadGutachter, []);

  const handleSave = async () => {
    if (!form.vorname || !form.nachname) { return; }
    setSaving(true);
    try {
      await gutachterApi.create({
        vorname: form.vorname,
        nachname: form.nachname,
        email: form.email || undefined,
        telefon: form.telefon || undefined,
        fachgebiet: form.fachgebiet || undefined,
      });
      setDialogOpen(false);
      setForm({ vorname: '', nachname: '', email: '', telefon: '', fachgebiet: '' });
      loadGutachter();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Gutachter
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          Neuer Gutachter
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : gutachter.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography color="text.secondary" gutterBottom>
              Noch keine Gutachter angelegt.
            </Typography>
            <Button variant="outlined" onClick={() => setDialogOpen(true)}>
              Ersten Gutachter anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {gutachter.map((g) => (
            <Grid item xs={12} sm={6} md={4} key={g.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600}>
                    {g.vorname} {g.nachname}
                  </Typography>
                  {g.fachgebiet && (
                    <Chip label={g.fachgebiet} size="small" sx={{ mt: 0.5, mb: 1 }} />
                  )}
                  {g.email && (
                    <Typography variant="body2" color="text.secondary">
                      {g.email}
                    </Typography>
                  )}
                  {g.telefon && (
                    <Typography variant="body2" color="text.secondary">
                      {g.telefon}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuer Gutachter</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Vorname *"
              value={form.vorname}
              onChange={(e) => setForm((p) => ({ ...p, vorname: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Nachname *"
              value={form.nachname}
              onChange={(e) => setForm((p) => ({ ...p, nachname: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="E-Mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Telefon"
              value={form.telefon}
              onChange={(e) => setForm((p) => ({ ...p, telefon: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Fachgebiet"
              value={form.fachgebiet}
              onChange={(e) => setForm((p) => ({ ...p, fachgebiet: e.target.value }))}
              fullWidth
              helperText="z.B. Unfallanalyse, KFZ-Bewertung"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.vorname || !form.nachname}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
