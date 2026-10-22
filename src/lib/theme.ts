import { getActiveLang } from '@/i18n';

// Espejo en JS de los tokens de src/app/globals.css. Existe porque hay lugares
// donde el color no puede ser una clase de Tailwind: el `color` de un icono de
// react-icons, un degrade inline, el atributo de un <svg>.
export const colors = {
  bg: '#F9F1F8', // rosado: con #FBFBFD las tarjetas blancas no se despegaban
  card: '#FFFFFF',

  ink: '#0A053D',
  inkSoft: '#5D5D75',
  muted: '#82849B',
  subtle: '#7C7F8E',
  value: '#474749',

  purple: '#7638E7',
  purpleDeep: '#6536D2',
  purpleInk: '#6F3EBE',
  purpleSoft: '#F5F1FF',
  purpleTint: '#F6F2FE',

  pink: '#CD2B74',
  pinkAccent: '#EC2E7B',
  pinkLine: '#F9CBDE',

  danger: '#DA3845',
  dangerBg: '#FDE7EA',

  line: '#F1F1F5',
  chevron: '#9CA0B5',

  // Degrade morado de los botones y del boton central de la barra.
  brand: ['#7C3AEE', '#6D2FDB'],
  // Mockup de detalle de organizacion / historial (18/08/2026): morado -> rosa.
  headerGrad: ['#7539F9', '#FD66AC'],
  pinkGrad: ['#7C3AF2', '#FC5EA8'],
  // Remuestreado del mockup del 10/09/2026 (la caja de puntos nueva).
  pointsGrad: ['#7644EA', '#EF458A'],
  // Tarjeta "Escanear QR" de Explorar: lavanda -> rosa muy claro.
  qrCardGrad: ['#F3EAFD', '#FBE6F7'],
  // Login: franja superior, mismo degrade que la ilustracion del hero.
  authTop: ['#FCE6F5', '#F4E8FC'],

  violet: '#6627F5',
  violetSoft: '#F1E9FE',
  lilac: '#F3EEFD',
  lilacRow: '#F6F2FB',

  amber: '#F59E0B',

  green: '#0FA347',
  greenSoft: '#E7F6EA',
  greenLine: '#86DFA6',
  magenta: '#F5056B',
  magentaSoft: '#FDE3EC',

  notifGreen: '#EFF8F1',
  notifPink: '#FDF1F5',
  notifLilac: '#F5F2FD',

  slate: '#6A6A96',
  slateSoft: '#807FAA',
  navy: '#1A1A5A',
} as const;

export const PLACEHOLDER = '#868B9A';

// En movil el degrade es un <Svg><Rect> de react-native-svg (components/
// Gradient.tsx); en web es una propiedad de CSS y no hace falta un componente.
// `to right` / `to bottom` reproducen el x1,y1 -> x2,y2 de aquel SVG.
export const gradient = (stops: readonly string[], vertical = false) =>
  `linear-gradient(${vertical ? 'to bottom' : 'to right'}, ${stops.join(', ')})`;

// --- Branding de la org (organization.brand_color) ---
// El owner elige UN color de su logo en el admin; la paleta la armamos
// nosotros desde ese color para que siempre combine. Solo pisa los tokens de
// acento (los morados y rosas); tinta, grises, verde de "ganados" y fondos
// quedan igual. Lo usan las pantallas de la org, no la home: ahi conviven
// varios clubes.
type Rgb = [number, number, number];

const toRgb = (hex: string): Rgb =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;

const toHex = (rgb: Rgb) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;

// t=0 deja el color, t=1 lo lleva entero a `to`.
const mix = (rgb: Rgb, to: Rgb, t: number): Rgb =>
  rgb.map((v, i) => v + (to[i] - v) * t) as Rgb;

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

// Luminancia relativa de WCAG.
const luminance = (rgb: Rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const brandPalette = (seed: string | null | undefined) => {
  if (!seed || !/^#[0-9A-Fa-f]{6}$/.test(seed)) return null;
  // El acento lleva texto blanco encima (barra, botones, caja de puntos):
  // se oscurece hasta 4.5:1. Un amarillo o un celeste claro salen mas
  // profundos que el logo, pero legibles.
  let p = toRgb(seed);
  while (1.05 / (luminance(p) + 0.05) < 4.5) p = mix(p, BLACK, 0.05);

  const main = toHex(p);
  const soft = toHex(mix(p, WHITE, 0.9));
  const softer = toHex(mix(p, WHITE, 0.94));
  const grad = [toHex(mix(p, BLACK, 0.12)), main] as const;

  return {
    violet: main,
    purple: main,
    purpleDeep: main,
    purpleInk: main,
    magenta: main,
    pink: main,
    pinkAccent: main,
    violetSoft: soft,
    purpleSoft: soft,
    magentaSoft: soft,
    lilac: soft,
    purpleTint: softer,
    lilacRow: softer,
    pinkLine: toHex(mix(p, WHITE, 0.7)),
    brand: grad,
    headerGrad: grad,
    pinkGrad: grad,
    pointsGrad: grad,
  };
};

type BrandKey = keyof NonNullable<ReturnType<typeof brandPalette>>;
const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// La paleta como variables CSS, en dos juegos: --color-* con el nombre que
// usa @theme en globals.css (las clases de Tailwind leen esas y heredan
// solas) y --brand-* para `accent`. Las --color-* siempre existen (las define
// Tailwind en :root), asi que no sirven para caer al color de Puntos Club; las
// --brand-* solo existen con marca. Las pone el layout de organization/[id]
// sobre <html>, no sobre un div: el dialogo de confirmar vive en un portal.
export const brandVars = (seed: string | null | undefined) =>
  Object.fromEntries(
    Object.entries(brandPalette(seed) ?? {}).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [
            [`--color-${kebab(key)}`, value],
            [`--brand-${kebab(key)}`, value],
          ]
        : [[`--brand-${kebab(key)}`, gradient(value)]],
    ),
  );

// Para lo que no puede ser una clase (iconos, degrades inline, spinners, hex
// sueltos del mockup): el color de la marca si hay, `fallback` si no.
export const accent = (key: BrandKey, fallback?: string) => {
  const value = colors[key];
  return `var(--brand-${kebab(key)}, ${
    fallback ?? (typeof value === 'string' ? value : gradient(value))
  })`;
};

// El mockup separa "3.500" con punto. En ingles el punto es separador decimal
// ("3.500" se leeria como tres y medio), asi que ese idioma usa coma.
export const formatPoints = (n: number) =>
  String(n ?? 0).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    getActiveLang() === 'en' ? ',' : '.',
  );

const pad2 = (n: number) => String(n).padStart(2, '0');

// Las columnas de fecha llegan como 'YYYY-MM-DD', sin hora: new Date() las lee
// como UTC y en UTC-3 el dia local retrocede uno ("03/08" se veia "02/08"). Se
// arman con los componentes del string. Un timestamp completo si trae zona, asi
// que ese se parsea normal y se muestra en hora local.
const toLocalDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value);
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// dd/mm/aaaa con cero adelante. En ingles el orden es mm/dd/aaaa.
export const formatShortDate = (date: string) => {
  const d = toLocalDate(date);
  const day = pad2(d.getDate());
  const month = pad2(d.getMonth() + 1);
  return getActiveLang() === 'en'
    ? `${month}/${day}/${d.getFullYear()}`
    : `${day}/${month}/${d.getFullYear()}`;
};

// "03 de agosto de 2026" / "August 03, 2026".
export const formatLongDate = (date: string) => {
  const d = toLocalDate(date);
  const en = getActiveLang() === 'en';
  const month = d.toLocaleDateString(en ? 'en-US' : 'es-AR', { month: 'long' });
  return en
    ? `${month} ${pad2(d.getDate())}, ${d.getFullYear()}`
    : `${pad2(d.getDate())} de ${month} de ${d.getFullYear()}`;
};

// "5 de mayo" / "May 5" — sello de las notificaciones viejas. Sin ano a
// proposito: el panel no guarda nada de mas de un ano.
export const formatDayMonth = (date: string) => {
  const d = toLocalDate(date);
  const en = getActiveLang() === 'en';
  const month = d.toLocaleDateString(en ? 'en-US' : 'es-AR', { month: 'long' });
  return en ? `${month} ${d.getDate()}` : `${d.getDate()} de ${month}`;
};

// "09:05" — hora de cada fila del historial.
export const formatTime = (date: string) => {
  const d = toLocalDate(date);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// Normalizacion para buscar: sin mayusculas y sin acentos, asi "cafe"
// encuentra "Café". La comparten el buscador de organizaciones y el de
// productos, que antes filtraban distinto.
export const norm = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Coincidencia por substring, no por igualdad: "leche" tiene que pegarle a
// "Cafe con leche". Por eso no sirve un Set de nombres para buscar.
export const matches = (text: string, query: string) =>
  norm(text).includes(query);
