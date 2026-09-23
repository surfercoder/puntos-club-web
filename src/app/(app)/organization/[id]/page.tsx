'use client';

import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { FiChevronRight } from 'react-icons/fi';
import {
  IoCallOutline,
  IoGlobeOutline,
  IoInformationCircleOutline,
  IoLocationOutline,
  IoMailOutline,
  IoNotificationsOutline,
  IoRemoveCircleOutline,
  IoTimeOutline,
} from 'react-icons/io5';

import RedeemButton from '@/components/RedeemButton';
import ScreenHeader from '@/components/ScreenHeader';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { MessageKey, Translate } from '@/i18n';
import { confirm } from '@/lib/confirm';
import { errorMessage } from '@/lib/errors';
import { notify } from '@/lib/notify';
import { useOrganizationProducts } from '@/lib/products';
import { supabase } from '@/lib/supabase/client';
import { colors, formatPoints, gradient } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type {
  Address,
  BeneficiaryOrganization,
  Organization,
  Product,
} from '@/types';

// Mascota recortada del mockup del 10/09/2026 (misma tecnica que los heros):
// va sobre el degrade vivo de la caja de puntos, con la antena asomando por
// encima del borde superior de la tarjeta, como en el diseno.
const CLUBI = '/images/organization/clubi-points.png';
// Medidas del mockup, en proporcion: la tarjeta mide 453x276 y el recorte de
// la mascota 203x279, pegado abajo a la derecha. Que el recorte sea mas alto
// que la tarjeta es a proposito: son los 3px de antena que sobresalen.
const POINTS_CARD_RATIO = 453 / 276;
const CLUBI_RATIO = 203 / 279;

// Cuantos premios entran en el carrusel de la ficha. El resto vive en
// "Ver todos"; sin tope la fila de puntitos se vuelve una pared.
const PREVIEW_PRODUCTS = 6;

const CARD =
  'mx-4 mt-[14px] rounded-[20px] bg-card p-[14px] shadow-[0px_4px_14px_rgba(23,10,60,0.05)]';

type ActiveOffer = {
  id: number;
  display_name: string;
  description: string;
  display_icon: string;
  display_color: string;
  rule_type: string;
  config: { points_per_dollar?: number; percentage?: number };
  time_start: string | null;
  time_end: string | null;
  days_of_week: number[] | null;
  valid_until: string | null;
};

const DAY_KEYS: MessageKey[] = [
  'day.0',
  'day.1',
  'day.2',
  'day.3',
  'day.4',
  'day.5',
  'day.6',
];

// Solo se llama cuando al menos uno de start/end tiene valor (ver el bloque de
// horario en OfferRow), asi que los defaults cubren el caso parcial.
const formatTimeRange = (start: string | null, end: string | null) => {
  const hhmm = (time: string) => time.slice(0, 5);
  return `${hhmm(start || '00:00')} - ${hhmm(end || '23:59')}`;
};

// Solo se llama cuando `days` no es null y 0 < length < 7.
const formatDays = (days: number[], t: Translate) =>
  days.map((d) => t(DAY_KEYS[d])).join(', ');

// ---------------------------------------------------------------------------
// Data loaders + hooks
// ---------------------------------------------------------------------------

async function loadActiveOffers(organizationId: string): Promise<ActiveOffer[]> {
  try {
    const { data, error } = await supabase.rpc('get_active_offers', {
      p_organization_id: parseInt(organizationId),
      p_branch_id: null,
      p_check_time: new Date().toISOString(),
    });
    if (error || !data) return [];
    return data as ActiveOffer[];
  } catch {
    return [];
  }
}

type BranchInfo = {
  id: number;
  name: string;
  phone: string | null;
  address: Address | null;
};

// La direccion vive en `address`, no en `branch`: la trae el join. Depende de
// la policy beneficiary_read_branch_addresses (migracion 20260901); sin ella el
// join vuelve null sin error y la ficha queda sin direccion.
async function loadOrganizationBranches(
  organizationId: string,
): Promise<BranchInfo[]> {
  const { data, error } = await supabase
    .from('branch')
    .select(
      'id, name, phone, address:address_id(street, number, city, state, zip_code)',
    )
    .eq('organization_id', parseInt(organizationId))
    .eq('active', true)
    .order('id');

  if (error || !data) {
    console.warn('[branches] load failed', error?.message);
    return [];
  }
  return data as unknown as BranchInfo[];
}

const formatAddress = (address: Address | null) =>
  [
    [address?.street, address?.number].filter(Boolean).join(' '),
    address?.city,
    address?.state,
  ]
    .filter(Boolean)
    .join(', ');

function useActiveOffers(organizationId: string | undefined) {
  const [offers, setOffers] = useState<ActiveOffer[] | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      const next = await loadActiveOffers(organizationId);
      if (!cancelled) setOffers(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  return offers;
}

// Vuelve a pedir las organizaciones del usuario cuando cambia su fila de
// puntos. El callback solo llama a una funcion que recibe, asi que no dispara
// la regla de no-setState-in-effect.
function usePointsRealtime(
  beneficiaryId: string | undefined,
  organizationId: string | undefined,
  refreshOrganizations: () => Promise<void>,
) {
  const refreshRef = useRef(refreshOrganizations);
  useEffect(() => {
    refreshRef.current = refreshOrganizations;
  });

  useEffect(() => {
    if (!beneficiaryId || !organizationId) return;

    const channel = supabase.channel(
      `org-points-${beneficiaryId}-${organizationId}`,
    );
    const bound = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'beneficiary_organization',
        filter: `beneficiary_id=eq.${beneficiaryId}`,
      },
      () => {
        void refreshRef.current();
      },
    );
    bound.subscribe();

    return () => {
      bound.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [beneficiaryId, organizationId]);
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

// Cabecera del mockup: logo grande, nombre y la pastilla "Info de la empresa".
// Va sobre el fondo de la pantalla, sin tarjeta.
function OrgHeader({
  organization,
  onInfo,
  t,
}: {
  organization: Organization | undefined;
  onInfo: () => void;
  t: Translate;
}) {
  return (
    <div className="mx-4 mt-5 flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={organization?.logo_url ?? undefined}
        alt=""
        className="h-25 w-25 shrink-0 rounded-full bg-[#FCFCFE] object-contain"
        style={{ width: 100, height: 100 }}
      />
      <div className="ml-[18px] min-w-0 flex-1">
        <h1 className="line-clamp-2 text-[22px] font-extrabold leading-[27px] text-ink">
          {organization?.name}
        </h1>
        {/* El mockup dibuja 35dp de alto; se sube a 44 por el minimo tactil. */}
        <button
          type="button"
          className="pressable mt-2.5 flex h-11 w-full items-center rounded-[22px] border border-pink-line bg-card px-4"
          onClick={onInfo}
        >
          <IoInformationCircleOutline size={18} color={colors.magenta} />
          <span className="ml-2 flex-1 text-left text-[14.5px] font-bold text-magenta">
            {t('org.companyInfo')}
          </span>
          <FiChevronRight size={18} color={colors.magenta} />
        </button>
      </div>
    </div>
  );
}

// Ficha "Info de la empresa": el beneficiario acumula puntos sin saber donde
// queda el local. Las sucursales se piden recien al abrir el modal, que se monta
// solo mientras esta abierto.
function CompanyInfoModal({
  organization,
  onClose,
  t,
}: {
  organization: Organization | undefined;
  onClose: () => void;
  t: Translate;
}) {
  const [branches, setBranches] = useState<BranchInfo[] | null>(null);
  const organizationId = organization?.id;

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      const next = await loadOrganizationBranches(String(organizationId));
      if (!cancelled) setBranches(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // <dialog> nativo: Escape, foco atrapado y backdrop los pone el navegador, en
  // vez de un listener de teclado propio. Ver el comentario del QR de la home.
  const ref = useRef<HTMLDialogElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    /* v8 ignore next */
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const close = () => onCloseRef.current();
    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) onCloseRef.current();
    };
    dialog.addEventListener('close', close);
    dialog.addEventListener('click', onClick);
    return () => {
      dialog.removeEventListener('close', close);
      dialog.removeEventListener('click', onClick);
    };
  }, []);

  const about =
    organization?.public_info?.trim() || organization?.description?.trim();
  const contacts = [
    { Icon: IoCallOutline, key: 'phone', value: organization?.contact_phone },
    { Icon: IoMailOutline, key: 'email', value: organization?.contact_email },
    { Icon: IoGlobeOutline, key: 'web', value: organization?.website },
  ].filter((c) => c.value?.trim());
  const hasData =
    Boolean(about) || contacts.length > 0 || (branches?.length ?? 0) > 0;
  // Sin organizacion el efecto no dispara nunca: sin esto el modal se queda
  // colgado en el spinner en vez de mostrar el vacio.
  const loading = Boolean(organizationId) && branches === null;

  return (
    <dialog
      ref={ref}
      aria-label={t('org.companyInfo')}
      className="m-auto max-h-[80%] w-full max-w-[380px] bg-transparent p-6 backdrop:bg-[#0A053D]/80"
    >
      <div className="flex max-h-full flex-col rounded-3xl bg-card p-6">
        <h2 className="text-[20px] font-extrabold text-ink">
          {t('org.companyInfo')}
        </h2>
        <p className="mt-0.5 text-[13.5px] text-ink-soft">{organization?.name}</p>

        <div className="no-scrollbar mt-4 flex-1 overflow-y-auto">
          {about ? (
            <p className="mb-[14px] text-[13.5px] leading-[19px] text-ink-soft">
              {about}
            </p>
          ) : null}

          {loading ? (
            <div className="flex justify-center">
              <Spinner size={20} color={colors.violet} />
            </div>
          ) : (
            (branches ?? []).map((branch) => (
              <div key={branch.id} className="mb-[14px] flex gap-2.5">
                <IoLocationOutline
                  size={18}
                  color={colors.violet}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-ink">{branch.name}</p>
                  <p className="text-[13.5px] leading-[19px] text-ink-soft">
                    {formatAddress(branch.address) || t('org.noAddress')}
                  </p>
                  {branch.phone?.trim() ? (
                    <p className="text-[13.5px] leading-[19px] text-ink-soft">
                      {branch.phone}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {contacts.map(({ Icon, key, value }) => (
            <div key={key} className="mb-[14px] flex gap-2.5">
              <Icon size={18} color={colors.violet} className="shrink-0" />
              <p className="min-w-0 flex-1 break-words text-[13.5px] leading-[19px] text-ink-soft">
                {value}
              </p>
            </div>
          ))}

          {!loading && !hasData ? (
            <p className="text-center text-[13.5px] text-slate-soft">
              {t('org.noContactData')}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="pressable mt-2 self-center rounded-xl bg-purple px-8 py-3 text-[15px] font-bold text-white"
          onClick={onClose}
        >
          {t('common.close')}
        </button>
      </div>
    </dialog>
  );
}

// Caja de puntos: degrade vivo + mascota. El degrade se recorta aparte para que
// la antena pueda salirse del borde superior redondeado.
function PointsCard({ points, t }: { points: number; t: Translate }) {
  return (
    <div
      className="relative mx-4 mt-4 flex items-center justify-center"
      style={{ aspectRatio: POINTS_CARD_RATIO }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-[22px]"
        style={{ backgroundImage: gradient(colors.pointsGrad) }}
      />
      {/* El bloque de texto va centrado en el 57% izquierdo; el resto es
          mascota. */}
      <div className="relative flex flex-col items-center pr-[43%] text-center">
        <p className="text-[15px] font-semibold text-white">
          {t('org.pointsLabel')}
        </p>
        <p className="whitespace-nowrap text-[clamp(28px,13vw,54px)] font-extrabold leading-[1.18] tracking-[-1.5px] text-white">
          {formatPoints(points)}
        </p>
        <p className="text-[15px] font-bold text-white">{t('common.pts')}</p>
      </div>
      <Image
        src={CLUBI}
        alt=""
        width={203}
        height={279}
        className="pointer-events-none absolute bottom-0 h-auto"
        style={{ right: '1.3%', width: '45%', aspectRatio: CLUBI_RATIO }}
      />
    </div>
  );
}

function StatsCard({
  membership,
  organizationId,
  t,
}: {
  membership: BeneficiaryOrganization;
  organizationId: string;
  t: Translate;
}) {
  const router = useRouter();
  return (
    <div className={cn(CARD, 'lg:mt-4 lg:flex lg:flex-col')}>
      <div className="flex items-center justify-between">
        <h2 className="text-[16.5px] font-extrabold text-ink">
          {t('org.stats')}
        </h2>
        <button
          type="button"
          className="pressable flex items-center rounded-xl bg-violet-soft px-[11px] py-[5px]"
          onClick={() => router.push(`/organization/${organizationId}/history`)}
        >
          <IoTimeOutline size={14} color={colors.violet} />
          <span className="ml-[5px] text-[12.5px] font-bold text-violet">
            {t('org.history')}
          </span>
        </button>
      </div>
      <div className="mt-[14px] flex items-center lg:flex-1">
        {[
          {
            key: 'earned',
            color: colors.green,
            value: membership.total_points_earned,
            label: 'org.pointsEarned',
          },
          {
            key: 'redeemed',
            color: colors.magenta,
            value: membership.total_points_redeemed,
            label: 'org.pointsRedeemed',
          },
          {
            key: 'available',
            color: colors.violet,
            value: membership.available_points,
            label: 'org.pointsAvailable',
          },
        ].map((stat, i) => (
          <React.Fragment key={stat.key}>
            {i > 0 ? <span className="h-14 w-px bg-line" /> : null}
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <p
                className="text-[24px] font-extrabold tracking-[-0.5px]"
                style={{ color: stat.color }}
              >
                {formatPoints(stat.value)}
              </p>
              <p className="mt-[5px] text-center text-[12.5px] text-slate">
                {t(stat.label as MessageKey)}
              </p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function OfferRow({ offer, t }: { offer: ActiveOffer; t: Translate }) {
  return (
    <div className="mt-3 flex">
      <span
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] text-[18px]"
        style={{ backgroundColor: offer.display_color || colors.violet }}
      >
        {offer.display_icon || '🎉'}
      </span>
      <div className="ml-2.5 min-w-0 flex-1">
        <p className="text-[14px] font-bold text-ink">{offer.display_name}</p>
        {offer.description ? (
          <p className="mt-0.5 text-[12.5px] text-slate">{offer.description}</p>
        ) : null}
        <div className="mt-[3px] flex gap-2.5">
          {offer.time_start || offer.time_end ? (
            <span className="text-[11.5px] font-semibold text-violet">
              {formatTimeRange(offer.time_start, offer.time_end)}
            </span>
          ) : null}
          {offer.days_of_week &&
          offer.days_of_week.length > 0 &&
          offer.days_of_week.length < 7 ? (
            <span className="text-[11.5px] text-slate">
              {formatDays(offer.days_of_week, t)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ActiveOffersList({
  offers,
  t,
}: {
  offers: ActiveOffer[] | null;
  t: Translate;
}) {
  if (offers === null) {
    return (
      <div className={cn(CARD, 'flex items-center justify-center')}>
        <Spinner size={20} color={colors.violet} />
        <span className="ml-2.5 text-[13px] text-slate">
          {t('org.loadingOffers')}
        </span>
      </div>
    );
  }
  if (offers.length === 0) return null;
  return (
    <div className={CARD}>
      <h2 className="text-[16.5px] font-extrabold text-ink">
        {t('org.activeOffers')}
      </h2>
      {offers.map((offer) => (
        <OfferRow key={offer.id} offer={offer} t={t} />
      ))}
    </div>
  );
}

// Tarjeta del carrusel: imagen, puntos, nombre y "Canjear". Mas chica que la de
// la lista completa, que ademas muestra descripcion, stock y categoria.
function RewardCard({
  product,
  availablePoints,
  beneficiaryId,
  organizationId,
  onRedeemed,
  t,
}: {
  product: Product;
  availablePoints: number;
  beneficiaryId: string | undefined;
  organizationId: string;
  onRedeemed: () => void;
  t: Translate;
}) {
  const image = product.image_urls?.[0];
  return (
    // 3 premios por pantalla con 12px de hueco, como en el mockup.
    <div className="w-[calc((100%-24px)/3)] shrink-0 snap-start md:w-[calc((100%-60px)/6)]">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className="w-full rounded-[14px] bg-violet-soft object-cover"
          style={{ aspectRatio: 132.5 / 162 }}
        />
      ) : (
        <div
          className="flex w-full items-center justify-center rounded-[14px] bg-violet-soft text-[30px]"
          style={{ aspectRatio: 132.5 / 162 }}
        >
          🎁
        </div>
      )}
      <div className="mt-2.5 flex items-baseline">
        <span className="text-[15px] font-extrabold text-violet">
          {formatPoints(product.required_points)}
        </span>
        <span className="ml-1 text-[11.5px] text-slate">{t('common.pts')}</span>
      </div>
      <p className="mt-1 truncate text-[13.5px] font-bold text-ink">
        {product.name}
      </p>
      <RedeemButton
        compact
        product={product}
        beneficiaryId={beneficiaryId}
        organizationId={organizationId}
        canAfford={availablePoints >= product.required_points}
        totalStock={product.stock}
        onRedeemed={onRedeemed}
      />
    </div>
  );
}

function RewardsCard({
  products,
  organizationId,
  availablePoints,
  beneficiaryId,
  onRedeemed,
  t,
}: {
  products: Product[] | 'error' | null;
  organizationId: string;
  availablePoints: number;
  beneficiaryId: string | undefined;
  onRedeemed: () => void;
  t: Translate;
}) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(0);

  const preview = Array.isArray(products)
    ? products.slice(0, PREVIEW_PRODUCTS)
    : [];

  // El punto activo sale del scroll real del carrusel: en web no hay
  // onMomentumScrollEnd, asi que se mide la posicion contra el ancho de un item.
  const onScroll = () => {
    const track = trackRef.current;
    // Inalcanzable: el track solo se dibuja cuando hay premios, y el ref ya
    // apunta cuando llega un scroll. Existe por el tipo.
    /* v8 ignore next */
    if (!track || preview.length === 0) return;
    const step = (track.scrollWidth - track.clientWidth) / Math.max(1, preview.length - 3);
    setPage(step > 0 ? Math.round(track.scrollLeft / step) : 0);
  };

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <h2 className="text-[16.5px] font-extrabold text-ink">
          {t('org.rewardsTitle')}
        </h2>
        {preview.length > 0 ? (
          <button
            type="button"
            className="pressable py-0.5 pl-3 text-[13.5px] font-bold text-violet"
            onClick={() =>
              router.push(`/organization/${organizationId}/products`)
            }
          >
            {t('org.seeAll')}
          </button>
        ) : null}
      </div>
      <p className="mt-[3px] text-[13px] text-slate">
        {t('org.rewardsSubtitle')}
      </p>

      {products === null ? (
        <div className="flex items-center justify-center py-[18px]">
          <Spinner size={20} color={colors.violet} />
          <span className="ml-2.5 text-[13px] text-slate">
            {t('org.loadingRewards')}
          </span>
        </div>
      ) : null}

      {products === 'error' ? (
        <p className="mt-3 text-[13px] leading-[18px] text-slate">
          {t('org.rewardsError')}
        </p>
      ) : null}

      {Array.isArray(products) && products.length === 0 ? (
        <p className="mt-3 text-[13px] leading-[18px] text-slate">
          {t('org.rewardsEmpty')}
        </p>
      ) : null}

      {preview.length > 0 ? (
        <>
          <div
            ref={trackRef}
            onScroll={onScroll}
            className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pt-3"
          >
            {preview.map((product) => (
              <RewardCard
                key={product.id}
                product={product}
                t={t}
                availablePoints={availablePoints}
                beneficiaryId={beneficiaryId}
                organizationId={organizationId}
                onRedeemed={onRedeemed}
              />
            ))}
          </div>
          {/* Entran tres por pantalla, asi que el carrusel frena en length - 3:
              hay length - 2 posiciones y no un punto por premio. Con tres o
              menos no scrollea nada, y a partir de md entran los 6 premios de
              una: en los dos casos los puntos sobran. */}
          {preview.length > 3 ? (
            <div className="mt-[14px] flex justify-center gap-[7px] md:hidden">
              {preview.slice(0, preview.length - 2).map((product, index) => (
                <span
                  key={`dot-${product.id}`}
                  className={cn(
                    'h-[7px] w-[7px] rounded-full',
                    index === page ? 'bg-violet' : 'bg-[#DCD9E8]',
                  )}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantalla
// ---------------------------------------------------------------------------

export default function OrganizationDetailPage() {
  const router = useRouter();
  const id = String(useParams().id ?? '');
  const {
    userOrganizations,
    organizationsLoading,
    beneficiary,
    refreshOrganizations,
  } = useAuth();
  const t = useT();
  const [unfollowLoading, setUnfollowLoading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const membership = userOrganizations.find(
    (org) => org.organization_id.toString() === id,
  );

  usePointsRealtime(beneficiary?.id, id, refreshOrganizations);
  const activeOffers = useActiveOffers(id);
  const products = useOrganizationProducts(id);

  if (organizationsLoading) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col bg-bg">
        <ScreenHeader title={t('org.loading')} />
        <div className="flex flex-1 items-center justify-center p-5">
          <Spinner size={36} color={colors.violet} />
        </div>
      </div>
    );
  }

  if (!membership) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col bg-bg">
        <ScreenHeader title={t('org.notFound')} />
        <div className="flex flex-1 items-center justify-center p-5">
          <p className="text-center text-[15px] text-ink-soft">
            {t('org.notFoundBody')}
          </p>
        </div>
      </div>
    );
  }

  const organization = membership.organization;

  const handleUnfollow = async () => {
    const ok = await confirm({
      title: t('org.unfollowConfirmTitle'),
      message: t('org.unfollowConfirmBody', { name: organization?.name ?? '' }),
      confirmText: t('org.unfollowAction'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;

    setUnfollowLoading(true);
    await (async () => {
      try {
        const { error } = await supabase
          .from('beneficiary_organization')
          .update({ is_active: false })
          .eq('id', membership.id);

        if (error) {
          notify.error(t('common.error'), { description: t('org.unfollowFailed') });
          return;
        }
        await refreshOrganizations();
        notify.success(t('org.unfollowedTitle'), {
          description: t('org.unfollowedBody', { name: organization?.name ?? '' }),
        });
        router.back();
      } catch (e) {
        notify.error(t('common.error'), { description: errorMessage(t, e) });
      }
    })().finally(() => setUnfollowLoading(false));
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader
        title={organization?.name || t('org.fallbackName')}
        right={
          // Sin badge aca: el contador vive en la campana de la home, que es la
          // que ve el usuario al abrir la app.
          <button
            type="button"
            className="pressable px-[18px] text-white"
            aria-label={t('notif.bell')}
            onClick={() => router.push('/notifications')}
          >
            <IoNotificationsOutline size={22} />
          </button>
        }
      />
      <div className="page-column no-scrollbar flex-1 overflow-y-auto pb-7">
        <OrgHeader
          organization={organization}
          onInfo={() => setInfoOpen(true)}
          t={t}
        />
        {infoOpen ? (
          <CompanyInfoModal
            organization={organization}
            onClose={() => setInfoOpen(false)}
            t={t}
          />
        ) : null}
        {/* A partir de lg van a la par, del mismo alto: el alto lo fija la caja
            de puntos, que tiene proporcion fija, y las estadisticas se estiran.
            Cada tarjeta conserva su mx-4, que es lo que separa las columnas. */}
        <div className="lg:mb-2.5 lg:grid lg:grid-cols-2 lg:items-stretch">
          <PointsCard points={membership.available_points} t={t} />
          <StatsCard membership={membership} organizationId={id} t={t} />
        </div>
        <ActiveOffersList offers={activeOffers} t={t} />
        <RewardsCard
          t={t}
          products={products}
          organizationId={id}
          availablePoints={membership.available_points}
          beneficiaryId={
            beneficiary?.id != null ? String(beneficiary.id) : undefined
          }
          onRedeemed={refreshOrganizations}
        />
        <button
          type="button"
          className="pressable mx-4 mt-[14px] flex h-[46px] w-[calc(100%-32px)] items-center justify-center rounded-2xl border border-[#FBD9E6] bg-[#FFF2F6] md:mx-auto md:w-[320px]"
          onClick={handleUnfollow}
          disabled={unfollowLoading}
        >
          {unfollowLoading ? (
            <Spinner size={18} color={colors.magenta} />
          ) : (
            <>
              <IoRemoveCircleOutline size={18} color={colors.magenta} />
              <span className="ml-2 text-[14.5px] font-bold text-magenta">
                {t('org.unfollow')}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
