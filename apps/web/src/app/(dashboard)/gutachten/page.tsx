/**
 * @file apps/web/src/app/(dashboard)/gutachten/page.tsx
 * @description Gutachten-Listenansicht.
 */

'use client';

import React, { useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { gutachtenApi, type GutachtenStatus } from '@/lib/api/gutachten.api';

const STATUS_LABELS: Record<GutachtenStatus, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const STATUS_COLORS: Record<GutachtenStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'info',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'secondary',
  FERTIG: 'success',
  ARCHIV: 'default',
};

export default function GutachtenListePage(): React.JSX.Element {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [suche, setSuche] = useState('');
  const [data, setData] = React.useState<Awaited<ReturnType<typeof gutachtenApi.list>> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    gutachtenApi
      .list({ page: page + 1, pageSize: rowsPerPage, suche: suche || undefined })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, suche]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Gutachten
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/gutachten/new"
        >
          Neues Gutachten
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Suchen nach Aktenzeichen, Titel..."
          value={suche}
          onChange={(e) => { setSuche(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Aktenzeichen</TableCell>
                  <TableCell>Titel</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Auftraggeber</TableCell>
                  <TableCell>Gutachter</TableCell>
                  <TableCell>Frist</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.gutachten.map((g) => (
                  <TableRow
                    key={g.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/gutachten/${g.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {g.aktenzeichen}
                      </Typography>
                    </TableCell>
                    <TableCell>{g.titel}</TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABELS[g.status]}
                        color={STATUS_COLORS[g.status]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {g.kunde
                        ? `${g.kunde.vorname ?? ''} ${g.kunde.nachname}`.trim()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {g.gutachter
                        ? `${g.gutachter.vorname} ${g.gutachter.nachname}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {g.frist
                        ? new Date(g.frist).toLocaleDateString('de-DE')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {(!data?.gutachten.length) && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">
                        Keine Gutachten gefunden.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={data?.meta.total ?? 0}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[10, 20, 50]}
              labelRowsPerPage="Zeilen pro Seite:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} von ${count}`}
            />
          </>
        )}
      </TableContainer>
    </Box>
  );
}
