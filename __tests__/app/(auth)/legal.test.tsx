import { screen } from '@testing-library/react';

import { es, renderApp } from '../../_helpers/render';

const params = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => params,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

import LegalPage from '@/app/(auth)/legal/page';
import { PRIVACY_TEXT, PRIVACY_VERSION, TERMS_TEXT, TERMS_VERSION } from '@/lib/legal';

const show = (doc?: string) => {
  params.delete('doc');
  if (doc) params.set('doc', doc);
  return renderApp(<LegalPage />);
};

describe('documentos legales', () => {
  it('por defecto muestra los terminos', () => {
    show();
    expect(
      screen.getByRole('heading', { name: es('legal.terms'), level: 1 }),
    ).toBeInTheDocument();
  });

  it('con ?doc=privacy muestra la politica de privacidad', () => {
    show('privacy');
    expect(
      screen.getByRole('heading', { name: es('legal.privacy'), level: 1 }),
    ).toBeInTheDocument();
  });

  it('un doc desconocido cae a los terminos', () => {
    show('cualquiera');
    expect(
      screen.getByRole('heading', { name: es('legal.terms'), level: 1 }),
    ).toBeInTheDocument();
  });

  // El cuerpo se escribe en markdown minimo: "## " es un titulo y "- " un item.
  it('dibuja titulos, items y parrafos', () => {
    const { container } = show();
    expect(container.querySelectorAll('h2').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('p').length).toBeGreaterThan(0);
    expect(screen.getAllByText('•').length).toBeGreaterThan(0);
  });

  it('no deja los marcadores de markdown a la vista', () => {
    const { container } = show();
    expect(container.textContent).not.toContain('## ');
  });

  // Una version inglesa sin revision legal seria igual de vinculante, asi que el
  // cuerpo queda en espanol y se antepone el aviso.
  it('en ingles avisa que el texto esta en espanol', () => {
    renderApp(<LegalPage />, { lang: 'en' });
    expect(screen.getByText(es('legal.spanishOnly'))).toBeInTheDocument();
  });

  it('en espanol no muestra ese aviso', () => {
    show();
    expect(screen.queryByText(es('legal.spanishOnly'))).not.toBeInTheDocument();
  });
});

// Los T&C exigen dejar constancia de QUE version acepto cada beneficiario: al
// cambiar el texto hay que subir la version.
describe('versiones', () => {
  it('estan declaradas y los textos no estan vacios', () => {
    expect(TERMS_VERSION).toMatch(/^\d+\.\d+$/);
    expect(PRIVACY_VERSION).toMatch(/^\d+\.\d+$/);
    expect(TERMS_TEXT.length).toBeGreaterThan(500);
    expect(PRIVACY_TEXT.length).toBeGreaterThan(500);
  });
});
