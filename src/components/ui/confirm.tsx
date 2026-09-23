'use client';

import { AlertDialog } from 'radix-ui';
import React, { useEffect, useRef, useState } from 'react';

import { setConfirmHost, type Pending } from '@/lib/confirm';
import { colors, gradient } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** Host del dialogo. La API imperativa vive en `@/lib/confirm`. */
export function ConfirmHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  // Radix cierra el dialogo por las tres vias (confirmar, cancelar, Escape) y
  // todas desembocan en onOpenChange(false). Los botones solo anotan aca la
  // intencion y onOpenChange resuelve una sola vez: asi no depende del orden en
  // que Radix compone el onClick del hijo con el suyo. Escape y el overlay no
  // tocan el ref, y por eso cuentan como cancelar.
  const acceptedRef = useRef(false);

  useEffect(() => {
    setConfirmHost((next) => {
      acceptedRef.current = false;
      setPending(next);
    });
    return () => setConfirmHost(null);
  }, []);

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <AlertDialog.Root
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) close(acceptedRef.current);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[#0A053D]/45" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-48px)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] bg-card p-5 shadow-[0px_16px_40px_rgba(23,10,60,0.22)]">
          <AlertDialog.Title className="text-[17px] font-bold text-ink">
            {pending?.title}
          </AlertDialog.Title>
          {pending?.message ? (
            <AlertDialog.Description className="mt-2 text-[14px] leading-[20px] text-ink-soft">
              {pending.message}
            </AlertDialog.Description>
          ) : (
            // Radix exige una descripcion accesible aunque el mockup no la tenga.
            <AlertDialog.Description className="sr-only">
              {pending?.title}
            </AlertDialog.Description>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button
                type="button"
                className="pressable h-11 rounded-xl border border-line px-4 text-[14.5px] font-bold text-ink-soft"
              >
                {pending?.cancelText}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                type="button"
                onClick={() => {
                  acceptedRef.current = true;
                }}
                className={cn(
                  'pressable h-11 rounded-xl px-4 text-[14.5px] font-bold text-white',
                )}
                style={
                  pending?.destructive
                    ? { background: colors.danger }
                    : { backgroundImage: gradient(colors.brand) }
                }
              >
                {pending?.confirmText}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
