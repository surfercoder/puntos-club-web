import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, membership, organization, resetAuth } from '../../_helpers/auth';
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

const rpc = jest.fn();
jest.mock('@/lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import ExplorePage from '@/app/(app)/explore/page';

const show = () => renderApp(<ExplorePage />);

const search = (text: string) =>
  userEvent.type(
    screen.getByPlaceholderText(es('explore.searchPlaceholder')),
    text,
  );

beforeEach(() => {
  jest.clearAllMocks();
  resetAuth({
    allOrganizations: [
      organization({ id: '9', name: 'Cafe Lila' }),
      organization({ id: '4', name: 'Panaderia Rosa', business_name: 'Rosa SA' }),
    ],
  });
  confirmMock.mockResolvedValue(true);
  rpc.mockResolvedValue({ data: null, error: null });
});

describe('listado', () => {
  it('muestra el catalogo con la cuenta', () => {
    show();
    expect(screen.getByText('Cafe Lila')).toBeInTheDocument();
    expect(screen.getByText('Panaderia Rosa')).toBeInTheDocument();
    expect(
      screen.getByText(es('explore.countMany', { count: 2 })),
    ).toBeInTheDocument();
  });

  it('con una sola organizacion usa el singular', () => {
    auth.allOrganizations = [organization()];
    show();
    expect(screen.getByText(es('explore.countOne'))).toBeInTheDocument();
  });

  it('mientras carga muestra el spinner', () => {
    auth.allOrganizations = [];
    auth.organizationsLoading = true;
    show();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sin catalogo lo dice', () => {
    auth.allOrganizations = [];
    show();
    expect(screen.getByText(es('explore.empty'))).toBeInTheDocument();
  });
});

describe('buscador', () => {
  it('filtra por nombre ignorando acentos y mayusculas', async () => {
    auth.allOrganizations = [organization({ name: 'Café Lila' })];
    show();
    await search('CAFE');
    expect(screen.getByText('Café Lila')).toBeInTheDocument();
  });

  it('filtra tambien por razon social', async () => {
    show();
    await search('rosa sa');
    expect(screen.getByText('Panaderia Rosa')).toBeInTheDocument();
    expect(screen.queryByText('Cafe Lila')).not.toBeInTheDocument();
  });

  it('una organizacion sin razon social no la dibuja ni la busca', async () => {
    auth.allOrganizations = [organization({ business_name: null })];
    show();
    expect(screen.queryByText('Lila SRL')).not.toBeInTheDocument();

    await search('lila srl');
    expect(screen.getByText(es('explore.emptySearch'))).toBeInTheDocument();
  });

  it('sin resultados lo dice con el texto de busqueda', async () => {
    show();
    await search('pizzeria');
    expect(screen.getByText(es('explore.emptySearch'))).toBeInTheDocument();
  });

  // Con una busqueda activa el hero se oculta para dejarle el alto a los
  // resultados, como en el mockup.
  it('la busqueda esconde el hero', async () => {
    show();
    expect(screen.getByText(esFlat('explore.heroTitle'))).toBeInTheDocument();
    await search('cafe');
    expect(
      screen.queryByText(esFlat('explore.heroTitle')),
    ).not.toBeInTheDocument();
  });

  it('la cruz limpia la busqueda', async () => {
    show();
    await search('cafe');
    await userEvent.click(
      screen.getByRole('button', { name: es('common.clearSearch') }),
    );
    expect(screen.getByText('Panaderia Rosa')).toBeInTheDocument();
  });
});

describe('sumarse a una organizacion', () => {
  it('confirma, se suma y avisa', async () => {
    show();
    await userEvent.click(screen.getAllByText(es('explore.join'))[0]);

    await waitFor(() => expect(auth.joinOrganization).toHaveBeenCalledWith('9'));
    expect(notify.success).toHaveBeenCalledWith(es('join.successTitle'), {
      description: es('join.successBody', { name: 'Cafe Lila' }),
    });
  });

  it('si cancela no se suma', async () => {
    confirmMock.mockResolvedValue(false);
    show();
    await userEvent.click(screen.getAllByText(es('explore.join'))[0]);

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(auth.joinOrganization).not.toHaveBeenCalled();
  });

  it('el error sale traducido', async () => {
    auth.joinOrganization.mockResolvedValue({
      error: new Error('error.join.alreadyMember'),
    });
    show();
    await userEvent.click(screen.getAllByText(es('explore.join'))[0]);

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.join.alreadyMember'),
      }),
    );
  });

  it('mientras se suma muestra el spinner en esa fila', async () => {
    let resolve!: (v: { error: null }) => void;
    auth.joinOrganization.mockReturnValue(new Promise((r) => (resolve = r)));
    show();
    await userEvent.click(screen.getAllByText(es('explore.join'))[0]);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    resolve({ error: null });
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
  });
});

describe('ya soy miembro', () => {
  beforeEach(() => {
    auth.userOrganizations = [membership({ organization_id: '9' })];
  });

  it('la fila muestra la insignia y no el boton de sumarse', () => {
    show();
    expect(screen.getByText(es('explore.member'))).toBeInTheDocument();
    expect(screen.getAllByText(es('explore.join'))).toHaveLength(1);
  });

  // Con la home acotada a 4 tarjetas, esta es la via para llegar a las demas.
  it('la fila lleva al detalle', async () => {
    show();
    await userEvent.click(screen.getByText('Cafe Lila'));
    expect(router.push).toHaveBeenCalledWith('/organization/9');
  });

  it('tambien se abre con el teclado', async () => {
    show();
    const row = screen.getByText('Cafe Lila').closest<HTMLElement>(
      '[role="button"]',
    )!;
    row.focus();
    await userEvent.keyboard('{Enter}');
    expect(router.push).toHaveBeenCalledWith('/organization/9');

    await userEvent.keyboard(' ');
    expect(router.push).toHaveBeenCalledTimes(2);
  });

  it('otra tecla no navega', async () => {
    show();
    const row = screen.getByText('Cafe Lila').closest<HTMLElement>(
      '[role="button"]',
    )!;
    row.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('la fila sin membresia no navega', async () => {
    show();
    await userEvent.click(screen.getByText('Panaderia Rosa'));
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('escanear', () => {
  it('las tres vias llevan al escaner', async () => {
    show();
    await userEvent.click(
      screen.getByRole('button', { name: es('explore.scanQr') }),
    );
    await userEvent.click(
      screen.getByRole('button', { name: es('explore.qrCardLabel') }),
    );
    expect(router.push).toHaveBeenCalledTimes(2);
    expect(router.push).toHaveBeenCalledWith('/scan-organization');
  });
});

describe('filtro de ubicacion', () => {
  const place = (organization_id: number, overrides: Record<string, unknown> = {}) => ({
    organization_id,
    country: 'Argentina',
    state: 'Mendoza',
    city: 'Capital',
    latitude: -32.89,
    longitude: -68.83,
    ...overrides,
  });
  const locs = [
    place(1),
    place(2, { city: 'Luján de Cuyo' }),
    place(3, { state: 'Córdoba', city: 'Río Cuarto', latitude: -33.12, longitude: -64.35 }),
  ];
  const getCurrentPosition = jest.fn();
  const chip = (name: string) => screen.getByRole('button', { name });
  const shown = async () => {
    show();
    await screen.findByRole('button', { name: es('explore.near') });
  };

  beforeEach(() => {
    resetAuth({
      allOrganizations: [
        organization({ id: '1', name: 'Mendo Capital' }),
        organization({ id: '2', name: 'Mendo Lujan' }),
        organization({ id: '3', name: 'Cordobes' }),
        organization({ id: '4', name: 'Sin Sucursal' }),
      ],
    });
    rpc.mockResolvedValue({ data: locs, error: null });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
  });

  it('no aparece si la RPC devuelve error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'x' } });
    show();
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: es('explore.near') })).toBeNull();
  });

  it('no aparece si la RPC tira', async () => {
    rpc.mockRejectedValue(new Error('offline'));
    show();
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: es('explore.near') })).toBeNull();
  });

  it('descarta la respuesta si la pagina se desmonta antes', async () => {
    let resolveRpc: (v: unknown) => void = () => {};
    rpc.mockReturnValue(new Promise((r) => (resolveRpc = r)));
    const { unmount } = show();
    unmount();
    await act(async () => resolveRpc({ data: locs, error: null }));
  });

  it('baja de pais a provincia a departamento y vuelve con Todas', async () => {
    await shown();
    expect(screen.queryByRole('button', { name: 'Mendoza' })).toBeNull();

    await userEvent.click(chip('Argentina'));
    expect(screen.queryByText('Sin Sucursal')).toBeNull();
    await userEvent.click(chip('Córdoba'));
    expect(screen.getByText('Cordobes')).toBeInTheDocument();
    expect(screen.queryByText('Mendo Capital')).toBeNull();

    await userEvent.click(chip('Mendoza'));
    await userEvent.click(chip('Luján de Cuyo'));
    expect(chip('Luján de Cuyo')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Mendo Capital')).toBeNull();

    // Tocar el departamento elegido lo suelta.
    await userEvent.click(chip('Luján de Cuyo'));
    expect(screen.getByText('Mendo Capital')).toBeInTheDocument();

    await userEvent.click(chip(es('explore.allPlaces')));
    expect(screen.getByText('Sin Sucursal')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mendoza' })).toBeNull();
  });

  it('una zona sin orgs lo dice; con busqueda manda el texto de busqueda', async () => {
    auth.allOrganizations = [organization({ id: '3', name: 'Cordobes' })];
    await shown();
    await userEvent.click(chip('Argentina'));
    await userEvent.click(chip('Mendoza'));
    expect(screen.getByText(es('explore.emptyPlace'))).toBeInTheDocument();
    await search('zzz');
    expect(screen.getByText(es('explore.emptySearch'))).toBeInTheDocument();
  });

  it('cerca de mi elige la provincia de la sucursal mas cercana y se suelta', async () => {
    let succeed: (p: unknown) => void = () => {};
    getCurrentPosition.mockImplementation((ok) => (succeed = ok));
    await shown();

    await userEvent.click(chip(es('explore.near')));
    // Mientras ubica, el chip muestra un spinner.
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    // ...y los chips quedan bloqueados para que el resultado no pise un toque manual.
    expect(chip('Argentina')).toBeDisabled();
    await act(async () => succeed({ coords: { latitude: -31.42, longitude: -64.18 } }));

    expect(chip(es('explore.near'))).toHaveAttribute('aria-pressed', 'true');
    expect(chip('Córdoba')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Cordobes')).toBeInTheDocument();
    expect(screen.queryByText('Mendo Capital')).toBeNull();

    await userEvent.click(chip(es('explore.near')));
    expect(screen.getByText('Mendo Capital')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Córdoba' })).toBeNull();

    // Elegir algo a mano apaga "cerca de mi".
    getCurrentPosition.mockImplementation((ok) =>
      ok({ coords: { latitude: -32.9, longitude: -68.8 } }),
    );
    await userEvent.click(chip(es('explore.near')));
    await userEvent.click(chip('Capital'));
    expect(chip(es('explore.near'))).toHaveAttribute('aria-pressed', 'false');
  });

  it('avisa si niegan el permiso o si falla la ubicacion', async () => {
    await shown();
    getCurrentPosition.mockImplementationOnce((_ok, fail) => fail({ code: 1 }));
    await userEvent.click(chip(es('explore.near')));
    expect(notify.error).toHaveBeenLastCalledWith(es('explore.near'), {
      description: es('explore.nearDenied'),
    });

    getCurrentPosition.mockImplementationOnce((_ok, fail) => fail({ code: 3 }));
    await userEvent.click(chip(es('explore.near')));
    expect(notify.error).toHaveBeenLastCalledWith(es('explore.near'), {
      description: es('explore.nearFailed'),
    });
  });

  it('avisa cuando ninguna sucursal tiene coordenadas', async () => {
    rpc.mockResolvedValue({ data: [place(1, { latitude: null, longitude: null })], error: null });
    getCurrentPosition.mockImplementation((ok) => ok({ coords: { latitude: 0, longitude: 0 } }));
    await shown();
    await userEvent.click(chip(es('explore.near')));
    expect(notify.error).toHaveBeenLastCalledWith(es('explore.near'), {
      description: es('explore.nearNone'),
    });
  });
});
