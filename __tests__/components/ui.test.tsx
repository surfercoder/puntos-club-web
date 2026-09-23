import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';

import { ConfirmHost } from '@/components/ui/confirm';
import { NotifyHost } from '@/components/ui/notify';
import { FullScreenSpinner, Spinner } from '@/components/ui/spinner';
import { confirm } from '@/lib/confirm';
import { notify } from '@/lib/notify';

jest.mock('sonner', () => ({
  Toaster: (props: Record<string, unknown>) => (
    <div data-testid="toaster" data-position={props.position as string} />
  ),
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

const options = {
  title: 'Cerrar sesion',
  message: '¿Seguro?',
  confirmText: 'Salir',
  cancelText: 'Cancelar',
};

/** confirm() abre el dialogo con un setState: va dentro de act. */
const ask = (next: Partial<typeof options> & { destructive?: boolean } = {}) => {
  let answer!: Promise<boolean>;
  act(() => {
    answer = confirm({ ...options, ...next });
  });
  return answer;
};

describe('Spinner', () => {
  // El equivalente en HTML seria <progress>, que dibuja progreso determinado;
  // aca no hay progreso que informar (ver doctor.config.json).
  it('se anuncia como progressbar y toma el tamano que le pasan', () => {
    render(<Spinner size={36} color="#FFF" />);
    const spinner = screen.getByRole('progressbar');
    expect(spinner).toHaveStyle({ width: '36px', height: '36px' });
  });

  it('el borde crece con el tamano, con un minimo de 2', () => {
    const { container } = render(<Spinner size={10} />);
    expect(container.firstChild).toHaveStyle({ borderWidth: '2px' });
  });

  it('el de pantalla completa centra uno grande', () => {
    render(<FullScreenSpinner color="#7C3AED" />);
    expect(screen.getByRole('progressbar')).toHaveStyle({ width: '36px' });
  });
});

describe('notify', () => {
  it('monta el Toaster arriba al centro', () => {
    render(<NotifyHost />);
    expect(screen.getByTestId('toaster')).toHaveAttribute(
      'data-position',
      'top-center',
    );
  });

  it('cada nivel manda su propio color', () => {
    notify.success('ok');
    notify.error('mal', { description: 'detalle' });
    notify.info('dato');

    expect(toast.success).toHaveBeenCalledWith('ok', expect.objectContaining({
      style: expect.objectContaining({ color: expect.any(String) }),
    }));
    expect(toast.error).toHaveBeenCalledWith(
      'mal',
      expect.objectContaining({ description: 'detalle' }),
    );
    expect(toast).toHaveBeenCalledWith('dato', expect.any(Object));
  });
});

describe('confirm', () => {
  // Sin host montado nadie puede confirmar: el "no" es el lado seguro de
  // cualquiera de estos dialogos (todos borran, canjean o cancelan).
  it('sin host responde que no', async () => {
    await expect(confirm(options)).resolves.toBe(false);
  });

  it('muestra titulo y mensaje del pedido', async () => {
    render(<ConfirmHost />);
    void ask();

    expect(await screen.findByText('Cerrar sesion')).toBeInTheDocument();
    expect(screen.getByText('¿Seguro?')).toBeInTheDocument();
  });

  // El bug que este ref arregla: con Radix cerrando el dialogo por el mismo
  // camino que cancelar, confirmar resolvia false y el canje no pasaba nunca.
  it('confirmar resuelve true', async () => {
    render(<ConfirmHost />);
    const answer = ask();

    await userEvent.click(await screen.findByText('Salir'));
    await expect(answer).resolves.toBe(true);
  });

  it('cancelar resuelve false', async () => {
    render(<ConfirmHost />);
    const answer = ask();

    await userEvent.click(await screen.findByText('Cancelar'));
    await expect(answer).resolves.toBe(false);
  });

  it('Escape cuenta como cancelar', async () => {
    render(<ConfirmHost />);
    const answer = ask();
    await screen.findByText('Salir');

    await userEvent.keyboard('{Escape}');
    await expect(answer).resolves.toBe(false);
  });

  // Sin reiniciar el ref, el segundo dialogo heredaba el "acepto" del primero.
  it('un dialogo no hereda la respuesta del anterior', async () => {
    render(<ConfirmHost />);
    const first = ask();
    await userEvent.click(await screen.findByText('Salir'));
    await expect(first).resolves.toBe(true);

    const second = ask();
    await screen.findByText('Cancelar');
    await userEvent.keyboard('{Escape}');
    await expect(second).resolves.toBe(false);
  });

  it('sin mensaje deja una descripcion accesible igual', async () => {
    render(<ConfirmHost />);
    void ask({ message: undefined });

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAccessibleDescription('Cerrar sesion');
  });

  it('el destructivo pinta el boton en rojo', async () => {
    render(<ConfirmHost />);
    void ask({ destructive: true });

    const button = await screen.findByText('Salir');
    expect(button).toHaveStyle({ background: '#DA3845' });
  });

  it('al desmontar el host, confirm vuelve a responder que no', async () => {
    const { unmount } = render(<ConfirmHost />);
    unmount();
    await waitFor(async () => expect(await confirm(options)).toBe(false));
  });
});
