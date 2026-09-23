import { screen, waitFor } from '@testing-library/react';
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
