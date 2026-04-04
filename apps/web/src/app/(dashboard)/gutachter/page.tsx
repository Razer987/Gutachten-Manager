/**
 * @file apps/web/src/app/(dashboard)/gutachter/page.tsx
 * @description Gutachter-Listenansicht.
 */

'use client';

import React, { useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Link from 'next/link';

import { gutachterApi, type Gutachter } from '@/lib/api/gutachter.api';

export default function GutachterPage(): React.JSX.Element {
  const [gutachter, setGutachter] = useState<Gutachter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gutachterApi
      .list()
      .then((res) => setGutachter(res.gutachter))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Gutachter
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} component={Link} href="/gutachter/new">
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
            <BadgeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary" gutterBottom>
              Noch keine Gutachter angelegt.
            </Typography>
            <Button variant="outlined" component={Link} href="/gutachter/new">
              Ersten Gutachter anlegen
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {gutachter.map((g) => (
            <Grid item xs={12} sm={6} md={4} key={g.id}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea component={Link} href={`/gutachter/${g.id}`} sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {g.vorname} {g.nachname}
                    </Typography>
                    {g.fachgebiet && (
                      <Chip
                        label={g.fachgebiet}
                        size="small"
                        variant="outlined"
                        sx={{ mb: 1.5, maxWidth: '100%' }}
                      />
                    )}
                    {g.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <EmailIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {g.email}
                        </Typography>
                      </Box>
                    )}
                    {g.telefon && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <PhoneIcon fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {g.telefon}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
