import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

const auth = () => db.client.auth;
const realFrom = db.client.from.getMockImplementation()!;
const session = { user: { id: 'u1' } };
const row = { id: '7', first_name: 'Ana', user_role: { name: 'final_user' } };

/** Promesa que resuelve cuando el test lo decide. */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
});

// Cerrar la pestana a mitad de la carga no puede dejar un dispatch colgado
// contra un arbol desmontado.
describe('desmontado a mitad de camino', () => {
  it('la sesion que llega tarde no dispara nada mas', async () => {
    const session$ = deferred<unknown>();
    auth().getSession.mockReturnValue(session$.promise as never);

    const { unmount } = renderHook(() => useAuth(), { wrapper });
    unmount();

    await act(async () => {
      session$.resolve({ data: { session }, error: null });
    });

    // Ni siquiera llega a pedir el beneficiario.
    expect(db.tables).not.toContain('beneficiary');
  });

  it('el beneficiario que llega tarde no dispara nada mas', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    const row$ = deferred<unknown>();
    db.client.from.mockImplementation((table: string) => {
      if (table !== 'beneficiary') return realFrom(table);
      return { select: () => ({ eq: () => ({ single: () => row$.promise }) }) };
    });

    const { unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() =>
      expect(db.client.from).toHaveBeenCalledWith('beneficiary'),
    );
    unmount();

    await act(async () => {
      row$.resolve({ data: row, error: null });
    });

    // Sin beneficiario nunca se abrio el canal de organizaciones.
    expect(db.client.channel).not.toHaveBeenCalled();
  });

  it('un evento de GoTrue posterior al desmontaje se ignora', async () => {
    auth().getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);

    const { result, unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const handler = (
      auth().onAuthStateChange.mock.calls as unknown as [
        (event: string, session: unknown) => Promise<void>,
      ][]
    )[0][0];
    unmount();

    await act(() => handler('SIGNED_IN', session));
    expect(db.tables).not.toContain('beneficiary');
  });
});

// La suscripcion de realtime se abre junto con el primer fetch: el evento puede
// llegar antes de que haya una lista con la que comparar.
describe('realtime antes de la primera lista', () => {
  it('un cambio de puntos sin lista cargada no rompe', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    const orgs$ = deferred<unknown>();
    db.client.from.mockImplementation((table: string) => {
      if (table !== 'beneficiary_organization') return realFrom(table);
      const link: Record<string, unknown> = {
        then: (resolve: (v: unknown) => unknown) => orgs$.promise.then(resolve),
      };
      for (const method of ['select', 'eq', 'order', 'limit']) {
        link[method] = () => link;
      }
      return link;
    });
    db.queueTable('beneficiary', { data: row, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(db.channel.on).toHaveBeenCalled());

    const onRow = db.channel.on.mock.calls[0][2] as (
      payload: unknown,
    ) => Promise<void>;
    await act(() =>
      onRow({
        eventType: 'UPDATE',
        old: { id: '1', is_hidden: false, is_active: true },
        new: { id: '1', available_points: 500, is_hidden: false, is_active: true },
      }),
    );

    // El mapper corre sobre una lista vacia: la fila todavia no existe, y el
    // fetch que sigue en vuelo la va a traer con los puntos nuevos.
    expect(result.current.userOrganizations).toEqual([]);

    await act(async () => {
      orgs$.resolve({ data: [], error: null });
    });
  });
});
