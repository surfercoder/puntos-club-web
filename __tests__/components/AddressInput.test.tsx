import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const importLibrary = jest.fn();
const setOptions = jest.fn();
jest.mock('@googlemaps/js-api-loader', () => ({
  importLibrary: (...args: unknown[]) => importLibrary(...args),
  setOptions: (...args: unknown[]) => setOptions(...args),
}));

import AddressInput, { type AddressData } from '@/components/AddressInput';

import { es, renderApp } from '../_helpers/render';

type PlaceListener = () => void;

const getPlace = jest.fn();
const removeListener = jest.fn();
const clearInstanceListeners = jest.fn();
/** El handler que el widget dispara al elegir una direccion. Avisar al padre
 *  cambia su estado, asi que va dentro de act. */
let placeChanged: PlaceListener = () => {};
const firePlaceChanged = () => act(() => placeChanged());

const installGoogle = () => {
  (globalThis as unknown as { google: unknown }).google = {
    maps: {
      places: { Autocomplete: jest.fn(() => ({ getPlace })) },
      event: {
        addListener: jest.fn((_a: unknown, _e: string, cb: PlaceListener) => {
          placeChanged = cb;
          return { remove: removeListener };
        }),
        clearInstanceListeners,
      },
    },
  };
};

const place = (components: { types: string[]; long_name: string }[]) => ({
  place_id: 'pid',
  address_components: components,
  geometry: { location: { lat: () => -34.6, lng: () => -58.4 } },
});

const setup = (
  props: Partial<Parameters<typeof AddressInput>[0]> = {},
) => {
  const onChange = jest.fn();
  const view = renderApp(
    <AddressInput value={{}} onChange={onChange} googleApiKey="key" {...props} />,
  );
  return { onChange, ...view };
};

/** El widget se engancha al input recien cuando Places termino de cargar. */
const ready = () =>
  waitFor(() =>
    expect(
      screen.getByPlaceholderText(es('address.searchPlaceholder')),
    ).toBeEnabled(),
  );

beforeEach(() => {
  jest.clearAllMocks();
  importLibrary.mockResolvedValue({});
  installGoogle();
});

describe('sin key de Google', () => {
  // Igual que en la app movil cuando no hay key: se entra directo al manual.
  it('arranca en el formulario manual y no ofrece el buscador', () => {
    setup({ googleApiKey: '' });
    expect(screen.getByLabelText(es('address.street'))).toBeInTheDocument();
    expect(
      screen.queryByText(es('address.searchWithGoogle')),
    ).not.toBeInTheDocument();
    expect(setOptions).not.toHaveBeenCalled();
  });

  it('cada campo avisa el cambio', async () => {
    const { onChange } = setup({ googleApiKey: '' });
    await userEvent.type(screen.getByLabelText(es('address.city')), 'L');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'L' }),
    );
  });

  // Editar a mano invalida lo que devolvio Google: si se conservaran place_id y
  // las coordenadas, la direccion guardada apuntaria al lugar buscado.
  it('escribir a mano borra place_id y las coordenadas', async () => {
    const { onChange } = setup({
      googleApiKey: '',
      value: { street: 'Corrientes', place_id: 'pid', latitude: 1, longitude: 2 },
    });
    await userEvent.type(screen.getByLabelText(es('address.number')), '1');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        place_id: undefined,
        latitude: undefined,
        longitude: undefined,
      }),
    );
  });
});

describe('con key de Google', () => {
  it('carga Places con la key y el idioma, y habilita el buscador', async () => {
    setup();
    await waitFor(() =>
      expect(
        screen.getByPlaceholderText(es('address.searchPlaceholder')),
      ).toBeEnabled(),
    );
    expect(setOptions).toHaveBeenCalledWith({ key: 'key', language: 'es' });
    expect(importLibrary).toHaveBeenCalledWith('places');
  });

  it('mientras carga, el buscador esta deshabilitado', async () => {
    setup();
    expect(
      screen.getByPlaceholderText(es('address.searchPlaceholder')),
    ).toBeDisabled();
    await ready();
  });

  it('elegir una direccion la desarma en campos', async () => {
    const { onChange } = setup();
    await ready();

    getPlace.mockReturnValue(
      place([
        { types: ['street_number'], long_name: '1234' },
        { types: ['route'], long_name: 'Av. Corrientes' },
        { types: ['locality'], long_name: 'CABA' },
        { types: ['administrative_area_level_1'], long_name: 'Buenos Aires' },
        { types: ['country'], long_name: 'Argentina' },
        { types: ['postal_code'], long_name: 'C1043' },
      ]),
    );
    firePlaceChanged();

    expect(onChange).toHaveBeenCalledWith({
      street: 'Av. Corrientes',
      number: '1234',
      city: 'CABA',
      state: 'Buenos Aires',
      country: 'Argentina',
      zip_code: 'C1043',
      place_id: 'pid',
      latitude: -34.6,
      longitude: -58.4,
    });
  });

  // Caso Argentina: muchas localidades vienen sin `locality`.
  it('usa administrative_area_level_2 como respaldo de la ciudad', async () => {
    const { onChange } = setup();
    await ready();

    getPlace.mockReturnValue(
      place([
        { types: ['administrative_area_level_2'], long_name: 'La Matanza' },
        { types: ['sublocality'], long_name: 'ignorado' },
      ]),
    );
    firePlaceChanged();

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'La Matanza' }),
    );
  });

  it('con locality, el nivel 2 no la pisa', async () => {
    const { onChange } = setup();
    await ready();
    getPlace.mockReturnValue(
      place([
        { types: ['locality'], long_name: 'CABA' },
        { types: ['administrative_area_level_2'], long_name: 'La Matanza' },
      ]),
    );
    firePlaceChanged();

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ city: 'CABA' }),
    );
  });

  it('una eleccion sin componentes no avisa nada', async () => {
    const { onChange } = setup();
    await ready();
    getPlace.mockReturnValue({ place_id: 'pid' });
    firePlaceChanged();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('un lugar sin geometria no rompe', async () => {
    const { onChange } = setup();
    await ready();
    getPlace.mockReturnValue({
      place_id: 'pid',
      address_components: [{ types: ['route'], long_name: 'Corrientes' }],
    });
    firePlaceChanged();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: undefined, longitude: undefined }),
    );
  });

  // Enter dentro del autocompletado no puede enviar el formulario del alta.
  it('Enter en el buscador no envia el formulario', async () => {
    const onSubmit = jest.fn((e: React.FormEvent) => e.preventDefault());
    renderApp(
      <form onSubmit={onSubmit}>
        <AddressInput value={{}} onChange={jest.fn()} googleApiKey="key" />
      </form>,
    );
    await ready();
    const input = screen.getByPlaceholderText(es('address.searchPlaceholder'));

    await userEvent.type(input, 'Corrientes{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('se puede ir y volver entre el buscador y el manual', async () => {
    setup();
    await userEvent.click(screen.getByText(es('address.enterManually')));
    expect(screen.getByLabelText(es('address.street'))).toBeInTheDocument();

    await userEvent.click(screen.getByText(es('address.searchWithGoogle')));
    expect(
      screen.getByPlaceholderText(es('address.searchPlaceholder')),
    ).toBeInTheDocument();
  });

  // Con datos cargados el manual se muestra siempre: es lo que el usuario
  // acaba de ver escrito.
  it('con una direccion ya cargada arranca en el manual', () => {
    setup({ value: { street: 'Corrientes' } });
    expect(screen.getByLabelText(es('address.street'))).toHaveValue('Corrientes');
  });

  // Key mal, adblocker o sin red: el buscador quedaria como un campo muerto.
  it('si Google no carga cae al formulario manual', async () => {
    importLibrary.mockRejectedValue(new Error('bloqueado'));
    setup();
    expect(
      await screen.findByLabelText(es('address.street')),
    ).toBeInTheDocument();
  });

  it('al desmontar suelta los listeners del widget', async () => {
    const { unmount } = setup();
    await ready();

    unmount();
    expect(removeListener).toHaveBeenCalled();
    expect(clearInstanceListeners).toHaveBeenCalled();
  });

  it('elegir una direccion pasa al manual con los campos llenos', async () => {
    const value: Partial<AddressData> = {};
    const onChange = jest.fn();
    renderApp(
      <AddressInput value={value} onChange={onChange} googleApiKey="key" />,
    );
    await ready();

    getPlace.mockReturnValue(
      place([{ types: ['route'], long_name: 'Corrientes' }]),
    );
    firePlaceChanged();

    expect(await screen.findByLabelText(es('address.street'))).toBeInTheDocument();
  });
});
