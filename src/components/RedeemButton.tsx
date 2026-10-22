'use client';

import React, { useState } from 'react';
import { IoGiftOutline } from 'react-icons/io5';

import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/contexts/I18nContext';
import type { Translate } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase/client';
import { accent, formatPoints } from '@/lib/theme';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';

// Texto e icono del boton cuando no alcanzan los puntos: un tinte de la marca.
const MUTED = accent('pinkLine', '#B7A6DC');

// Hace el canje y avisa el resultado. Vive fuera del componente porque no toca
// estado de React (el spinner lo maneja quien llama) y sacarlo deja el boton
// con una sola rama de control. Nunca relanza: el caller puede apagar el
// spinner con un solo setState, sin try/finally.
async function submitRedemption(
  t: Translate,
  product: Product,
  beneficiaryId: string,
  organizationId: string,
  onRedeemed: () => void,
) {
  try {
    const { error } = await supabase.rpc('request_redemption', {
      p_beneficiary_id: parseInt(beneficiaryId),
      p_product_id: product.id,
      p_organization_id: parseInt(organizationId),
    });
    if (error) {
      notify.error(t('redeem.failedTitle'), { description: errorMessage(t, error) });
      return;
    }
    onRedeemed();
    notify.success(t('redeem.doneTitle'), { description: t('redeem.doneBody') });
  } catch (e) {
    notify.error(t('common.error'), { description: errorMessage(t, e) });
  }
}

// Contenido del boton: spinner, o icono + texto. Separado del contenedor para
// que cada uno tenga un control de flujo que se lee de un vistazo.
function RedeemButtonFace({
  redeeming,
  canAfford,
  compact,
}: {
  redeeming: boolean;
  canAfford: boolean;
  compact: boolean;
}) {
  const t = useT();

  if (redeeming) return <Spinner size={18} color="#FFFFFF" />;

  return (
    <>
      {compact ? null : (
        <IoGiftOutline size={16} color={canAfford ? '#FFFFFF' : MUTED} />
      )}
      <span
        className={cn(
          'font-bold',
          compact ? 'ml-0 text-[13.5px]' : 'ml-2 text-[14px]',
          canAfford && 'text-white',
        )}
        style={canAfford ? undefined : { color: MUTED }}
      >
        {t(
          canAfford
            ? 'redeem.action'
            : compact
              ? 'redeem.noPointsShort'
              : 'redeem.noPoints',
        )}
      </span>
    </>
  );
}

// Boton "Canjear": lo usan el carrusel del detalle de organizacion y la lista
// completa de productos. El estado "en curso" y la confirmacion viven aca.
export default function RedeemButton({
  product,
  beneficiaryId,
  organizationId,
  canAfford,
  totalStock,
  onRedeemed,
  compact = false,
}: {
  product: Product;
  beneficiaryId: string | undefined;
  organizationId: string;
  canAfford: boolean;
  totalStock: number;
  onRedeemed: () => void;
  // El carrusel no tiene ancho para "Puntos insuficientes" ni para el icono.
  compact?: boolean;
}) {
  const t = useT();
  const [redeeming, setRedeeming] = useState(false);
  const canRedeem = canAfford && totalStock > 0 && !redeeming && !!beneficiaryId;

  const handleRedeem = async () => {
    // Inalcanzable: sin beneficiario el boton esta deshabilitado (canRedeem).
    // Existe para que TypeScript estreche el tipo a string mas abajo.
    /* v8 ignore next */
    if (!beneficiaryId) return;
    const ok = await confirm({
      title: t('redeem.confirmTitle'),
      message: t('redeem.confirmBody', {
        product: product.name,
        points: formatPoints(product.required_points),
      }),
      confirmText: t('redeem.action'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;

    setRedeeming(true);
    await submitRedemption(
      t,
      product,
      beneficiaryId,
      organizationId,
      onRedeemed,
    );
    setRedeeming(false);
  };

  return (
    <button
      type="button"
      onClick={handleRedeem}
      disabled={!canRedeem}
      className={cn(
        'flex w-full items-center justify-center overflow-hidden rounded-xl',
        // El mockup dibuja 22dp de alto; se sube por el minimo tactil.
        compact ? 'mt-[10px] h-[34px] rounded-[11px]' : 'mt-3 h-9',
        canRedeem && 'pressable',
      )}
      style={
        canAfford
          ? { backgroundImage: accent('pinkGrad') }
          : { backgroundColor: accent('violetSoft', '#EBE0FC') }
      }
    >
      <RedeemButtonFace
        redeeming={redeeming}
        canAfford={canAfford}
        compact={compact}
      />
    </button>
  );
}
