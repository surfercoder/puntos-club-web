import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, resetAuth } from '../../_helpers/auth';
import { es, renderApp } from '../../_helpers/render';
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
  permission = 'granted';
});

describe('escaneo', () => {
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

  it('sin nombre en el QR usa el generico', async () => {
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
      description: es('scan.unreadableQr'),
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
