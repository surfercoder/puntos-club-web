import { parseOrgQr } from '@/lib/org-qr';

describe('parseOrgQr', () => {
  it.each([
    ['https://www.puntosclub.com.ar/unirse/42', '42'],
    ['https://www.puntosclub.com.ar/unirse/42/', '42'],
    ['https://www.puntosclub.com.ar/unirse/42?utm=qr', '42'],
    ['puntosclub://unirse/7', '7'],
    ['/unirse/7', '7'],
    [JSON.stringify({ type: 'organization', id: 5, name: 'Churrico' }), '5'],
  ])('%s -> %s', (data, id) => expect(parseOrgQr(data)).toBe(id));

  it.each([
    'not-json',
    JSON.stringify({ type: 'other', id: 1 }),
    JSON.stringify({ type: 'organization' }),
    'https://www.puntosclub.com.ar/unirse/abc',
    'https://www.puntosclub.com.ar/planes',
    'null',
  ])('%s -> null', (data) => expect(parseOrgQr(data)).toBeNull());
});
