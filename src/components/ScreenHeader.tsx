'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { FiArrowLeft } from 'react-icons/fi';

import { useT } from '@/contexts/I18nContext';
import { colors, gradient } from '@/lib/theme';
import { cn } from '@/lib/utils';

/** Ancho de la columna de contenido; tiene que coincidir con el de la pantalla
 *  o el titulo queda desalineado con lo que hay abajo. */
export type PageWidth = 'wide' | 'form' | 'read';

// Barra superior del mockup: degrade morado -> rosa, flecha de volver y titulo.
// La comparten el detalle de organizacion y el historial de actividad.
export default function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
  width = 'wide',
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onBack?: () => void;
  width?: PageWidth;
}) {
  const router = useRouter();
  const t = useT();
  return (
    <div
      className="shrink-0 overflow-hidden pt-[env(safe-area-inset-top)]"
      style={{ backgroundImage: gradient(colors.headerGrad) }}
    >
      {/* El degrade va a sangre; la fila se centra con el resto del contenido
          de la pantalla. */}
      <div
        className={cn(
          'page-column',
          width === 'form' && 'page-form',
          width === 'read' && 'page-read',
        )}
      >
        {/* Sin bajada la barra mantiene el alto fijo del mockup original; con
            bajada crece sola, por eso min-height y no height. */}
        <div className="flex min-h-[44px] items-center">
          <button
            type="button"
            className="pressable -my-2 px-[18px] py-2 text-white"
            aria-label={t('common.back')}
            onClick={() => (onBack ? onBack() : router.back())}
          >
            <FiArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1 py-2">
            <h1 className="truncate text-[18px] font-bold text-white">{title}</h1>
            {subtitle ? (
              <p className="mt-[3px] truncate text-[13.5px] text-[#F3E6FB]">
                {subtitle}
              </p>
            ) : null}
          </div>
          {right}
        </div>
      </div>
    </div>
  );
}
