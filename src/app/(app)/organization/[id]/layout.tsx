'use client';

import { useParams } from 'next/navigation';
import React, { useLayoutEffect } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { brandVars } from '@/lib/theme';

// Las tres pantallas de la org (detalle, historial, catalogo) se pintan con el
// color de la marca que eligio el owner en el admin (organization.brand_color).
// La home y Explorar no: ahi conviven varios clubes. Layout y no cada pagina:
// el color se aplica una sola vez y sigue puesto al pasar de una a otra.
export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const id = String(useParams().id ?? '');
  const { userOrganizations } = useAuth();
  const seed = userOrganizations.find(
    (org) => org.organization_id.toString() === id,
  )?.organization?.brand_color;

  // Layout effect: se pinta con la marca desde el primer frame, sin destello
  // morado. Al salir se sacan y la app vuelve a Puntos Club.
  useLayoutEffect(() => {
    const vars = brandVars(seed);
    const { style } = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => style.setProperty(key, value));
    return () => Object.keys(vars).forEach((key) => style.removeProperty(key));
  }, [seed]);

  return children;
}
