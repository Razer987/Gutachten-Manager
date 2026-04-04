/**
 * @file apps/web/src/app/(dashboard)/gutachter/[id]/edit/page.tsx
 * @description Gutachter bearbeiten.
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

import { gutachterApi } from '@/lib/api/gutachter.api';

export default function GutachterEditPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    fachgebiet: '',
  });

  useEffect(() => {
    gutachterApi
      .findById(id)
      .then((g) => {
        setForm({
          vorname: g.vorname,
          nachname: g.nachname,
          email: g.email ?? '',
          telefon: g.telefon ?? '',
          fachgebiet: g.fachgebiet ?? '',
        });
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vorname.trim() || !form.nachname.trim()) {
      setError('Vor- und Nachname sind Pflichtfelder.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await gutachterApi.update(id, {
        vorname: form.vorname,
        nachname: form.nachname,
        email: form.email || undefined,
        telefon: form.telefon || undefined,
        fachgebiet: form.fachgebiet || undefined,
      });
      router.push(`/gutachter/${id}`);
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
        <Button startIcon={<ArrowBackIcon />} component={Link} href={`/gutachter/${id}`} color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Gutachter bearbeiten
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 700 }}>
        <CardHeader title="Gutachterdaten" />
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
                  label="Vorname *"
                  value={form.vorname}
                  onChange={handleChange('vorname')}
                  required
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
              <Grid item xs={12} sm={6}>
                <TextField
                  label="E-Mail"
                  type="email"
                  value={form.email}
                  onChange={handleChange('email')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Telefon"
                  value={form.telefon}
                  onChange={handleChange('telefon')}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Fachgebiet"
                  value={form.fachgebiet}
                  onChange={handleChange('fachgebiet')}
                  fullWidth
                />
              </Grid>
            </Grid>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="outlined" component={Link} href={`/gutachter/${id}`} disabled={saving}>
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
