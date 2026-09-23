'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import React, { useEffect, useRef, useState } from 'react';
import { FiChevronRight, FiEdit2, FiLogOut } from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';
import {
  IoCall,
  IoCard,
  IoMail,
  IoNotificationsOutline,
  IoPerson,
} from 'react-icons/io5';

import TabBar from '@/components/TabBar';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { MessageKey, Translate } from '@/i18n';
import {
  getClearedAt,
  getSeenAt,
  loadNotifications,
  unreadCount,
  visible,
} from '@/lib/notifications';
import { confirm } from '@/lib/confirm';
import { colors, formatPoints, formatShortDate, gradient } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { Beneficiary, BeneficiaryOrganization } from '@/types';

// Alto de una fila (padding 10 + logo 38 + padding 10 + margen 6) x 4 filas,
// mas un asomo de la quinta para que se vea que la lista sigue.
const ORG_ROW = 64;
const ORGS_MAX_HEIGHT = ORG_ROW * 4 + 16;

// Ilustraciones recortadas del mockup (POC). Los recortes de fondo plano
// (logo, estrella, tienda, iconos) ya traen el color de la tarjeta que los
// contiene, asi que su rectangulo no se ve. El robot salio con alfa de
// hero-bg.png (la card entera del mockup) para que la card pueda ir a sangre
// sin estirarlo: el fondo pasa a ser el degrade de abajo, que si se estira.
// Al recorte se le devolvio arriba mascot-tip.png, la mitad de la bola de la
// antena que en el mockup asomaba fuera de la card: adentro entra entera.
const ART = {
  logo: '/images/home/logo.png',
  mascot: '/images/home/clubi.png',
  pillStar: '/images/home/pill-star.png',
  store: '/images/home/store.png',
};

// Degrade del hero, medido sobre hero-bg.png (lavanda a la izquierda, rosa a
// la derecha). La mascota ya trae la antena: no sobresale de la card.
const HERO_BG =
  'linear-gradient(105deg, #EDE7FC 0%, #F3E3F4 55%, #FBDEE7 100%)';

const QUICK_ACTIONS: { key: string; label: MessageKey; art: string }[] = [
  { key: 'acumulo', label: 'home.quick.earn', art: '/images/home/qa-star.png' },
  {
    key: 'canjeo',
    label: 'home.quick.redeem',
    art: '/images/home/qa-gift.png',
  },
  {
    key: 'promos',
    label: 'home.quick.promos',
    art: '/images/home/qa-promo.png',
  },
  { key: 'ayuda', label: 'home.quick.help', art: '/images/home/qa-help.png' },
  {
    key: 'novedades',
    label: 'home.quick.news',
    art: '/images/home/qa-news.png',
  },
];

// Los nombres guardados suelen traer espacios de mas ("Carlos "), que se veian
// como "Carlos  Schmidt" en la ficha de cuenta. Se colapsan aca, una vez.
const fullName = (beneficiary: Beneficiary | null | undefined) =>
  `${beneficiary?.first_name ?? ''} ${beneficiary?.last_name ?? ''}`
    .replace(/\s+/g, ' ')
    .trim();

const buildQrValue = (beneficiary: Beneficiary | null | undefined) =>
  beneficiary?.id
    ? JSON.stringify({
        type: 'beneficiary',
        id: beneficiary.id,
        email: beneficiary.email ?? '',
        name: fullName(beneficiary),
      })
    : '';

function SectionHeader({
  title,
  action,
  icon,
  onClick,
}: {
  title: string;
  action?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div className="mb-[9px] mt-5 flex items-center justify-between px-4">
      <h2 className="text-[16.5px] font-extrabold text-ink">{title}</h2>
      {action ? (
        <button
          type="button"
          className="pressable flex items-center"
          onClick={onClick}
        >
          <span className="mr-1 text-[12.5px] font-bold text-purple-deep">
            {action}
          </span>
          {icon ?? <FiChevronRight size={15} color={colors.purpleDeep} />}
        </button>
      ) : null}
    </div>
  );
}

function OrganizationCard({
  item,
  t,
}: {
  item: BeneficiaryOrganization;
  t: Translate;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="pressable mx-4 mb-1.5 flex w-[calc(100%-32px)] items-center rounded-2xl bg-card p-2.5 text-left shadow-[0px_3px_10px_rgba(23,10,60,0.05)]"
      onClick={() => router.push(`/organization/${item.organization_id}`)}
    >
      {/* next/image no sirve para un logo que puede no existir: el fallback es
          el cuadrito vacio con borde, igual que en movil. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.organization?.logo_url ?? undefined}
        alt=""
        className="h-[38px] w-[38px] shrink-0 rounded-full border border-line bg-[#FCFCFE] object-contain"
      />
      <span className="ml-3 min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-bold text-[#0D0D33]">
          {item.organization?.name || t('home.organization')}
        </span>
        <span className="mt-px block text-[11px] text-subtle">
          {t('home.memberSince', { date: formatShortDate(item.joined_date) })}
        </span>
      </span>
      <span className="ml-2 flex min-w-[58px] shrink-0 flex-col items-center rounded-xl bg-purple-soft px-[11px] py-[5px]">
        <span className="text-[14.5px] font-extrabold text-purple-ink">
          {formatPoints(item.available_points)}
        </span>
        <span className="text-[9.5px] text-purple-ink">
          {t('common.points')}
        </span>
      </span>
      <FiChevronRight
        size={19}
        color={colors.chevron}
        className="ml-1 shrink-0"
      />
    </button>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className="flex h-[42px] items-center">
      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] bg-[#F3EEFD] text-purple">
        {icon}
      </span>
      {/* La linea arranca en el label, no debajo del icono, como en el diseno. */}
      <div
        className={cn(
          'ml-2.5 flex h-full min-w-0 flex-1 items-center border-b',
          last ? 'border-b-0' : 'border-[#F2F2F6]',
        )}
      >
        <span className="text-[12.5px] text-muted">{label}</span>
        <span className="ml-3 min-w-0 flex-1 truncate text-right text-[12.5px] font-semibold text-value">
          {value}
        </span>
      </div>
    </div>
  );
}

// Badge de la campana: cuenta lo que entro despues de la ultima vez que se
// abrio el panel. Va por fuera del camino critico de la home — mientras no
// resuelva, la campana se dibuja sin badge y lo gana despues.
function useUnreadNotifications(
  beneficiaryId: string | undefined,
  t: Translate,
) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!beneficiaryId) return;
    let cancelled = false;
    (async () => {
      let next = 0;
      try {
        const [items, seenAt, clearedAt] = await Promise.all([
          loadNotifications(beneficiaryId, t),
          getSeenAt(beneficiaryId),
          getClearedAt(beneficiaryId),
        ]);
        next = unreadCount(visible(items, clearedAt), seenAt);
      } catch {
        next = 0;
      }
      if (!cancelled) setUnread(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [beneficiaryId, t]);

  return unread;
}

// QR grande del beneficiario: el cajero lo escanea desde su app.
function QrModal({
  onClose,
  qrValue,
  name,
  email,
  t,
}: {
  onClose: () => void;
  qrValue: string;
  name: string;
  email: string | null | undefined;
  t: Translate;
}) {
  // <dialog> nativo: Escape, foco atrapado y backdrop vienen del navegador, en
  // vez de un listener de teclado propio. El componente se monta solo mientras
  // esta abierto, asi que showModal va una sola vez.
  //
  // El listener de `close` va a mano y no como prop de React: `close` no
  // burbujea, asi que la delegacion de eventos de React no lo entrega y el
  // modal quedaba cerrado pero montado — sin volver a abrirse nunca.
  const ref = useRef<HTMLDialogElement | null>(null);
  // onClose vive en un ref para que el efecto no se vuelva a suscribir cuando
  // el padre re-renderiza y le cambia la identidad al handler. Se actualiza en
  // un efecto y no en el render: escribir un ref durante el render es un
  // efecto secundario (mismo patron que useQrCamera).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    // El <dialog> esta en el JSX de este mismo componente: cuando corre el
    // efecto el ref ya apunta. El guardia existe solo por el tipo.
    /* v8 ignore next */
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const close = () => onCloseRef.current();
    // Solo el click en el ::backdrop, que llega al propio <dialog>: apoyar el
    // dedo sobre el QR mientras el cajero lo escanea no puede cerrarlo.
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

  return (
    <dialog
      ref={ref}
      aria-label={t('home.qrModalTitle')}
      className="m-auto w-[85%] max-w-[350px] bg-transparent p-5 backdrop:bg-[#0A053D]/80"
    >
      <div className="flex flex-col items-center rounded-3xl bg-card p-8 text-center">
        <h2 className="mb-2 text-[22px] font-extrabold text-ink">
          {t('home.qrModalTitle')}
        </h2>
        <p className="mb-6 text-[13px] text-ink-soft">
          {t('home.qrModalSubtitle')}
        </p>
        <div className="mb-6 rounded-2xl bg-card p-4 shadow-[0px_4px_8px_rgba(0,0,0,0.1)]">
          {qrValue ? (
            <QRCodeSVG
              value={qrValue}
              size={250}
              level="H"
              bgColor="#FFFFFF"
              fgColor="#000000"
              className="h-auto w-full max-w-[250px]"
            />
          ) : null}
        </div>
        <p className="mb-1 text-[17px] font-bold text-ink">{name}</p>
        <p className="mb-6 text-[13px] text-ink-soft">{email}</p>
        <button
          type="button"
          className="pressable rounded-xl bg-purple px-8 py-3 text-[15px] font-bold text-white"
          onClick={onClose}
        >
          {t('common.close')}
        </button>
      </div>
    </dialog>
  );
}

// Marca + campana. El badge cuenta lo no visto; arriba de 9 se corta en "9+"
// para no ensanchar el circulo.
function TopBar({ unread, t }: { unread: number; t: Translate }) {
  const router = useRouter();
  return (
    <div className="flex items-center justify-between px-4 pb-2.5">
      <div className="flex items-center">
        {/* El regalito del header web del admin: mismo PNG, para no tener
            dos marcas. ponytail: unificado solo el icono; la tipografia
            (Poppins) y el rosa se unifican antes de produccion. */}
        <Image
          src={ART.logo}
          alt=""
          width={34}
          height={34}
          priority
          className="h-[34px] w-[34px] object-contain"
        />
        <span className="ml-1.5 text-[21px] font-extrabold tracking-[-0.4px] text-ink">
          Puntos <span className="text-pink">Club</span>
        </span>
      </div>
      <button
        type="button"
        className="pressable relative flex h-10 w-10 items-center justify-center rounded-[13px] bg-card shadow-[0px_4px_12px_rgba(23,10,60,0.10)]"
        aria-label={
          unread
            ? `${t('notif.bell')}, ${t('notif.unread', { count: unread })}`
            : t('notif.bell')
        }
        onClick={() => router.push('/notifications')}
      >
        <IoNotificationsOutline size={20} color="#0A0A2C" />
        {unread ? (
          <span className="absolute -right-[3px] -top-[3px] flex h-[19px] min-w-[19px] items-center justify-center rounded-[10px] border-2 border-card bg-pink-accent px-1 text-[10px] font-extrabold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}

// Hero: saludo, puntos totales, QR y mascota.
function Hero({
  firstName,
  totalPoints,
  qrValue,
  onExpandQr,
  t,
}: {
  firstName: string | null | undefined;
  totalPoints: number;
  qrValue: string;
  onExpandQr: () => void;
  t: Translate;
}) {
  const router = useRouter();
  return (
    // A sangre: el fondo es un degrade, no una imagen, asi que la card crece
    // todo lo que le den sin deformar nada.
    <div className="mx-4">
      <div
        className="flex items-stretch gap-3 overflow-hidden rounded-3xl p-3.5"
        style={{ backgroundImage: HERO_BG }}
      >
        {/* Saludo a la izquierda, mascota al medio, QR a la derecha: las dos
            columnas laterales pesan igual para que la mascota quede centrada
            en la card, no entre lo que sobra. */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="truncate text-[18px] font-extrabold leading-[22px] text-ink">
            {t('home.greeting', {
              name: firstName || t('home.defaultUser'),
            })}
          </p>
          <p className="mt-[3px] text-[11.5px] leading-[15.5px] text-ink-soft">
            {t('home.greetingSub')}
          </p>
          <div className="mt-2 inline-flex w-fit items-center rounded-[14px] bg-white/[0.62] px-2.5 py-[7px]">
            <Image
              src={ART.pillStar}
              alt=""
              width={22}
              height={22}
              className="mr-2 h-[22px] w-[22px] object-contain"
            />
            <span>
              <span className="block text-[9px] leading-3 text-[#78798D]">
                {t('home.pointsLabel')}
              </span>
              <span className="block text-[16px] font-extrabold leading-5 text-purple-deep">
                {formatPoints(totalPoints)} {t('common.pts')}
              </span>
            </span>
          </div>
        </div>

        {/* Ancho fijo y alto libre: la mascota nunca se deforma. Va pegada al
            borde de abajo, donde el recorte ya le corta los pies. */}
        <Image
          src={ART.mascot}
          alt=""
          width={542}
          height={569}
          priority
          className="-mb-3.5 h-auto w-[104px] shrink-0 self-end object-contain sm:w-[150px]"
        />

        <div className="flex min-w-0 flex-1 justify-end">
          <div className="w-24">
            <button
              type="button"
              className="pressable flex w-full flex-col items-center rounded-[14px] bg-card p-[7px] shadow-[0px_4px_12px_rgba(23,10,60,0.10)]"
              aria-label={t('home.expandQr')}
              onClick={onExpandQr}
            >
              {qrValue ? (
                <QRCodeSVG
                  value={qrValue}
                  size={82}
                  level="M"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                />
              ) : (
                <span className="block h-[82px] w-[82px]" />
              )}
            </button>
            <button
              type="button"
              className="pressable mt-[5px] flex h-[30px] w-full items-center justify-center overflow-hidden rounded-[11px]"
              style={{ backgroundImage: gradient(colors.brand) }}
              onClick={() => router.push('/scan-organization')}
            >
              <MdQrCodeScanner size={13} color="#FFFFFF" />
              <span className="ml-[5px] text-[11px] font-bold text-white">
                {t('home.scanQr')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Ficha de cuenta + cerrar sesion.
function AccountCard({
  beneficiary,
  onSignOut,
  t,
}: {
  beneficiary: Beneficiary | null;
  onSignOut: () => void;
  t: Translate;
}) {
  const router = useRouter();
  return (
    <>
      <SectionHeader
        title={t('home.account')}
        action={t('home.editProfile')}
        icon={<FiEdit2 size={15} color={colors.purpleDeep} />}
        onClick={() => router.push('/profile')}
      />
      <div>
        <div className="mx-4 rounded-[18px] bg-card px-3 shadow-[0px_3px_10px_rgba(23,10,60,0.05)]">
          <InfoRow
            icon={<IoPerson size={14} />}
            label={t('home.name')}
            value={fullName(beneficiary)}
          />
          <InfoRow
            icon={<IoMail size={14} />}
            label={t('home.email')}
            value={beneficiary?.email ?? '-'}
          />
          <InfoRow
            icon={<IoCall size={14} />}
            label={t('home.phone')}
            value={beneficiary?.phone ?? '-'}
          />
          <InfoRow
            icon={<IoCard size={14} />}
            label={t('home.document')}
            value={beneficiary?.document_id ?? '-'}
            last
          />
        </div>

        {/* Debajo de la ficha, que ahora va a sangre, y centrado en la pagina. */}
        <button
          type="button"
          className="pressable mx-auto mt-[11px] flex h-12 w-[calc(100%-32px)] max-w-[320px] items-center justify-center rounded-2xl bg-danger-bg"
          onClick={onSignOut}
        >
          <FiLogOut size={18} color={colors.danger} />
          <span className="ml-2.5 text-[14.5px] font-bold text-danger">
            {t('signOut.action')}
          </span>
        </button>
      </div>
    </>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { beneficiary, userOrganizations, organizationsLoading, signOut } =
    useAuth();
  const t = useT();
  const unread = useUnreadNotifications(beneficiary?.id, t);
  const [showQRModal, setShowQRModal] = useState(false);

  // El total del hero es la suma de lo disponible en cada organizacion:
  // beneficiary.available_points nunca se actualiza, siempre llega en 0.
  const totalPoints = userOrganizations.reduce(
    (sum, org) => sum + (org.available_points ?? 0),
    0,
  );

  const qrValue = buildQrValue(beneficiary);

  const handleSignOut = async () => {
    const ok = await confirm({
      title: t('signOut.confirmTitle'),
      message: t('signOut.confirmBody'),
      confirmText: t('signOut.action'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await signOut();
    router.replace('/sign-in');
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      {showQRModal ? (
        <QrModal
          onClose={() => setShowQRModal(false)}
          qrValue={qrValue}
          name={fullName(beneficiary)}
          email={beneficiary?.email}
          t={t}
        />
      ) : null}

      <div className="page-column no-scrollbar flex-1 overflow-y-auto pb-[100px] pt-[calc(6px+env(safe-area-inset-top))]">
        <TopBar unread={unread} t={t} />

        <Hero
          firstName={beneficiary?.first_name}
          totalPoints={totalPoints}
          qrValue={qrValue}
          onExpandQr={() => setShowQRModal(true)}
          t={t}
        />

        {/* Mis organizaciones */}
        <SectionHeader title={t('home.myOrganizations')} />
        {organizationsLoading && userOrganizations.length === 0 ? (
          <div className="mt-4 flex justify-center">
            <Spinner size={20} color={colors.purple} />
          </div>
        ) : null}
        {/* Scroll propio acotado a 4 filas: se ven todas las organizaciones sin
            estirar la home. Un beneficiario sigue decenas de tiendas, no miles. */}
        {/* En el telefono la lista scrollea dentro de un alto de 4 filas
            (ORGS_MAX_HEIGHT), como en la app. En una ventana ancha entran en
            grilla y ese tope sobra: se ven todas de una. */}
        <div
          className="no-scrollbar overflow-y-auto md:!max-h-none md:grid md:grid-cols-2 md:gap-x-4 xl:grid-cols-3"
          style={{ maxHeight: ORGS_MAX_HEIGHT }}
        >
          {userOrganizations.map((item) => (
            <OrganizationCard key={item.id} item={item} t={t} />
          ))}
        </div>
        {!organizationsLoading && userOrganizations.length === 0 ? (
          <div className="mx-4 flex flex-col items-center rounded-2xl bg-card p-5">
            <p className="text-center text-[14px] text-ink">
              {t('home.emptyTitle')}
            </p>
            <p className="mt-1.5 text-center text-[12.5px] text-ink-soft">
              {t('home.emptyBody')}
            </p>
          </div>
        ) : null}

        {/* Explorar */}
        <div className="mx-4 mt-3 flex items-center rounded-[18px] bg-purple-tint p-2.5">
          <Image
            src={ART.store}
            alt=""
            width={50}
            height={46}
            className="h-[46px] w-[50px] shrink-0 object-contain"
          />
          <div className="ml-2.5 min-w-0 flex-1">
            <p className="text-[13.5px] font-extrabold text-ink">
              {t('home.exploreTitle')}
            </p>
            <p className="mt-0.5 text-[11px] leading-[14.5px] text-ink-soft">
              {t('home.exploreBody')}
            </p>
          </div>
          <button
            type="button"
            className="pressable flex h-9 shrink-0 items-center overflow-hidden rounded-[13px] px-[13px]"
            style={{ backgroundImage: gradient(colors.brand) }}
            onClick={() => router.push('/explore')}
          >
            <span className="mr-1 text-[13px] font-bold text-white">
              {t('home.exploreAction')}
            </span>
            <FiChevronRight size={16} color="#FFFFFF" />
          </button>
        </div>

        {/* Accesos rapidos */}
        <SectionHeader title={t('home.quickActions')} />
        <div className="flex gap-2 px-4">
          {/* Sin pantalla destino todavia: se dibujan como en el mockup pero no
              fingen ser tocables. Se vuelven botones cuando tengan ruta. */}
          {QUICK_ACTIONS.map((qa) => (
            <div
              key={qa.key}
              className="flex flex-1 flex-col items-center rounded-2xl bg-card py-2 shadow-[0px_3px_10px_rgba(23,10,60,0.05)]"
            >
              <Image
                src={qa.art}
                alt=""
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
              />
              <span className="mt-1.5 text-center text-[9.5px] leading-[13px] text-[#4E4D52]">
                {t(qa.label)}
              </span>
            </div>
          ))}
        </div>

        <AccountCard
          beneficiary={beneficiary}
          onSignOut={handleSignOut}
          t={t}
        />
      </div>

      <TabBar active="home" />
    </div>
  );
}
