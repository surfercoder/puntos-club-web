import { z } from 'zod';

// Mismo patron que puntos-club-admin: el build falla de entrada si falta una
// variable, en vez de romper en runtime con un `undefined!` adentro de Supabase.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  // Base del panel admin: ahi caen los links de los mails (confirmacion de
  // cuenta y recuperacion de contrasena). El default evita que un deploy sin
  // la variable mande un `undefined/auth/...` que Supabase rechaza.
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.url().default('https://puntos-club-admin.vercel.app'),
  ),
  // Opcional: sin ella el bloque de direccion cae al formulario manual, igual
  // que en la app movil cuando no hay key.
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().min(1).optional(),
  ),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
});
