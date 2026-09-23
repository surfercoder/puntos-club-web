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

const beneficiary = (role = 'final_user') => ({
  id: '7',
  first_name: 'Ana',
  email: 'ana@x.com',
  user_role: { name: role },
});

const hook = async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result;
};

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
  auth().getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
});

describe('signIn', () => {
  it('entra cuando el usuario es un beneficiario final_user', async () => {
    auth().signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    } as never);
    db.queueTable('beneficiary', { data: beneficiary(), error: null });

    const result = await hook();
    await expect(
      result.current.signIn('ana@x.com', 'secreta'),
    ).resolves.toEqual({ error: null });
    expect(auth().signOut).not.toHaveBeenCalled();
  });

  it('el error de credenciales sale traducido', async () => {
    auth().signInWithPassword.mockResolvedValue({
      data: {},
      error: { code: 'invalid_credentials', message: 'Invalid login credentials' },
    } as never);

    const result = await hook();
    const { error } = await result.current.signIn('ana@x.com', 'mala');
    expect(error?.message).toBe('error.auth.invalidCredentials');
  });

  // El email de un admin puede autenticarse contra el mismo GoTrue: lo que
  // define que sea beneficiario es la fila de `beneficiary`, no la sesion.
  it('sin fila de beneficiary cierra la sesion y lo dice', async () => {
    auth().signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    } as never);
    db.queueTable('beneficiary', { data: null, error: { code: 'PGRST116' } });

    const result = await hook();
    const { error } = await result.current.signIn('admin@x.com', 'secreta');

    expect(error?.message).toBe('error.auth.notBeneficiary');
    expect(auth().signOut).toHaveBeenCalled();
  });

  it('con otro rol tampoco entra', async () => {
    auth().signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    } as never);
    db.queueTable('beneficiary', { data: beneficiary('org_admin'), error: null });

    const result = await hook();
    const { error } = await result.current.signIn('jefe@x.com', 'secreta');

    expect(error?.message).toBe('error.auth.noPermission');
    expect(auth().signOut).toHaveBeenCalled();
  });

  // Puede pasar con un flujo sin usuario (magic link a medias): no hay a quien
  // validar, y la sesion la resuelve el efecto de arranque.
  it('sin usuario en la respuesta no consulta la tabla', async () => {
    auth().signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);

    const result = await hook();
    await expect(result.current.signIn('ana@x.com', 'x')).resolves.toEqual({
      error: null,
    });
    expect(db.tables).not.toContain('beneficiary');
  });

  it('una caida de red sale como error de red', async () => {
    auth().signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));

    const result = await hook();
    const { error } = await result.current.signIn('ana@x.com', 'x');
    expect(error?.message).toBe('error.network');
  });
});

describe('signOut', () => {
  it('cierra sesion, borra el beneficiario y suelta el canal de organizaciones', async () => {
    auth().getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
      error: null,
    } as never);
    db.queueTable('beneficiary', { data: beneficiary(), error: null });
    db.queueTable('beneficiary_organization', { data: [], error: null });
    db.queueTable('organization', { data: [], error: null });

    const result = await hook();
    await waitFor(() => expect(result.current.beneficiary).not.toBeNull());

    await act(() => result.current.signOut());

    await waitFor(() => expect(result.current.beneficiary).toBeNull());
    expect(auth().signOut).toHaveBeenCalled();
    expect(db.client.removeChannel).toHaveBeenCalled();
  });
});

describe('useAuth', () => {
  // Un contexto de auth ausente es un bug que conviene que explote.
  it('explota fuera del provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(/AuthProvider/);
  });
});
