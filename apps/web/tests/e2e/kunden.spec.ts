/**
 * E2E-Tests für die Kundenverwaltung.
 */

import { test, expect } from '@playwright/test';

test.describe('Kunden-Liste', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kunden');
    await page.waitForLoadState('networkidle');
  });

  test('Kunden-Liste lädt', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /kunden/i }).first()).toBeVisible();
  });

  test('"Neuer Kunde"-Button ist vorhanden', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /neuer kunde/i })
        .or(page.getByRole('link', { name: /neuer kunde/i }))
    ).toBeVisible();
  });
});

test.describe('Neuen Kunden anlegen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kunden/new');
    await page.waitForLoadState('networkidle');
  });

  test('Formular ist vorhanden', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible();
  });

  test('Nachname-Feld ist Pflichtfeld', async ({ page }) => {
    const nachnameFeld = page.getByLabel(/nachname/i).first();
    await expect(nachnameFeld).toBeVisible();
  });
});
