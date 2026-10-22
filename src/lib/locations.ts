import { norm } from '@/lib/theme';

// Una fila por sucursal activa, de la RPC explore_org_locations.
export type OrgLocation = {
  organization_id: number | string;
  country: string | null;
  state: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
};

// Filtro de Explorar en cascada: pais -> provincia -> departamento. Cada nivel
// guarda la clave normalizada porque la base mezcla "San martin" y "San Martín".
export type PlaceFilter = { country?: string; state?: string; city?: string };
export type PlaceLevel = keyof PlaceFilter;

export const LEVELS: PlaceLevel[] = ['country', 'state', 'city'];

const fits = (loc: OrgLocation, filter: PlaceFilter) =>
  LEVELS.every((level) => {
    const value = loc[level];
    return !filter[level] || (value != null && norm(value.trim()) === filter[level]);
  });

// Opciones de un nivel, acotadas por lo elegido en los niveles de arriba.
export function placeOptions(
  locs: OrgLocation[],
  filter: PlaceFilter,
  level: PlaceLevel
) {
  const above: PlaceFilter = {};
  for (const l of LEVELS.slice(0, LEVELS.indexOf(level))) above[l] = filter[l];

  const options = new Map<string, string>();
  for (const loc of locs) {
    const label = loc[level]?.trim();
    if (label && fits(loc, above) && !options.has(norm(label))) {
      options.set(norm(label), label);
    }
  }
  return [...options]
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Orgs con al menos una sucursal dentro del filtro.
export const orgIdsIn = (locs: OrgLocation[], filter: PlaceFilter) =>
  new Set(locs.filter((loc) => fits(loc, filter)).map((loc) => String(loc.organization_id)));

// Elegir una opcion corta los niveles de abajo; tocar la elegida la suelta.
export function pickPlace(filter: PlaceFilter, level: PlaceLevel, key: string) {
  const next: PlaceFilter = {};
  for (const l of LEVELS.slice(0, LEVELS.indexOf(level))) next[l] = filter[l];
  if (filter[level] !== key) next[level] = key;
  return next;
}

// "Cerca de mí" = la provincia de la sucursal mas cercana. Para comparar
// distancias entre sucursales alcanza la aproximacion equirectangular.
// ponytail: sin sucursal cercana real; el que esta lejos de todas cae en la
// provincia de la menos lejana. Poner tope en km si molesta.
export function nearestPlace(
  locs: OrgLocation[],
  lat: number,
  lng: number
): PlaceFilter | null {
  let best: OrgLocation | null = null;
  let bestDist = Infinity;
  for (const loc of locs) {
    if (loc.latitude == null || loc.longitude == null || !loc.state?.trim()) continue;
    const dx = (loc.longitude - lng) * Math.cos((lat * Math.PI) / 180);
    const dy = loc.latitude - lat;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      best = loc;
      bestDist = dist;
    }
  }
  if (!best) return null;
  return {
    ...(best.country?.trim() ? { country: norm(best.country.trim()) } : {}),
    state: norm(best.state!.trim()),
  };
}
