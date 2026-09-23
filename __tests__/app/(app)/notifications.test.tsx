import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, beneficiary, resetAuth } from '../../_helpers/auth';
import { es, renderApp } from '../../_helpers/render';
import { confirmMock } from '../../_helpers/ui';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
jest.mock('@/lib/confirm', () => ({
  get confirm() {
    return confirmMock;
  },
}));

const loadNotifications = jest.fn();
const getClearedAt = jest.fn();
const markSeen = jest.fn();
const markCleared = jest.fn();
jest.mock('@/lib/notifications', () => {
  const real = jest.requireActual('@/lib/notifications');
  return {
    ...real,
    loadNotifications: (...a: unknown[]) => loadNotifications(...a),
    getClearedAt: (...a: unknown[]) => getClearedAt(...a),
    markSeen: (...a: unknown[]) => markSeen(...a),
    markCleared: (...a: unknown[]) => markCleared(...a),
  };
});

import NotificationsPage from '@/app/(app)/notifications/page';
import type { AppNotification, NotifKind } from '@/lib/notifications';

const NOW = new Date(2026, 8, 20, 12, 0, 0);

const notif = (over: Partial<AppNotification> = {}): AppNotification => ({
  id: 'n1',
  kind: 'points' as NotifKind,
  organizationId: '9',
  organizationName: 'Cafe Lila',
  logoUrl: null,
  title: 'Sumaste puntos',
  body: 'Ganaste 120 puntos en Cafe Lila',
  at: new Date(2026, 8, 20, 9, 30).toISOString(),
  ...over,
});

const show = () => renderApp(<NotificationsPage />);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
  resetAuth({ beneficiary: beneficiary() });
  confirmMock.mockResolvedValue(true);
  loadNotifications.mockResolvedValue([]);
  getClearedAt.mockResolvedValue(null);
});

afterEach(() => jest.useRealTimers());

describe('feed', () => {
  it('mientras carga muestra el spinner', () => {
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('agrupa por dia: hoy con la hora, lo viejo con la fecha', async () => {
    loadNotifications.mockResolvedValue([
      notif(),
      notif({
        id: 'n2',
        at: new Date(2026, 8, 19, 20, 45).toISOString(),
        title: 'Canjeaste',
      }),
      notif({ id: 'n3', at: new Date(2026, 8, 16, 10, 0).toISOString() }),
      notif({ id: 'n4', at: new Date(2026, 6, 1, 10, 0).toISOString() }),
    ]);
    show();

    expect(await screen.findByText(es('notif.today'))).toBeInTheDocument();
    expect(screen.getByText(es('notif.yesterday'))).toBeInTheDocument();
    expect(screen.getByText(es('notif.thisWeek'))).toBeInTheDocument();
    expect(screen.getByText(es('notif.older'))).toBeInTheDocument();
    // Hoy y ayer llevan la hora; de ahi para atras, la fecha.
    expect(screen.getByText('09:30')).toBeInTheDocument();
    expect(screen.getByText('20:45')).toBeInTheDocument();
    expect(screen.getByText('16 de septiembre')).toBeInTheDocument();
  });

  // Los premios nuevos vienen de una columna `date`, sin hora que mostrar.
  it('una fila sin hora muestra la fecha aunque sea de hoy', async () => {
    loadNotifications.mockResolvedValue([
      notif({ kind: 'rewards', at: '2026-09-20' }),
    ]);
    show();
    expect(await screen.findByText('20 de septiembre')).toBeInTheDocument();
  });

  it('sin logo muestra la inicial de la organizacion', async () => {
    loadNotifications.mockResolvedValue([notif()]);
    show();
    expect(await screen.findByText('C')).toBeInTheDocument();
  });

  it('con logo lo dibuja', async () => {
    loadNotifications.mockResolvedValue([
      notif({ logoUrl: 'https://x/logo.png' }),
    ]);
    show();
    await waitFor(() =>
      expect(document.querySelector('img')).toHaveAttribute(
        'src',
        'https://x/logo.png',
      ),
    );
  });

  it('cada fila lleva al detalle de su organizacion', async () => {
    loadNotifications.mockResolvedValue([notif()]);
    show();
    await userEvent.click(await screen.findByText('Sumaste puntos'));
    expect(router.push).toHaveBeenCalledWith('/organization/9');
  });

  it('el panel vacio lo dice', async () => {
    show();
    expect(await screen.findByText(es('notif.emptyTitle'))).toBeInTheDocument();
  });
});

describe('marcas', () => {
  // Abrir el panel es haberlas visto: apaga el badge de la campana.
  it('abrir el panel marca todo como visto', async () => {
    loadNotifications.mockResolvedValue([notif()]);
    show();
    await waitFor(() => expect(markSeen).toHaveBeenCalledWith('7'));
  });

  // Marcar sobre un feed vacio por error silenciaria para siempre
  // notificaciones que nunca se mostraron.
  it('si la carga falla no marca nada como visto', async () => {
    loadNotifications.mockRejectedValue(new Error('rls'));
    show();
    expect(await screen.findByText(es('notif.emptyTitle'))).toBeInTheDocument();
    expect(markSeen).not.toHaveBeenCalled();
  });

  it('respeta lo que se limpio antes', async () => {
    getClearedAt.mockResolvedValue(new Date(2026, 8, 20, 10, 0).toISOString());
    loadNotifications.mockResolvedValue([notif()]);
    show();
    expect(await screen.findByText(es('notif.emptyTitle'))).toBeInTheDocument();
  });

  it('si se sale antes de que cargue, no marca nada', async () => {
    let resolve!: (v: unknown[]) => void;
    loadNotifications.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = show();
    unmount();

    await act(async () => {
      resolve([notif()]);
    });
    expect(markSeen).not.toHaveBeenCalled();
  });

  it('sin beneficiario no consulta nada', () => {
    auth.beneficiary = null;
    show();
    expect(loadNotifications).not.toHaveBeenCalled();
  });
});

describe('limpiar', () => {
  const clear = () =>
    userEvent.click(screen.getByRole('button', { name: es('notif.clear') }));

  it('confirma y vacia el panel sin tocar la base', async () => {
    loadNotifications.mockResolvedValue([notif()]);
    show();
    await screen.findByText('Sumaste puntos');

    await clear();

    await waitFor(() => expect(markCleared).toHaveBeenCalledWith('7'));
    expect(screen.getByText(es('notif.emptyTitle'))).toBeInTheDocument();
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({ destructive: true }),
    );
  });

  it('si cancela no borra nada', async () => {
    confirmMock.mockResolvedValue(false);
    loadNotifications.mockResolvedValue([notif()]);
    show();
    await screen.findByText('Sumaste puntos');

    await clear();
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(markCleared).not.toHaveBeenCalled();
    expect(screen.getByText('Sumaste puntos')).toBeInTheDocument();
  });

  it('con el panel vacio el tacho esta deshabilitado', async () => {
    show();
    await screen.findByText(es('notif.emptyTitle'));
    expect(
      screen.getByRole('button', { name: es('notif.clear') }),
    ).toBeDisabled();
  });
});
