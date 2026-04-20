/**
 * @file apps/web/next.config.ts
 * @description Next.js Konfiguration für den Gutachten-Manager.
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone-Output erzeugt ein autarkes Bundle fuer Docker.
  // server.js liegt direkt im Standalone-Verzeichnis-Stamm.
  output: 'standalone',

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


