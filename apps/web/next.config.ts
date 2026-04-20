/**
 * @file apps/web/next.config.ts
 * @description Next.js Konfiguration für den Gutachten-Manager.
 */

import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone-Output für Docker-Images.
  // outputFileTracingRoot zeigt auf den Monorepo-Stamm, damit Next.js
  // Workspace-Pakete (@gutachten/shared) korrekt in das Standalone-Bundle
  // tracen kann. Ohne diese Angabe können pnpm-Symlinks außerhalb des
  // app-Verzeichnisses nicht aufgelöst werden.
  output: 'standalone',
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

