'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { FullScreenSpinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';

// El proxy ya corta a quien no tiene sesion. Aca se valida lo que el proxy no
// puede: que ese usuario tenga una fila de `beneficiary` con rol final_user
// (vive en la base, detras de RLS). Mismo guardia que el (app)/_layout.tsx de
// la app movil.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading, beneficiary, signOut } = useAuth();
  const router = useRouter();
  // `signOut` se rearma en cada render del provider: si va en las dependencias
  // el efecto se repite solo. El flag corta el segundo pase mientras la sesion
  // todavia no se limpio.
  const bouncing = useRef(false);
  const signOutRef = useRef(signOut);
  useEffect(() => {
    signOutRef.current = signOut;
  });

  useEffect(() => {
    if (loading || bouncing.current) return;
    // Con sesion valida pero sin beneficiario hay que soltar la cookie antes de
    // mandarlo al login: el proxy ve un usuario y rebota /sign-in a /, asi que
    // sin esto queda en un loop de redirects contra el spinner. Pasa cuando el
    // fetch del beneficiario corta por timeout — cuando no existe la fila, o el
    // rol no es final_user, AuthContext ya cerro la sesion.
    if (session && !beneficiary) {
      bouncing.current = true;
      void signOutRef.current().finally(() => router.replace('/sign-in'));
      return;
    }
    if (!session) router.replace('/sign-in');
  }, [loading, session, beneficiary, router]);

  if (loading || !session || !beneficiary) {
    return <FullScreenSpinner color="#7C3AED" />;
  }

  return <>{children}</>;
}
