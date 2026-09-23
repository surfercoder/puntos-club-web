'use client';

import { useSearchParams } from 'next/navigation';
import React, { Suspense } from 'react';

import ScreenHeader from '@/components/ScreenHeader';
import { FullScreenSpinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { PRIVACY_TEXT, TERMS_TEXT } from '@/lib/legal';

// Una sola pantalla para los dos documentos: cambian el titulo y el texto, no
// el layout. Se llega con /legal?doc=terms|privacy desde el alta.
// El CUERPO de los documentos sigue solo en espanol a proposito: una version
// inglesa sin revision legal seria igual de vinculante. Con el idioma en ingles
// se antepone el aviso de legal.spanishOnly.
//
// Las lineas se parten una sola vez, al cargar el modulo: los documentos son
// constantes del bundle, asi que cada linea ya viene con su id estable y la
// lista no necesita el indice como key.
const lines = (text: string) =>
  text.split('\n').map((line, i) => ({ id: `l${i}`, line }));

const DOCS = {
  terms: { title: 'legal.terms', lines: lines(TERMS_TEXT) },
  privacy: { title: 'legal.privacy', lines: lines(PRIVACY_TEXT) },
} as const;

// Una linea del documento: encabezado (## ), item (- ) o parrafo suelto.
function LegalLine({ line }: { line: string }) {
  if (line.startsWith('## ')) {
    return (
      <h2 className="mb-1.5 mt-5 text-[14.5px] font-bold text-ink">
        {line.slice(3)}
      </h2>
    );
  }
  if (line.startsWith('- ')) {
    return (
      <div className="flex pl-1.5">
        <span className="w-4 text-[13px] leading-5 text-ink-soft">•</span>
        <p className="mb-2 flex-1 text-[13px] leading-5 text-ink-soft">
          {line.slice(2)}
        </p>
      </div>
    );
  }
  return <p className="mb-2 text-[13px] leading-5 text-ink-soft">{line}</p>;
}

function LegalScreen() {
  const doc = useSearchParams().get('doc');
  const { t, lang } = useI18n();
  const active = DOCS[doc === 'privacy' ? 'privacy' : 'terms'];

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader width="read" title={t(active.title)} />
      <div className="page-column page-read no-scrollbar flex-1 overflow-y-auto px-5 pb-[calc(28px+env(safe-area-inset-bottom))] pt-5">
        {lang === 'en' ? (
          <p className="mb-3 rounded-xl bg-lilac p-3 text-[12.5px] leading-[18px] text-violet">
            {t('legal.spanishOnly')}
          </p>
        ) : null}
        {active.lines.map(({ id, line }) => (
          <LegalLine key={id} line={line} />
        ))}
      </div>
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={<FullScreenSpinner color="#7C3AED" />}>
      <LegalScreen />
    </Suspense>
  );
}
