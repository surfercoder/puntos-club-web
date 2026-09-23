import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';

import { ConfirmHost } from '@/components/ui/confirm';
import { NotifyHost } from '@/components/ui/notify';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { LANG_COOKIE, readLangCookie } from '@/i18n/cookie';

import './globals.css';

export const metadata: Metadata = {
  title: 'PuntosClub',
  description:
    'Sumá puntos en los comercios que elegís y canjealos por premios.',
};

export const viewport: Viewport = {
  // Casi todas las pantallas arrancan con el degrade morado a sangre: en un
  // celular la barra del navegador tiene que acompañarlo.
  themeColor: '#7539F9',
  width: 'device-width',
  initialScale: 1,
  // El zoom queda habilitado a proposito: bloquearlo es una barrera de
  // accesibilidad y el layout ya escala bien.
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = readLangCookie((await cookies()).get(LANG_COOKIE)?.value);

  return (
    <html lang={lang}>
      <body>
        <I18nProvider initialLang={lang}>
          <AuthProvider>
            {/* La pantalla ocupa todo el ancho: las barras superiores van a
                sangre y cada pantalla centra su propio contenido con
                `page-column` (ver globals.css). En un celular eso es el ancho
                completo y queda identico a la app movil.
                `h-dvh` (alto fijo, no minimo) es lo que hace que scrollee el
                contenedor de cada pantalla y no la ventana: asi la barra
                superior queda fija y la pastilla de tabs no se va debajo del
                pliegue, igual que en la app. */}
            <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-bg">
              {children}
            </div>
            <NotifyHost />
            <ConfirmHost />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
