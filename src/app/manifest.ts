import type { MetadataRoute } from 'next';

// Permite "agregar a la pantalla de inicio": quien no quiera instalar la app
// igual termina con un icono y una ventana sin barra de navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PuntosClub',
    short_name: 'PuntosClub',
    description:
      'Sumá puntos en los comercios que elegís y canjealos por premios.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FBFBFD',
    theme_color: '#7539F9',
    icons: [{ src: '/images/icon.png', sizes: '512x512', type: 'image/png' }],
  };
}
