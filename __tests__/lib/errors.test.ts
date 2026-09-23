import { translate } from '@/i18n';
import { errorDescriptor, errorMessage } from '@/lib/errors';

const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
  translate('es', key, params);

describe('errorDescriptor', () => {
  it('mapea codigos de GoTrue', () => {
    expect(errorDescriptor({ code: 'invalid_credentials' })).toEqual({
      key: 'error.auth.invalidCredentials',
    });
    expect(errorDescriptor({ code: 'email_not_confirmed' })).toEqual({
      key: 'error.auth.emailNotConfirmed',
    });
  });

  it('mapea SQLSTATE de PostgREST', () => {
    expect(errorDescriptor({ code: '23505' })).toEqual({ key: 'error.db.duplicate' });
    expect(errorDescriptor({ code: 'PGRST116' })).toEqual({ key: 'error.db.notFound' });
  });

  // El rate limit va antes que todo lo demas: es el unico caso donde el texto
  // aporta un dato que el usuario necesita.
  it('saca los segundos del rate limit', () => {
    expect(
      errorDescriptor({
        code: 'over_email_send_rate_limit',
        message: 'For security purposes, you can only request this after 47 seconds',
      }),
    ).toEqual({ key: 'error.auth.rateLimitSeconds', params: { seconds: 47 } });
  });

  it('cae al rate limit generico si el texto no trae los segundos', () => {
    expect(errorDescriptor({ status: 429, message: 'Too many requests' })).toEqual({
      key: 'error.auth.rateLimit',
    });
  });

  it('reconoce las excepciones de las funciones del backend', () => {
    expect(
      errorDescriptor({ message: 'ERROR: INSUFFICIENT_POINTS (SQLSTATE P0001)' }),
    ).toEqual({ key: 'error.rpc.insufficientPoints' });
    expect(errorDescriptor({ message: 'OUT_OF_STOCK' })).toEqual({
      key: 'error.rpc.outOfStock',
    });
  });

  it('reconoce la caida de red por el texto', () => {
    expect(errorDescriptor(new TypeError('Failed to fetch'))).toEqual({
      key: 'error.network',
    });
  });

  // Un bug nuestro tambien es un TypeError: no puede mandar al usuario a
  // revisar el WiFi.
  it('no confunde un TypeError propio con falta de red', () => {
    expect(
      errorDescriptor(new TypeError("Cannot read properties of null")),
    ).toEqual({ key: 'error.unexpected' });
  });

  it('deja pasar una clave de i18n puesta por AuthContext', () => {
    expect(errorDescriptor(new Error('error.auth.notBeneficiary'))).toEqual({
      key: 'error.auth.notBeneficiary',
    });
  });

  it('recupera los parametros que viajan colgados del Error', () => {
    const error = Object.assign(new Error('error.auth.rateLimitSeconds'), {
      i18nParams: { seconds: 12 },
    });
    expect(errorDescriptor(error)).toEqual({
      key: 'error.auth.rateLimitSeconds',
      params: { seconds: 12 },
    });
  });

  it('ignora i18nParams cuando no es un objeto', () => {
    const error = Object.assign(new Error('error.network'), { i18nParams: 'x' });
    expect(errorDescriptor(error)).toEqual({ key: 'error.network' });
  });

  it('cae en el generico con null, undefined y formas raras', () => {
    expect(errorDescriptor(null)).toEqual({ key: 'error.unexpected' });
    expect(errorDescriptor(undefined)).toEqual({ key: 'error.unexpected' });
    expect(errorDescriptor({ code: 42, message: 99 })).toEqual({
      key: 'error.unexpected',
    });
  });
});

describe('errorMessage', () => {
  it('traduce e interpola', () => {
    expect(
      errorMessage(t, {
        status: 429,
        message: 'you can only request this after 60 seconds',
      }),
    ).toContain('60');
  });

  it('nunca devuelve el texto crudo de Supabase', () => {
    expect(errorMessage(t, { code: 'invalid_credentials', message: 'Invalid login credentials' })).not.toContain(
      'Invalid login',
    );
  });
});
