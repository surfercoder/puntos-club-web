import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, beneficiary, resetAuth } from '../../_helpers/auth';
import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';
import { confirmMock, notify } from '../../_helpers/ui';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
jest.mock('@/lib/confirm', () => ({
  get confirm() {
    return confirmMock;
  },
}));
jest.mock('@/lib/notify', () => ({
  get notify() {
    return notify;
  },
}));
// Sin key, el bloque de direccion es el formulario manual (su buscador tiene
// suite propia en AddressInput).
jest.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3001',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
  },
}));

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import ProfilePage from '@/app/(app)/profile/page';

const address = {
  id: '3',
  street: 'Corrientes',
  number: '1234',
  city: 'CABA',
  state: 'Buenos Aires',
  zip_code: 'C1043',
  country: 'Argentina',
  place_id: 'pid',
  latitude: -34.6,
  longitude: -58.4,
};

const show = () => renderApp(<ProfilePage />);
const save = () =>
  userEvent.click(screen.getByRole('button', { name: es('profile.save') }));

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
  resetAuth({ beneficiary: beneficiary() });
  confirmMock.mockResolvedValue(true);
});

describe('carga', () => {
  it('trae los datos del beneficiario', () => {
    show();
    expect(screen.getByLabelText(es('profile.firstName'))).toHaveValue('Ana');
    expect(screen.getByLabelText(es('profile.email'))).toHaveValue('ana@x.com');
    expect(screen.getByLabelText(es('profile.document'))).toHaveValue('30111222');
  });

  it('un beneficiario sin datos deja los campos vacios', () => {
    auth.beneficiary = beneficiary({
      first_name: null,
      last_name: null,
      email: null,
      phone: null,
      document_id: null,
    });
    show();
    expect(screen.getByLabelText(es('profile.firstName'))).toHaveValue('');
  });

  it('trae la direccion guardada y la muestra en el formulario', async () => {
    auth.beneficiary = beneficiary({ address_id: '3' });
    db.queueTable('address', { data: address, error: null });
    show();

    expect(await screen.findByDisplayValue('Corrientes')).toBeInTheDocument();
    expect(screen.getByLabelText(es('address.city'))).toHaveValue('CABA');
  });

  // Las columnas de address son nullable: el formulario no puede mostrar
  // "null" ni perder las coordenadas (0 es una coordenada valida).
  it('una direccion con columnas vacias no ensucia el formulario', async () => {
    auth.beneficiary = beneficiary({ address_id: '3' });
    db.queueTable('address', {
      data: {
        id: '3',
        street: null,
        number: null,
        city: null,
        state: null,
        zip_code: null,
        country: null,
        place_id: null,
        latitude: null,
        longitude: null,
      },
      error: null,
    });
    show();

    await waitFor(() => expect(db.tables).toContain('address'));
    // Se espera el remonte del formulario con la direccion cargada.
    await act(async () => {});

    expect(screen.getByLabelText(es('address.street'))).toHaveValue('');
    expect(screen.getByLabelText(es('address.city'))).toHaveValue('');
  });

  // 0 es una coordenada valida (golfo de Guinea, pero valida): con `||` volvia
  // al formulario como undefined y se guardaba borrada.
  it('una coordenada en 0 sobrevive al guardado', async () => {
    auth.beneficiary = beneficiary({ address_id: '3' });
    db.queueTable('address', {
      data: { ...address, latitude: 0, longitude: 0 },
      error: null,
    });
    show();
    await screen.findByDisplayValue('Corrientes');

    await save();
    await waitFor(() =>
      expect(db.client.rpc).toHaveBeenCalledWith(
        'save_my_address',
        expect.objectContaining({ p_latitude: 0, p_longitude: 0 }),
      ),
    );
  });

  it('si la direccion no se puede leer, el formulario queda vacio', async () => {
    auth.beneficiary = beneficiary({ address_id: '3' });
    db.queueTable('address', { data: null, error: { code: '42501' } });
    show();

    await waitFor(() => expect(db.tables).toContain('address'));
    expect(screen.getByLabelText(es('address.street'))).toHaveValue('');
  });

  it('sin address_id no consulta la direccion', () => {
    show();
    expect(db.tables).not.toContain('address');
  });
});

describe('guardar', () => {
  it('actualiza el beneficiario, refresca y vuelve', async () => {
    show();
    await userEvent.clear(screen.getByLabelText(es('profile.firstName')));
    await userEvent.type(screen.getByLabelText(es('profile.firstName')), 'Anabel');
    await save();

    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    expect(db.tables).toContain('beneficiary');
    expect(auth.refreshBeneficiary).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });

  // save_my_address crea-y-linkea o actualiza en una sola llamada definer: RLS
  // no puede expresar "lee la fila que insertaste pero todavia no linkeaste".
  it('guarda tambien apellido, telefono y documento', async () => {
    show();
    await userEvent.type(screen.getByLabelText(es('profile.lastName')), 'ez');
    await userEvent.type(screen.getByLabelText(es('profile.phone')), '9');
    await userEvent.type(screen.getByLabelText(es('profile.document')), '3');

    expect(screen.getByLabelText(es('profile.lastName'))).toHaveValue('Diazez');
    expect(screen.getByLabelText(es('profile.phone'))).toHaveValue('11555512349');
    expect(screen.getByLabelText(es('profile.document'))).toHaveValue('301112223');

    await save();
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
  });

  // `document_id` tiene UNIQUE: dos beneficiarios que lo borran chocarian si se
  // guardara '' en vez de null. El nombre ademas va sin espacios de sobra.
  it('telefono y documento vacios se guardan como null, y el nombre recortado', async () => {
    show();
    await userEvent.clear(screen.getByLabelText(es('profile.phone')));
    await userEvent.clear(screen.getByLabelText(es('profile.document')));
    await userEvent.type(screen.getByLabelText(es('profile.firstName')), '  ');
    await save();

    // El mock arma un chain nuevo por `from()`, asi que el payload se busca en
    // los `update` de todos ellos: en este flujo solo lo llama `beneficiary`.
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    const payloads = db.client.from.mock.results.flatMap(
      (r) => (r.value as { update: jest.Mock }).update.mock.calls,
    );
    expect(payloads).toContainEqual([
      expect.objectContaining({
        first_name: 'Ana',
        phone: null,
        document_id: null,
      }),
    ]);
  });

  it('con la direccion completa llama a save_my_address', async () => {
    show();
    await userEvent.type(screen.getByLabelText(es('address.street')), 'Corrientes');
    await userEvent.type(screen.getByLabelText(es('address.number')), '1234');
    await userEvent.type(screen.getByLabelText(es('address.city')), 'CABA');
    await userEvent.type(screen.getByLabelText(es('address.state')), 'BA');
    await userEvent.type(screen.getByLabelText(es('address.zip')), 'C1043');
    await save();

    await waitFor(() =>
      expect(db.client.rpc).toHaveBeenCalledWith(
        'save_my_address',
        expect.objectContaining({
          p_street: 'Corrientes',
          p_number: '1234',
          p_city: 'CABA',
          p_country: null,
          p_place_id: null,
          p_latitude: null,
          p_longitude: null,
        }),
      ),
    );
  });

  it('con la direccion a medias no la guarda', async () => {
    show();
    await userEvent.type(screen.getByLabelText(es('address.street')), 'Corrientes');
    await save();

    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    expect(db.client.rpc).not.toHaveBeenCalled();
  });

  it('el error de la direccion corta el guardado', async () => {
    db.client.rpc.mockResolvedValue({ error: { code: '42501' } });
    show();
    await userEvent.type(screen.getByLabelText(es('address.street')), 'Corrientes');
    await userEvent.type(screen.getByLabelText(es('address.number')), '1234');
    await userEvent.type(screen.getByLabelText(es('address.city')), 'CABA');
    await userEvent.type(screen.getByLabelText(es('address.state')), 'BA');
    await userEvent.type(screen.getByLabelText(es('address.zip')), 'C1043');
    await save();

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.db.forbidden'),
      }),
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  it('el error del update sale traducido', async () => {
    db.queueTable('beneficiary', { error: { code: '23505' } });
    show();
    await save();

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.db.duplicate'),
      }),
    );
    expect(auth.refreshBeneficiary).not.toHaveBeenCalled();
  });

  // Cambiar el mail dispara el flujo de confirmacion de GoTrue.
  it('cambiar el email avisa que hay que confirmarlo', async () => {
    show();
    await userEvent.clear(screen.getByLabelText(es('profile.email')));
    await userEvent.type(screen.getByLabelText(es('profile.email')), 'otra@x.com');
    await save();

    await waitFor(() =>
      expect(db.client.auth.updateUser).toHaveBeenCalledWith({
        email: 'otra@x.com',
      }),
    );
    expect(notify.info).toHaveBeenCalledWith(
      es('profile.emailChangedTitle'),
      { description: es('profile.emailChangedBody') },
    );
  });

  it('sin cambiar el email no toca GoTrue', async () => {
    show();
    await save();
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    expect(db.client.auth.updateUser).not.toHaveBeenCalled();
  });

  it('el error al cambiar el email corta el guardado', async () => {
    db.client.auth.updateUser.mockResolvedValue({
      error: { code: 'email_exists' },
    } as never);
    show();
    await userEvent.clear(screen.getByLabelText(es('profile.email')));
    await userEvent.type(screen.getByLabelText(es('profile.email')), 'otra@x.com');
    await save();

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.auth.emailExists'),
      }),
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  it('sin beneficiario no guarda nada', async () => {
    auth.beneficiary = null;
    show();
    await save();
    expect(db.tables).toHaveLength(0);
  });

  it('mientras guarda muestra el spinner', async () => {
    let resolve!: (v: { error: null }) => void;
    db.client.rpc.mockReturnValue(new Promise((r) => (resolve = r)));
    db.queueTable('beneficiary', { error: null });
    show();
    await userEvent.type(screen.getByLabelText(es('address.street')), 'Corrientes');
    await userEvent.type(screen.getByLabelText(es('address.number')), '1234');
    await userEvent.type(screen.getByLabelText(es('address.city')), 'CABA');
    await userEvent.type(screen.getByLabelText(es('address.state')), 'BA');
    await userEvent.type(screen.getByLabelText(es('address.zip')), 'C1043');
    await save();

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolve({ error: null });
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
  });
});

describe('idioma', () => {
  // Queda guardado en este equipo (cookie), no en el perfil.
  it('cambia el idioma de la pantalla', async () => {
    show();
    await userEvent.click(
      screen.getByRole('radio', { name: es('profile.languageEn') }),
    );

    expect(
      screen.getByRole('radio', { name: 'English' }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});

describe('cerrar sesion', () => {
  it('confirma, cierra y manda al login', async () => {
    show();
    await userEvent.click(screen.getByText(es('signOut.action')));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
    expect(router.replace).toHaveBeenCalledWith('/sign-in');
  });

  it('si cancela no cierra nada', async () => {
    confirmMock.mockResolvedValue(false);
    show();
    await userEvent.click(screen.getByText(es('signOut.action')));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
