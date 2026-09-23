import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { createSupabaseMock } from '../_helpers/supabase';
import { es, renderApp } from '../_helpers/render';
import { confirmMock, notify } from '../_helpers/ui';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

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

import RedeemButton from '@/components/RedeemButton';
import type { Product } from '@/types';

const product = {
  id: 1,
  name: 'Cafe gratis',
  required_points: 100,
  stock: 3,
} as unknown as Product;

const setup = (props: Partial<Parameters<typeof RedeemButton>[0]> = {}) => {
  const onRedeemed = jest.fn();
  renderApp(
    <RedeemButton
      product={product}
      beneficiaryId="7"
      organizationId="9"
      canAfford
      totalStock={3}
      onRedeemed={onRedeemed}
      {...props}
    />,
  );
  return { onRedeemed };
};

beforeEach(() => {
  db.reset();
  jest.clearAllMocks();
  confirmMock.mockResolvedValue(true);
});

describe('RedeemButton', () => {
  it('canjea por RPC y avisa', async () => {
    db.queue({ error: null });
    const { onRedeemed } = setup();

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(notify.success).toHaveBeenCalled());
    expect(db.client.rpc).toHaveBeenCalledWith('request_redemption', {
      p_beneficiary_id: 7,
      p_product_id: 1,
      p_organization_id: 9,
    });
    expect(onRedeemed).toHaveBeenCalled();
  });

  it('confirma antes de canjear, con el producto y los puntos', async () => {
    db.queue({ error: null });
    setup();

    await userEvent.click(screen.getByRole('button'));
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Cafe gratis'),
      }),
    );
  });

  it('si el usuario cancela no toca la base', async () => {
    confirmMock.mockResolvedValue(false);
    const { onRedeemed } = setup();

    await userEvent.click(screen.getByRole('button'));
    expect(db.client.rpc).not.toHaveBeenCalled();
    expect(onRedeemed).not.toHaveBeenCalled();
  });

  // El error de la base sale traducido: nunca el texto crudo de PostgREST.
  it('muestra el error del canje traducido', async () => {
    db.queue({ error: { message: 'INSUFFICIENT_POINTS' } });
    const { onRedeemed } = setup();

    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(notify.error).toHaveBeenCalled());
    expect(notify.error).toHaveBeenCalledWith(
      es('redeem.failedTitle'),
      { description: es('error.rpc.insufficientPoints') },
    );
    expect(onRedeemed).not.toHaveBeenCalled();
  });

  it('avisa tambien si la llamada tira', async () => {
    db.client.rpc.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    setup();

    await userEvent.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith(es('common.error'), {
        description: es('error.network'),
      }),
    );
  });

  it('sin puntos queda deshabilitado y lo dice', () => {
    setup({ canAfford: false });
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(es('redeem.noPoints'))).toBeInTheDocument();
  });

  // El carrusel no tiene ancho para "Puntos insuficientes" ni para el icono.
  it('en compacto usa el texto corto', () => {
    setup({ canAfford: false, compact: true });
    expect(screen.getByText(es('redeem.noPointsShort'))).toBeInTheDocument();
  });

  it('sin stock no se puede canjear', () => {
    setup({ totalStock: 0 });
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('sin beneficiario el boton no hace nada', async () => {
    setup({ beneficiaryId: undefined });
    await userEvent.click(screen.getByRole('button'));
    expect(confirmMock).not.toHaveBeenCalled();
  });

  it('mientras canjea muestra el spinner', async () => {
    let resolve!: (v: { error: null }) => void;
    db.client.rpc.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    setup();

    await userEvent.click(screen.getByRole('button'));
    expect(await screen.findByRole('progressbar')).toBeInTheDocument();

    resolve({ error: null });
    await waitFor(() => expect(notify.success).toHaveBeenCalled());
  });
});
