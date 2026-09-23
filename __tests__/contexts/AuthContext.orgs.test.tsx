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
/** La implementacion real del doble, para poder hacer fallar una sola tabla. */
const realFrom = db.client.from.getMockImplementation()!;
const session = { user: { id: 'u1' } };
const row = { id: '7', first_name: 'Ana', user_role: { name: 'final_user' } };

const membership = (over: Record<string, unknown> = {}) => ({
  id: '1',
  organization_id: 9,
  available_points: 100,
  total_points_earned: 100,
  total_points_redeemed: 0,
  is_active: true,
  ...over,
});

/** Provider con sesion, beneficiario y las tres consultas de organizaciones. */
const start = async ({
  orgs = [membership()],
  all = [{ id: 9, name: 'Cafe Lila' }],
  hidden = [] as unknown[],
} = {}) => {
  auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
  db.queueTable('beneficiary', { data: row, error: null });
  db.queueTable(
    'beneficiary_organization',
    { data: orgs, error: null },
    { data: hidden, error: null },
  );
  db.queueTable('organization', { data: all, error: null });

  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.beneficiary).not.toBeNull());
  await waitFor(() => expect(db.client.channel).toHaveBeenCalled());
  return result;
};

/** El handler de postgres_changes que registro el loader, por indice de `.on`. */
const onChange = (index: number) =>
  db.channel.on.mock.calls[index][2] as (payload: unknown) => Promise<void>;

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
});

describe('carga de organizaciones', () => {
  it('trae las del usuario y el catalogo publico', async () => {
    const result = await start();
    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));
    expect(result.current.allOrganizations).toHaveLength(1);
    expect(result.current.organizationsLoading).toBe(false);
  });

  // La organizacion que el beneficiario oculto no puede volver en Explorar.
  it('saca de Explorar las organizaciones ocultas', async () => {
    const result = await start({
      all: [
        { id: 9, name: 'Cafe Lila' },
        { id: 4, name: 'Kiosco' },
      ],
      hidden: [{ organization_id: 4 }],
    });

    await waitFor(() => expect(result.current.allOrganizations).toHaveLength(1));
    expect(result.current.allOrganizations[0].id).toBe(9);
  });

  it('un error en la lista del usuario apaga el cargando sin romper', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: row, error: null });
    db.queueTable('beneficiary_organization', {
      data: null,
      error: { message: 'rls' },
    });
    db.queueTable('organization', { data: null, error: { message: 'rls' } });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.beneficiary).not.toBeNull());
    // El spinner tiene que apagarse: si no, la home gira para siempre.
    await waitFor(() => expect(result.current.organizationsLoading).toBe(false));
    expect(result.current.userOrganizations).toHaveLength(0);
  });

  // Antes el flag arrancaba en false y el spinner no aparecia nunca: en su
  // lugar parpadeaba el vacio ("Todavia no seguis ninguna organizacion").
  it('esta cargando hasta que llega la primera lista', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: row, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.organizationsLoading).toBe(true);

    db.queueTable(
      'beneficiary_organization',
      { data: [membership()], error: null },
      { data: [], error: null },
    );
    db.queueTable('organization', { data: [], error: null });
    await waitFor(() => expect(result.current.organizationsLoading).toBe(false));
  });

  // Un refresh que falla no puede borrar la lista que el usuario ya esta viendo.
  it('un error posterior conserva la lista que ya estaba', async () => {
    const result = await start();
    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));

    db.queueTable('beneficiary_organization', { data: null, error: { message: 'rls' } });
    db.queueTable('organization', { data: null, error: { message: 'rls' } });
    await act(() => result.current.refreshOrganizations());

    expect(result.current.userOrganizations).toHaveLength(1);
  });

  it('si el catalogo publico tira, la pantalla sigue con lo que tenia', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: row, error: null });
    db.queueTable('beneficiary_organization', {
      data: [membership()],
      error: null,
    });
    db.client.from.mockImplementation((table: string) => {
      if (table === 'organization') throw new Error('sin red');
      return realFrom(table);
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));
    expect(result.current.allOrganizations).toHaveLength(0);
  });
});

describe('realtime de membresias', () => {
  it('un cambio de puntos actualiza la fila en el lugar', async () => {
    const result = await start();
    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));

    await act(() =>
      onChange(0)({
        eventType: 'UPDATE',
        old: { id: '1', is_hidden: false, is_active: true },
        new: { ...membership({ available_points: 500 }), is_hidden: false },
      }),
    );

    expect(result.current.userOrganizations[0].available_points).toBe(500);
  });

  it('el cambio de puntos no toca las otras membresias', async () => {
    const result = await start({
      orgs: [membership(), membership({ id: '2', organization_id: 4 })],
    });
    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(2));

    await act(() =>
      onChange(0)({
        eventType: 'UPDATE',
        old: { id: '1', is_hidden: false, is_active: true },
        new: { ...membership({ available_points: 500 }), is_hidden: false },
      }),
    );

    expect(result.current.userOrganizations[0].available_points).toBe(500);
    expect(result.current.userOrganizations[1].available_points).toBe(100);
  });

  it('ocultar o dar de baja la membresia la saca de la lista', async () => {
    const result = await start();
    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));

    db.queueTable('organization', { data: [], error: null });
    db.queueTable('beneficiary_organization', { data: [], error: null });
    await act(() =>
      onChange(0)({
        eventType: 'UPDATE',
        old: { id: '1', is_hidden: false, is_active: true },
        new: { id: '1', is_hidden: true, is_active: true },
      }),
    );

    expect(result.current.userOrganizations).toHaveLength(0);
  });

  it('volver a mostrarla recarga las dos listas', async () => {
    const result = await start({ orgs: [] });

    db.queueTable(
      'beneficiary_organization',
      { data: [membership()], error: null },
      { data: [], error: null },
    );
    db.queueTable('organization', { data: [], error: null });
    await act(() =>
      onChange(0)({
        eventType: 'UPDATE',
        old: { id: '1', is_hidden: true, is_active: true },
        new: { id: '1', is_hidden: false, is_active: true },
      }),
    );

    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));
  });

  it('un alta nueva recarga las dos listas', async () => {
    const result = await start({ orgs: [] });

    db.queueTable(
      'beneficiary_organization',
      { data: [membership()], error: null },
      { data: [], error: null },
    );
    db.queueTable('organization', { data: [], error: null });
    await act(() => onChange(0)({ eventType: 'INSERT', new: membership() }));

    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));
  });

  // Un cambio de is_public en el admin se tiene que ver al instante en Explorar.
  it('un cambio en organization recarga el catalogo', async () => {
    const result = await start();

    db.queueTable('organization', {
      data: [
        { id: 9, name: 'Cafe Lila' },
        { id: 4, name: 'Kiosco' },
      ],
      error: null,
    });
    db.queueTable('beneficiary_organization', { data: [], error: null });
    await act(() => onChange(1)({}));

    await waitFor(() => expect(result.current.allOrganizations).toHaveLength(2));
  });

  it('al desmontar suelta el canal', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: row, error: null });
    db.queueTable(
      'beneficiary_organization',
      { data: [], error: null },
      { data: [], error: null },
    );
    db.queueTable('organization', { data: [], error: null });

    const { result, unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(db.client.channel).toHaveBeenCalled());
    expect(result.current.beneficiary).not.toBeNull();

    unmount();
    expect(db.channel.unsubscribe).toHaveBeenCalled();
    expect(db.client.removeChannel).toHaveBeenCalled();
  });
});

describe('bordes de la carga', () => {
  // PostgREST puede devolver data null sin error (una policy que no deja ver
  // nada): las dos listas tienen que quedar vacias, no romper.
  it('sobrevive a las dos listas en null', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: row, error: null });
    db.queueTable(
      'beneficiary_organization',
      { data: null, error: null },
      { data: null, error: null },
    );
    db.queueTable('organization', { data: null, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.organizationsLoading).toBe(false));
    expect(result.current.userOrganizations).toEqual([]);
    expect(result.current.allOrganizations).toEqual([]);
  });

  // El realtime puede llegar antes que la primera lista.
  it('un cambio de puntos antes de la primera carga no rompe', async () => {
    auth().getSession.mockResolvedValue({ data: { session }, error: null } as never);
    db.queueTable('beneficiary', { data: row, error: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(db.channel.on).toHaveBeenCalled());

    await act(() =>
      onChange(0)({
        eventType: 'UPDATE',
        old: { id: '1', is_hidden: false, is_active: true },
        new: { ...membership({ available_points: 500 }), is_hidden: false },
      }),
    );

    expect(result.current.userOrganizations).toEqual([]);
  });
});

describe('joinOrganization', () => {
  it('inserta la membresia y recarga la lista', async () => {
    const result = await start({ orgs: [] });

    db.queueTable(
      'beneficiary_organization',
      { data: null, error: { code: 'PGRST116' } }, // no existia
      { error: null }, // insert
      { data: [membership()], error: null }, // recarga
    );
    await act(async () => {
      await expect(result.current.joinOrganization('9')).resolves.toEqual({
        error: null,
      });
    });

    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));
  });

  it('reactiva una membresia dada de baja', async () => {
    const result = await start({ orgs: [] });

    db.queueTable(
      'beneficiary_organization',
      { data: { id: '1', is_active: false, is_hidden: false }, error: null },
      { error: null }, // update
      { data: [membership()], error: null },
    );
    await act(async () => {
      await expect(result.current.joinOrganization('9')).resolves.toEqual({
        error: null,
      });
    });
  });

  it('no deja sumarse dos veces', async () => {
    const result = await start();

    db.queueTable('beneficiary_organization', {
      data: { id: '1', is_active: true, is_hidden: false },
      error: null,
    });
    const { error } = await result.current.joinOrganization('9');
    expect(error?.message).toBe('error.join.alreadyMember');
  });

  // Ocultarla es una decision del beneficiario: sumarse de nuevo tiene que
  // pasar por Explorar, no por el QR.
  it('la organizacion oculta no esta disponible', async () => {
    const result = await start();

    db.queueTable('beneficiary_organization', {
      data: { id: '1', is_active: false, is_hidden: true },
      error: null,
    });
    const { error } = await result.current.joinOrganization('9');
    expect(error?.message).toBe('error.join.notAvailable');
  });

  it('avisa si falla la reactivacion', async () => {
    const result = await start();

    db.queueTable(
      'beneficiary_organization',
      { data: { id: '1', is_active: false, is_hidden: false }, error: null },
      { error: { message: 'rls' } },
    );
    const { error } = await result.current.joinOrganization('9');
    expect(error?.message).toBe('error.join.reactivateFailed');
  });

  it('avisa si falla el alta', async () => {
    const result = await start();

    db.queueTable(
      'beneficiary_organization',
      { data: null, error: { code: 'PGRST116' } },
      { error: { message: 'rls' } },
    );
    const { error } = await result.current.joinOrganization('9');
    expect(error?.message).toBe('error.join.failed');
  });

  it('una caida de red sale como error de red', async () => {
    const result = await start();

    db.client.from.mockImplementationOnce(() => {
      throw new TypeError('Failed to fetch');
    });
    const { error } = await result.current.joinOrganization('9');
    expect(error?.message).toBe('error.network');
  });

  it('sin beneficiario no hay a quien sumar', async () => {
    auth().getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { error } = await result.current.joinOrganization('9');
    expect(error?.message).toBe('error.noSession');
  });
});

describe('refreshOrganizations', () => {
  it('vuelve a pedir las dos listas', async () => {
    const result = await start({ orgs: [] });

    db.queueTable(
      'beneficiary_organization',
      { data: [membership()], error: null },
      { data: [], error: null },
    );
    db.queueTable('organization', { data: [{ id: 9 }], error: null });
    await act(() => result.current.refreshOrganizations());

    await waitFor(() => expect(result.current.userOrganizations).toHaveLength(1));
  });

  it('sin beneficiario no hace nada', async () => {
    auth().getSession.mockResolvedValue({ data: { session: null }, error: null } as never);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(() => result.current.refreshOrganizations());
    expect(db.tables).toHaveLength(0);
  });
});
