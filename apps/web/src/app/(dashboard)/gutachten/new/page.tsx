/**
 * @file apps/web/src/app/(dashboard)/gutachten/new/page.tsx
 * @description Seite: Neues Gutachten erstellen.
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
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { gutachtenApi, type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_OPTIONS: Array<{ value: GutachtenStatus; label: string }> = [
  { value: 'AUFGENOMMEN', label: 'Aufgenommen' },
  { value: 'BEAUFTRAGT', label: 'Beauftragt' },
  { value: 'BESICHTIGUNG', label: 'Besichtigung' },
  { value: 'ENTWURF', label: 'Entwurf' },
];

export default function NewGutachtenPage(): React.JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titel: '',
    aktenzeichen: '',
    status: 'AUFGENOMMEN' as GutachtenStatus,
    beschreibung: '',
    frist: '',
    auftragsdatum: '',
  });

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titel.trim()) {
      setError('Bitte geben Sie einen Titel ein.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const gutachten = await gutachtenApi.create({
        titel: form.titel,
        aktenzeichen: form.aktenzeichen || undefined,
        status: form.status,
        beschreibung: form.beschreibung || undefined,
        frist: form.frist ? new Date(form.frist).toISOString() : null,
        auftragsdatum: form.auftragsdatum ? new Date(form.auftragsdatum).toISOString() : null,
      });
      router.push(`/gutachten/${gutachten.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen des Gutachtens.');
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          component={Link}
          href="/gutachten"
          color="inherit"
        >
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Neues Gutachten
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 800 }}>
        <CardHeader title="Gutachten-Details" />
        <CardContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}

            <TextField
              label="Titel *"
              value={form.titel}
              onChange={handleChange('titel')}
              required
              fullWidth
              helperText="Kurze Beschreibung des Gutachtens"
            />

            <TextField
              label="Aktenzeichen"
              value={form.aktenzeichen}
              onChange={handleChange('aktenzeichen')}
              fullWidth
              helperText="Leer lassen für automatische Vergabe (z.B. GA-2026-001)"
            />

            <TextField
              label="Status"
              value={form.status}
              onChange={handleChange('status')}
              select
              fullWidth
            >
              {STATUS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Auftragsdatum"
              type="date"
              value={form.auftragsdatum}
              onChange={handleChange('auftragsdatum')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Frist"
              type="date"
              value={form.frist}
              onChange={handleChange('frist')}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Beschreibung"
              value={form.beschreibung}
              onChange={handleChange('beschreibung')}
              multiline
              rows={4}
              fullWidth
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="outlined"
                component={Link}
                href="/gutachten"
                disabled={loading}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={16} /> : undefined}
              >
                Gutachten erstellen
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
