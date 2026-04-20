/**
 * @file apps/web/next.config.ts
 * @description Next.js Konfiguration für den Gutachten-Manager.
 */

import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',

  // Pflicht fuer pnpm-Monorepos: ohne diesen Eintrag legt der Next.js-
  // File-Tracer server.js in einem Unterverzeichnis des Standalone-
  // Ordners ab (weil er pnpm-Symlinks aus dem .pnpm-Virtual-Store bis
  // zum Monorepo-Stamm verfolgt). outputFileTracingRoot verankert alle
  // Pfade am Monorepo-Stamm, sodass die Standalone-Struktur lautet:
  //   .next/standalone/
  //     apps/web/server.js   ← Einstiegspunkt
  //     apps/web/.next/      ← Server-seitige Artefakte
  //     node_modules/        ← gehostete Deps
  outputFileTracingRoot: path.join(__dirname, '../../'),

  // Strenger Modus für bessere React-Fehlererkennung
  reactStrictMode: true,

  // TypeScript-Fehler beim Build ignorieren (Typ-Checks laufen separat)
  typescript: {
    ignoreBuildErrors: true,
  },

  // ESLint beim Build deaktivieren (läuft separat im CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Bilder von externen Domains erlauben (für zukünftige Features)
  images: {
    remotePatterns: [],
  },

  // Leaflet benötigt server-seitige Imports zu deaktivieren
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;


