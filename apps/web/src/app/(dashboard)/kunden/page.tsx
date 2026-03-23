/**
 * @file apps/web/src/app/(dashboard)/kunden/page.tsx
 * @description Kunden-Listenansicht.
 */

'use client';

import React, { useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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

import { kundenApi, type KundenListResponse } from '@/lib/api/kunden.api';

export default function KundenListePage(): React.JSX.Element {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [suche, setSuche] = useState('');
  const [data, setData] = useState<KundenListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    kundenApi
      .list({ page: page + 1, pageSize: rowsPerPage, suche: suche || undefined })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, suche]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Kunden
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          href="/kunden/new"
        >
          Neuer Kunde
        </Button>
      </Box>

      <Paper sx={{ mb: 2, p: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Suchen nach Name, Firma, E-Mail..."
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
          <Box sx={{ p: 4 }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Firma</TableCell>
                  <TableCell>E-Mail</TableCell>
                  <TableCell>Telefon</TableCell>
                  <TableCell>Gutachten</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data?.kunden.map((k) => (
                  <TableRow
                    key={k.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/kunden/${k.id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {k.vorname ? `${k.vorname} ${k.nachname}` : k.nachname}
                      </Typography>
                    </TableCell>
                    <TableCell>{k.firma ?? '—'}</TableCell>
                    <TableCell>{k.email ?? '—'}</TableCell>
                    <TableCell>{k.telefon ?? k.mobil ?? '—'}</TableCell>
                    <TableCell>{k._count?.gutachten ?? 0}</TableCell>
                  </TableRow>
                ))}
                {(!data?.kunden.length) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">Keine Kunden gefunden.</Typography>
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
