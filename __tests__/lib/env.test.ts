/** El modulo valida al importarse, asi que cada caso lo carga de cero. */
const loadEnv = async (vars: Record<string, string | undefined>) => {
  const previous = { ...process.env };
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  let loaded!: typeof import('@/lib/env');
  await jest.isolateModulesAsync(async () => {
    loaded = await import('@/lib/env');
  });

  process.env = previous;
  return loaded.env;
};

describe('validacion del entorno', () => {
  it('acepta una url de admin valida', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_SITE_URL: 'https://admin.puntosclub.com.ar' }),
    ).resolves.toMatchObject({
      NEXT_PUBLIC_SITE_URL: 'https://admin.puntosclub.com.ar',
    });
  });

  // Vacia o ausente caen al admin de produccion: un `undefined` interpolado en
  // el redirectTo de Supabase manda un link que no abre nada.
  it('la cadena vacia cae al admin de produccion, no falla por "no es una url"', async () => {
    await expect(loadEnv({ NEXT_PUBLIC_SITE_URL: '' })).resolves.toMatchObject({
      NEXT_PUBLIC_SITE_URL: 'https://puntos-club-admin.vercel.app',
    });
  });

  it('sin la variable tambien cae al admin de produccion', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_SITE_URL: undefined }),
    ).resolves.toMatchObject({
      NEXT_PUBLIC_SITE_URL: 'https://puntos-club-admin.vercel.app',
    });
  });

  // Sin key el bloque de direccion cae al formulario manual, igual que en la
  // app movil: es una ausencia valida, no un error de configuracion.
  it('la key de Google Maps es opcional y la cadena vacia cuenta como ausente', async () => {
    await expect(
      loadEnv({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined }),
    ).resolves.toMatchObject({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined });
    await expect(
      loadEnv({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '' }),
    ).resolves.toMatchObject({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined });
  });

  it('el build falla de entrada si falta Supabase, en vez de romper en runtime', async () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(
      jest.isolateModulesAsync(async () => {
        await import('@/lib/env');
      }),
    ).rejects.toThrow();

    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  });
});
