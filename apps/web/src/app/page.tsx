/**
 * @file apps/web/src/app/page.tsx
 * @description Startseite — leitet direkt zum Dashboard weiter.
 */

import { redirect } from 'next/navigation';

export default function HomePage(): never {
  redirect('/dashboard');
}
