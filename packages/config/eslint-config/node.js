// =============================================================================
// ESLint Node.js Konfiguration — für apps/api
// =============================================================================

/** @type {import('eslint').Linter.Config} */
module.exports = {
  ...require('./index'),
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    ...require('./index').rules,
    // In Node.js ist console.log für Logging akzeptabel (Winston übernimmt)
    'no-console': 'warn',
  },
};
