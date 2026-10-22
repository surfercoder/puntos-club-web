import {
  nearestPlace,
  orgIdsIn,
  pickPlace,
  placeOptions,
  type OrgLocation,
} from '@/lib/locations';

const loc = (overrides: Partial<OrgLocation>): OrgLocation => ({
  organization_id: 1,
  country: 'Argentina',
  state: 'Mendoza',
  city: 'Capital',
  latitude: null,
  longitude: null,
  ...overrides,
});

const LOCS: OrgLocation[] = [
  loc({ organization_id: 1, city: 'San Martín', latitude: -33.08, longitude: -68.47 }),
  loc({ organization_id: 2, city: 'San martin ' }),
  loc({ organization_id: 3, state: 'Córdoba', city: 'Río Cuarto', latitude: -33.12, longitude: -64.35 }),
  loc({ organization_id: 4, country: 'Chile', state: 'Región Metropolitana', city: 'Las Condes' }),
  loc({ organization_id: 5, country: null, state: null, city: null }),
];

describe('locations', () => {
  it('lista opciones sin duplicar variantes de mayusculas/acentos, acotadas por el nivel de arriba', () => {
    expect(placeOptions(LOCS, {}, 'country')).toEqual([
      { key: 'argentina', label: 'Argentina' },
      { key: 'chile', label: 'Chile' },
    ]);
    expect(placeOptions(LOCS, { country: 'argentina' }, 'state').map((o) => o.label)).toEqual([
      'Córdoba',
      'Mendoza',
    ]);
    // "San martin " y "San Martín" son la misma opcion; gana la primera.
    expect(placeOptions(LOCS, { country: 'argentina', state: 'mendoza' }, 'city')).toEqual([
      { key: 'san martin', label: 'San Martín' },
    ]);
  });

  it('filtra orgs por cualquier nivel; null nunca matchea', () => {
    expect([...orgIdsIn(LOCS, { state: 'mendoza', city: 'san martin' })]).toEqual(['1', '2']);
    expect([...orgIdsIn(LOCS, { country: 'chile' })]).toEqual(['4']);
    expect(orgIdsIn(LOCS, { city: 'nada' }).size).toBe(0);
  });

  it('elegir corta los niveles de abajo y tocar lo elegido lo suelta', () => {
    const full = { country: 'argentina', state: 'mendoza', city: 'capital' };
    expect(pickPlace(full, 'state', 'cordoba')).toEqual({ country: 'argentina', state: 'cordoba' });
    expect(pickPlace(full, 'state', 'mendoza')).toEqual({ country: 'argentina' });
    expect(pickPlace({}, 'country', 'chile')).toEqual({ country: 'chile' });
  });

  it('cerca de mi = provincia de la sucursal mas cercana con coordenadas', () => {
    // Desde la ciudad de Mendoza gana San Martin (Mendoza), no Rio Cuarto.
    expect(nearestPlace(LOCS, -32.89, -68.83)).toEqual({ country: 'argentina', state: 'mendoza' });
    // Desde Cordoba capital gana Rio Cuarto.
    expect(nearestPlace(LOCS, -31.42, -64.18)).toEqual({ country: 'argentina', state: 'cordoba' });
    // Sin pais cargado solo devuelve la provincia; sin provincia se ignora.
    expect(
      nearestPlace(
        [
          loc({ country: null, state: 'Mendoza', latitude: -33, longitude: -68 }),
          loc({ state: ' ', latitude: -32.89, longitude: -68.83 }),
        ],
        -32.89,
        -68.83
      )
    ).toEqual({ state: 'mendoza' });
    expect(nearestPlace([loc({})], 0, 0)).toBeNull();
  });
});
