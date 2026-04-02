/**
 * E2E-Tests für die Gutachten-Verwaltung.
 * Voraussetzung: App läuft auf http://localhost:3000, API auf :4000
 */

import { test, expect } from '@playwright/test';

test.describe('Gutachten-Liste', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gutachten');
    await page.waitForLoadState('networkidle');
  });

  test('Gutachten-Liste lädt', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /gutachten/i }).first()).toBeVisible();
  });

  test('"Neues Gutachten"-Button ist vorhanden', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /neues gutachten/i })
        .or(page.getByRole('link', { name: /neues gutachten/i }))
    ).toBeVisible();
  });

  test('Suchfeld ist vorhanden', async ({ page }) => {
    const suchfeld = page.getByRole('textbox', { name: /suche/i })
      .or(page.locator('input[placeholder*="Suche"]'))
      .or(page.locator('input[placeholder*="suche"]'));
    await expect(suchfeld.first()).toBeVisible();
  });
});

test.describe('Neues Gutachten erstellen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gutachten/new');
    await page.waitForLoadState('networkidle');
  });

  test('Formular ist vorhanden', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /gutachten/i }).first()).toBeVisible();
  });

  test('Titel-Feld ist vorhanden und fokussierbar', async ({ page }) => {
    const titelFeld = page.getByLabel(/titel/i).first();
    await expect(titelFeld).toBeVisible();
    await titelFeld.focus();
    await expect(titelFeld).toBeFocused();
  });

  test('Abbrechen-Link führt zurück zur Liste', async ({ page }) => {
    const abbrechenLink = page.getByRole('link', { name: /abbrechen/i })
      .or(page.getByRole('button', { name: /abbrechen/i }));
    if (await abbrechenLink.count() > 0) {
      await abbrechenLink.first().click();
      await expect(page).toHaveURL(/\/gutachten$/);
    }
  });
});

test.describe('Navigation', () => {
  test('Gutachten-Seite ist über Sidebar erreichbar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const gutachtenLink = page.getByRole('link', { name: /gutachten/i }).first();
    await gutachtenLink.click();
    await page.waitForURL('**/gutachten');

    expect(page.url()).toContain('/gutachten');
  });

  test('Kunden-Seite ist über Sidebar erreichbar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const kundenLink = page.getByRole('link', { name: /kunden/i }).first();
    await kundenLink.click();
    await page.waitForURL('**/kunden');

    expect(page.url()).toContain('/kunden');
  });

  test('Kalender-Seite ist über Sidebar erreichbar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const kalenderLink = page.getByRole('link', { name: /kalender/i }).first();
    await kalenderLink.click();
    await page.waitForURL('**/kalender');

    expect(page.url()).toContain('/kalender');
  });
});
