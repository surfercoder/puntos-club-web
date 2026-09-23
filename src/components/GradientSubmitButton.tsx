'use client';

import React from 'react';
import { FiArrowRight } from 'react-icons/fi';

import { Spinner } from '@/components/ui/spinner';
import { gradient } from '@/lib/theme';
import { cn } from '@/lib/utils';

// Boton de submit compartido por sign-in y sign-up: mismo degrade + flecha,
// solo cambian la etiqueta y el margen superior de cada pantalla.
export default function GradientSubmitButton({
  label,
  loading,
  onClick,
  disabled,
  gradientColors,
  className,
  type = 'submit',
}: {
  label: string;
  loading: boolean;
  onClick?: () => void;
  disabled?: boolean;
  gradientColors: readonly string[];
  className?: string;
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'pressable relative flex h-[46px] w-full items-center justify-center overflow-hidden rounded-xl',
        className,
      )}
      style={{ backgroundImage: gradient(gradientColors) }}
    >
      {loading ? (
        <Spinner size={20} color="#FFFFFF" />
      ) : (
        <>
          <span className="text-[14.5px] font-bold text-white">{label}</span>
          <FiArrowRight
            size={18}
            color="#FFFFFF"
            className="absolute right-5"
          />
        </>
      )}
    </button>
  );
}
