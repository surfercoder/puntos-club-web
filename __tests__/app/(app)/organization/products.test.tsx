import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { auth, beneficiary, membership, resetAuth } from '../../../_helpers/auth';
import { es, renderApp } from '../../../_helpers/render';

/** La ruta puede venir sin id (un link roto): los tests lo cambian. */
let params: { id?: string } = { id: '9' };
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useParams: () => params,
}));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

// El boton de canje tiene su propia suite.
jest.mock('@/components/RedeemButton', () => ({
  __esModule: true,
  default: ({ canAfford }: { canAfford: boolean }) => (
    <button type="button" disabled={!canAfford}>
      canjear
    </button>
  ),
}));

let products: unknown = [];
jest.mock('@/lib/products', () => ({
  useOrganizationProducts: () => products,
}));

import OrganizationProductsPage from '@/app/(app)/organization/[id]/products/page';

const product = (over: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Cafe gratis',
  description: 'Un cafe de especialidad',
  required_points: 100,
  stock: 3,
  category_id: 'c1',
  category: { id: 'c1', name: 'Bebidas' },
  image_urls: null,
  ...over,
});

const show = () => renderApp(<OrganizationProductsPage />);

const search = (text: string) =>
  userEvent.type(
    screen.getByPlaceholderText(es('products.searchPlaceholder')),
    text,
  );

beforeEach(() => {
  jest.clearAllMocks();
  params = { id: '9' };
  products = [product()];
  resetAuth({
    beneficiary: beneficiary(),
    userOrganizations: [membership({ available_points: 1200 })],
  });
});

describe('catalogo', () => {
  it('muestra cada premio con sus puntos, categoria, stock y descripcion', () => {
    show();
    expect(screen.getByText('Cafe gratis')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('Bebidas')).toBeInTheDocument();
    expect(screen.getByText('Un cafe de especialidad')).toBeInTheDocument();
    expect(
      screen.getByText(es('products.stock', { count: 3 })),
    ).toBeInTheDocument();
  });

  it('un premio sin categoria ni descripcion se dibuja igual', () => {
    products = [product({ category: null, description: null })];
    show();
    expect(screen.getByText('Cafe gratis')).toBeInTheDocument();
    expect(screen.queryByText('Bebidas')).not.toBeInTheDocument();
  });

  it('con puntos de sobra el boton esta habilitado', () => {
    show();
    expect(screen.getByRole('button', { name: 'canjear' })).toBeEnabled();
  });

  it('sin puntos suficientes dice cuantos faltan', () => {
    products = [product({ required_points: 5000 })];
    show();
    expect(
      screen.getByText(es('products.missingPoints', { points: '3.800' })),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'canjear' })).toBeDisabled();
  });

  it('sin id en la ruta no hay membresia que mostrar', () => {
    params = {};
    show();
    expect(
      screen.getByText(es('products.missingPoints', { points: '100' })),
    ).toBeInTheDocument();
  });

  // El canje necesita el id del beneficiario: sin sesion no se ofrece.
  it('sin beneficiario el boton de canje no recibe id', () => {
    auth.beneficiary = null;
    show();
    expect(screen.getByRole('button', { name: 'canjear' })).toBeInTheDocument();
  });

  it('sin membresia los puntos disponibles son cero', () => {
    auth.userOrganizations = [];
    show();
    expect(
      screen.getByText(es('products.missingPoints', { points: '100' })),
    ).toBeInTheDocument();
  });
});

// Los cuatro motivos por los que la lista puede venir vacia no son el mismo
// problema para el usuario.
describe('vacios', () => {
  it('mientras carga lo dice', () => {
    products = null;
    show();
    expect(screen.getByText(es('products.loading'))).toBeInTheDocument();
  });

  it('el error del catalogo lo dice', () => {
    products = 'error';
    show();
    expect(screen.getByText(es('products.errorTitle'))).toBeInTheDocument();
  });

  it('un catalogo vacio lo dice', () => {
    products = [];
    show();
    expect(screen.getByText(es('products.emptyTitle'))).toBeInTheDocument();
    // Sin catalogo no hay nada que buscar: la cabecera no va.
    expect(
      screen.queryByPlaceholderText(es('products.searchPlaceholder')),
    ).not.toBeInTheDocument();
  });

  it('una busqueda sin resultados lo dice distinto', async () => {
    show();
    await search('pizza');
    expect(screen.getByText(es('common.noResults'))).toBeInTheDocument();
  });
});

describe('buscador', () => {
  it('filtra por nombre ignorando acentos', async () => {
    products = [product({ name: 'Café gratis' })];
    show();
    await search('CAFE');
    expect(screen.getByText('Café gratis')).toBeInTheDocument();
  });

  it('la cruz limpia la busqueda', async () => {
    show();
    await search('pizza');
    await userEvent.click(
      screen.getByRole('button', { name: es('common.clearSearch') }),
    );
    expect(screen.getByText('Cafe gratis')).toBeInTheDocument();
  });
});

// Las categorias salen de los productos ya cargados: evita una consulta mas y
// no ofrece filtros que no devuelven nada.
describe('categorias', () => {
  beforeEach(() => {
    products = [
      product(),
      product({
        id: 2,
        name: 'Medialunas',
        category_id: 'c2',
        category: { id: 'c2', name: 'Panaderia' },
      }),
    ];
  });

  it('los chips salen del catalogo y filtran', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Panaderia' }));

    expect(screen.getByText('Medialunas')).toBeInTheDocument();
    expect(screen.queryByText('Cafe gratis')).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: es('products.allCategories') }),
    );
    expect(screen.getByText('Cafe gratis')).toBeInTheDocument();
  });

  // Con una sola categoria los chips serian "Todas" + esa: no aportan nada.
  it('con menos de dos categorias no dibuja chips', () => {
    products = [product()];
    show();
    expect(screen.queryByRole('button', { name: 'Bebidas' })).not.toBeInTheDocument();
  });

  // Si la categoria elegida desaparece (se agoto el stock, llego un refresh),
  // su chip ya no esta para deseleccionarla: cae sola a "Todas".
  it('si la categoria elegida desaparece, vuelve a "Todas"', async () => {
    const { rerender } = show();
    await userEvent.click(screen.getByRole('button', { name: 'Panaderia' }));
    expect(screen.queryByText('Cafe gratis')).not.toBeInTheDocument();

    products = [product()];
    rerender(<OrganizationProductsPage />);
    expect(screen.getByText('Cafe gratis')).toBeInTheDocument();
  });
});

describe('carrusel de imagenes', () => {
  it('con una sola imagen no dibuja puntitos', () => {
    products = [product({ image_urls: ['https://x/1.png'] })];
    const { container } = show();
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelectorAll('.h-1\\.5')).toHaveLength(0);
  });

  it('con varias imagenes dibuja un puntito por cada una', () => {
    products = [
      product({ image_urls: ['https://x/1.png', 'https://x/2.png'] }),
    ];
    const { container } = show();
    expect(container.querySelectorAll('img')).toHaveLength(2);
    expect(container.querySelectorAll('.h-1\\.5')).toHaveLength(2);
  });

  it('el scroll mueve el puntito activo', async () => {
    products = [
      product({ image_urls: ['https://x/1.png', 'https://x/2.png'] }),
    ];
    const { container } = show();
    const track = container.querySelector('.snap-x')!;
    Object.defineProperties(track, {
      clientWidth: { value: 300, configurable: true },
      scrollLeft: { value: 300, configurable: true },
    });

    await act(async () => {
      track.dispatchEvent(new Event('scroll'));
    });
    expect(container.querySelectorAll('.w-3\\.5')).toHaveLength(1);
  });

  it('sin ancho medido no mueve nada', async () => {
    products = [
      product({ image_urls: ['https://x/1.png', 'https://x/2.png'] }),
    ];
    const { container } = show();
    const track = container.querySelector('.snap-x')!;

    await act(async () => {
      track.dispatchEvent(new Event('scroll'));
    });
    expect(container.querySelectorAll('.w-3\\.5')).toHaveLength(1);
  });
});
