/**
 * E2E-Tests für das Dashboard.
 * Voraussetzung: App läuft auf http://localhost:3000
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('Dashboard-Seite lädt ohne Fehler', async ({ page }) => {
    // Kein JS-Fehler auf der Seite
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
  });

  test('Seitentitel ist sichtbar', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('Sidebar-Navigation ist vorhanden', async ({ page }) => {
    // Hauptnavigationspunkte prüfen
    await expect(page.getByRole('link', { name: /gutachten/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /kunden/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /kalender/i }).first()).toBeVisible();
  });

  test('Redirect von / zu /dashboard funktioniert', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/dashboard');
    expect(page.url()).toContain('/dashboard');
  });
});
