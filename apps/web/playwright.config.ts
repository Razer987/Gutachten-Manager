import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E-Testkonfiguration.
 * Tests laufen gegen die laufende Next.js-Anwendung.
 *
 * Lokal starten:
 *   pnpm dev                    # App starten
 *   pnpm test:e2e               # Tests ausführen
 *
 * Mit automatischem Start:
 *   pnpm test:e2e --headed      # Mit Browser-Fenster
 */

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Maximale Zeit pro Test
  timeout: 30_000,

  // Bei Fehlern: Screenshot + Video
  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Parallele Ausführung
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,

  // Reporter
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  // Projekte (Browser)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  // Entwicklungsserver automatisch starten (optional)
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true,
  //   timeout: 120_000,
  // },
});
