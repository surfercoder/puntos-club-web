import { toast } from 'sonner';

import { colors } from '@/lib/theme';

// En movil cada aviso de un solo boton es un Alert.alert que corta la pantalla.
// En web el equivalente es el toast: mismo texto, misma jerarquia de color, sin
// robarle el foco al usuario.
//
// Vive aparte de NotifyHost por Fast Refresh: ver el comentario de lib/confirm.
type Options = { description?: string };

export const notify = {
  success: (title: string, options?: Options) =>
    toast.success(title, {
      ...options,
      style: {
        borderColor: colors.greenLine,
        background: colors.greenSoft,
        color: colors.green,
      },
    }),
  error: (title: string, options?: Options) =>
    toast.error(title, {
      ...options,
      style: {
        borderColor: '#F3B9C0',
        background: colors.dangerBg,
        color: colors.danger,
      },
    }),
  info: (title: string, options?: Options) =>
    toast(title, {
      ...options,
      style: {
        borderColor: '#E3D6FB',
        background: colors.purpleSoft,
        color: colors.purpleInk,
      },
    }),
};
