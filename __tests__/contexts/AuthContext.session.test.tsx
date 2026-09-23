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

const session = { user: { id: 'u1' } };
const row = { id: '7', first_name: 'Ana', user_role: { name: 'final_user' } };

/** Las tres consultas que dispara tener beneficiario. */
const orgsQueries = (orgs: unknown[] = [], all: unknown[] = []) => {
  db.queueTable('beneficiary_organization', { data: orgs, error: null });
  db.queueTable('organization', { data: all, error: null });
  db.queueTable('beneficiary_organization', { data: [], error: null });
};

const hook = () => renderHook(() => useAuth(), { wrapper });

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
});

describe('arranque', () => {
  it('sin sesion queda sin usuario y deja de cargar', async () => {
    auth().getSession.mockResolvedValue({ data: { session: null }, error: null } as never);

    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.beneficiary).toBeNull();
  });

  it('con sesion trae el beneficiario y sus organizaciones', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: row, error: null });
    orgsQueries([{ id: '1', organization_id: 9, available_points: 100 }], [{ id: 9 }]);

    const { result } = hook();
    await waitFor(() => expect(result.current.beneficiary).toMatchObject({ id: '7' }));
    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));
    expect(result.current.allOrganizations).toHaveLength(1);
    expect(result.current.user).toEqual(session.user);
  });

  it('un error al leer la sesion la cierra', async () => {
    auth().getSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'token invalido' },
    } as never);

    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(auth().signOut).toHaveBeenCalled();
  });

  it('si getSession tira, la pantalla igual deja de cargar', async () => {
    auth().getSession.mockRejectedValue(new Error('sin red'));

    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  // El perfil que no es beneficiario (un admin) no puede quedar con sesion.
  it('con sesion pero sin fila de beneficiary cierra la sesion', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: null, error: { code: 'PGRST116' } });

    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.beneficiary).toBeNull();
    expect(auth().signOut).toHaveBeenCalled();
  });

  it('con rol equivocado tambien cierra la sesion', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', {
      data: { ...row, user_role: { name: 'cashier' } },
      error: null,
    });

    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(auth().signOut).toHaveBeenCalled();
  });

  it('si la consulta del beneficiario tira, no desloguea', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.client.from.mockImplementationOnce(() => {
      throw new Error('sin red');
    });

    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(auth().signOut).not.toHaveBeenCalled();
  });
});

describe('onAuthStateChange', () => {
  /** Devuelve el handler que AuthProvider le registro a GoTrue. */
  const handler = () =>
    (auth().onAuthStateChange.mock.calls as unknown as [
      (event: string, session: unknown) => Promise<void>,
    ][])[0][0];

  beforeEach(() => {
    auth().getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
  });

  it('un login trae el beneficiario', async () => {
    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    db.queueTable('beneficiary', { data: row, error: null });
    orgsQueries();
    await act(() => handler()('SIGNED_IN', session));

    await waitFor(() => expect(result.current.beneficiary).toMatchObject({ id: '7' }));
  });

  // TOKEN_REFRESHED llega cada hora: volver a pedir el beneficiario pondria
  // `loading` en true y parpadearia la pantalla entera.
  it('TOKEN_REFRESHED no vuelve a pedir el beneficiario', async () => {
    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => handler()('TOKEN_REFRESHED', session));

    expect(result.current.session).toEqual(session);
    expect(db.tables).not.toContain('beneficiary');
  });

  it('un logout deja todo en cero', async () => {
    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => handler()('SIGNED_OUT', null));

    expect(result.current.beneficiary).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('al desmontar se da de baja', async () => {
    const unsubscribe = jest.fn();
    auth().onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    const { unmount, result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe('refreshBeneficiary', () => {
  it('vuelve a pedir la fila del beneficiario', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: row, error: null });
    orgsQueries();

    const { result } = hook();
    await waitFor(() => expect(result.current.beneficiary).not.toBeNull());

    db.queueTable('beneficiary', {
      data: { ...row, first_name: 'Anabel' },
      error: null,
    });
    await act(() => result.current.refreshBeneficiary());

    await waitFor(() =>
      expect(result.current.beneficiary).toMatchObject({ first_name: 'Anabel' }),
    );
  });

  it('sin usuario no consulta nada', async () => {
    auth().getSession.mockResolvedValue({ data: { session: null }, error: null } as never);

    const { result } = hook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.refreshBeneficiary());
    expect(db.tables).not.toContain('beneficiary');
  });
});
