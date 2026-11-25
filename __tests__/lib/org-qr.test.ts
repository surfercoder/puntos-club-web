import { homeAfterSignIn, linkOrgId, parseOrgQr, withOrgId } from '@/lib/org-qr';

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

describe('orgId de un link /unirse pendiente', () => {
  it('solo acepta ids numericos', () => {
    expect(linkOrgId('?orgId=9')).toBe('9');
    expect(linkOrgId('?orgId=9x')).toBeNull();
    expect(linkOrgId('')).toBeNull();
  });

  it('sin search explicito lee la URL actual', () => {
    window.history.pushState({}, '', '/sign-in?orgId=4');
    expect(withOrgId('/sign-up')).toBe('/sign-up?orgId=4');
    window.history.pushState({}, '', '/');
  });

  it('lo agrega a la ruta solo si hay uno', () => {
    expect(withOrgId('/sign-in', '?orgId=9')).toBe('/sign-in?orgId=9');
    expect(withOrgId('/sign-in', '')).toBe('/sign-in');
  });

  it('despues del login retoma el alta o va a la home', () => {
    expect(homeAfterSignIn('?orgId=9')).toBe('/scan-organization?orgId=9');
    expect(homeAfterSignIn('')).toBe('/');
  });
});
