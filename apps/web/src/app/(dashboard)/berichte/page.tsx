/**
 * @file apps/web/src/app/(dashboard)/berichte/page.tsx
 * @description Berichte und Statistiken.
 */

'use client';

import React, { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { dashboardApi, type DashboardStats, type MonatsuebersichtItem } from '@/lib/api/dashboard.api';
import type { GutachtenListItem } from '@/lib/api/gutachten.api';

const STATUS_LABELS: Record<string, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiviert',
};

const STATUS_COLORS_HEX: Record<string, string> = {
  AUFGENOMMEN: '#90caf9',
  BEAUFTRAGT: '#1976d2',
  BESICHTIGUNG: '#42a5f5',
  ENTWURF: '#ffa726',
  FREIGABE: '#ff7043',
  FERTIG: '#66bb6a',
  ARCHIV: '#bdbdbd',
};

const STATUS_CHIP_COLORS: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'primary',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'warning',
  FERTIG: 'success',
  ARCHIV: 'default',
};

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Paper sx={{ p: 2.5, textAlign: 'center' }}>
      <Typography variant="h3" fontWeight={700} color={color ?? 'text.primary'}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Paper>
  );
}

export default function BerichtePage(): React.JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monats, setMonats] = useState<MonatsuebersichtItem[]>([]);
  const [fristen, setFristen] = useState<GutachtenListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getMonatsuebersicht(),
      dashboardApi.getFristen(),
    ])
      .then(([s, m, f]) => {
        setStats(s);
        setMonats(m);
        setFristen(f);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !stats) {
    return <Typography color="error">{error ?? 'Fehler beim Laden der Berichte.'}</Typography>;
  }

  const pieData = Object.entries(stats.statusVerteilung)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: count,
      color: STATUS_COLORS_HEX[status] ?? '#9e9e9e',
    }));

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Berichte
      </Typography>

      {/* KPI-Karten */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Gesamt" value={stats.gesamt} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Aktiv" value={stats.aktiv} color="primary.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Fertig" value={stats.fertig} color="success.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Überfällig" value={stats.ueberfaellige} color={stats.ueberfaellige > 0 ? 'error.main' : undefined} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="Fällig in 30 Tagen" value={stats.faelligIn30Tagen} color={stats.faelligIn30Tagen > 0 ? 'warning.main' : undefined} />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Statusverteilung Pie */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Statusverteilung" />
            <Divider />
            <CardContent>
              {pieData.length === 0 ? (
                <Typography color="text.secondary" variant="body2">Keine Daten.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => [`${val} Gutachten`]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Monatsübersicht Bar */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Monatsübersicht (letzte 12 Monate)" />
            <Divider />
            <CardContent>
              {monats.length === 0 ? (
                <Typography color="text.secondary" variant="body2">Keine Daten.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monats} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monat" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="erstellt" name="Erstellt" fill="#1976d2" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="fertig" name="Fertig" fill="#66bb6a" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fristen-Tabelle */}
      <Card>
        <CardHeader
          title="Anstehende Fristen"
          subheader="Gutachten mit Fristen in den nächsten 30 Tagen oder bereits überfällig"
        />
        <Divider />
        {fristen.length === 0 ? (
          <CardContent>
            <Typography color="text.secondary" variant="body2">
              Keine ausstehenden Fristen.
            </Typography>
          </CardContent>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Aktenzeichen</TableCell>
                  <TableCell>Titel</TableCell>
                  <TableCell>Kunde</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Frist</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fristen.map((g) => {
                  const isOverdue = g.frist ? new Date(g.frist) < new Date() : false;
                  return (
                    <TableRow key={g.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {g.aktenzeichen}
                        </Typography>
                      </TableCell>
                      <TableCell>{g.titel}</TableCell>
                      <TableCell>
                        {g.kunde
                          ? `${g.kunde.vorname ?? ''} ${g.kunde.nachname}`.trim()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABELS[g.status] ?? g.status}
                          color={STATUS_CHIP_COLORS[g.status] ?? 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {g.frist ? (
                          <Typography
                            variant="body2"
                            color={isOverdue ? 'error.main' : 'warning.main'}
                            fontWeight={isOverdue ? 700 : 400}
                          >
                            {new Date(g.frist).toLocaleDateString('de-DE', {
                              day: '2-digit', month: '2-digit', year: 'numeric',
                            })}
                            {isOverdue && ' (Überfällig)'}
                          </Typography>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
