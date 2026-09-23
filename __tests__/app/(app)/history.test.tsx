import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, beneficiary, resetAuth } from '../../_helpers/auth';
import { es, renderApp } from '../../_helpers/render';
import { createSupabaseMock } from '../../_helpers/supabase';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import GeneralHistoryPage from '@/app/(app)/history/page';

const NOW = new Date(2026, 8, 20, 12, 0, 0);
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number, hour = 10) =>
  iso(new Date(2026, 8, 20 - n, hour, 0));

const org = { id: 9, name: 'Cafe Lila', logo_url: null };

const purchase = (over: Record<string, unknown> = {}) => ({
  id: 1,
  organization_id: 9,
  points_earned: 120,
  purchase_date: daysAgo(0),
  created_at: null,
  status: 'active',
  cancelled_at: null,
  organization: org,
  ...over,
});

const redemption = (over: Record<string, unknown> = {}) => ({
  id: 1,
  organization_id: 9,
  points_used: 500,
  status: 'delivered',
  requested_at: daysAgo(0, 9),
  delivered_at: daysAgo(0, 11),
  cancelled_at: null,
  redemption_date: null,
  product: { name: 'Cafe gratis' },
  organization: org,
  ...over,
});

const feed = (purchases: unknown[] = [], redemptions: unknown[] = []) => {
  db.queueTable('purchase', { data: purchases, error: null });
  db.queueTable('redemption', { data: redemptions, error: null });
};

const show = () => renderApp(<GeneralHistoryPage />);

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
  jest.useFakeTimers({ now: NOW, advanceTimers: true });
  resetAuth({ beneficiary: beneficiary() });
});

afterEach(() => jest.useRealTimers());

describe('feed', () => {
  it('mezcla compras y canjes, y los agrupa por dia', async () => {
    feed([purchase(), purchase({ id: 2, purchase_date: daysAgo(1) })], [redemption()]);
    show();

    expect(
      await screen.findByText(
        es('historyAll.today', { date: '20 de septiembre de 2026' }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        es('historyAll.yesterday', { date: '19 de septiembre de 2026' }),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Cafe gratis')).toBeInTheDocument();
  });

  it('mientras carga muestra el spinner', async () => {
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // Se espera la carga: si no, el setState cae fuera de act.
    expect(await screen.findByText(es('historyAll.emptyTitle'))).toBeInTheDocument();
  });

  it('el signo y el sentido de cada movimiento', async () => {
    feed(
      [purchase(), purchase({ id: 2, status: 'cancelled', cancelled_at: daysAgo(0) })],
      [redemption(), redemption({ id: 2, status: 'cancelled', cancelled_at: daysAgo(0) })],
    );
    show();

    await screen.findAllByText('Cafe Lila');
    // + ganados, - cancelados, - canjeados, y el canje cancelado sin signo.
    expect(screen.getByText(/^\+/)).toBeInTheDocument();
    expect(screen.getAllByText(/^-/)).toHaveLength(2);
  });

  // Un canje cancelado NO es una cancelacion de puntos: los devuelve, asi que
  // sigue viviendo bajo "Canjes" y se pinta en gris.
  it('el canje cancelado queda en el grupo de canjes', async () => {
    feed([], [redemption({ status: 'cancelled', cancelled_at: daysAgo(0) })]);
    show();

    await screen.findByText(es('history.redemptionCancelled'));
    await userEvent.click(screen.getByText(es('historyAll.filterRedeemed')));
    expect(screen.getByText(es('history.redemptionCancelled'))).toBeInTheDocument();

    await userEvent.click(screen.getByText(es('historyAll.filterCancelled')));
    expect(
      screen.queryByText(es('history.redemptionCancelled')),
    ).not.toBeInTheDocument();
  });

  it('una compra sin ninguna fecha no entra', async () => {
    feed([purchase({ purchase_date: null, created_at: null })]);
    show();
    expect(await screen.findByText(es('historyAll.emptyTitle'))).toBeInTheDocument();
  });

  it('usa created_at cuando la compra no tiene fecha propia', async () => {
    feed([purchase({ purchase_date: null, created_at: daysAgo(0) })]);
    show();
    expect(await screen.findByText('Cafe Lila')).toBeInTheDocument();
  });

  it('el canje cae a redemption_date y despues a requested_at', async () => {
    feed(
      [],
      [
        redemption({ delivered_at: null, redemption_date: daysAgo(2) }),
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

    await screen.findAllByText('Cafe Lila');
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(2);
  });

  // Una membresia dada de baja deja igual sus movimientos: sin el embed
  // quedarian sin identificar.
  it('sin organizacion embebida usa el nombre generico y la inicial', async () => {
    feed([purchase({ organization: null })]);
    show();
    expect(
      await screen.findByText(es('history.theOrganization')),
    ).toBeInTheDocument();
  });

  it('acepta el embed como array y dibuja el logo', async () => {
    feed([purchase({ organization: [{ ...org, logo_url: 'https://x/l.png' }] })]);
    show();
    await waitFor(() =>
      expect(document.querySelector('img')).toHaveAttribute(
        'src',
        'https://x/l.png',
      ),
    );
  });

  it('un embed vacio cae al nombre generico', async () => {
    feed([purchase({ organization: [] })]);
    show();
    expect(
      await screen.findByText(es('history.theOrganization')),
    ).toBeInTheDocument();
  });

  it('un canje sin puntos cuenta como cero', async () => {
    feed([], [redemption({ points_used: null })]);
    show();
    await screen.findByText('Cafe gratis');
    expect(screen.getAllByText(/0/).length).toBeGreaterThan(0);
  });

  it('un producto borrado del catalogo se nombra igual', async () => {
    feed([], [redemption({ product: null })]);
    show();
    expect(
      await screen.findByText(es('history.deletedProduct')),
    ).toBeInTheDocument();
  });

  it('si la consulta falla, el feed queda vacio sin romper', async () => {
    db.client.from.mockImplementationOnce(() => {
      throw new Error('sin red');
    });
    show();
    expect(await screen.findByText(es('historyAll.emptyTitle'))).toBeInTheDocument();
  });

  it('sin beneficiario no consulta nada', () => {
    auth.beneficiary = null;
    show();
    expect(db.tables).toHaveLength(0);
  });

  it('cada fila lleva al detalle de su organizacion', async () => {
    feed([purchase()]);
    show();
    await userEvent.click(await screen.findByText('Cafe Lila'));
    expect(router.push).toHaveBeenCalledWith('/organization/9');
  });
});

describe('fichas del resumen', () => {
  // Las fichas resumen el periodo, no el chip de tipo.
  it('suman por tipo sobre el periodo, no sobre el filtro', async () => {
    feed(
      [
        purchase({ points_earned: 100 }),
        purchase({ id: 2, points_earned: 50 }),
        purchase({
          id: 3,
          points_earned: 30,
          status: 'cancelled',
          cancelled_at: daysAgo(0),
        }),
      ],
      [redemption()],
    );
    show();

    await screen.findAllByText('Cafe Lila');
    expect(screen.getByText('150')).toBeInTheDocument(); // asignados
    expect(screen.getByText('30')).toBeInTheDocument(); // cancelados
    expect(screen.getByText('1')).toBeInTheDocument(); // canjes realizados

    await userEvent.click(screen.getByText(es('historyAll.filterRedeemed')));
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('los puntos nulos cuentan como cero', async () => {
    feed([purchase({ points_earned: null })]);
    show();
    await screen.findByText('Cafe Lila');
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });
});

describe('filtros', () => {
  it('el chip de tipo recorta la lista', async () => {
    feed([purchase()], [redemption()]);
    show();
    await screen.findAllByText('Cafe Lila');

    await userEvent.click(screen.getByText(es('historyAll.filterAssigned')));
    expect(screen.queryByText('Cafe gratis')).not.toBeInTheDocument();

    await userEvent.click(screen.getByText(es('historyAll.filterAll')));
    expect(screen.getByText('Cafe gratis')).toBeInTheDocument();
  });

  // El mockup abre en "Ultimos 3 meses".
  it('el periodo arranca en 3 meses y se puede cambiar', async () => {
    feed([purchase(), purchase({ id: 2, purchase_date: daysAgo(200) })]);
    show();
    await screen.findAllByText('Cafe Lila');
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(1);

    await userEvent.click(
      screen.getByRole('button', { name: es('historyAll.periodLabel') }),
    );
    await userEvent.click(screen.getByText(es('historyAll.period0')));
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(2);
  });

  it('el desplegable se abre y se cierra', async () => {
    feed();
    show();
    await screen.findByText(es('historyAll.emptyTitle'));
    const toggle = screen.getByRole('button', {
      name: es('historyAll.periodLabel'),
    });

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('sin resultados distingue "no hay nada" de "no hay coincidencias"', async () => {
    feed([purchase({ purchase_date: daysAgo(200) })]);
    show();

    await waitFor(() => expect(db.tables).toContain('purchase'));
    expect(
      await screen.findByText(es('historyAll.noResultsTitle')),
    ).toBeInTheDocument();
  });
});

describe('paginado', () => {
  it('muestra 10 y carga mas de a 10', async () => {
    feed(
      Array.from({ length: 25 }, (_, i) => purchase({ id: i + 1 })),
    );
    show();

    await screen.findAllByText('Cafe Lila');
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(10);

    await userEvent.click(screen.getByText(es('historyAll.loadMore')));
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(20);

    await userEvent.click(screen.getByText(es('historyAll.loadMore')));
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(25);
    expect(screen.queryByText(es('historyAll.loadMore'))).not.toBeInTheDocument();
  });

  it('cambiar de filtro vuelve a la primera pagina', async () => {
    feed(Array.from({ length: 15 }, (_, i) => purchase({ id: i + 1 })));
    show();
    await screen.findAllByText('Cafe Lila');

    await userEvent.click(screen.getByText(es('historyAll.loadMore')));
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(15);

    await userEvent.click(screen.getByText(es('historyAll.filterAssigned')));
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(10);
  });

  it('cambiar de periodo tambien', async () => {
    feed(Array.from({ length: 15 }, (_, i) => purchase({ id: i + 1 })));
    show();
    await screen.findAllByText('Cafe Lila');
    await userEvent.click(screen.getByText(es('historyAll.loadMore')));

    await userEvent.click(
      screen.getByRole('button', { name: es('historyAll.periodLabel') }),
    );
    await userEvent.click(screen.getByText(es('historyAll.period7')));
    expect(screen.getAllByText('Cafe Lila')).toHaveLength(10);
  });
});

describe('realtime', () => {
  it('una compra nueva recarga el feed', async () => {
    feed([purchase()]);
    show();
    await screen.findByText('Cafe Lila');

    feed([purchase(), purchase({ id: 2 })]);
    const bump = db.channel.on.mock.calls[0][2] as () => void;
    await act(async () => bump());

    await waitFor(() => expect(screen.getAllByText('Cafe Lila')).toHaveLength(2));
  });

  it('al salir de la pantalla suelta el canal', async () => {
    feed();
    const { unmount } = show();
    await waitFor(() => expect(db.client.channel).toHaveBeenCalled());

    unmount();
    expect(db.client.removeChannel).toHaveBeenCalled();
  });
});
