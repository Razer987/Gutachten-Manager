/**
 * @file apps/web/next.config.ts
 * @description Next.js Konfiguration für den Gutachten-Manager.
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone-Output für kleinere Docker-Images
  output: 'standalone',

  // Strenger Modus für bessere React-Fehlererkennung
  reactStrictMode: true,

  // TypeScript-Fehler beim Build als Fehler behandeln
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint beim Build ausführen
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Umgebungsvariablen die im Browser verfügbar sind
  // (Alle mit NEXT_PUBLIC_ Präfix sind automatisch verfügbar)

  // Bilder von externen Domains erlauben (für zukünftige Features)
  images: {
    remotePatterns: [],
  },

  // Leaflet benötigt server-seitige Imports zu deaktivieren
  webpack: (config) => {
    // Leaflet funktioniert nur im Browser — Server-seitige Imports deaktivieren
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

export default nextConfig;
