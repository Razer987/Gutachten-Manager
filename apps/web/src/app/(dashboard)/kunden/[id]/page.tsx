/**
 * @file apps/web/src/app/(dashboard)/kunden/[id]/page.tsx
 * @description Kunden-Detailansicht mit Gutachten und Kontakthistorie.
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
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { kundenApi, type Kunde } from '@/lib/api/kunden.api';

interface KundeDetail extends Kunde {
  kontakthistorie?: Array<{
    id: string;
    art: string;
    inhalt: string;
    bearbeiter: string | null;
    kontaktDat: string;
  }>;
  gutachten?: Array<{
    id: string;
    aktenzeichen: string;
    titel: string;
    status: string;
    createdAt: string;
  }>;
}

export default function KundeDetailPage(): React.JSX.Element {
  const params = useParams();
  const id = params.id as string;

  const [kunde, setKunde] = useState<KundeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    kundenApi
      .findById(id)
      .then((k) => setKunde(k as KundeDetail))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !kunde) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">{error ?? 'Kunde nicht gefunden.'}</Typography>
        <Button component={Link} href="/kunden" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Zurück zur Liste
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Button
            startIcon={<ArrowBackIcon />}
            component={Link}
            href="/kunden"
            color="inherit"
            sx={{ mb: 1 }}
          >
            Alle Kunden
          </Button>
          <Typography variant="h4" fontWeight={700}>
            {kunde.vorname ? `${kunde.vorname} ${kunde.nachname}` : kunde.nachname}
          </Typography>
          {kunde.firma && (
            <Typography variant="subtitle1" color="text.secondary">
              {kunde.firma}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          component={Link}
          href={`/kunden/${id}/edit`}
        >
          Bearbeiten
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Kontaktdaten */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Kontaktdaten" />
            <CardContent>
              {kunde.email && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">E-Mail</Typography>
                  <Typography>{kunde.email}</Typography>
                </Box>
              )}
              {kunde.telefon && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Telefon</Typography>
                  <Typography>{kunde.telefon}</Typography>
                </Box>
              )}
              {kunde.mobil && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Mobil</Typography>
                  <Typography>{kunde.mobil}</Typography>
                </Box>
              )}
              {(kunde.strasse || kunde.stadt) && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">Adresse</Typography>
                  <Typography>{kunde.strasse}</Typography>
                  <Typography>{[kunde.plz, kunde.stadt].filter(Boolean).join(' ')}</Typography>
                </Box>
              )}
              {kunde.notizen && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">Notizen</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {kunde.notizen}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Gutachten */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 2 }}>
            <CardHeader
              title="Gutachten"
              subheader={`${kunde.gutachten?.length ?? 0} Gutachten`}
            />
            <CardContent sx={{ p: 0 }}>
              {kunde.gutachten && kunde.gutachten.length > 0 ? (
                <List dense>
                  {kunde.gutachten.map((g) => (
                    <ListItem
                      key={g.id}
                      component={Link}
                      href={`/gutachten/${g.id}`}
                      sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600} color="primary">
                              {g.aktenzeichen}
                            </Typography>
                            <Chip label={g.status} size="small" />
                          </Box>
                        }
                        secondary={g.titel}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary" variant="body2">
                    Keine Gutachten vorhanden.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Kontakthistorie */}
          <Card>
            <CardHeader
              title="Kontakthistorie"
              subheader={`${kunde.kontakthistorie?.length ?? 0} Einträge`}
            />
            <CardContent sx={{ p: 0 }}>
              {kunde.kontakthistorie && kunde.kontakthistorie.length > 0 ? (
                <List dense>
                  {kunde.kontakthistorie.map((k) => (
                    <ListItem key={k.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Chip label={k.art} size="small" variant="outlined" />
                            <Typography variant="caption" color="text.secondary">
                              {new Date(k.kontaktDat).toLocaleDateString('de-DE')}
                            </Typography>
                          </Box>
                        }
                        secondary={k.inhalt}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 2 }}>
                  <Typography color="text.secondary" variant="body2">
                    Keine Kontakteinträge vorhanden.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
