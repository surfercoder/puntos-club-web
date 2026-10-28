import type { MetadataRoute } from 'next';

// Permite "agregar a la pantalla de inicio": quien no quiera instalar la app
// igual termina con un icono y una ventana sin barra de navegador.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Puntos Club',
    short_name: 'Puntos Club',
    description:
      'Sumá puntos en los comercios que elegís y canjealos por premios.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F9F1F8',
    theme_color: '#7539F9',
    icons: [{ src: '/images/icon-v2.png', sizes: '512x512', type: 'image/png' }],
  };
}
