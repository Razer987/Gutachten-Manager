/**
 * @file apps/web/src/app/(dashboard)/kunden/[id]/edit/page.tsx
 * @description Kunden bearbeiten.
 */

'use client';

import React, { useEffect, useState } from 'react';

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
import { useParams, useRouter } from 'next/navigation';

import { kundenApi, type CreateKundeInput } from '@/lib/api/kunden.api';

export default function KundeEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    kundenApi
      .findById(id)
      .then((k) => {
        setForm({
          nachname: k.nachname,
          vorname: k.vorname ?? '',
          firma: k.firma ?? '',
          email: k.email ?? '',
          telefon: k.telefon ?? '',
          mobil: k.mobil ?? '',
          strasse: k.strasse ?? '',
          plz: k.plz ?? '',
          stadt: k.stadt ?? '',
          land: k.land ?? 'Deutschland',
          notizen: k.notizen ?? '',
        });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

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
      await kundenApi.update(id, form);
      router.push(`/kunden/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} component={Link} href={`/kunden/${id}`} color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Kunde bearbeiten
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
                  label="Land"
                  value={form.land ?? ''}
                  onChange={handleChange('land')}
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
              <Button variant="outlined" component={Link} href={`/kunden/${id}`} disabled={saving}>
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : undefined}
              >
                Speichern
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
