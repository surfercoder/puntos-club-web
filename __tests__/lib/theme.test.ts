import { setActiveLang } from '@/i18n';
import {
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
