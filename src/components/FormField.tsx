import React from 'react';

import { cn } from '@/lib/utils';

// Fila de formulario del mockup de perfil: pastilla lavanda con el icono a la
// izquierda, y label + control a la derecha. La usa la pantalla de perfil y,
// para el bloque de direccion, envuelve al AddressInput entero.
// Sin `label` la fila deja el cuerpo entero al children: lo usa el alta, donde
// Nombre y Apellido comparten una sola pastilla y traen su propio label.
export default function FormField({
  icon,
  label,
  children,
  last,
  htmlFor,
}: {
  icon: React.ReactNode;
  label?: string;
  children: React.ReactNode;
  last?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className={cn('flex', last ? 'mb-0' : 'mb-4')}>
      <span className="mt-0.5 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[#F4EFFD] text-violet">
        {icon}
      </span>
      <div className="ml-3 min-w-0 flex-1">
        {label ? (
          <label
            htmlFor={htmlFor}
            className="mb-[7px] block text-[12.5px] font-bold text-[#3F4557]"
          >
            {label}
          </label>
        ) : null}
        {children}
      </div>
    </div>
  );
}
