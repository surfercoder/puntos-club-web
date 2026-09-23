import { act, render, screen, waitFor } from '@testing-library/react';

import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import {
  loadOrganizationProducts,
  useOrganizationProducts,
} from '@/lib/products';

const product = { id: 1, name: 'Cafe gratis', required_points: 100, stock: 3 };

beforeEach(() => {
  db.reset();
  // El doble de Supabase vive en el modulo, asi que los contadores de llamadas
  // sobreviven entre tests si no se limpian (clearAllMocks conserva las
  // implementaciones de la cadena).
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('loadOrganizationProducts', () => {
  it('trae el catalogo de la organizacion', async () => {
    db.queue({ data: [product], error: null });
    await expect(loadOrganizationProducts('9')).resolves.toEqual([product]);
    expect(db.tables).toEqual(['product']);
  });

  // Un error y un catalogo vacio se veian iguales: asi se leyo "no hay
  // productos" durante semanas despues de un cambio de esquema.
  it('devuelve "error" y no [] cuando la query falla', async () => {
    db.queue({ data: null, error: { message: 'stock no existe' } });
    await expect(loadOrganizationProducts('9')).resolves.toBe('error');
  });

  it('devuelve "error" si la llamada tira', async () => {
    db.client.from.mockImplementationOnce(() => {
      throw new Error('sin red');
    });
    await expect(loadOrganizationProducts('9')).resolves.toBe('error');
  });
});

function Probe({ organizationId }: { organizationId: string | undefined }) {
  const products = useOrganizationProducts(organizationId);
  return (
    <span data-testid="state">
      {products === null
        ? 'cargando'
        : products === 'error'
          ? 'error'
          : products.map((p) => p.name).join(',')}
    </span>
  );
}

describe('useOrganizationProducts', () => {
  it('carga el catalogo y se suscribe al stock', async () => {
    db.queue({ data: [product], error: null });
    render(<Probe organizationId="9" />);

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('Cafe gratis'),
    );
    expect(db.client.channel).toHaveBeenCalledWith(
      expect.stringContaining('org-stock-9-'),
    );
  });

  it('sin organizacion no consulta nada', () => {
    render(<Probe organizationId={undefined} />);
    expect(db.client.from).not.toHaveBeenCalled();
    expect(screen.getByTestId('state')).toHaveTextContent('cargando');
  });

  // El topic lleva un sufijo por instancia: `supabase.channel` devuelve el canal
  // ya abierto si el topic existe, y hacerle .on() a uno suscripto tira. El
  // detalle de organizacion queda montado debajo del catalogo completo.
  it('dos instancias con el mismo id piden topics distintos', async () => {
    db.queueTable('product', { data: [product], error: null }, { data: [], error: null });
    render(
      <>
        <Probe organizationId="9" />
        <Probe organizationId="9" />
      </>,
    );

    await waitFor(() => expect(db.client.channel).toHaveBeenCalledTimes(2));
    const topics = db.client.channel.mock.calls.flat();
    expect(new Set(topics).size).toBe(2);
  });

  it('un cambio de stock vuelve a pedir el catalogo', async () => {
    db.queue({ data: [product], error: null });
    render(<Probe organizationId="9" />);
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('Cafe gratis'),
    );

    db.queue({ data: [{ ...product, name: 'Cafe gratis (2)' }], error: null });
    const handler = db.channel.on.mock.calls[0][2] as () => void;
    await act(async () => handler());

    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('Cafe gratis (2)'),
    );
  });

  it('da de baja el canal al desmontar', async () => {
    db.queue({ data: [product], error: null });
    const { unmount } = render(<Probe organizationId="9" />);
    await waitFor(() => expect(db.client.channel).toHaveBeenCalled());

    unmount();
    expect(db.client.removeChannel).toHaveBeenCalled();
    expect(db.channel.unsubscribe).toHaveBeenCalled();
  });

  // Sin la etiqueta de organizacion se veian un instante los productos de la
  // anterior, hasta que resolvia el fetch nuevo.
  it('no muestra el catalogo de la organizacion anterior al cambiar de id', async () => {
    db.queueTable('product', { data: [product], error: null });
    const { rerender } = render(<Probe organizationId="9" />);
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent('Cafe gratis'),
    );

    db.queueTable('product', { data: [], error: null });
    rerender(<Probe organizationId="4" />);
    expect(screen.getByTestId('state')).toHaveTextContent('cargando');

    // Se espera el fetch de la organizacion nueva: sin esto el setState cae
    // fuera de act y el catalogo vacio llega despues de terminar el test.
    await waitFor(() =>
      expect(screen.getByTestId('state')).toHaveTextContent(''),
    );
  });
});
