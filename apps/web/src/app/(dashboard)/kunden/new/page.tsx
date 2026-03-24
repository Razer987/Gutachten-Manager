/**
 * @file apps/web/src/app/(dashboard)/kunden/new/page.tsx
 * @description Neuen Kunden anlegen.
 */

'use client';

import React, { useState } from 'react';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { kundenApi, type CreateKundeInput } from '@/lib/api/kunden.api';

export default function NewKundePage(): React.JSX.Element {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateKundeInput>({
    nachname: '',
    vorname: '',
    firma: '',
    email: '',
    telefon: '',
    mobil: '',
    strasse: '',
    plz: '',
    stadt: '',
    land: 'Deutschland',
    notizen: '',
  });

  const handleChange = (field: keyof CreateKundeInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nachname?.trim()) {
      setError('Bitte geben Sie einen Nachnamen ein.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const kunde = await kundenApi.create(form);
      router.push(`/kunden/${kunde.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Kunden.');
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href="/kunden" color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Neuer Kunde
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 900 }}>
        <CardHeader title="Kundendaten" />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Typography color="error" variant="body2" sx={{ mb: 2 }}>
                {error}
              </Typography>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Vorname"
                  value={form.vorname ?? ''}
                  onChange={handleChange('vorname')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nachname *"
                  value={form.nachname}
                  onChange={handleChange('nachname')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Firma"
                  value={form.firma ?? ''}
                  onChange={handleChange('firma')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  value={form.email ?? ''}
                  onChange={handleChange('email')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefon"
                  value={form.telefon ?? ''}
                  onChange={handleChange('telefon')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Mobil"
                  value={form.mobil ?? ''}
                  onChange={handleChange('mobil')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Straße"
                  value={form.strasse ?? ''}
                  onChange={handleChange('strasse')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="PLZ"
                  value={form.plz ?? ''}
                  onChange={handleChange('plz')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={8}>
                <TextField
                  label="Stadt"
                  value={form.stadt ?? ''}
                  onChange={handleChange('stadt')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Notizen"
                  value={form.notizen ?? ''}
                  onChange={handleChange('notizen')}
                  multiline
                  rows={3}
                  fullWidth
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="outlined" component={Link} href="/kunden" disabled={saving}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : undefined}
              >
                Kunden erstellen
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
