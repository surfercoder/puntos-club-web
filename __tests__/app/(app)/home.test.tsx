import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, beneficiary, membership, resetAuth } from '../../_helpers/auth';
import { es, esFlat, renderApp } from '../../_helpers/render';
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

const loadNotifications = jest.fn();
const getSeenAt = jest.fn();
const getClearedAt = jest.fn();
jest.mock('@/lib/notifications', () => ({
  loadNotifications: (...a: unknown[]) => loadNotifications(...a),
  getSeenAt: (...a: unknown[]) => getSeenAt(...a),
  getClearedAt: (...a: unknown[]) => getClearedAt(...a),
  visible: (items: unknown[]) => items,
  unreadCount: (items: unknown[]) => items.length,
}));

import HomePage from '@/app/(app)/page';

const notification = (id: string) => ({ id, at: '2026-09-20T10:00:00Z' });

const show = () => renderApp(<HomePage />);

beforeEach(() => {
  jest.clearAllMocks();
  resetAuth({ beneficiary: beneficiary() });
  confirmMock.mockResolvedValue(true);
  loadNotifications.mockResolvedValue([]);
  getSeenAt.mockResolvedValue(null);
  getClearedAt.mockResolvedValue(null);
});

describe('hero', () => {
  it('saluda por el nombre y suma los puntos de todas las organizaciones', async () => {
    auth.userOrganizations = [
      membership({ available_points: 1200 }),
      membership({ id: '2', organization_id: '4', available_points: 300 }),
    ];
    show();

    expect(
      screen.getByText(es('home.greeting', { name: 'Ana' })),
    ).toBeInTheDocument();
    // beneficiary.available_points nunca se actualiza: el total es la suma.
    expect(
      screen.getByText(`1.500 ${es('common.pts')}`),
    ).toBeInTheDocument();
  });

  // La columna es nullable en la base aunque el tipo diga number.
  it('una membresia sin puntos cuenta como cero', () => {
    auth.userOrganizations = [
      membership({ available_points: null as unknown as number }),
      membership({ id: '2', organization_id: '4', available_points: 300 }),
    ];
    show();
    expect(screen.getByText(`300 ${es('common.pts')}`)).toBeInTheDocument();
  });

  it('sin nombre usa el saludo generico', () => {
    auth.beneficiary = beneficiary({ first_name: '' });
    show();
    expect(
      screen.getByText(es('home.greeting', { name: es('home.defaultUser') })),
    ).toBeInTheDocument();
  });

  it('el QR lleva los datos del beneficiario', () => {
    show();
    expect(screen.getByTestId('qr-code')).toHaveAttribute(
      'data-value',
      JSON.stringify({
        type: 'beneficiary',
        id: '7',
        email: 'ana@x.com',
        name: 'Ana Diaz',
      }),
    );
  });

  // Los nombres guardados suelen traer espacios de mas ("Carlos ").
  it('colapsa los espacios de mas del nombre', () => {
    auth.beneficiary = beneficiary({ first_name: 'Carlos ', last_name: ' Schmidt' });
    show();
    expect(screen.getByText('Carlos Schmidt')).toBeInTheDocument();
  });

  it('sin beneficiario no dibuja ningun QR', () => {
    auth.beneficiary = null;
    show();
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });
});

describe('modal del QR', () => {
  const open = async () =>
    userEvent.click(screen.getByRole('button', { name: es('home.expandQr') }));

  it('se abre con el QR grande y el mail', async () => {
    show();
    await open();

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(es('home.qrModalTitle'));
    expect(dialog).toHaveTextContent('ana@x.com');
  });

  it('se cierra con el boton', async () => {
    show();
    await open();
    await userEvent.click(screen.getByText(es('common.close')));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Escape, foco atrapado y backdrop los pone el <dialog> nativo.
  it('se cierra con Escape', async () => {
    show();
    await open();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // Solo el click en el ::backdrop cierra: apoyar el dedo sobre el QR mientras
  // el cajero lo escanea no puede cerrarlo.
  it('el click en el fondo cierra, el click en el QR no', async () => {
    show();
    await open();

    // El QR del hero y el del modal comparten el testid: el grande es el segundo.
    const [, big] = screen.getAllByTestId('qr-code');
    await userEvent.click(big);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('dialog'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('sin QR igual se abre (cuenta recien creada)', async () => {
    auth.beneficiary = null;
    show();
    await open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByTestId('qr-code')).not.toBeInTheDocument();
  });
});

describe('badge de notificaciones', () => {
  it('cuenta lo que entro despues de la ultima visita', async () => {
    loadNotifications.mockResolvedValue([notification('a'), notification('b')]);
    show();

    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  // Arriba de 9 se corta para no ensanchar el circulo.
  it('mas de nueve se muestra como 9+', async () => {
    loadNotifications.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => notification(String(i))),
    );
    show();

    expect(await screen.findByText('9+')).toBeInTheDocument();
  });

  it('sin novedades no dibuja el badge', async () => {
    show();
    await waitFor(() => expect(loadNotifications).toHaveBeenCalled());
    expect(
      screen.getByRole('button', { name: es('notif.bell') }),
    ).toBeInTheDocument();
  });

  // El badge va por fuera del camino critico de la home.
  it('si el panel falla, la home sigue sin badge', async () => {
    loadNotifications.mockRejectedValue(new Error('rls'));
    show();

    await waitFor(() => expect(loadNotifications).toHaveBeenCalled());
    expect(
      screen.getByRole('button', { name: es('notif.bell') }),
    ).toBeInTheDocument();
  });

  it('sin beneficiario no consulta el panel', () => {
    auth.beneficiary = null;
    show();
    expect(loadNotifications).not.toHaveBeenCalled();
  });

  it('la campana lleva al panel', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: es('notif.bell') }));
    expect(router.push).toHaveBeenCalledWith('/notifications');
  });
});

describe('mis organizaciones', () => {
  it('lista cada organizacion con sus puntos y lleva al detalle', async () => {
    auth.userOrganizations = [membership()];
    show();

    expect(screen.getByText('Cafe Lila')).toBeInTheDocument();
    expect(screen.getByText('1.200')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Cafe Lila'));
    expect(router.push).toHaveBeenCalledWith('/organization/9');
  });

  it('sin nombre de organizacion usa el generico', () => {
    auth.userOrganizations = [membership({ organization: undefined })];
    show();
    expect(screen.getByText(es('home.organization'))).toBeInTheDocument();
  });

  it('mientras carga muestra el spinner', () => {
    auth.organizationsLoading = true;
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText(es('home.emptyTitle'))).not.toBeInTheDocument();
  });

  it('sin organizaciones invita a sumarse', () => {
    show();
    expect(screen.getByText(es('home.emptyTitle'))).toBeInTheDocument();
  });
});

describe('atajos', () => {
  it('el escaner y Explorar tienen su destino', async () => {
    show();
    await userEvent.click(screen.getByText(es('home.scanQr')));
    expect(router.push).toHaveBeenCalledWith('/scan-organization');

    // "Explorar" tambien es una pestana de la barra, que va al final del DOM:
    // el primero es el boton de la tarjeta.
    const [exploreCard] = screen.getAllByRole('button', {
      name: es('home.exploreAction'),
    });
    await userEvent.click(exploreCard);
    expect(router.push).toHaveBeenCalledWith('/explore');
  });

  it('editar perfil lleva al perfil', async () => {
    show();
    await userEvent.click(screen.getByText(es('home.editProfile')));
    expect(router.push).toHaveBeenCalledWith('/profile');
  });

  // Se dibujan como en el mockup pero no fingen ser tocables: no tienen destino.
  it('los accesos rapidos todavia no navegan', () => {
    show();
    expect(screen.getByText(esFlat('home.quick.earn'))).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: esFlat('home.quick.earn') }),
    ).not.toBeInTheDocument();
  });
});

describe('ficha de cuenta', () => {
  it('muestra los datos del beneficiario', () => {
    show();
    expect(screen.getByText('ana@x.com')).toBeInTheDocument();
    expect(screen.getByText('1155551234')).toBeInTheDocument();
    expect(screen.getByText('30111222')).toBeInTheDocument();
  });

  it('los datos que faltan se muestran como guion', () => {
    auth.beneficiary = beneficiary({ phone: null, document_id: null, email: null });
    show();
    expect(screen.getAllByText('-')).toHaveLength(3);
  });
});

describe('cerrar sesion', () => {
  it('confirma, cierra y manda al login', async () => {
    show();
    await userEvent.click(screen.getByText(es('signOut.action')));

    await waitFor(() => expect(auth.signOut).toHaveBeenCalled());
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true }),
    );
    expect(router.replace).toHaveBeenCalledWith('/sign-in');
  });

  it('si el usuario cancela no cierra nada', async () => {
    confirmMock.mockResolvedValue(false);
    show();
    await userEvent.click(screen.getByText(es('signOut.action')));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
