'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import {
  IoBulb,
  IoChevronForward,
  IoCloseCircle,
  IoQrCode,
  IoQrCodeOutline,
  IoSearch,
} from 'react-icons/io5';

import ScreenHeader from '@/components/ScreenHeader';
import TabBar from '@/components/TabBar';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { notify } from '@/lib/notify';
import { colors, gradient, matches, norm } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { Organization } from '@/types';

// Igual que el hero de la home: Clubi salio con alfa de explore/hero.png (la
// card entera del mockup) y el fondo paso a ser este degrade, que se estira
// sin deformar nada. El radial es el resplandor rosa que el mockup tiene
// detras del robot.
const HERO_BG =
  'radial-gradient(70% 90% at 88% 35%, #FDF1F7 0%, rgba(253,241,247,0) 65%),' +
  'linear-gradient(180deg, #ECE7F4 0%, #F5F1FC 28%, #F5F1FC 100%)';
const HERO = { art: '/images/explore/clubi-lupa.png', w: 261, h: 236 };

export default function ExplorePage() {
  const router = useRouter();
  const {
    allOrganizations,
    userOrganizations,
    organizationsLoading,
    joinOrganization,
  } = useAuth();
  const t = useT();

  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const userOrgIds = new Set(
    userOrganizations.map((org) => org.organization_id.toString()),
  );

  const filteredOrganizations = (() => {
    if (!searchQuery.trim()) return allOrganizations;
    const query = norm(searchQuery);
    return allOrganizations.filter(
      (org) =>
        matches(org.name, query) ||
        (org.business_name ? matches(org.business_name, query) : false),
    );
  })();

  const handleJoinOrganization = async (org: Organization) => {
    const ok = await confirm({
      title: t('join.confirmTitle', { name: org.name }),
      message: t('join.confirmBody', { name: org.name }),
      confirmText: t('join.action'),
      cancelText: t('common.cancel'),
    });
    if (!ok) return;

    setJoiningId(org.id);
    const { error } = await joinOrganization(org.id);
    setJoiningId(null);
    if (error) {
      notify.error(t('common.error'), { description: errorMessage(t, error) });
    } else {
      notify.success(t('join.successTitle'), {
        description: t('join.successBody', { name: org.name }),
      });
    }
  };

  const renderOrganizationItem = (item: Organization) => {
    const isMember = userOrgIds.has(item.id.toString());
    const isJoining = joiningId === item.id;

    // Siendo miembro la fila lleva al detalle: el chevron ya prometia ese
    // destino y, con la home acotada a 4 tarjetas, esta es la via para llegar
    // a las demas. Sin membresia la fila no navega.
    return (
      <div
        key={item.id}
        role={isMember ? 'button' : undefined}
        tabIndex={isMember ? 0 : undefined}
        className={cn(
          'mx-4 mt-3 flex h-[82px] items-center rounded-2xl bg-card px-3 shadow-[0px_3px_10px_rgba(23,10,60,0.05)]',
          isMember && 'pressable cursor-pointer',
        )}
        onClick={
          isMember ? () => router.push(`/organization/${item.id}`) : undefined
        }
        onKeyDown={
          isMember
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/organization/${item.id}`);
                }
              }
            : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.logo_url ?? undefined}
          alt=""
          className="h-[46px] w-[46px] shrink-0 rounded-full border border-line bg-[#FCFCFE] object-contain"
        />
        <div className="ml-[14px] min-w-0 flex-1">
          <p className="truncate text-[15.5px] font-extrabold text-[#0A0A45]">
            {item.name}
          </p>
          {item.business_name ? (
            <p className="mt-[3px] truncate text-[13px] text-[#71798B]">
              {item.business_name}
            </p>
          ) : null}
        </div>
        {isMember ? (
          <>
            <span className="mr-1.5 shrink-0 rounded-[10px] bg-[#E9F9EA] px-3 py-1.5 text-[12.5px] font-bold text-[#35A35A]">
              {t('explore.member')}
            </span>
            <IoChevronForward size={20} color={colors.chevron} className="shrink-0" />
          </>
        ) : (
          <button
            type="button"
            className="pressable flex h-[34px] min-w-[82px] shrink-0 items-center justify-center overflow-hidden rounded-xl"
            style={{ backgroundImage: gradient(colors.pinkGrad) }}
            onClick={(e) => {
              e.stopPropagation();
              handleJoinOrganization(item);
            }}
            disabled={isJoining}
          >
            {isJoining ? (
              <Spinner size={18} color="#FFFFFF" />
            ) : (
              <span className="text-[13.5px] font-bold text-white">
                {t('explore.join')}
              </span>
            )}
          </button>
        )}
      </div>
    );
  };

  const count = filteredOrganizations.length;
  const countLabel =
    count === 1 ? t('explore.countOne') : t('explore.countMany', { count });

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader
        title={t('explore.title')}
        right={
          <button
            type="button"
            className="pressable px-[18px] text-white"
            aria-label={t('explore.scanQr')}
            onClick={() => router.push('/scan-organization')}
          >
            <IoQrCodeOutline size={22} />
          </button>
        }
      />

      <div className="page-column no-scrollbar flex-1 overflow-y-auto pb-[100px]">
        {/* Con una busqueda activa el hero se oculta para dejarle el alto a los
            resultados, como en el mockup. */}
        {searchQuery ? null : (
          <div
            className="mx-4 flex items-end gap-4 overflow-hidden rounded-b-3xl pl-[22px] pt-[30px]"
            style={{ backgroundImage: HERO_BG }}
          >
            <div className="min-w-0 flex-1 self-center pb-[30px]">
              <p className="text-[20px] font-extrabold leading-[27px] text-ink sm:text-[26px] sm:leading-[34px]">
                {t('explore.heroTitle')}
              </p>
              <p className="mt-2.5 text-[13.5px] leading-[19px] text-ink-soft sm:mt-3 sm:text-[16px] sm:leading-[23px]">
                {t('explore.heroSubtitle')}
              </p>
            </div>
            {/* Ancho fijo: Clubi se queda en el tamano que ya tenia en vez de
                crecer con la card. Los pies vienen cortados del recorte. */}
            <Image
              src={HERO.art}
              alt=""
              width={HERO.w}
              height={HERO.h}
              priority
              className="h-auto w-[170px] shrink-0 sm:w-[340px]"
            />
          </div>
        )}

        <div className="mx-4 mt-[14px] flex h-[52px] items-center gap-2.5 rounded-2xl border border-[#EFEFF5] bg-card px-[14px]">
          <IoSearch size={18} color="#A2A6B3" className="shrink-0" />
          <input
            type="search"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[#0C0F1A] outline-none placeholder:text-[#A2A6B3] [&::-webkit-search-cancel-button]:appearance-none"
            placeholder={t('explore.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="pressable shrink-0"
              aria-label={t('common.clearSearch')}
              onClick={() => setSearchQuery('')}
            >
              <IoCloseCircle size={20} color="#BFC3CF" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="pressable mx-4 mt-[14px] flex w-[calc(100%-32px)] items-center overflow-hidden rounded-[18px] p-[18px] text-left"
          style={{ backgroundImage: gradient(colors.qrCardGrad) }}
          aria-label={t('explore.qrCardLabel')}
          onClick={() => router.push('/scan-organization')}
        >
          <span className="flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-[18px] bg-card">
            <IoQrCode size={28} color={colors.violet} />
          </span>
          <span className="ml-[14px] min-w-0 flex-1">
            <span className="block text-[15.5px] font-extrabold text-violet">
              {t('explore.qrCardTitle')}
            </span>
            <span className="mt-[3px] block text-[12.5px] leading-[17px] text-[#6A6A96]">
              {t('explore.qrCardSubtitle')}
            </span>
          </span>
          <IoChevronForward size={20} color={colors.violet} className="shrink-0" />
        </button>

        <h2 className="mx-4 mt-6 text-[16.5px] font-extrabold text-ink">
          {t('explore.available')}
        </h2>
        <p className="mx-4 mt-[3px] text-[13px] text-slate">{countLabel}</p>

        {count === 0 ? (
          organizationsLoading ? (
            <div className="mt-6 flex justify-center">
              <Spinner size={36} color={colors.violet} />
            </div>
          ) : (
            <div className="mx-4 mt-5 flex flex-col items-center py-6">
              <p className="text-center text-[13.5px] text-slate">
                {t(searchQuery ? 'explore.emptySearch' : 'explore.empty')}
              </p>
            </div>
          )
        ) : (
          <div className="md:grid md:grid-cols-2 md:gap-x-4 xl:grid-cols-3">
            {filteredOrganizations.map(renderOrganizationItem)}
          </div>
        )}

        <div className="mx-4 mt-4 flex items-center rounded-[18px] bg-[#F5EFFE] p-[14px]">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#EDE1FD]">
            <IoBulb size={22} color={colors.violet} />
          </span>
          <div className="ml-[14px] min-w-0 flex-1">
            <p className="text-[14.5px] font-extrabold text-violet">
              {t('explore.helpTitle')}
            </p>
            <p className="mt-1 text-[13px] leading-[18px] text-[#65697C]">
              {t('explore.helpBody')}
            </p>
          </div>
        </div>
      </div>

      <TabBar active="explore" />
    </div>
  );
}
