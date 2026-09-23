import {
  DEFAULT_LANG,
  LANGS,
  deviceLang,
  en,
  es,
  getActiveLang,
  isLang,
  isMessageKey,
  setActiveLang,
  translate,
  type MessageKey,
} from '@/i18n';

afterEach(() => setActiveLang(DEFAULT_LANG));

// `es` es la fuente de verdad de las claves. El test de paridad es lo que evita
// que un mensaje nuevo quede en un solo idioma.
describe('paridad de diccionarios', () => {
  it('en tiene exactamente las mismas claves que es', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('ninguna traduccion queda vacia', () => {
    for (const [key, value] of Object.entries(es)) {
      expect(value.trim()).not.toBe('');
      expect(en[key as MessageKey].trim()).not.toBe('');
    }
  });

  // Un {placeholder} que no exista en el otro idioma se muestra crudo.
  it('los placeholders coinciden entre idiomas', () => {
    const holders = (text: string) =>
      [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(es) as MessageKey[]) {
      expect(holders(en[key])).toEqual(holders(es[key]));
    }
  });
});

describe('translate', () => {
  it('traduce en los dos idiomas', () => {
    expect(translate('es', 'common.cancel')).toBe(es['common.cancel']);
    expect(translate('en', 'common.cancel')).toBe(en['common.cancel']);
  });

  it('interpola los parametros', () => {
    expect(translate('es', 'notif.unread', { count: 3 })).toContain('3');
  });

  // Mejor el placeholder crudo que un "undefined" en medio de la frase.
  it('deja el placeholder cuando falta el parametro', () => {
    expect(translate('es', 'notif.unread', { otro: 1 })).toContain('{count}');
  });

  it('cae a espanol si al idioma le falta la clave', () => {
    const key = 'x.inexistente' as MessageKey;
    expect(translate('en', key)).toBe(key);
  });
});

describe('guardias', () => {
  it('isLang solo acepta los idiomas de LANGS', () => {
    expect(LANGS).toEqual(['es', 'en']);
    expect(isLang('es')).toBe(true);
    expect(isLang('pt')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });

  it('isMessageKey se fija en el diccionario, no en la forma del string', () => {
    expect(isMessageKey('common.cancel')).toBe(true);
    expect(isMessageKey('Invalid login credentials.')).toBe(false);
    expect(isMessageKey(42)).toBe(false);
  });
});

describe('idioma activo', () => {
  it('lo publica el provider para los formateadores', () => {
    setActiveLang('en');
    expect(getActiveLang()).toBe('en');
  });
});

describe('deviceLang', () => {
  it('devuelve en con un locale ingles y es con cualquier otro', () => {
    const spy = jest.spyOn(Intl, 'DateTimeFormat');
    spy.mockReturnValue({
      resolvedOptions: () => ({ locale: 'en-US' }),
    } as unknown as Intl.DateTimeFormat);
    expect(deviceLang()).toBe('en');

    spy.mockReturnValue({
      resolvedOptions: () => ({ locale: 'pt-BR' }),
    } as unknown as Intl.DateTimeFormat);
    expect(deviceLang()).toBe('es');
  });

  it('cae al default cuando no hay locale', () => {
    jest.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
      resolvedOptions: () => ({ locale: undefined }),
    } as unknown as Intl.DateTimeFormat);
    expect(deviceLang()).toBe('es');
  });

  it('cae al default si Intl tira', () => {
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('sin Intl');
    });
    expect(deviceLang()).toBe('es');
  });
});
