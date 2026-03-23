/**
 * @file packages/shared/src/index.ts
 * @description Haupt-Export des @gutachten/shared Pakets.
 *
 * Alles was von Frontend (apps/web) und Backend (apps/api)
 * gemeinsam genutzt wird, wird hier exportiert.
 *
 * Verwendung:
 *   import { GUTACHTEN_STATUS, formatEuro, ApiResponse } from '@gutachten/shared'
 */

// Typen
export * from './types/api.types';

// Konstanten
export * from './constants/status.constants';
export * from './constants/routes.constants';

// Utilities
export * from './utils/date.utils';
export * from './utils/currency.utils';
