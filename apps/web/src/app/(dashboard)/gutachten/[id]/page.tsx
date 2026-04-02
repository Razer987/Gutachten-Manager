/**
 * @file apps/web/src/app/(dashboard)/gutachten/[id]/page.tsx
 * @description Gutachten-Detailansicht mit vollständigen Unterressourcen-Tabs.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';

import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DownloadIcon from '@mui/icons-material/Download';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import DeleteIcon from '@mui/icons-material/Delete';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import NoteIcon from '@mui/icons-material/Note';
import PeopleIcon from '@mui/icons-material/People';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import WarningIcon from '@mui/icons-material/Warning';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { gutachtenApi, type GutachtenDetail, type GutachtenStatus } from '@/lib/api/gutachten.api';
import {
  subresourcesApi,
  type Aufgabe,
  type CreateAufgabeInput,
  type CreateFahrzeugInput,
  type CreateNotizInput,
  type CreatePersonInput,
  type CreateSchadenspostenInput,
  type Datei,
  type Fahrzeug,
  type Notiz,
  type Person,
  type Schadensposten,
  type Unfalldaten,
  type AuditEintrag,
} from '@/lib/api/subresources.api';

const STATUS_LABELS: Record<GutachtenStatus, string> = {
  AUFGENOMMEN: 'Aufgenommen',
  BEAUFTRAGT: 'Beauftragt',
  BESICHTIGUNG: 'Besichtigung',
  ENTWURF: 'Entwurf',
  FREIGABE: 'Freigabe',
  FERTIG: 'Fertig',
  ARCHIV: 'Archiv',
};

const STATUS_COLORS: Record<
  GutachtenStatus,
  'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
> = {
  AUFGENOMMEN: 'default',
  BEAUFTRAGT: 'info',
  BESICHTIGUNG: 'primary',
  ENTWURF: 'warning',
  FREIGABE: 'secondary',
  FERTIG: 'success',
  ARCHIV: 'default',
};

const STATUS_UEBERGAENGE: Record<GutachtenStatus, GutachtenStatus[]> = {
  AUFGENOMMEN: ['BEAUFTRAGT'],
  BEAUFTRAGT: ['AUFGENOMMEN', 'BESICHTIGUNG'],
  BESICHTIGUNG: ['ENTWURF'],
  ENTWURF: ['BESICHTIGUNG', 'FREIGABE'],
  FREIGABE: ['ENTWURF', 'FERTIG'],
  FERTIG: ['ARCHIV'],
  ARCHIV: [],
};

const PERSON_TYP_LABELS: Record<string, string> = {
  FAHRER: 'Fahrer',
  ZEUGE: 'Zeuge',
  GESCHAEDIGTER: 'Geschädigter',
  SONSTIGER: 'Sonstiger',
};

// ─── Tab-Panel ────────────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

// ─── Fahrzeuge-Tab ────────────────────────────────────────────────────────────

function FahrzeugeTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Fahrzeug[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateFahrzeugInput>({});

  const load = useCallback(() => {
    subresourcesApi.fahrzeuge.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    await subresourcesApi.fahrzeuge.create(gutachtenId, form);
    setOpen(false);
    setForm({});
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.fahrzeuge.delete(gutachtenId, id);
    load();
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>
          Fahrzeug hinzufügen
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Fahrzeuge erfasst.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Kennzeichen</TableCell>
              <TableCell>Marke / Modell</TableCell>
              <TableCell>Baujahr</TableCell>
              <TableCell>Farbe</TableCell>
              <TableCell>FIN</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{f.kennzeichen ?? '—'}</TableCell>
                <TableCell>{[f.marke, f.modell].filter(Boolean).join(' ') || '—'}</TableCell>
                <TableCell>{f.baujahr ?? '—'}</TableCell>
                <TableCell>{f.farbe ?? '—'}</TableCell>
                <TableCell>{f.fahrgestellnummer ?? '—'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(f.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Fahrzeug hinzufügen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Kennzeichen" value={form.kennzeichen ?? ''} onChange={(e) => setForm((p) => ({ ...p, kennzeichen: e.target.value }))} />
          <TextField label="Marke" value={form.marke ?? ''} onChange={(e) => setForm((p) => ({ ...p, marke: e.target.value }))} />
          <TextField label="Modell" value={form.modell ?? ''} onChange={(e) => setForm((p) => ({ ...p, modell: e.target.value }))} />
          <TextField label="Baujahr" type="number" value={form.baujahr ?? ''} onChange={(e) => setForm((p) => ({ ...p, baujahr: Number(e.target.value) || undefined }))} />
          <TextField label="Farbe" value={form.farbe ?? ''} onChange={(e) => setForm((p) => ({ ...p, farbe: e.target.value }))} />
          <TextField label="Fahrgestellnummer (FIN)" value={form.fahrgestellnummer ?? ''} onChange={(e) => setForm((p) => ({ ...p, fahrgestellnummer: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Personen-Tab ─────────────────────────────────────────────────────────────

function PersonenTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreatePersonInput>({ typ: 'FAHRER', nachname: '' });

  const load = useCallback(() => {
    subresourcesApi.personen.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.nachname) return;
    await subresourcesApi.personen.create(gutachtenId, form);
    setOpen(false);
    setForm({ typ: 'FAHRER', nachname: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.personen.delete(gutachtenId, id);
    load();
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>
          Person hinzufügen
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Personen erfasst.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Typ</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Chip label={PERSON_TYP_LABELS[p.typ] ?? p.typ} size="small" />
                </TableCell>
                <TableCell>{[p.vorname, p.nachname].filter(Boolean).join(' ')}</TableCell>
                <TableCell>{p.telefon ?? '—'}</TableCell>
                <TableCell>{p.email ?? '—'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(p.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Person hinzufügen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Select value={form.typ} onChange={(e) => setForm((p) => ({ ...p, typ: e.target.value as CreatePersonInput['typ'] }))}>
            {Object.entries(PERSON_TYP_LABELS).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v}</MenuItem>
            ))}
          </Select>
          <TextField label="Vorname" value={form.vorname ?? ''} onChange={(e) => setForm((p) => ({ ...p, vorname: e.target.value }))} />
          <TextField required label="Nachname" value={form.nachname} onChange={(e) => setForm((p) => ({ ...p, nachname: e.target.value }))} />
          <TextField label="Telefon" value={form.telefon ?? ''} onChange={(e) => setForm((p) => ({ ...p, telefon: e.target.value }))} />
          <TextField label="E-Mail" value={form.email ?? ''} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <TextField label="Adresse" value={form.adresse ?? ''} onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.nachname}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Schaden-Tab ──────────────────────────────────────────────────────────────

function SchadenTab({ gutachtenId }: { gutachtenId: string }) {
  const [posten, setPosten] = useState<Schadensposten[]>([]);
  const [gesamt, setGesamt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateSchadenspostenInput>({ beschreibung: '', betrag: 0 });

  const load = useCallback(() => {
    subresourcesApi.schaden.list(gutachtenId)
      .then((res) => { setPosten(res.posten); setGesamt(res.gesamtbetrag); })
      .finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.beschreibung || form.betrag <= 0) return;
    await subresourcesApi.schaden.create(gutachtenId, form);
    setOpen(false);
    setForm({ beschreibung: '', betrag: 0 });
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.schaden.delete(gutachtenId, id);
    load();
  };

  const fmt = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Gesamtschaden: <strong>{fmt(gesamt)}</strong></Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>
          Posten hinzufügen
        </Button>
      </Box>

      {posten.length === 0 ? (
        <Typography color="text.secondary">Noch keine Schadensposten erfasst.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Beschreibung</TableCell>
              <TableCell>Einheit</TableCell>
              <TableCell align="right">Betrag</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {posten.map((sp) => (
              <TableRow key={sp.id}>
                <TableCell>{sp.position}</TableCell>
                <TableCell>{sp.beschreibung}</TableCell>
                <TableCell>{sp.einheit ?? '—'}</TableCell>
                <TableCell align="right">{fmt(sp.betrag)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(sp.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={3} align="right"><strong>Gesamt</strong></TableCell>
              <TableCell align="right"><strong>{fmt(gesamt)}</strong></TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schadensposten hinzufügen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField required label="Beschreibung" value={form.beschreibung} onChange={(e) => setForm((p) => ({ ...p, beschreibung: e.target.value }))} />
          <TextField required label="Betrag (€)" type="number" value={form.betrag} onChange={(e) => setForm((p) => ({ ...p, betrag: Number(e.target.value) }))} />
          <TextField label="Einheit" value={form.einheit ?? ''} onChange={(e) => setForm((p) => ({ ...p, einheit: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.beschreibung || form.betrag <= 0}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Notizen-Tab ──────────────────────────────────────────────────────────────

function NotizenTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Notiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [inhalt, setInhalt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    subresourcesApi.notizen.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!inhalt.trim()) return;
    setSaving(true);
    await subresourcesApi.notizen.create(gutachtenId, { inhalt });
    setInhalt('');
    setSaving(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.notizen.delete(gutachtenId, id);
    load();
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Neue Notiz"
          value={inhalt}
          onChange={(e) => setInhalt(e.target.value)}
          placeholder="Notiz eingeben..."
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button variant="contained" onClick={handleSave} disabled={saving || !inhalt.trim()}>
            Notiz speichern
          </Button>
        </Box>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Notizen vorhanden.</Typography>
      ) : (
        <List disablePadding>
          {items.map((n, i) => (
            <React.Fragment key={n.id}>
              {i > 0 && <Divider />}
              <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                <ListItemText
                  primary={<Typography sx={{ whiteSpace: 'pre-wrap' }}>{n.inhalt}</Typography>}
                  secondary={`${n.autor ?? 'System'} · ${new Date(n.createdAt).toLocaleString('de-DE')}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => handleDelete(n.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </>
  );
}

// ─── Aufgaben-Tab ─────────────────────────────────────────────────────────────

function AufgabenTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Aufgabe[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateAufgabeInput>({ titel: '' });

  const load = useCallback(() => {
    subresourcesApi.aufgaben.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, erledigt: boolean) => {
    await subresourcesApi.aufgaben.toggleErledigt(gutachtenId, id, !erledigt);
    load();
  };

  const handleSave = async () => {
    if (!form.titel) return;
    await subresourcesApi.aufgaben.create(gutachtenId, form);
    setOpen(false);
    setForm({ titel: '' });
    load();
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.aufgaben.delete(gutachtenId, id);
    load();
  };

  const offen = items.filter((a) => !a.erledigt).length;

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography color="text.secondary">{offen} offene Aufgabe{offen !== 1 ? 'n' : ''}</Typography>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpen(true)}>
          Aufgabe hinzufügen
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Aufgaben vorhanden.</Typography>
      ) : (
        <List disablePadding>
          {items.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ px: 0 }}>
                <IconButton size="small" onClick={() => handleToggle(a.id, a.erledigt)} sx={{ mr: 1 }}>
                  {a.erledigt ? <CheckBoxIcon color="success" /> : <CheckBoxOutlineBlankIcon />}
                </IconButton>
                <ListItemText
                  primary={
                    <Typography sx={{ textDecoration: a.erledigt ? 'line-through' : 'none', color: a.erledigt ? 'text.secondary' : 'text.primary' }}>
                      {a.titel}
                    </Typography>
                  }
                  secondary={[
                    a.zugewiesen && `Zugewiesen: ${a.zugewiesen}`,
                    a.faelligAm && `Fällig: ${new Date(a.faelligAm).toLocaleDateString('de-DE')}`,
                  ].filter(Boolean).join(' · ')}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => handleDelete(a.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Aufgabe hinzufügen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField required label="Titel" value={form.titel} onChange={(e) => setForm((p) => ({ ...p, titel: e.target.value }))} />
          <TextField label="Beschreibung" multiline rows={2} value={form.beschreibung ?? ''} onChange={(e) => setForm((p) => ({ ...p, beschreibung: e.target.value }))} />
          <TextField label="Zugewiesen an" value={form.zugewiesen ?? ''} onChange={(e) => setForm((p) => ({ ...p, zugewiesen: e.target.value }))} />
          <TextField label="Fällig am" type="date" InputLabelProps={{ shrink: true }} value={form.faelligAm ?? ''} onChange={(e) => setForm((p) => ({ ...p, faelligAm: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.titel}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ─── Dateien-Tab ──────────────────────────────────────────────────────────────

function DateienTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<Datei[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(() => {
    subresourcesApi.dateien.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('datei', file);
    await subresourcesApi.dateien.upload(gutachtenId, fd);
    setUploading(false);
    load();
    e.target.value = '';
  };

  const handleDelete = async (id: string) => {
    await subresourcesApi.dateien.delete(gutachtenId, id);
    load();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button component="label" startIcon={<AttachFileIcon />} variant="contained" disabled={uploading}>
          {uploading ? 'Wird hochgeladen...' : 'Datei hochladen'}
          <input type="file" hidden onChange={handleUpload} />
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary">Noch keine Dateien hochgeladen.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Dateiname</TableCell>
              <TableCell>Typ</TableCell>
              <TableCell>Größe</TableCell>
              <TableCell>Hochgeladen</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <a
                    href={subresourcesApi.dateien.downloadUrl(gutachtenId, d.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {d.originalname}
                  </a>
                </TableCell>
                <TableCell>{d.mimetype}</TableCell>
                <TableCell>{formatSize(d.groesse)}</TableCell>
                <TableCell>{new Date(d.createdAt).toLocaleDateString('de-DE')}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleDelete(d.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  );
}

// ─── Unfalldaten-Tab ──────────────────────────────────────────────────────────

function UnfalldatenTab({ gutachtenId }: { gutachtenId: string }) {
  const [data, setData] = useState<Unfalldaten | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    unfallOrt: '',
    unfallZeit: '',
    unfallHergang: '',
    strassenverhaeltnisse: '',
    witterung: '',
    lichtverhaeltnisse: '',
    polizeiAktenzeichen: '',
  });

  useEffect(() => {
    subresourcesApi.unfall.get(gutachtenId)
      .then((res) => {
        if (res) {
          setData(res);
          setForm({
            unfallOrt: res.unfallOrt ?? '',
            unfallZeit: res.unfallZeit ? res.unfallZeit.substring(0, 16) : '',
            unfallHergang: res.unfallHergang ?? '',
            strassenverhaeltnisse: res.strassenverhaeltnisse ?? '',
            witterung: res.witterung ?? '',
            lichtverhaeltnisse: res.lichtverhaeltnisse ?? '',
            polizeiAktenzeichen: res.polizeiAktenzeichen ?? '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [gutachtenId]);

  const handleSave = async () => {
    setSaving(true);
    const res = await subresourcesApi.unfall.upsert(gutachtenId, {
      ...form,
      unfallZeit: form.unfallZeit || undefined,
    });
    setData(res);
    setSaving(false);
  };

  if (loading) return <CircularProgress size={24} />;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Unfallort" value={form.unfallOrt} onChange={(e) => setForm((p) => ({ ...p, unfallOrt: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Unfallzeit" type="datetime-local" InputLabelProps={{ shrink: true }} value={form.unfallZeit} onChange={(e) => setForm((p) => ({ ...p, unfallZeit: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Straßenverhältnisse" value={form.strassenverhaeltnisse} onChange={(e) => setForm((p) => ({ ...p, strassenverhaeltnisse: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Witterung" value={form.witterung} onChange={(e) => setForm((p) => ({ ...p, witterung: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TextField fullWidth label="Lichtverhältnisse" value={form.lichtverhaeltnisse} onChange={(e) => setForm((p) => ({ ...p, lichtverhaeltnisse: e.target.value }))} />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField fullWidth label="Polizei-Aktenzeichen" value={form.polizeiAktenzeichen} onChange={(e) => setForm((p) => ({ ...p, polizeiAktenzeichen: e.target.value }))} />
      </Grid>
      <Grid item xs={12}>
        <TextField fullWidth multiline rows={4} label="Unfallhergang" value={form.unfallHergang} onChange={(e) => setForm((p) => ({ ...p, unfallHergang: e.target.value }))} />
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Wird gespeichert...' : 'Unfalldaten speichern'}
          </Button>
        </Box>
      </Grid>
    </Grid>
  );
}

// ─── Audit-Tab ────────────────────────────────────────────────────────────────

function AuditTab({ gutachtenId }: { gutachtenId: string }) {
  const [items, setItems] = useState<AuditEintrag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subresourcesApi.audit.list(gutachtenId).then(setItems).finally(() => setLoading(false));
  }, [gutachtenId]);

  if (loading) return <CircularProgress size={24} />;

  return items.length === 0 ? (
    <Typography color="text.secondary">Keine Audit-Einträge vorhanden.</Typography>
  ) : (
    <List disablePadding>
      {items.map((e, i) => (
        <React.Fragment key={e.id}>
          {i > 0 && <Divider />}
          <ListItem sx={{ px: 0 }}>
            <ListItemText
              primary={e.aktion}
              secondary={[
                e.autor && `von ${e.autor}`,
                new Date(e.createdAt).toLocaleString('de-DE'),
              ].filter(Boolean).join(' · ')}
            />
            {e.details && (
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, ml: 2 }}>
                {e.details}
              </Typography>
            )}
          </ListItem>
        </React.Fragment>
      ))}
    </List>
  );
}

// ─── Hauptseite ───────────────────────────────────────────────────────────────

export default function GutachtenDetailPage(): React.JSX.Element {
  const params = useParams();
  const id = params.id as string;

  const [gutachten, setGutachten] = useState<GutachtenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    gutachtenApi
      .findById(id)
      .then(setGutachten)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (newStatus: GutachtenStatus) => {
    if (!gutachten) return;
    setStatusChanging(true);
    try {
      const updated = await gutachtenApi.updateStatus(id, newStatus);
      setGutachten((prev) => prev ? { ...prev, status: updated.status } : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden.');
    } finally {
      setStatusChanging(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !gutachten) {
    return (
      <Box sx={{ mt: 4 }}>
        <Typography color="error">{error ?? 'Gutachten nicht gefunden.'}</Typography>
        <Button component={Link} href="/gutachten" startIcon={<ArrowBackIcon />} sx={{ mt: 2 }}>
          Zurück zur Liste
        </Button>
      </Box>
    );
  }

  const erlaubteStatus = STATUS_UEBERGAENGE[gutachten.status];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Button startIcon={<ArrowBackIcon />} component={Link} href="/gutachten" color="inherit" sx={{ mb: 1 }}>
            Alle Gutachten
          </Button>
          <Typography variant="h4" fontWeight={700}>{gutachten.aktenzeichen}</Typography>
          <Typography variant="h6" color="text.secondary">{gutachten.titel}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip label={STATUS_LABELS[gutachten.status]} color={STATUS_COLORS[gutachten.status]} />
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            component="a"
            href={`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'}/gutachten/${id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
          >
            PDF
          </Button>
          <Button variant="outlined" startIcon={<EditIcon />} component={Link} href={`/gutachten/${id}/edit`}>
            Bearbeiten
          </Button>
        </Box>
      </Box>

      {/* Stammdaten + Workflow */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Stammdaten" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Aktenzeichen</Typography>
                  <Typography variant="body1" fontWeight={600}>{gutachten.aktenzeichen}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Typography variant="body1">{STATUS_LABELS[gutachten.status]}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Auftraggeber</Typography>
                  <Typography variant="body1">
                    {gutachten.kunde
                      ? `${gutachten.kunde.vorname ?? ''} ${gutachten.kunde.nachname}`.trim()
                      : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Gutachter</Typography>
                  <Typography variant="body1">
                    {gutachten.gutachter
                      ? `${gutachten.gutachter.vorname} ${gutachten.gutachter.nachname}`
                      : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Auftragsdatum</Typography>
                  <Typography variant="body1">
                    {gutachten.auftragsdatum ? new Date(gutachten.auftragsdatum).toLocaleDateString('de-DE') : '—'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">Frist</Typography>
                  <Typography
                    variant="body1"
                    color={gutachten.frist && new Date(gutachten.frist) < new Date() ? 'error' : 'text.primary'}
                  >
                    {gutachten.frist ? new Date(gutachten.frist).toLocaleDateString('de-DE') : '—'}
                  </Typography>
                </Grid>
                {gutachten.beschreibung && (
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">Beschreibung</Typography>
                    <Typography variant="body1" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                      {gutachten.beschreibung}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Workflow" />
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>Aktueller Status:</Typography>
              <Chip label={STATUS_LABELS[gutachten.status]} color={STATUS_COLORS[gutachten.status]} sx={{ mb: 2 }} />
              {erlaubteStatus.length > 0 && (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>Status ändern zu:</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {erlaubteStatus.map((status) => (
                      <Button key={status} variant="outlined" size="small" disabled={statusChanging} onClick={() => handleStatusChange(status)}>
                        {STATUS_LABELS[status]}
                      </Button>
                    ))}
                  </Box>
                </>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Erstellt: {new Date(gutachten.createdAt).toLocaleDateString('de-DE')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Geändert: {new Date(gutachten.updatedAt).toLocaleDateString('de-DE')}
              </Typography>
            </CardContent>
          </Card>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Offene Aufgaben: {gutachten._count.aufgaben}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dateien: {gutachten._count.dateien}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Unterressourcen-Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab icon={<WarningIcon />} iconPosition="start" label="Unfalldaten" />
            <Tab icon={<DirectionsCarIcon />} iconPosition="start" label="Fahrzeuge" />
            <Tab icon={<PeopleIcon />} iconPosition="start" label="Personen" />
            <Tab icon={<TaskAltIcon />} iconPosition="start" label="Schaden" />
            <Tab icon={<NoteIcon />} iconPosition="start" label="Notizen" />
            <Tab icon={<CheckBoxOutlineBlankIcon />} iconPosition="start" label="Aufgaben" />
            <Tab icon={<AttachFileIcon />} iconPosition="start" label="Dateien" />
            <Tab icon={<HistoryIcon />} iconPosition="start" label="Protokoll" />
          </Tabs>
        </Box>

        <CardContent>
          <TabPanel value={tab} index={0}><UnfalldatenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={1}><FahrzeugeTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={2}><PersonenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={3}><SchadenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={4}><NotizenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={5}><AufgabenTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={6}><DateienTab gutachtenId={id} /></TabPanel>
          <TabPanel value={tab} index={7}><AuditTab gutachtenId={id} /></TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
}
