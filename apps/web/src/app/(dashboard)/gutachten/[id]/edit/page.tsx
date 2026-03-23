/**
 * @file apps/web/src/app/(dashboard)/gutachten/[id]/edit/page.tsx
 * @description Gutachten bearbeiten.
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
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { gutachtenApi, type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_OPTIONS: Array<{ value: GutachtenStatus; label: string }> = [
  { value: 'AUFGENOMMEN', label: 'Aufgenommen' },
  { value: 'BEAUFTRAGT', label: 'Beauftragt' },
  { value: 'BESICHTIGUNG', label: 'Besichtigung' },
  { value: 'ENTWURF', label: 'Entwurf' },
  { value: 'FREIGABE', label: 'Freigabe' },
  { value: 'FERTIG', label: 'Fertig' },
  { value: 'ARCHIV', label: 'Archiv' },
];

export default function EditGutachtenPage(): React.JSX.Element {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    titel: '',
    aktenzeichen: '',
    status: 'AUFGENOMMEN' as GutachtenStatus,
    beschreibung: '',
    frist: '',
    auftragsdatum: '',
  });

  useEffect(() => {
    gutachtenApi
      .findById(id)
      .then((g) => {
        setForm({
          titel: g.titel,
          aktenzeichen: g.aktenzeichen,
          status: g.status,
          beschreibung: g.beschreibung ?? '',
          frist: g.frist ? new Date(g.frist).toISOString().split('T')[0] : '',
          auftragsdatum: g.auftragsdatum
            ? new Date(g.auftragsdatum).toISOString().split('T')[0]
            : '',
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
    setSaving(true);
    setError(null);
    try {
      await gutachtenApi.update(id, {
        titel: form.titel,
        aktenzeichen: form.aktenzeichen,
        status: form.status,
        beschreibung: form.beschreibung || undefined,
        frist: form.frist ? new Date(form.frist).toISOString() : null,
        auftragsdatum: form.auftragsdatum ? new Date(form.auftragsdatum).toISOString() : null,
      });
      router.push(`/gutachten/${id}`);
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
        <Button startIcon={<ArrowBackIcon />} component={Link} href={`/gutachten/${id}`} color="inherit">
          Zurück
        </Button>
        <Typography variant="h4" fontWeight={700}>
          Gutachten bearbeiten
        </Typography>
      </Box>

      <Card sx={{ maxWidth: 800 }}>
        <CardHeader title={form.aktenzeichen} />
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
            />

            <TextField
              label="Aktenzeichen"
              value={form.aktenzeichen}
              onChange={handleChange('aktenzeichen')}
              fullWidth
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
              <Button variant="outlined" component={Link} href={`/gutachten/${id}`} disabled={saving}>
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
