'use client';

import { Toaster } from 'sonner';

import { colors } from '@/lib/theme';

/** Host de los toasts. La API imperativa vive en `@/lib/notify`. */
export function NotifyHost() {
  return (
    <Toaster
      position="top-center"
      richColors={false}
      toastOptions={{
        style: {
          borderRadius: 14,
          border: `1px solid ${colors.line}`,
          background: colors.card,
          color: colors.ink,
          boxShadow: '0px 8px 24px rgba(23, 10, 60, 0.14)',
          fontFamily: 'inherit',
        },
      }}
    />
  );
}
