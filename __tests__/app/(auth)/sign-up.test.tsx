import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, resetAuth } from '../../_helpers/auth';
import { es, renderApp } from '../../_helpers/render';
import { notify } from '../../_helpers/ui';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
jest.mock('@/lib/notify', () => ({
  get notify() {
    return notify;
  },
}));

// El alta usa el formulario manual de direccion: el buscador de Google tiene su
// propia suite (AddressInput).
jest.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test',
    NEXT_PUBLIC_SITE_URL: 'http://localhost:3001',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
  },
}));

import SignUpPage from '@/app/(auth)/sign-up/page';
import { PRIVACY_VERSION, TERMS_VERSION } from '@/lib/legal';

const type = async (label: string, value: string) =>
  userEvent.type(screen.getByLabelText(label), value);

const fillAddress = async () => {
  await type(es('address.street'), 'Corrientes');
  await type(es('address.number'), '1234');
  await type(es('address.city'), 'CABA');
  await type(es('address.state'), 'Buenos Aires');
  await type(es('address.zip'), 'C1043');
};

const fillPerson = async (password = 'secreta') => {
  await type(es('signUp.firstName'), 'Ana');
  await type(es('signUp.lastName'), 'Diaz');
  await type(es('signUp.email'), 'ana@x.com');
  await type(es('signUp.phone'), '1155551234');
  await type(es('signUp.document'), '30111222');
  await type(es('signUp.password'), password);
  await type(es('signUp.confirmPassword'), password);
};

const accept = async () => {
  await userEvent.click(screen.getByText(es('signUp.acceptTerms')));
  await userEvent.click(screen.getByText(es('signUp.readPrivacy')));
};

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: es('signUp.submit') }));

beforeEach(() => {
  jest.clearAllMocks();
  resetAuth();
  renderApp(<SignUpPage />);
});

describe('alta completa', () => {
  it('registra con las versiones legales y la direccion, y vuelve al login', async () => {
    await fillPerson();
    await fillAddress();
    await accept();
    await submit();

    await waitFor(() => expect(auth.signUp).toHaveBeenCalled());
    expect(auth.signUp).toHaveBeenCalledWith('ana@x.com', 'secreta', {
      first_name: 'Ana',
      last_name: 'Diaz',
      phone: '1155551234',
      document_id: '30111222',
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      marketing_opt_in: false,
      address: {
        street: 'Corrientes',
        number: '1234',
        city: 'CABA',
        state: 'Buenos Aires',
        zip_code: 'C1043',
        country: undefined,
        place_id: undefined,
        latitude: undefined,
        longitude: undefined,
      },
    });
    expect(notify.success).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/sign-in');
  });

  it('la casilla de marketing es opcional y viaja como la marco el usuario', async () => {
    await fillPerson();
    await fillAddress();
    await accept();
    await userEvent.click(screen.getByText(es('signUp.marketing')));
    await submit();

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith(
        'ana@x.com',
        'secreta',
        expect.objectContaining({ marketing_opt_in: true }),
      ),
    );
  });

  it('el telefono y el documento vacios no viajan', async () => {
    await type(es('signUp.firstName'), 'Ana');
    await type(es('signUp.lastName'), 'Diaz');
    await type(es('signUp.email'), 'ana@x.com');
    await type(es('signUp.password'), 'secreta');
    await type(es('signUp.confirmPassword'), 'secreta');
    await fillAddress();
    await accept();
    await submit();

    await waitFor(() =>
      expect(auth.signUp).toHaveBeenCalledWith(
        'ana@x.com',
        'secreta',
        expect.objectContaining({ phone: undefined, document_id: undefined }),
      ),
    );
  });
});

describe('validaciones', () => {
  it('pide los campos obligatorios', async () => {
    await submit();
    expect(auth.signUp).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
      description: es('signUp.missingFields'),
    });
  });

  it('las contrasenas tienen que coincidir', async () => {
    await type(es('signUp.firstName'), 'Ana');
    await type(es('signUp.lastName'), 'Diaz');
    await type(es('signUp.email'), 'ana@x.com');
    await type(es('signUp.password'), 'secreta');
    await type(es('signUp.confirmPassword'), 'otra');
    await submit();

    expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
      description: es('signUp.passwordMismatch'),
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('la contrasena tiene un minimo', async () => {
    await fillPerson('123');
    await submit();

    expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
      description: es('signUp.passwordTooShort'),
    });
  });

  // Google Places puede no traer altura ni codigo postal: se exigen los cinco
  // campos del formulario manual y se dice cuales faltan.
  it('nombra los campos de direccion que faltan', async () => {
    await fillPerson();
    await type(es('address.street'), 'Corrientes');
    await submit();

    expect(notify.error).toHaveBeenCalledWith(
      es('signUp.missingAddressTitle'),
      {
        description: es('signUp.missingAddressBody', {
          fields: [
            es('address.field.number'),
            es('address.field.city'),
            es('address.field.state'),
            es('address.field.zip'),
          ].join(', '),
        }),
      },
    );
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it('sin aceptar T&C y privacidad no registra', async () => {
    await fillPerson();
    await fillAddress();
    await submit();

    expect(notify.error).toHaveBeenCalledWith(
      es('signUp.missingConsentTitle'),
      { description: es('signUp.missingConsentBody') },
    );
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe('errores del servidor', () => {
  it('el email duplicado sale traducido y no navega', async () => {
    auth.signUp.mockResolvedValue({
      error: new Error('error.auth.emailExists'),
    });
    await fillPerson();
    await fillAddress();
    await accept();
    await submit();

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.auth.emailExists'),
      }),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('mientras registra muestra el spinner', async () => {
    let resolve!: (v: { error: null }) => void;
    auth.signUp.mockReturnValue(new Promise((r) => (resolve = r)));
    await fillPerson();
    await fillAddress();
    await accept();
    await submit();

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolve({ error: null });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });
});

describe('navegacion', () => {
  it('abre cada documento legal sin marcar la casilla', async () => {
    await userEvent.click(screen.getByText(es('signUp.viewTerms')));
    expect(router.push).toHaveBeenCalledWith('/legal?doc=terms');

    await userEvent.click(screen.getByText(es('signUp.viewPrivacy')));
    expect(router.push).toHaveBeenCalledWith('/legal?doc=privacy');

    expect(screen.getByLabelText(es('signUp.acceptTerms'))).not.toBeChecked();
  });

  it('el ojo muestra y esconde cada contrasena', async () => {
    const password = screen.getByLabelText(es('signUp.password'));
    const confirm = screen.getByLabelText(es('signUp.confirmPassword'));

    await userEvent.click(
      screen.getByRole('button', { name: es('signIn.showPassword') }),
    );
    expect(password).toHaveAttribute('type', 'text');

    await userEvent.click(
      screen.getByRole('button', { name: es('signUp.showConfirmPassword') }),
    );
    expect(confirm).toHaveAttribute('type', 'text');

    await userEvent.click(
      screen.getByRole('button', { name: es('signIn.hidePassword') }),
    );
    expect(password).toHaveAttribute('type', 'password');
    await userEvent.click(
      screen.getByRole('button', { name: es('signUp.hideConfirmPassword') }),
    );
    expect(confirm).toHaveAttribute('type', 'password');
  });

  it('ofrece volver al login', async () => {
    await userEvent.click(screen.getByText(es('signUp.signInLink')));
    expect(router.replace).toHaveBeenCalledWith('/sign-in');
  });
});
