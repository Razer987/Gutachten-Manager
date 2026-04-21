'use client';

// Next.js 15: useSearchParams braucht Suspense-Grenze + force-dynamic auf Seitenebene
export const dynamic = 'force-dynamic';

/**
 * @file apps/web/src/app/(dashboard)/suche/page.tsx
 * @description Volltextsuche über Gutachten, Kunden und Gutachter.
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import SearchIcon from '@mui/icons-material/Search';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

import { sucheApi, type SucheResult } from '@/lib/api/suche.api';
import { type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_COLORS: Record<GutachtenStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'info',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'secondary',
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
  ARCHIV: 'Archiv',
};

// ─── Innere Komponente (nutzt useSearchParams — muss in <Suspense> liegen) ───

function SucheInhalt(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';

  const [query, setQuery] = useState(initialQ);
  const [result, setResult] = useState<SucheResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    sucheApi
      .suche(q.trim(), 20)
      .then(setResult)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (initialQ) { search(initialQ); }
  }, [initialQ, search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (val.trim()) params.set('q', val.trim());
      router.replace(`/suche${params.size ? `?${params}` : ''}`);
      search(val);
    }, 300);
  };

  const total = result?.total ?? 0;
  const hasResults = result && total > 0;

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Suche
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          autoFocus
          placeholder="Suche nach Gutachten, Kunden, Gutachtern..."
          value={query}
          onChange={handleChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {loading ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          Fehler: {error}
        </Typography>
      )}

      {query.trim().length >= 2 && !loading && !hasResults && !error && (
        <Typography color="text.secondary">Keine Ergebnisse für &ldquo;{query}&rdquo;.</Typography>
      )}

      {hasResults && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {total} Ergebnis{total !== 1 ? 'se' : ''} für &ldquo;{query}&rdquo;
        </Typography>
      )}

      {/* Gutachten */}
      {result && result.gutachten.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Gutachten ({result.gutachten.length})
            </Typography>
          </Box>
          <Divider />
          <List disablePadding>
            {result.gutachten.map((g, i) => (
              <React.Fragment key={g.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/gutachten/${g.id}`}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
                        G
                      </Avatar>
                    </ListItemAvatar>
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
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Kunden */}
      {result && result.kunden.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Kunden ({result.kunden.length})
            </Typography>
          </Box>
          <Divider />
          <List disablePadding>
            {result.kunden.map((k, i) => (
              <React.Fragment key={k.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/kunden/${k.id}`}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36, fontSize: 14 }}>
                        K
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${k.vorname ?? ''} ${k.nachname}`.trim()}
                      secondary={k.email ?? undefined}
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Gutachter */}
      {result && result.gutachter.length > 0 && (
        <Paper sx={{ mb: 2 }}>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Gutachter ({result.gutachter.length})
            </Typography>
          </Box>
          <Divider />
          <List disablePadding>
            {result.gutachter.map((g, i) => (
              <React.Fragment key={g.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem disablePadding>
                  <ListItemButton component={Link} href={`/gutachter/${g.id}`}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'success.main', width: 36, height: 36, fontSize: 14 }}>
                        E
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${g.vorname} ${g.nachname}`}
                      secondary={g.email ?? undefined}
                    />
                  </ListItemButton>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
}

// ─── Äußere Seite: Suspense-Wrapper für useSearchParams ──────────────────────

export default function SuchePage(): React.JSX.Element {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress />
        </Box>
      }
    >
      <SucheInhalt />
    </Suspense>
  );
}
