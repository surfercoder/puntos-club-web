import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, beneficiary, membership, organization, resetAuth } from '../../../_helpers/auth';
import { es, renderApp } from '../../../_helpers/render';
import { createSupabaseMock } from '../../../_helpers/supabase';
import { confirmMock, notify } from '../../../_helpers/ui';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
/** La ruta puede venir sin id (un link roto): los tests lo cambian. */
let params: { id?: string } = { id: '9' };
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => params,
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

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

// El catalogo tiene su propia suite (lib/products): aca solo interesa que la
// ficha lo dibuje.
let products: unknown = [];
jest.mock('@/lib/products', () => ({
  useOrganizationProducts: () => products,
}));

import OrganizationDetailPage from '@/app/(app)/organization/[id]/page';

const product = (over: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Cafe gratis',
  required_points: 100,
  stock: 3,
  image_urls: null,
  ...over,
});

const offer = (over: Record<string, unknown> = {}) => ({
  id: 1,
  display_name: '2x1 los martes',
  description: 'Solo en el local',
  display_icon: '🎉',
  display_color: '#7638E7',
  rule_type: 'multiplier',
  config: {},
  time_start: null,
  time_end: null,
  days_of_week: null,
  valid_until: null,
  ...over,
});

/** Deja resolver la carga de promociones que dispara el montaje. */
const settle = () => act(async () => {});

const show = () => renderApp(<OrganizationDetailPage />);

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
  params = { id: '9' };
  products = [];
  resetAuth({
    beneficiary: beneficiary(),
    userOrganizations: [membership()],
  });
  confirmMock.mockResolvedValue(true);
  db.client.rpc.mockResolvedValue({ data: [], error: null });
});

// La ficha pide las promociones al montarse: los tests que afirman de forma
// sincronica terminan antes de que resuelva, y ese setState caeria fuera de act.
afterEach(async () => {
  await act(async () => {});
});

describe('estados de la pantalla', () => {
  it('mientras cargan las organizaciones muestra el spinner', async () => {
    auth.organizationsLoading = true;
    auth.userOrganizations = [];
    show();
    expect(screen.getByText(es('org.loading'))).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await settle();
  });

  // Un link sin id: no hay membresia que encontrar, y no se consulta nada.
  it('sin id en la ruta no consulta promociones', async () => {
    params = {};
    auth.userOrganizations = [];
    show();
    expect(screen.getByText(es('org.notFoundBody'))).toBeInTheDocument();
    expect(db.client.rpc).not.toHaveBeenCalled();
    await settle();
  });

  it('si no es miembro de esa organizacion lo dice', async () => {
    auth.userOrganizations = [];
    show();
    expect(screen.getByText(es('org.notFoundBody'))).toBeInTheDocument();
    await settle();
  });

  it('sin nombre de organizacion usa el generico en la barra', async () => {
    auth.userOrganizations = [membership({ organization: undefined })];
    show();
    expect(
      screen.getByRole('heading', { name: es('org.fallbackName') }),
    ).toBeInTheDocument();
    await settle();
  });
});

describe('ficha', () => {
  it('muestra los puntos y las estadisticas', async () => {
    show();

    // Los puntos disponibles salen dos veces: la caja grande y la estadistica.
    expect(screen.getAllByText('1.200')).toHaveLength(2);
    expect(screen.getByText('2.000')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
    await settle();
  });

  it('el historial y las notificaciones tienen su destino', async () => {
    show();
    await userEvent.click(screen.getByText(es('org.history')));
    expect(router.push).toHaveBeenCalledWith('/organization/9/history');

    await userEvent.click(screen.getByRole('button', { name: es('notif.bell') }));
    expect(router.push).toHaveBeenCalledWith('/notifications');
    await settle();
  });
});

describe('info de la empresa', () => {
  const open = () => userEvent.click(screen.getByText(es('org.companyInfo')));

  it('trae las sucursales recien al abrirla', async () => {
    show();
    expect(db.tables).not.toContain('branch');

    db.queueTable('branch', {
      data: [
        {
          id: 1,
          name: 'Sucursal Centro',
          phone: '1144445555',
          address: {
            street: 'Corrientes',
            number: '1234',
            city: 'CABA',
            state: 'BA',
          },
        },
      ],
      error: null,
    });
    await open();

    expect(await screen.findByText('Sucursal Centro')).toBeInTheDocument();
    expect(
      screen.getByText('Corrientes 1234, CABA, BA'),
    ).toBeInTheDocument();
    expect(screen.getByText('1144445555')).toBeInTheDocument();
  });

  it('una sucursal sin direccion lo dice', async () => {
    db.queueTable('branch', {
      data: [{ id: 1, name: 'Sucursal', phone: null, address: null }],
      error: null,
    });
    show();
    await open();

    expect(await screen.findByText(es('org.noAddress'))).toBeInTheDocument();
  });

  // Sin organizacion el efecto de sucursales no dispara: sin el guardia de
  // `loading` el modal se quedaba colgado en el spinner.
  it('sin organizacion muestra el vacio y no consulta sucursales', async () => {
    auth.userOrganizations = [membership({ organization: undefined })];
    show();
    await open();

    expect(await screen.findByText(es('org.noContactData'))).toBeInTheDocument();
    expect(db.tables).not.toContain('branch');
  });

  it('el click en el fondo cierra, el click en el contenido no', async () => {
    db.queueTable('branch', { data: [], error: null });
    show();
    await open();
    const dialog = await screen.findByRole('dialog');

    await userEvent.click(screen.getByText(es('org.companyInfo'), { selector: 'h2' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(dialog);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });

  it('muestra los contactos que existen', async () => {
    auth.userOrganizations = [
      membership({
        organization: organization({
          contact_phone: '1155556666',
          contact_email: 'hola@lila.com',
          website: 'https://lila.com',
          description: 'Cafe de especialidad',
        }),
      }),
    ];
    db.queueTable('branch', { data: [], error: null });
    show();
    await open();

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('hola@lila.com')).toBeInTheDocument();
    expect(within(dialog).getByText('1155556666')).toBeInTheDocument();
    expect(within(dialog).getByText('Cafe de especialidad')).toBeInTheDocument();
  });

  // public_info es lo que la organizacion eligio publicar; description es el
  // texto interno.
  it('public_info le gana a description', async () => {
    auth.userOrganizations = [
      membership({
        organization: organization({
          public_info: 'Texto publico',
          description: 'Texto interno',
        }),
      }),
    ];
    db.queueTable('branch', { data: [], error: null });
    show();
    await open();

    expect(await screen.findByText('Texto publico')).toBeInTheDocument();
    expect(screen.queryByText('Texto interno')).not.toBeInTheDocument();
  });

  it('sin datos ni sucursales lo dice', async () => {
    db.queueTable('branch', { data: [], error: null });
    show();
    await open();

    expect(await screen.findByText(es('org.noContactData'))).toBeInTheDocument();
  });

  // Depende de la policy beneficiary_read_branch_addresses: sin ella el join
  // vuelve null sin error.
  it('si las sucursales no se pueden leer, muestra el resto', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    db.queueTable('branch', { data: null, error: { code: '42501' } });
    show();
    await open();

    expect(await screen.findByText(es('org.noContactData'))).toBeInTheDocument();
  });

  it('se cierra con el boton y con Escape', async () => {
    db.queueTable('branch', { data: [], error: null });
    show();
    await open();
    await screen.findByRole('dialog');

    await userEvent.click(screen.getByText(es('common.close')));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    db.queueTable('branch', { data: [], error: null });
    await open();
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  });
});

describe('promociones activas', () => {
  it('mientras cargan muestra el cartel de carga', async () => {
    db.client.rpc.mockReturnValue(new Promise(() => {}));
    show();
    expect(screen.getByText(es('org.loadingOffers'))).toBeInTheDocument();
    await settle();
  });

  it('lista las promociones con su horario y sus dias', async () => {
    db.client.rpc.mockResolvedValue({
      data: [
        offer({ time_start: '09:00:00', time_end: '13:00:00', days_of_week: [1, 2] }),
      ],
      error: null,
    });
    show();

    expect(await screen.findByText('2x1 los martes')).toBeInTheDocument();
    expect(screen.getByText('09:00 - 13:00')).toBeInTheDocument();
    expect(
      screen.getByText(`${es('day.1')}, ${es('day.2')}`),
    ).toBeInTheDocument();
  });

  it('un horario a medias se completa', async () => {
    db.client.rpc.mockResolvedValue({
      data: [offer({ time_start: '09:00:00' })],
      error: null,
    });
    show();
    expect(await screen.findByText('09:00 - 23:59')).toBeInTheDocument();
  });

  it('un horario que solo trae el cierre arranca a las 00:00', async () => {
    db.client.rpc.mockResolvedValue({
      data: [offer({ time_end: '13:00:00' })],
      error: null,
    });
    show();
    expect(await screen.findByText('00:00 - 13:00')).toBeInTheDocument();
  });

  it('todos los dias no dibuja la lista de dias', async () => {
    db.client.rpc.mockResolvedValue({
      data: [offer({ days_of_week: [0, 1, 2, 3, 4, 5, 6] })],
      error: null,
    });
    show();
    await screen.findByText('2x1 los martes');
    expect(screen.queryByText(es('day.0'))).not.toBeInTheDocument();
  });

  it('una promocion sin icono ni color usa los de por defecto', async () => {
    db.client.rpc.mockResolvedValue({
      data: [offer({ display_icon: '', display_color: '', description: '' })],
      error: null,
    });
    show();
    expect(await screen.findByText('🎉')).toBeInTheDocument();
  });

  it('sin promociones no dibuja la tarjeta', async () => {
    show();
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    expect(screen.queryByText(es('org.activeOffers'))).not.toBeInTheDocument();
  });

  it('si la consulta falla, la tarjeta no aparece', async () => {
    db.client.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    show();
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    expect(screen.queryByText(es('org.activeOffers'))).not.toBeInTheDocument();
  });

  it('si la llamada tira, tampoco', async () => {
    db.client.rpc.mockRejectedValue(new Error('sin red'));
    show();
    await waitFor(() => expect(db.client.rpc).toHaveBeenCalled());
    expect(screen.queryByText(es('org.activeOffers'))).not.toBeInTheDocument();
  });
});

describe('carrusel de premios', () => {
  it('mientras carga lo dice', async () => {
    products = null;
    show();
    expect(screen.getByText(es('org.loadingRewards'))).toBeInTheDocument();
    await settle();
  });

  // Un error y un catalogo vacio no son el mismo problema para el usuario.
  it('distingue el error del catalogo vacio', async () => {
    products = 'error';
    const { unmount } = show();
    expect(screen.getByText(es('org.rewardsError'))).toBeInTheDocument();
    unmount();

    products = [];
    show();
    expect(screen.getByText(es('org.rewardsEmpty'))).toBeInTheDocument();
    await settle();
  });

  it('muestra hasta seis premios y el resto queda en "Ver todos"', async () => {
    products = Array.from({ length: 8 }, (_, i) =>
      product({ id: i + 1, name: `Premio ${i + 1}` }),
    );
    show();

    expect(screen.getByText('Premio 1')).toBeInTheDocument();
    expect(screen.getByText('Premio 6')).toBeInTheDocument();
    expect(screen.queryByText('Premio 7')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(es('org.seeAll')));
    expect(router.push).toHaveBeenCalledWith('/organization/9/products');
  });

  it('un premio con foto la dibuja, y sin foto va el regalito', async () => {
    products = [
      product({ image_urls: ['https://x/p.png'] }),
      product({ id: 2, name: 'Sin foto' }),
    ];
    show();

    expect(document.querySelector('img[src="https://x/p.png"]')).not.toBeNull();
    expect(screen.getByText('🎁')).toBeInTheDocument();
    await settle();
  });

  // Entran tres por pantalla: el carrusel frena en length - 3, asi que hay
  // length - 2 posiciones y no un punto por premio.
  it('con mas de tres premios dibuja los puntitos y sigue el scroll', async () => {
    products = Array.from({ length: 5 }, (_, i) => product({ id: i + 1 }));
    const { container } = show();

    const dots = container.querySelectorAll('.h-\\[7px\\]');
    expect(dots).toHaveLength(3);

    const track = container.querySelector('.snap-x')!;
    Object.defineProperties(track, {
      scrollWidth: { value: 500, configurable: true },
      clientWidth: { value: 300, configurable: true },
      scrollLeft: { value: 100, configurable: true, writable: true },
    });
    await act(async () => {
      track.dispatchEvent(new Event('scroll'));
    });
    expect(container.querySelectorAll('.bg-violet').length).toBeGreaterThan(0);
  });

  it('con tres o menos no hay puntitos', async () => {
    products = [product(), product({ id: 2 })];
    const { container } = show();
    expect(container.querySelectorAll('.h-\\[7px\\]')).toHaveLength(0);
    await settle();
  });

  it('el scroll sin premios no rompe', async () => {
    products = Array.from({ length: 4 }, (_, i) => product({ id: i + 1 }));
    const { container } = show();
    const track = container.querySelector('.snap-x')!;
    await act(async () => {
      track.dispatchEvent(new Event('scroll'));
    });
    expect(screen.getAllByText('Cafe gratis')).toHaveLength(4);
  });
});

describe('dejar de seguir', () => {
  it('confirma, da de baja la membresia y vuelve', async () => {
    db.queueTable('beneficiary_organization', { error: null });
    show();
    await userEvent.click(screen.getByText(es('org.unfollow')));

    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    expect(auth.refreshOrganizations).toHaveBeenCalled();
    expect(router.back).toHaveBeenCalled();
  });

  it('sin nombre de organizacion el texto igual se arma', async () => {
    auth.userOrganizations = [membership({ organization: undefined })];
    db.queueTable('beneficiary_organization', { error: null });
    show();
    await userEvent.click(screen.getByText(es('org.unfollow')));

    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: es('org.unfollowConfirmBody', { name: '' }),
      }),
    );
  });

  it('si cancela no toca nada', async () => {
    confirmMock.mockResolvedValue(false);
    show();
    await userEvent.click(screen.getByText(es('org.unfollow')));

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(db.tables).not.toContain('beneficiary_organization');
  });

  it('el error de la base lo avisa y no vuelve', async () => {
    db.queueTable('beneficiary_organization', { error: { code: '42501' } });
    show();
    await userEvent.click(screen.getByText(es('org.unfollow')));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('org.unfollowFailed'),
      }),
    );
    expect(router.back).not.toHaveBeenCalled();
  });

  it('si la llamada tira, sale el error traducido', async () => {
    db.client.from.mockImplementationOnce(() => {
      throw new TypeError('Failed to fetch');
    });
    show();
    await userEvent.click(screen.getByText(es('org.unfollow')));

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.network'),
      }),
    );
  });

  it('mientras da de baja muestra el spinner', async () => {
    let resolve!: (v: { error: null }) => void;
    db.client.from.mockImplementationOnce(() => ({
      update: () => ({ eq: () => new Promise((r) => (resolve = r)) }),
    }));
    show();
    await userEvent.click(screen.getByText(es('org.unfollow')));

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolve({ error: null });
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
  });
});

describe('realtime de puntos', () => {
  it('un cambio en la fila de puntos recarga las organizaciones', async () => {
    show();
    await waitFor(() => expect(db.channel.on).toHaveBeenCalled());

    const bump = db.channel.on.mock.calls[0][2] as () => void;
    await act(async () => bump());
    expect(auth.refreshOrganizations).toHaveBeenCalled();
  });

  it('al salir suelta el canal', async () => {
    const { unmount } = show();
    await waitFor(() => expect(db.client.channel).toHaveBeenCalled());

    unmount();
    expect(db.client.removeChannel).toHaveBeenCalled();
  });

  it('sin beneficiario no se suscribe', async () => {
    auth.beneficiary = null;
    show();
    expect(db.client.channel).not.toHaveBeenCalled();
    await settle();
  });
});
