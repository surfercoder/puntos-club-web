'use client';

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { useQrCamera } from '@/components/QrCameraView';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

// Esquina del marco de escaneo: cuatro de estas, rotadas por posicion.
const CORNER = 'absolute h-[30px] w-[30px] border-[4px] border-[#7C3AED]';

export default function ScanOrganizationPage() {
  const router = useRouter();
  const { joinOrganization, refreshOrganizations } = useAuth();
  const t = useT();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setLoading(false);
    setScanned(false);
  };

  const handleScan = async (data: string) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    let qrData: { type?: string; id?: string | number; name?: string };
    try {
      qrData = JSON.parse(data);
    } catch {
      reset();
      notify.error(t('common.error'), { description: t('scan.unreadableQr') });
      return;
    }

    if (qrData.type !== 'organization' || !qrData.id) {
      reset();
      notify.error(t('common.error'), { description: t('scan.invalidQr') });
      return;
    }

    const organizationId = qrData.id.toString();
    const organizationName = qrData.name || t('scan.thisOrganization');

    const ok = await confirm({
      title: t('join.confirmTitle', { name: organizationName }),
      message: t('join.confirmBody', { name: organizationName }),
      confirmText: t('join.action'),
      cancelText: t('common.cancel'),
    });
    if (!ok) {
      reset();
      return;
    }

    const { error } = await joinOrganization(organizationId);

    if (error) {
      reset();
      notify.error(t('common.error'), { description: errorMessage(t, error) });
      return;
    }

    await refreshOrganizations();
    notify.success(t('join.successTitle'), {
      description: t('join.successBody', { name: organizationName }),
    });
    // En movil el alert ofrece "Ver organizacion" o "Volver"; en web el toast
    // no tiene botones, asi que se va directo al detalle, que es lo que el
    // usuario acaba de pedir al escanear el QR del local.
    router.replace(`/organization/${organizationId}`);
  };

  const { videoRef, permission, request } = useQrCamera({
    onScan: handleScan,
    paused: scanned,
  });

  if (permission === 'denied') {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-[#F9FAFB] p-5 text-center">
        <h1 className="mb-3 text-[24px] font-bold text-[#111827]">
          {t('scan.permissionTitle')}
        </h1>
        <p className="mb-6 text-[16px] text-[#6B7280]">
          {t('scan.permissionBody')}
        </p>
        <button
          type="button"
          className="pressable mb-3 rounded-lg bg-[#7C3AED] px-8 py-[14px] text-[16px] font-semibold text-white"
          onClick={request}
        >
          {t('scan.permissionAction')}
        </button>
        <button
          type="button"
          className="pressable px-8 py-[14px] text-[16px] text-[#6B7280]"
          onClick={() => router.back()}
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh flex-1 bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        muted
      />

      {permission === 'pending' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size={36} color="#7C3AED" />
        </div>
      ) : null}

      <div className="absolute inset-0 flex flex-col">
        <div className="flex justify-end px-5 pt-[calc(60px+env(safe-area-inset-top))]">
          <button
            type="button"
            className="pressable rounded-[20px] bg-black/50 px-4 py-2 text-[16px] font-semibold text-white"
            onClick={() => router.back()}
          >
            {t('common.close')}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative h-[250px] w-[250px]">
            <span className={cn(CORNER, 'left-0 top-0 rounded-tl-xl border-b-0 border-r-0')} />
            <span className={cn(CORNER, 'right-0 top-0 rounded-tr-xl border-b-0 border-l-0')} />
            <span className={cn(CORNER, 'bottom-0 left-0 rounded-bl-xl border-r-0 border-t-0')} />
            <span className={cn(CORNER, 'bottom-0 right-0 rounded-br-xl border-l-0 border-t-0')} />
          </div>
        </div>

        <div className="flex flex-col items-center pb-[100px]">
          <p className="rounded-[20px] bg-black/50 px-5 py-2.5 text-center text-[16px] font-semibold text-white">
            {t('scan.instruction')}
          </p>
          <p className="mt-2 rounded-[20px] bg-black/50 px-5 py-2 text-center text-[14px] text-[#E9D5FF]">
            {t('scan.instructionSub')}
          </p>
          {loading ? <Spinner size={20} color="#FFFFFF" className="mt-4" /> : null}
        </div>
      </div>
    </div>
  );
}
