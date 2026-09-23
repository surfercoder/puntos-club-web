'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { FiClock, FiCompass, FiHome, FiMoreHorizontal } from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';

import { useT } from '@/contexts/I18nContext';
import type { MessageKey, Translate } from '@/i18n';
import { colors, gradient } from '@/lib/theme';
import { cn } from '@/lib/utils';

// 'none' es para pantallas que muestran la barra pero no son un destino de la
// barra (perfil): se dibuja sin pastilla activa, como en el mockup.
export type TabKey = 'home' | 'explore' | 'history' | 'more' | 'none';

// "Mas" queda dibujado pero sin navegacion hasta que tenga pantalla propia.
const TABS: {
  key: TabKey;
  label: MessageKey;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  href?: string;
}[] = [
  { key: 'home', label: 'tabs.home', Icon: FiHome, href: '/' },
  { key: 'explore', label: 'tabs.explore', Icon: FiCompass, href: '/explore' },
  { key: 'history', label: 'tabs.history', Icon: FiClock, href: '/history' },
  { key: 'more', label: 'tabs.more', Icon: FiMoreHorizontal },
];

function Tab({
  tab,
  active,
  t,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
  t: Translate;
}) {
  const router = useRouter();
  const { Icon } = tab;
  return (
    <button
      type="button"
      className={cn('flex flex-col items-center', tab.href && 'pressable')}
      onClick={() => tab.href && !active && router.replace(tab.href)}
    >
      <span
        className={cn(
          'flex flex-col items-center justify-center rounded-2xl px-[10px] py-1.5',
          active && 'bg-purple-soft',
        )}
      >
        <Icon size={20} color={active ? colors.purple : '#616588'} />
        <span
          className={cn(
            'mt-[3px] whitespace-nowrap text-[9.5px]',
            active ? 'font-bold text-purple' : 'text-[#616588]',
          )}
        >
          {t(tab.label)}
        </span>
      </span>
    </button>
  );
}

export default function TabBar({ active }: { active: TabKey }) {
  const router = useRouter();
  const t = useT();
  return (
    <div
      // La pastilla flotante sigue siendo la navegacion tambien en
      // escritorio, pero con tope: a 1900px de ancho los cinco destinos
      // quedarian a un palmo de distancia entre si.
      className="absolute inset-x-3 z-30 mx-auto flex h-16 max-w-[480px] items-center justify-between rounded-[26px] bg-card px-[10px] shadow-[0px_8px_24px_rgba(23,10,60,0.12)]"
      style={{ bottom: 'max(env(safe-area-inset-bottom), 10px)' }}
    >
      {TABS.slice(0, 2).map((tab) => (
        <Tab key={tab.key} tab={tab} active={active === tab.key} t={t} />
      ))}

      <button
        type="button"
        className="pressable -mt-5 flex w-[62px] flex-col items-center"
        onClick={() => router.push('/scan-organization')}
      >
        <span
          className="flex h-[62px] w-[62px] flex-col items-center justify-center overflow-hidden rounded-full border-4 border-card shadow-[0px_6px_14px_rgba(118,56,231,0.35)]"
          style={{ backgroundImage: gradient(colors.brand, true) }}
        >
          <MdQrCodeScanner size={21} color="#FFFFFF" />
          <span className="mt-0.5 text-[9px] font-bold text-white">
            {t('tabs.scan')}
          </span>
        </span>
      </button>

      {TABS.slice(2).map((tab) => (
        <Tab key={tab.key} tab={tab} active={active === tab.key} t={t} />
      ))}
    </div>
  );
}
