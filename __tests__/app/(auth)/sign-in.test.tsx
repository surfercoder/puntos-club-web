import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, resetAuth } from '../../_helpers/auth';
import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';
import { notify } from '../../_helpers/ui';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
jest.mock('@/lib/notify', () => ({
  get notify() {
    return notify;
  },
}));

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import SignInPage from '@/app/(auth)/sign-in/page';

const fill = async (email = 'ana@x.com', password = 'secreta') => {
  if (email) await userEvent.type(screen.getByLabelText(es('signIn.email')), email);
  if (password)
    await userEvent.type(screen.getByLabelText(es('signIn.password')), password);
};

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: es('signIn.submit') }));

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
  resetAuth();
  renderApp(<SignInPage />);
});

describe('ingreso', () => {
  it('entra y reemplaza la pantalla, para que "atras" no vuelva al formulario', async () => {
    await fill();
    await submit();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(auth.signIn).toHaveBeenCalledWith('ana@x.com', 'secreta');
  });

  it('pide los dos campos antes de llamar a la base', async () => {
    await submit();
    expect(auth.signIn).not.toHaveBeenCalled();
    expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
      description: es('signIn.missingFields'),
    });
  });

  // El email se puede tipear o pegar en mayusculas.
  it('normaliza el email a minuscula', async () => {
    await fill('ANA@X.COM');
    await submit();
    expect(auth.signIn).toHaveBeenCalledWith('ana@x.com', 'secreta');
  });

  it('el error de credenciales sale traducido y no navega', async () => {
    auth.signIn.mockResolvedValue({
      error: new Error('error.auth.invalidCredentials'),
    });
    await fill();
    await submit();

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.auth.invalidCredentials'),
      }),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('mientras entra muestra el spinner', async () => {
    let resolve!: (v: { error: null }) => void;
    auth.signIn.mockReturnValue(new Promise((r) => (resolve = r)));
    await fill();
    await submit();

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolve({ error: null });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });

  it('el ojo muestra y esconde la contrasena', async () => {
    const password = screen.getByLabelText(es('signIn.password'));
    expect(password).toHaveAttribute('type', 'password');

    await userEvent.click(
      screen.getByRole('button', { name: es('signIn.showPassword') }),
    );
    expect(password).toHaveAttribute('type', 'text');

    await userEvent.click(
      screen.getByRole('button', { name: es('signIn.hidePassword') }),
    );
    expect(password).toHaveAttribute('type', 'password');
  });

  it('ofrece crear una cuenta', async () => {
    await userEvent.click(screen.getByText(es('signIn.signUpLink')));
    expect(router.push).toHaveBeenCalledWith('/sign-up');
  });
});

// Sin pantalla propia de recuperacion: el mail abre /auth/update-password en el
// admin. Sin redirectTo, Supabase manda al Site URL y el link no sirve.
describe('olvide mi contrasena', () => {
  it('pide el mail al admin con el redirect correcto', async () => {
    await fill('ana@x.com', '');
    await userEvent.click(screen.getByText(es('signIn.forgot')));

    await waitFor(() =>
      expect(db.client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'ana@x.com',
        { redirectTo: expect.stringContaining('/auth/update-password') },
      ),
    );
    expect(notify.success).toHaveBeenCalledWith(es('forgot.title'), {
      description: es('forgot.sent'),
    });
  });

  it('sin email escrito lo pide primero', async () => {
    await userEvent.click(screen.getByText(es('signIn.forgot')));
    expect(db.client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(notify.info).toHaveBeenCalledWith(es('forgot.title'), {
      description: es('forgot.needEmail'),
    });
  });

  // El rate limit de GoTrue sale traducido y con los segundos.
  it('el rate limit sale traducido', async () => {
    db.client.auth.resetPasswordForEmail.mockResolvedValue({
      error: {
        status: 429,
        message: 'you can only request this after 51 seconds',
      },
    } as never);

    await fill('ana@x.com', '');
    await userEvent.click(screen.getByText(es('signIn.forgot')));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('forgot.title'), {
        description: es('error.auth.rateLimitSeconds', { seconds: 51 }),
      }),
    );
  });
});

describe('pie', () => {
  it('muestra la version de la app', () => {
    expect(screen.getByText(/PuntosClub/)).toBeInTheDocument();
  });
});
