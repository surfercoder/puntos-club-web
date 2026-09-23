import { renderHook, waitFor } from '@testing-library/react';
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

const userData = {
  first_name: 'Ana',
  last_name: 'Diaz',
  phone: '11',
  document_id: '30111222',
  terms_version: '1.1',
  privacy_version: '1.0',
  marketing_opt_in: true,
  address: {
    street: 'Corrientes',
    number: '1234',
    city: 'CABA',
    state: 'BA',
    zip_code: 'C1043',
  },
};

const auth = () => db.client.auth;

const signUpHook = async () => {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result;
};

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
  auth().getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
  
});

describe('signUp', () => {
  it('manda el metadata que usa el trigger de la base', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null } as never);
    auth().signUp.mockResolvedValue({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] } },
      error: null,
    });

    const result = await signUpHook();
    await expect(
      result.current.signUp('ana@x.com', 'secreta', userData),
    ).resolves.toEqual({ error: null });

    expect(auth().signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'ana@x.com',
        options: expect.objectContaining({
          data: expect.objectContaining({
            first_name: 'Ana',
            terms_version: '1.1',
            privacy_version: '1.0',
            marketing_opt_in: true,
            address: userData.address,
          }),
        }),
      }),
    );
  });

  it('el link de confirmacion cae en el admin', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null } as never);
    auth().signUp.mockResolvedValue({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] } },
      error: null,
    });

    const result = await signUpHook();
    await result.current.signUp('ana@x.com', 'secreta', userData);

    expect(auth().signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: 'http://localhost:3001/auth/email-confirmed',
        }),
      }),
    );
  });

  // El chequeo previo existe para poder decir CUAL de los dos esta repetido.
  it.each([
    ['email', 'error.auth.emailExists'],
    ['document_id', 'error.auth.documentExists'],
  ])('avisa el duplicado de %s antes de registrar', async (conflict, key) => {
    db.client.rpc.mockResolvedValueOnce({ data: conflict } as never);

    const result = await signUpHook();
    const { error } = await result.current.signUp('ana@x.com', 'x', userData);

    expect(error?.message).toBe(key);
    expect(auth().signUp).not.toHaveBeenCalled();
  });

  // El duplicado que se cuela entre el chequeo y el INSERT rompe adentro del
  // trigger, y GoTrue lo tapa con "Database error saving new user".
  it('traduce el unexpected_failure del trigger', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null } as never);
    auth().signUp.mockResolvedValue({
      data: {},
      error: { code: 'unexpected_failure', message: 'Database error' },
    } as never);

    const result = await signUpHook();
    const { error } = await result.current.signUp('ana@x.com', 'x', userData);
    expect(error?.message).toBe('error.auth.emailOrDocumentExists');
  });

  it('cualquier otro error de GoTrue sale mapeado', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null } as never);
    auth().signUp.mockResolvedValue({
      data: {},
      error: { code: 'weak_password', message: 'Password is too weak' },
    } as never);

    const result = await signUpHook();
    const { error } = await result.current.signUp('ana@x.com', 'x', userData);
    expect(error?.message).toBe('error.auth.weakPassword');
  });

  it('sin usuario en la respuesta, el alta fallo', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null } as never);
    auth().signUp.mockResolvedValue({ data: { user: null }, error: null } as never);

    const result = await signUpHook();
    const { error } = await result.current.signUp('ana@x.com', 'x', userData);
    expect(error?.message).toBe('error.auth.signUpFailed');
  });

  // GoTrue no delata que un email ya esta registrado: con "Confirm email"
  // prendido devuelve 200 y un usuario de mentira con identities vacio.
  it('detecta el email ya registrado que GoTrue tapa con un 200', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null } as never);
    auth().signUp.mockResolvedValue({
      data: { user: { id: 'u1', identities: [] } },
      error: null,
    } as never);

    const result = await signUpHook();
    const { error } = await result.current.signUp('ana@x.com', 'x', userData);
    expect(error?.message).toBe('error.auth.emailExists');
  });

  // Los parametros de interpolacion (los segundos del rate limit) no caben en
  // el `message` de un Error: viajan colgados y errorDescriptor los recupera.
  it('el rate limit llega con sus segundos hasta la pantalla', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null });
    auth().signUp.mockResolvedValue({
      data: {},
      error: {
        status: 429,
        message: 'you can only request this after 33 seconds',
      },
    } as never);

    const result = await signUpHook();
    const { error } = await result.current.signUp('ana@x.com', 'x', userData);

    expect(error?.message).toBe('error.auth.rateLimitSeconds');
    expect(error).toMatchObject({ i18nParams: { seconds: 33 } });
  });

  it('sin documento manda null, que es lo que espera el trigger', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null });
    auth().signUp.mockResolvedValue({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] } },
      error: null,
    } as never);

    const result = await signUpHook();
    await result.current.signUp('ana@x.com', 'x', {
      ...userData,
      document_id: undefined,
    });

    expect(db.client.rpc).toHaveBeenCalledWith('beneficiary_signup_conflict', {
      p_email: 'ana@x.com',
      p_document_id: null,
    });
  });

  it('una caida de red sale como error de red', async () => {
    db.client.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const result = await signUpHook();
    const { error } = await result.current.signUp('ana@x.com', 'x', userData);
    expect(error?.message).toBe('error.network');
  });

  it('el telefono y el documento vacios viajan como null', async () => {
    db.client.rpc.mockResolvedValueOnce({ data: null } as never);
    auth().signUp.mockResolvedValue({
      data: { user: { id: 'u1', identities: [{ id: 'i1' }] } },
      error: null,
    });

    const result = await signUpHook();
    await result.current.signUp('ana@x.com', 'x', {
      ...userData,
      phone: '',
      document_id: '',
    });

    expect(auth().signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ phone: null, document_id: null }),
        }),
      }),
    );
  });
});
