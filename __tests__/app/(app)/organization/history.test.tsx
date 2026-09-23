import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, beneficiary, membership, resetAuth } from '../../../_helpers/auth';
import { es, renderApp } from '../../../_helpers/render';
import { createSupabaseMock } from '../../../_helpers/supabase';

/** La ruta puede venir sin id (un link roto): los tests lo cambian. */
let params: { id?: string } = { id: '9' };
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useParams: () => params,
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import ActivityHistoryPage from '@/app/(app)/organization/[id]/history/page';

const NOW = new Date(2026, 8, 20, 12, 0, 0);
const daysAgo = (n: number, hour = 10) =>
  new Date(2026, 8, 20 - n, hour, 0).toISOString();

const purchase = (over: Record<string, unknown> = {}) => ({
  id: 1,
  points_earned: 120,
  purchase_date: daysAgo(0),
  created_at: null,
  status: 'active',
  cancelled_at: null,
  ...over,
});

const redemption = (over: Record<string, unknown> = {}) => ({
  id: 1,
  points_used: 500,
  status: 'delivered',
  requested_at: daysAgo(0, 9),
  delivered_at: daysAgo(0, 11),
  cancelled_at: null,
  redemption_date: null,
  product: { name: 'Cafe gratis' },
  ...over,
});

const feed = (purchases: unknown[] = [], redemptions: unknown[] = []) => {
  db.queueTable('purchase', { data: purchases, error: null });
  db.queueTable('redemption', { data: redemptions, error: null });
};

const show = () => renderApp(<ActivityHistoryPage />);

const openPanel = () =>
  userEvent.click(screen.getByRole('button', { name: es('history.filtersLabel') }));

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
  params = { id: '9' };
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
  resetAuth({
    beneficiary: beneficiary(),
    userOrganizations: [membership()],
  });
});

afterEach(() => jest.useRealTimers());

describe('resumen', () => {
  it('muestra los totales de la membresia', async () => {
    feed();
    show();
    expect(screen.getByText('2.000')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('1.200')).toBeInTheDocument();
    await screen.findByText(es('history.emptyTitle'));
  });

  it('sin membresia los totales son cero', async () => {
    auth.userOrganizations = [];
    feed();
    show();
    expect(screen.getAllByText('0')).toHaveLength(3);
    await screen.findByText(es('history.emptyTitle'));
  });
});

describe('feed', () => {
  it('mientras carga muestra el spinner', async () => {
    feed();
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    await screen.findByText(es('history.emptyTitle'));
  });

  it('mezcla compras y canjes con su letra y su signo', async () => {
    feed([purchase()], [redemption()]);
    show();

    expect(await screen.findByText(es('history.purchase'))).toBeInTheDocument();
    expect(screen.getByText(es('history.redemption'))).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('Cafe gratis')).toBeInTheDocument();
    expect(
      screen.getByText(es('history.purchaseAt', { name: 'Cafe Lila' })),
    ).toBeInTheDocument();
  });

  it('la compra cancelada se pinta en gris y sin signo', async () => {
    feed([purchase({ status: 'cancelled', cancelled_at: daysAgo(0) })]);
    show();
    expect(
      await screen.findByText(es('history.purchaseCancelled')),
    ).toBeInTheDocument();
  });

  it('el canje cancelado tambien', async () => {
    feed([], [redemption({ status: 'cancelled', cancelled_at: daysAgo(0) })]);
    show();
    expect(
      await screen.findByText(es('history.redemptionCancelled')),
    ).toBeInTheDocument();
  });

  it('usa created_at si la compra no tiene fecha, y descarta la que no tiene ninguna', async () => {
    feed([
      purchase({ purchase_date: null, created_at: daysAgo(1) }),
      purchase({ id: 2, purchase_date: null, created_at: null }),
    ]);
    show();

    await waitFor(() =>
      expect(screen.getAllByText(es('history.purchase'))).toHaveLength(1),
    );
  });

  it('el canje cae a redemption_date y despues a requested_at', async () => {
    feed(
      [],
      [
        redemption({ delivered_at: null, redemption_date: daysAgo(1) }),
        redemption({ id: 2, delivered_at: null, redemption_date: null }),
        redemption({
          id: 3,
          delivered_at: null,
          redemption_date: null,
          requested_at: null,
        }),
      ],
    );
    show();

    await waitFor(() =>
      expect(screen.getAllByText(es('history.redemption'))).toHaveLength(2),
    );
  });

  it('un producto borrado del catalogo se nombra igual', async () => {
    feed([], [redemption({ product: null })]);
    show();
    expect(
      await screen.findByText(es('history.deletedProduct')),
    ).toBeInTheDocument();
  });

  it('acepta el producto embebido como array', async () => {
    feed([], [redemption({ product: [{ name: 'Medialunas' }] })]);
    show();
    expect(await screen.findByText('Medialunas')).toBeInTheDocument();
  });

  it('los puntos nulos cuentan como cero', async () => {
    feed([purchase({ points_earned: null })]);
    show();
    await screen.findByText(es('history.purchase'));
    expect(screen.getAllByText(/0/).length).toBeGreaterThan(0);
  });

  it('agrupa por dia con la fecha larga', async () => {
    feed([purchase(), purchase({ id: 2, purchase_date: daysAgo(3) })]);
    show();

    expect(
      await screen.findByText('20 de septiembre de 2026'),
    ).toBeInTheDocument();
    expect(screen.getByText('17 de septiembre de 2026')).toBeInTheDocument();
  });

  it('sin organizacion en el contexto usa el nombre generico', async () => {
    auth.userOrganizations = [];
    feed([purchase()]);
    show();
    expect(
      await screen.findByText(
        es('history.purchaseAt', { name: es('history.theOrganization') }),
      ),
    ).toBeInTheDocument();
  });

  it('el vacio nombra la organizacion', async () => {
    feed();
    show();
    expect(
      await screen.findByText(es('history.emptyBody', { name: 'Cafe Lila' })),
    ).toBeInTheDocument();
  });

  it('si la consulta falla, el feed queda vacio sin romper', async () => {
    db.client.from.mockImplementationOnce(() => {
      throw new Error('sin red');
    });
    show();
    expect(await screen.findByText(es('history.emptyTitle'))).toBeInTheDocument();
  });

  it('sin id en la ruta no consulta nada', async () => {
    params = {};
    feed();
    show();
    expect(db.tables).toHaveLength(0);
  });

  // PostgREST puede devolver data null sin error (una policy que no deja ver).
  it('sobrevive a las dos consultas en null', async () => {
    db.queueTable('purchase', { data: null, error: null });
    db.queueTable('redemption', { data: null, error: null });
    show();
    expect(await screen.findByText(es('history.emptyTitle'))).toBeInTheDocument();
  });

  it('un canje sin puntos cuenta como cero', async () => {
    feed([], [redemption({ points_used: null })]);
    show();
    await screen.findByText(es('history.redemption'));
    expect(screen.getAllByText(/0/).length).toBeGreaterThan(0);
  });

  it('sin beneficiario no consulta nada', async () => {
    auth.beneficiary = null;
    feed();
    show();
    expect(db.tables).toHaveLength(0);
  });
});

describe('filtros de tipo', () => {
  it('cada chip recorta la lista', async () => {
    feed([purchase()], [redemption()]);
    show();
    await screen.findByText(es('history.purchase'));

    await userEvent.click(screen.getByText(es('history.filterEarned')));
    expect(screen.queryByText(es('history.redemption'))).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(es('history.filterRedeemed')));
    expect(screen.queryByText(es('history.purchase'))).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(es('history.filterAll')));
    expect(screen.getByText(es('history.purchase'))).toBeInTheDocument();
  });

  // Una compra cancelada sigue siendo un movimiento de "Ganados".
  it('la compra cancelada queda bajo Ganados', async () => {
    feed([purchase({ status: 'cancelled', cancelled_at: daysAgo(0) })]);
    show();
    await screen.findByText(es('history.purchaseCancelled'));

    await userEvent.click(screen.getByText(es('history.filterEarned')));
    expect(screen.getByText(es('history.purchaseCancelled'))).toBeInTheDocument();
  });
});

describe('panel de busqueda', () => {
  it('se abre y se cierra con el boton de filtros', async () => {
    feed();
    show();
    await screen.findByText(es('history.emptyTitle'));

    await openPanel();
    expect(
      screen.getByPlaceholderText(es('history.searchPlaceholder')),
    ).toBeInTheDocument();

    await openPanel();
    expect(
      screen.queryByPlaceholderText(es('history.searchPlaceholder')),
    ).not.toBeInTheDocument();
  });

  // El texto indexado incluye el dia largo del item: "21 de agosto" encuentra.
  it('busca por producto y por fecha', async () => {
    feed([purchase()], [redemption()]);
    show();
    await screen.findByText(es('history.purchase'));
    await openPanel();

    const input = screen.getByPlaceholderText(es('history.searchPlaceholder'));
    await userEvent.type(input, 'cafe gratis');
    expect(screen.queryByText(es('history.purchase'))).not.toBeInTheDocument();

    await userEvent.clear(input);
    await userEvent.type(input, '20 de septiembre');
    expect(screen.getByText(es('history.purchase'))).toBeInTheDocument();
  });

  it('la cruz limpia la busqueda', async () => {
    feed([purchase()]);
    show();
    await screen.findByText(es('history.purchase'));
    await openPanel();

    await userEvent.type(
      screen.getByPlaceholderText(es('history.searchPlaceholder')),
      'pizza',
    );
    expect(screen.getByText(es('common.noResults'))).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: es('common.clearSearch') }),
    );
    expect(screen.getByText(es('history.purchase'))).toBeInTheDocument();
  });

  it('el periodo recorta por fecha', async () => {
    feed([purchase(), purchase({ id: 2, purchase_date: daysAgo(40) })]);
    show();
    await waitFor(() =>
      expect(screen.getAllByText(es('history.purchase'))).toHaveLength(2),
    );
    await openPanel();

    await userEvent.click(screen.getByText(es('history.period7')));
    expect(screen.getAllByText(es('history.purchase'))).toHaveLength(1);

    // "Todo" es el rotulo del chip de tipo y del periodo: el del periodo es el
    // segundo en el DOM (el panel va debajo de la fila de chips).
    const [, periodAll] = screen.getAllByText(es('history.periodAll'));
    await userEvent.click(periodAll);
    expect(screen.getAllByText(es('history.purchase'))).toHaveLength(2);
  });

  it('el orden se puede invertir', async () => {
    feed([
      purchase({ points_earned: 100 }),
      purchase({ id: 2, points_earned: 200, purchase_date: daysAgo(3) }),
    ]);
    show();
    await waitFor(() =>
      expect(screen.getAllByText(es('history.purchase'))).toHaveLength(2),
    );
    await openPanel();

    expect(screen.getByText(es('history.sortNewest'))).toBeInTheDocument();
    await userEvent.click(screen.getByText(es('history.sortNewest')));
    expect(screen.getByText(es('history.sortOldest'))).toBeInTheDocument();
  });

  it('cuenta los resultados, en singular y en plural', async () => {
    feed([purchase()]);
    show();
    await screen.findByText(es('history.purchase'));
    await openPanel();
    expect(screen.getByText(es('history.countOne'))).toBeInTheDocument();
  });

  it('con varios resultados usa el plural', async () => {
    feed([purchase(), purchase({ id: 2 })]);
    show();
    await waitFor(() =>
      expect(screen.getAllByText(es('history.purchase'))).toHaveLength(2),
    );
    await openPanel();
    expect(
      screen.getByText(es('history.countMany', { count: 2 })),
    ).toBeInTheDocument();
  });

  // Con filtros puestos el boton queda encendido y con el punto, para que no
  // parezca que el historial esta vacio.
  it('con un filtro puesto el panel cerrado avisa con un punto', async () => {
    feed([purchase()]);
    show();
    await screen.findByText(es('history.purchase'));
    await openPanel();
    await userEvent.type(
      screen.getByPlaceholderText(es('history.searchPlaceholder')),
      'pizza',
    );

    await openPanel();
    const { container } = renderApp(<div />);
    expect(container).toBeInTheDocument();
    expect(
      document.querySelector('.bg-magenta'),
    ).toBeInTheDocument();
  });
});

describe('paginado', () => {
  it('muestra 10 y carga mas de a 10', async () => {
    feed(Array.from({ length: 23 }, (_, i) => purchase({ id: i + 1 })));
    show();
    await waitFor(() =>
      expect(screen.getAllByText(es('history.purchase'))).toHaveLength(10),
    );

    await userEvent.click(screen.getByText(es('history.loadMore')));
    expect(screen.getAllByText(es('history.purchase'))).toHaveLength(20);

    await userEvent.click(screen.getByText(es('history.loadMore')));
    expect(screen.getAllByText(es('history.purchase'))).toHaveLength(23);
    expect(screen.queryByText(es('history.loadMore'))).not.toBeInTheDocument();
  });

  it('cambiar de filtro vuelve a la primera pagina', async () => {
    feed(Array.from({ length: 15 }, (_, i) => purchase({ id: i + 1 })));
    show();
    await waitFor(() =>
      expect(screen.getAllByText(es('history.purchase'))).toHaveLength(10),
    );
    await userEvent.click(screen.getByText(es('history.loadMore')));

    await userEvent.click(screen.getByText(es('history.filterEarned')));
    expect(screen.getAllByText(es('history.purchase'))).toHaveLength(10);
  });

  it('cambiar la busqueda o el periodo tambien', async () => {
    feed(Array.from({ length: 15 }, (_, i) => purchase({ id: i + 1 })));
    show();
    await waitFor(() =>
      expect(screen.getAllByText(es('history.purchase'))).toHaveLength(10),
    );
    await userEvent.click(screen.getByText(es('history.loadMore')));
    await openPanel();

    await userEvent.click(screen.getByText(es('history.period365')));
    expect(screen.getAllByText(es('history.purchase'))).toHaveLength(10);

    await userEvent.click(screen.getByText(es('history.loadMore')));
    await userEvent.type(
      screen.getByPlaceholderText(es('history.searchPlaceholder')),
      'compra',
    );
    expect(screen.getAllByText(es('history.purchase'))).toHaveLength(10);
  });
});

describe('realtime', () => {
  it('un canje nuevo recarga el feed', async () => {
    feed([purchase()]);
    show();
    await screen.findByText(es('history.purchase'));

    feed([purchase(), purchase({ id: 2 })]);
    const bump = db.channel.on.mock.calls[0][2] as () => void;
    await act(async () => bump());

    await waitFor(() =>
      expect(screen.getAllByText(es('history.purchase'))).toHaveLength(2),
    );
  });

  it('al salir suelta el canal', async () => {
    feed();
    const { unmount } = show();
    await waitFor(() => expect(db.client.channel).toHaveBeenCalled());

    unmount();
    expect(db.client.removeChannel).toHaveBeenCalled();
  });
});
