/**
 * @file apps/web/src/app/(dashboard)/dashboard/page.tsx
 * @description Dashboard mit Statistiken und Übersichten.
 */

'use client';

import React, { useEffect, useState } from 'react';

import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassIcon from '@mui/icons-material/HourglassEmpty';
import Box from '@mui/material/Box';
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

import { dashboardApi, type DashboardStats, type MonatsuebersichtItem } from '@/lib/api/dashboard.api';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, subtitle }: StatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h3" fontWeight={700} color={color}>
              {value}
            </Typography>
            <Typography variant="body1" fontWeight={600} gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.8, '& svg': { fontSize: 48 } }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

const STATUS_LABELS: Record<string, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const STATUS_CHART_COLORS = ['#1565C0', '#1976d2', '#42a5f5', '#90caf9', '#FF6F00', '#4caf50', '#9e9e9e'];

export default function DashboardPage(): React.JSX.Element {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monatsDaten, setMonatsDaten] = useState<MonatsuebersichtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getMonatsuebersicht(),
    ])
      .then(([s, m]) => {
        setStats(s);
        setMonatsDaten(m);
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

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  const statusChartData = stats
    ? Object.entries(stats.statusVerteilung).map(([status, count]) => ({
        name: STATUS_LABELS[status] ?? status,
        value: count,
      }))
    : [];

  const monatLabels = monatsDaten.map((m) => {
    const [year, month] = m.monat.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('de-DE', {
      month: 'short',
      year: '2-digit',
    });
  });

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>

      {/* KPI-Karten */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Gesamt"
            value={stats?.gesamt ?? 0}
            icon={<AssignmentIcon />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Aktiv"
            value={stats?.aktiv ?? 0}
            icon={<HourglassIcon />}
            color="info.main"
            subtitle="In Bearbeitung"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Fertig"
            value={stats?.fertig ?? 0}
            icon={<CheckCircleIcon />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Überfällig"
            value={stats?.ueberfaellige ?? 0}
            icon={<ErrorIcon />}
            color="error.main"
            subtitle="Frist überschritten"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Monats-Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Monatliche Entwicklung" subheader="Letzte 12 Monate" />
            <CardContent>
              {monatsDaten.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monatsDaten.map((m, i) => ({ ...m, label: monatLabels[i] }))}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        value,
                        name === 'erstellt' ? 'Erstellt' : 'Fertig',
                      ]}
                    />
                    <Legend formatter={(v) => v === 'erstellt' ? 'Erstellt' : 'Fertig'} />
                    <Bar dataKey="erstellt" fill="#1565C0" name="erstellt" />
                    <Bar dataKey="fertig" fill="#4caf50" name="fertig" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">Noch keine Daten vorhanden.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status-Verteilung */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Status-Verteilung" />
            <CardContent>
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="45%"
                      outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {statusChartData.map((_, i) => (
                        <Cell key={i} fill={STATUS_CHART_COLORS[i % STATUS_CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">Noch keine Daten vorhanden.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Aktuelle Gutachten */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Zuletzt bearbeitet"
              subheader="Letzte 10 aktive Gutachten"
            />
            <CardContent sx={{ p: 0 }}>
              {stats?.aktuelleGutachten.length ? (
                <List dense>
                  {stats.aktuelleGutachten.map((g, idx) => (
                    <ListItem
                      key={g.id}
                      component={Link}
                      href={`/gutachten/${g.id}`}
                      sx={{
                        borderBottom: idx < (stats.aktuelleGutachten.length - 1) ? '1px solid' : 'none',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600} color="primary">
                              {g.aktenzeichen}
                            </Typography>
                            <Typography variant="body2">{g.titel}</Typography>
                            <Chip label={STATUS_LABELS[g.status] ?? g.status} size="small" sx={{ ml: 'auto' }} />
                          </Box>
                        }
                        secondary={
                          <>
                            {g.kunde && `${g.kunde.vorname ?? ''} ${g.kunde.nachname}`.trim()}
                            {g.frist && (
                              <span style={{ marginLeft: 8 }}>
                                Frist: {new Date(g.frist).toLocaleDateString('de-DE')}
                              </span>
                            )}
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">Noch keine Gutachten vorhanden.</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
