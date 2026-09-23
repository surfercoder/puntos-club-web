import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { I18nProvider, useI18n, useT } from '@/contexts/I18nContext';
import { en, es, getActiveLang, type Lang } from '@/i18n';
import { LANG_COOKIE } from '@/i18n/cookie';

function Probe() {
  const { lang, setLang } = useI18n();
  const t = useT();
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="text">{t('common.cancel')}</span>
      <button type="button" onClick={() => setLang('en')}>
        en
      </button>
      <button type="button" onClick={() => setLang('pt' as Lang)}>
        pt
      </button>
    </div>
  );
}

describe('I18nProvider', () => {
  // `initialLang` sale de la cookie que siembra el proxy: asi el primer HTML ya
  // viene traducido y no hay parpadeo ni mismatch de hidratacion.
  it('arranca en el idioma que le pasa el servidor', () => {
    render(
      <I18nProvider initialLang="en">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(screen.getByTestId('text')).toHaveTextContent(en['common.cancel']);
    expect(getActiveLang()).toBe('en');
  });

  it('cambiar de idioma traduce, publica el activo y deja la cookie', async () => {
    render(
      <I18nProvider initialLang="es">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('text')).toHaveTextContent(es['common.cancel']);

    await userEvent.click(screen.getByRole('button', { name: 'en' }));

    expect(screen.getByTestId('lang')).toHaveTextContent('en');
    expect(getActiveLang()).toBe('en');
    expect(document.cookie).toContain(`${LANG_COOKIE}=en`);
  });

  it('ignora un idioma que no existe', async () => {
    render(
      <I18nProvider initialLang="es">
        <Probe />
      </I18nProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'pt' }));
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
  });
});

// Un contexto de auth ausente es un bug que conviene que explote; uno de i18n
// ausente solo puede dejar la pantalla en blanco, y un texto en espanol es
// mejor que eso.
describe('sin provider', () => {
  it('traduce igual, en espanol, y setLang no rompe', async () => {
    render(<Probe />);
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
    expect(screen.getByTestId('text')).toHaveTextContent(es['common.cancel']);

    await userEvent.click(screen.getByRole('button', { name: 'en' }));
    expect(screen.getByTestId('lang')).toHaveTextContent('es');
  });
});
