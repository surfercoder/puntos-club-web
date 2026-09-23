import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import FormField from '@/components/FormField';
import GradientSubmitButton from '@/components/GradientSubmitButton';
import ScreenHeader from '@/components/ScreenHeader';
import TabBar from '@/components/TabBar';
import { colors } from '@/lib/theme';

import { es, renderApp } from '../_helpers/render';

const router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));

beforeEach(() => jest.clearAllMocks());

describe('ScreenHeader', () => {
  it('muestra el titulo y la bajada', () => {
    renderApp(<ScreenHeader title="Historial" subtitle="Todo tu movimiento" />);
    expect(screen.getByRole('heading', { name: 'Historial' })).toBeInTheDocument();
    expect(screen.getByText('Todo tu movimiento')).toBeInTheDocument();
  });

  it('sin bajada no dibuja el parrafo', () => {
    const { container } = renderApp(<ScreenHeader title="Historial" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('volver usa el historial del navegador por defecto', async () => {
    renderApp(<ScreenHeader title="x" />);
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(router.back).toHaveBeenCalled();
  });

  it('con onBack manda al destino explicito', async () => {
    const onBack = jest.fn();
    renderApp(<ScreenHeader title="x" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: es('common.back') }));
    expect(onBack).toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  // El ancho tiene que coincidir con el de la pantalla o el titulo queda
  // desalineado con lo de abajo.
  it.each([
    ['wide', ['page-column']],
    ['form', ['page-column', 'page-form']],
    ['read', ['page-column', 'page-read']],
  ] as const)('el ancho %s aplica sus clases', (width, classes) => {
    const { container } = renderApp(<ScreenHeader title="x" width={width} />);
    const column = container.querySelector('.page-column');
    for (const cls of classes) expect(column).toHaveClass(cls);
  });

  it('acepta un control a la derecha', () => {
    renderApp(<ScreenHeader title="x" right={<button type="button">Tacho</button>} />);
    expect(screen.getByRole('button', { name: 'Tacho' })).toBeInTheDocument();
  });
});

describe('TabBar', () => {
  it('lleva a cada destino y el central al escaner', async () => {
    renderApp(<TabBar active="home" />);

    await userEvent.click(screen.getByText(es('tabs.explore')));
    expect(router.replace).toHaveBeenCalledWith('/explore');

    await userEvent.click(screen.getByText(es('tabs.history')));
    expect(router.replace).toHaveBeenCalledWith('/history');

    await userEvent.click(screen.getByText(es('tabs.scan')));
    expect(router.push).toHaveBeenCalledWith('/scan-organization');
  });

  it('el destino activo no vuelve a navegar', async () => {
    renderApp(<TabBar active="home" />);
    await userEvent.click(screen.getByText(es('tabs.home')));
    expect(router.replace).not.toHaveBeenCalled();
  });

  // "Mas" queda dibujado pero sin pantalla propia todavia.
  it('"Mas" no navega a ningun lado', async () => {
    renderApp(<TabBar active="home" />);
    await userEvent.click(screen.getByText(es('tabs.more')));
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  // 'none' es para pantallas que muestran la barra sin ser un destino (perfil).
  it('con active="none" ninguna pastilla queda encendida', () => {
    const { container } = renderApp(<TabBar active="none" />);
    expect(container.querySelectorAll('.bg-purple-soft')).toHaveLength(0);
  });

  it('con un destino activo se enciende una sola pastilla', () => {
    const { container } = renderApp(<TabBar active="history" />);
    expect(container.querySelectorAll('.bg-purple-soft')).toHaveLength(1);
  });
});

describe('FormField', () => {
  it('ata el label al control por htmlFor', () => {
    renderApp(
      <FormField icon={<span />} label="Telefono" htmlFor="phone">
        <input id="phone" />
      </FormField>,
    );
    expect(screen.getByLabelText('Telefono')).toBe(screen.getByRole('textbox'));
  });

  // Sin label la fila deja el cuerpo entero al children: lo usa el alta, donde
  // Nombre y Apellido comparten una pastilla y traen su propio label.
  it('sin label no dibuja ninguno', () => {
    const { container } = renderApp(
      <FormField icon={<span />}>
        <input />
      </FormField>,
    );
    expect(container.querySelector('label')).toBeNull();
  });

  it('la ultima fila no lleva margen abajo', () => {
    const { container } = renderApp(
      <FormField icon={<span />} last>
        <input />
      </FormField>,
    );
    expect(container.firstChild).toHaveClass('mb-0');
  });
});

describe('GradientSubmitButton', () => {
  it('mientras carga muestra el spinner y esconde la etiqueta', () => {
    renderApp(
      <GradientSubmitButton
        label="Entrar"
        loading
        disabled
        gradientColors={colors.pinkGrad}
      />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Entrar')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('en reposo es un submit con su etiqueta', () => {
    renderApp(
      <GradientSubmitButton
        label="Entrar"
        loading={false}
        gradientColors={colors.pinkGrad}
      />,
    );
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });

  it('puede ser un boton comun con su onClick', async () => {
    const onClick = jest.fn();
    renderApp(
      <GradientSubmitButton
        label="Seguir"
        loading={false}
        type="button"
        onClick={onClick}
        gradientColors={colors.brand}
      />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
