import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { I18nProvider } from '@/contexts/I18nContext';

import { auth, resetAuth } from '../../_helpers/auth';
import { es, renderApp } from '../../_helpers/render';
import { confirmMock, notify } from '../../_helpers/ui';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
let searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => searchParams,
}));
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

// El hook de camara tiene su propia suite: aca solo hace falta poder disparar
// una lectura y cambiar el estado del permiso.
let permission = 'granted';
let onScan: (text: string) => void = () => {};
const request = jest.fn();
jest.mock('@/components/QrCameraView', () => ({
  useQrCamera: (opts: { onScan: (text: string) => void }) => {
    onScan = opts.onScan;
    return { videoRef: { current: null }, permission, request };
  },
}));

const maybeSingle = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => maybeSingle() }) }) }),
  },
}));

import ScanOrganizationPage from '@/app/(app)/scan-organization/page';

const show = () => renderApp(<ScanOrganizationPage />);

const scan = (payload: unknown) =>
  act(async () => {
    onScan(typeof payload === 'string' ? payload : JSON.stringify(payload));
  });

const orgQr = { type: 'organization', id: 9, name: 'Cafe Lila' };

beforeEach(() => {
  jest.clearAllMocks();
  resetAuth();
  confirmMock.mockResolvedValue(true);
  maybeSingle.mockResolvedValue({ data: { name: 'Cafe Lila', adults_only: false }, error: null });
  permission = 'granted';
  searchParams = new URLSearchParams();
});

describe('escaneo', () => {
  it('acepta el link universal del QR nuevo', async () => {
    show();
    await scan('https://www.puntosclub.com.ar/unirse/9');

    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalledWith('9'));
  });

  it('llegando por el link (?orgId=) arranca el alta sin escanear', async () => {
    searchParams = new URLSearchParams('orgId=9');
    show();

    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalledWith('9'));
  });

  it('por el link no pide la camara aunque este negada', async () => {
    permission = 'denied';
    searchParams = new URLSearchParams('orgId=9');
    show();

    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalledWith('9'));
    expect(screen.queryByText(es('scan.permissionTitle'))).not.toBeInTheDocument();
  });

  it('si el alta por link falla ofrece reintentar y volver', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'nope' } });
    searchParams = new URLSearchParams('orgId=9');
    show();

    // Reintenta y cancela la confirmacion: sigue ofreciendo reintentar.
    confirmMock.mockResolvedValueOnce(false);
    await userEvent.click(await screen.findByRole('button', { name: es('scan.linkRetry') }));
    await userEvent.click(await screen.findByRole('button', { name: es('common.back') }));
    expect(router.replace).toHaveBeenCalledWith('/');

    await userEvent.click(screen.getByRole('button', { name: es('scan.linkRetry') }));
    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalledWith('9'));
  });

  it('un link nuevo descarta el alta del anterior que sigue en vuelo', async () => {
    let resolveFirst: (v: unknown) => void = () => {};
    maybeSingle.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)));
    searchParams = new URLSearchParams('orgId=9');
    const { rerender } = show();

    searchParams = new URLSearchParams('orgId=10');
    rerender(
      <I18nProvider initialLang="es">
        <ScanOrganizationPage />
      </I18nProvider>,
    );
    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalledWith('10'));

    await act(async () => resolveFirst({ data: { name: 'Viejo', adults_only: false }, error: null }));
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(auth.joinOrganization).not.toHaveBeenCalledWith('9');
  });

  it('si el link cambia con la confirmacion abierta no se suma ni navega', async () => {
    let answer: (v: boolean) => void = () => {};
    confirmMock.mockImplementationOnce(() => new Promise((r) => (answer = r)));
    searchParams = new URLSearchParams('orgId=9');
    const { unmount } = show();
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());

    unmount();
    await act(async () => answer(true));
    expect(auth.joinOrganization).not.toHaveBeenCalled();
  });

  it('si se sale mientras se suma, no navega', async () => {
    let done: (v: unknown) => void = () => {};
    auth.joinOrganization.mockImplementationOnce(() => new Promise((r) => (done = r)));
    searchParams = new URLSearchParams('orgId=9');
    const { unmount } = show();
    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalled());

    unmount();
    await act(async () => done({ error: null }));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('suma la organizacion y va a su detalle', async () => {
    show();
    await scan(orgQr);

    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalledWith('9'));
    expect(auth.refreshOrganizations).toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith(es('join.successTitle'), {
      description: es('join.successBody', { name: 'Cafe Lila' }),
    });
    // En movil el alert ofrece "Ver organizacion"; en web el toast no tiene
    // botones, asi que se va directo al detalle.
    expect(router.replace).toHaveBeenCalledWith('/organization/9');
  });

  it('un club para mayores de 18 pregunta la edad', async () => {
    maybeSingle.mockResolvedValue({ data: { name: 'Cafe Lila', adults_only: true }, error: null });
    show();
    await scan(orgQr);

    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith({
        title: es('join.adultsTitle'),
        message: es('join.adultsBody', { name: 'Cafe Lila' }),
        confirmText: es('join.adultsYes'),
        cancelText: es('join.adultsNo'),
      }),
    );
  });

  it('si no se puede leer el club no ofrece unirse y muestra el error', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'nope' } });
    show();
    await scan(orgQr);

    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(confirmMock).not.toHaveBeenCalled();
    expect(auth.joinOrganization).not.toHaveBeenCalled();
  });

  it('si el club no existe avisa que el QR es invalido', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    show();
    await scan(orgQr);

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('scan.invalidQr'),
      }),
    );
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('sin nombre en la base usa el generico', async () => {
    maybeSingle.mockResolvedValue({ data: { name: null, adults_only: false }, error: null });
    show();
    await scan({ type: 'organization', id: 9 });

    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: es('join.confirmTitle', { name: es('scan.thisOrganization') }),
        }),
      ),
    );
  });

  it('un QR ilegible lo avisa y sigue escaneando', async () => {
    show();
    await scan('no es json');

    expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
      description: es('scan.invalidQr'),
    });
    expect(auth.joinOrganization).not.toHaveBeenCalled();

    // El scanner vuelve a estar activo: otra lectura entra.
    await scan(orgQr);
    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalled());
  });

  it('el QR de un beneficiario no sirve aca', async () => {
    show();
    await scan({ type: 'beneficiary', id: 7 });

    expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
      description: es('scan.invalidQr'),
    });
  });

  it('un QR de organizacion sin id tampoco', async () => {
    show();
    await scan({ type: 'organization' });

    expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
      description: es('scan.invalidQr'),
    });
  });

  it('si cancela la confirmacion no se suma', async () => {
    confirmMock.mockResolvedValue(false);
    show();
    await scan(orgQr);

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(auth.joinOrganization).not.toHaveBeenCalled();
  });

  it('el error al sumarse sale traducido y deja reintentar', async () => {
    auth.joinOrganization.mockResolvedValue({
      error: new Error('error.join.alreadyMember'),
    });
    show();
    await scan(orgQr);

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.join.alreadyMember'),
      }),
    );
    expect(router.replace).not.toHaveBeenCalled();
  });

  // Mientras se procesa una lectura, las siguientes se ignoran: el QR sigue
  // frente a la camara y ZXing dispara en cada cuadro.
  it('no procesa dos veces el mismo QR', async () => {
    let resolve!: (v: { error: null }) => void;
    auth.joinOrganization.mockReturnValue(new Promise((r) => (resolve = r)));
    show();
    await scan(orgQr);
    await scan(orgQr);

    expect(auth.joinOrganization).toHaveBeenCalledTimes(1);
    resolve({ error: null });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });

  it('mientras procesa muestra el spinner', async () => {
    let resolve!: (v: { error: null }) => void;
    auth.joinOrganization.mockReturnValue(new Promise((r) => (resolve = r)));
    show();
    await scan(orgQr);

    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    resolve({ error: null });
    await waitFor(() => expect(router.replace).toHaveBeenCalled());
  });
});

describe('camara', () => {
  it('mientras pide permiso muestra el spinner', () => {
    permission = 'pending';
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('con el permiso negado ofrece reintentar y volver', async () => {
    permission = 'denied';
    show();

    expect(screen.getByText(es('scan.permissionTitle'))).toBeInTheDocument();
    await userEvent.click(screen.getByText(es('scan.permissionAction')));
    expect(request).toHaveBeenCalled();

    await userEvent.click(screen.getByText(es('common.back')));
    expect(router.back).toHaveBeenCalled();
  });

  it('cerrar vuelve atras', async () => {
    show();
    await userEvent.click(screen.getByText(es('common.close')));
    expect(router.back).toHaveBeenCalled();
  });
});
