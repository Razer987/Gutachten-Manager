// =============================================================================
// ESLint Next.js Konfiguration — für apps/web
// =============================================================================

/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./index'),
  extends: [
    ...(require('./index').extends ?? []),
    'next/core-web-vitals',
  ],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  rules: {
    ...require('./index').rules,
    // React-spezifisch: keine direkte Console-Verwendung im Client-Code
    'no-console': 'error',
    // Next.js erlaubt <img> nur in bestimmten Fällen
    '@next/next/no-img-element': 'warn',
  },
};
