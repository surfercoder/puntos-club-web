import { setActiveLang } from '@/i18n';
import {
  accent,
  brandPalette,
  brandVars,
  formatDayMonth,
  formatLongDate,
  formatPoints,
  formatShortDate,
  formatTime,
  gradient,
  matches,
  norm,
} from '@/lib/theme';

afterEach(() => setActiveLang('es'));

describe('gradient', () => {
  it('va horizontal por defecto y vertical cuando se pide', () => {
    expect(gradient(['#A', '#B'])).toBe('linear-gradient(to right, #A, #B)');
    expect(gradient(['#A', '#B'], true)).toBe(
      'linear-gradient(to bottom, #A, #B)',
    );
  });
});

describe('formatPoints', () => {
  it('separa los miles con punto en espanol y con coma en ingles', () => {
    expect(formatPoints(3500)).toBe('3.500');
    expect(formatPoints(1234567)).toBe('1.234.567');
    setActiveLang('en');
    expect(formatPoints(3500)).toBe('3,500');
  });

  it('no separa nada abajo de mil', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(999)).toBe('999');
  });

  // La columna puede venir null desde la base aunque el tipo diga number.
  it('cae a 0 cuando no hay valor', () => {
    expect(formatPoints(null as unknown as number)).toBe('0');
  });
});

describe('formatShortDate', () => {
  // Una fecha sin hora no puede retroceder un dia por la zona horaria: es el
  // bug que este parseo propio evita.
  it('respeta el dia de una columna date en UTC-3', () => {
    expect(formatShortDate('2026-08-03')).toBe('03/08/2026');
    setActiveLang('en');
    expect(formatShortDate('2026-08-03')).toBe('08/03/2026');
  });

  it('muestra un timestamp completo en hora local', () => {
    expect(formatShortDate('2026-08-03T15:30:00Z')).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });
});

describe('formatLongDate', () => {
  it('escribe el mes con palabras en los dos idiomas', () => {
    expect(formatLongDate('2026-08-03')).toBe('03 de agosto de 2026');
    setActiveLang('en');
    expect(formatLongDate('2026-08-03')).toBe('August 03, 2026');
  });
});

describe('formatDayMonth', () => {
  it('va sin ano, en los dos idiomas', () => {
    expect(formatDayMonth('2026-05-05')).toBe('5 de mayo');
    setActiveLang('en');
    expect(formatDayMonth('2026-05-05')).toBe('May 5');
  });
});

describe('formatTime', () => {
  it('rellena con cero adelante', () => {
    expect(formatTime('2026-05-05T09:05:00')).toBe('09:05');
  });
});

describe('norm / matches', () => {
  it('ignora mayusculas y acentos', () => {
    expect(norm('Café')).toBe('cafe');
    expect(matches('Cafe con leche', norm('LECHE'))).toBe(true);
  });

  it('busca por substring, no por igualdad', () => {
    expect(matches('Panaderia', 'pan')).toBe(true);
    expect(matches('Panaderia', 'pizza')).toBe(false);
  });
});

describe('brandPalette', () => {
  it('sin color valido no hay marca', () => {
    expect(brandPalette(null)).toBeNull();
    expect(brandPalette('red')).toBeNull();
    expect(brandVars(undefined)).toEqual({});
  });

  it('un color que ya contrasta con blanco queda igual', () => {
    const p = brandPalette('#D7141A')!;
    expect(p.violet).toBe('#D7141A');
    expect(p.magenta).toBe('#D7141A');
    expect(p.violetSoft).toBe('#FBE8E8');
    expect(p.headerGrad).toEqual(['#BD1217', '#D7141A']);
  });

  // Va texto blanco encima: un amarillo o un blanco se oscurecen hasta 4.5:1.
  it('oscurece los colores claros', () => {
    expect(brandPalette('#FFD400')!.violet).toBe('#8A7300');
    expect(brandPalette('#FFFFFF')!.violet).toBe('#767676');
  });

  it('arma las vars de Tailwind y las de accent', () => {
    const vars = brandVars('#D7141A');
    expect(vars['--color-violet-soft']).toBe('#FBE8E8');
    expect(vars['--brand-violet-soft']).toBe('#FBE8E8');
    expect(vars['--brand-points-grad']).toBe(
      'linear-gradient(to right, #BD1217, #D7141A)',
    );
    expect(vars['--color-points-grad']).toBeUndefined();
  });
});

describe('accent', () => {
  it('cae al color de Puntos Club, o al que se le pase', () => {
    expect(accent('violet')).toBe('var(--brand-violet, #6627F5)');
    expect(accent('violet', '#7F3FF7')).toBe('var(--brand-violet, #7F3FF7)');
    expect(accent('pointsGrad')).toBe(
      'var(--brand-points-grad, linear-gradient(to right, #7644EA, #EF458A))',
    );
  });
});
