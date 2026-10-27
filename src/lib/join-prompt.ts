import type { Translate } from '@/i18n';

// Textos del confirm antes de unirse a un club. Si el club es para mayores de
// 18 (organization.adults_only) la pregunta pasa a ser la edad, al estilo de
// las webs de bebidas: "No" cierra sin unir. Es una declaracion, no una
// verificacion: no guardamos fecha de nacimiento.
export function joinPrompt(t: Translate, name: string, adultsOnly?: boolean | null) {
  return adultsOnly
    ? {
        title: t('join.adultsTitle'),
        body: t('join.adultsBody', { name }),
        cancel: t('join.adultsNo'),
        action: t('join.adultsYes'),
      }
    : {
        title: t('join.confirmTitle', { name }),
        body: t('join.confirmBody', { name }),
        cancel: t('common.cancel'),
        action: t('join.action'),
      };
}
