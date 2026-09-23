'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiGift,
  FiMinus,
  FiPlus,
} from 'react-icons/fi';

import ScreenHeader from '@/components/ScreenHeader';
import TabBar from '@/components/TabBar';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { MessageKey, Translate } from '@/i18n';
import { supabase } from '@/lib/supabase/client';
import { colors, formatLongDate, formatPoints, formatTime } from '@/lib/theme';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const CHIP_ON = '#7F3FF7';
const DAY_MS = 86_400_000;

// Los tres grupos del mockup. "Cancelaciones" son compras dadas de baja (puntos
// que se quitan); un canje cancelado no cancela puntos, los devuelve, asi que
// sigue viviendo bajo "Canjes" y se pinta en gris, igual que en el historial
// por organizacion.
type Group = 'assigned' | 'cancelled' | 'redeemed';
type Kind = Group | 'redeemCancelled';

type Movement = {
  id: string;
  kind: Kind;
  group: Group;
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
  title: MessageKey;
  detail: string | null; // nombre del producto, solo en canjes
  points: number;
  at: string; // ISO
};

const FILTERS = [
  { key: 'all', label: 'historyAll.filterAll', Icon: null },
  { key: 'assigned', label: 'historyAll.filterAssigned', Icon: FiPlus },
  { key: 'cancelled', label: 'historyAll.filterCancelled', Icon: FiMinus },
  { key: 'redeemed', label: 'historyAll.filterRedeemed', Icon: FiGift },
] as const satisfies readonly {
  key: 'all' | Group;
  label: MessageKey;
  Icon: React.ComponentType<{ size?: number; color?: string }> | null;
}[];

type FilterKey = (typeof FILTERS)[number]['key'];

const PERIODS = [
  { days: 0, label: 'historyAll.period0' },
  { days: 7, label: 'historyAll.period7' },
  { days: 30, label: 'historyAll.period30' },
  { days: 90, label: 'historyAll.period90' },
  { days: 365, label: 'historyAll.period365' },
] as const satisfies readonly { days: number; label: MessageKey }[];

// El mockup abre en "Ultimos 3 meses".
const DEFAULT_PERIOD = 3;

// Se guarda el indice y no los dias: el rotulo del desplegable sale de PERIODS
// sin tener que buscarlo. El corte se calcula al elegir el periodo, no en cada
// render: `Date.now()` durante el render es impuro.
type Period = { ix: number; since: number };

const periodFrom = (ix: number): Period => ({
  ix,
  since: PERIODS[ix].days ? Date.now() - PERIODS[ix].days * DAY_MS : 0,
});

// Cabecera de dia: "Hoy, 12 de mayo de 2026" / "Ayer, ..." / la fecha sola.
const dayLabel = (iso: string, t: Translate) => {
  const long = formatLongDate(iso);
  const today = formatLongDate(new Date().toISOString());
  if (long === today) return t('historyAll.today', { date: long });
  const yesterday = formatLongDate(new Date(Date.now() - DAY_MS).toISOString());
  if (long === yesterday) return t('historyAll.yesterday', { date: long });
  return long;
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Org = { id: number; name: string; logo_url: string | null };

// PostgREST devuelve el embed como objeto o como array segun infiera la
// cardinalidad; ambas formas llegan en la misma consulta.
type Embed = Org | Org[] | null;

const one = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

type PurchaseRow = {
  id: number;
  organization_id: number;
  points_earned: number | null;
  purchase_date: string | null;
  created_at: string | null;
  status: 'active' | 'cancelled' | null;
  cancelled_at: string | null;
  organization: Embed;
};

type RedemptionRow = {
  id: number;
  organization_id: number;
  points_used: number | null;
  status: 'pending' | 'delivered' | 'cancelled' | null;
  requested_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  redemption_date: string | null;
  product: { name: string } | { name: string }[] | null;
  organization: Embed;
};

// Compras + canjes de TODAS las organizaciones en un solo feed. El nombre y el
// logo vienen embebidos en la consulta y no del contexto: una membresia dada de
// baja deja igual sus movimientos, y sin el embed quedarian sin identificar.
async function loadMovements(
  beneficiaryId: string,
  t: Translate,
): Promise<Movement[]> {
  const [purchases, redemptions] = await Promise.all([
    supabase
      .from('purchase')
      .select(
        'id, organization_id, points_earned, purchase_date, created_at, status, cancelled_at, organization:organization_id(id, name, logo_url)',
      )
      .eq('beneficiary_id', beneficiaryId)
      .order('purchase_date', { ascending: false }),
    supabase
      .from('redemption')
      .select(
        'id, organization_id, points_used, status, requested_at, delivered_at, cancelled_at, redemption_date, product:product_id(name), organization:organization_id(id, name, logo_url)',
      )
      .eq('beneficiary_id', beneficiaryId)
      .order('requested_at', { ascending: false }),
  ]);

  const org = (row: { organization_id: number; organization: Embed }) => {
    const embedded = one(row.organization);
    return {
      organizationId: String(row.organization_id),
      organizationName: embedded?.name ?? t('history.theOrganization'),
      logoUrl: embedded?.logo_url ?? null,
    };
  };

  const bought = ((purchases.data ?? []) as unknown as PurchaseRow[])
    .map((p): Movement | null => {
      const cancelled = p.status === 'cancelled';
      const at =
        (cancelled ? p.cancelled_at : null) ?? p.purchase_date ?? p.created_at;
      if (!at) return null;
      return {
        id: `p${p.id}`,
        kind: cancelled ? 'cancelled' : 'assigned',
        group: cancelled ? 'cancelled' : 'assigned',
        ...org(p),
        title: cancelled ? 'history.purchaseCancelled' : 'history.purchase',
        detail: null,
        points: p.points_earned ?? 0,
        at,
      };
    })
    .filter((m): m is Movement => m !== null);

  const redeemed = ((redemptions.data ?? []) as unknown as RedemptionRow[])
    .map((r): Movement | null => {
      const cancelled = r.status === 'cancelled';
      // Se muestra la fecha relevante para el estado actual del canje.
      const at =
        (cancelled ? r.cancelled_at : (r.delivered_at ?? r.redemption_date)) ??
        r.requested_at;
      if (!at) return null;
      return {
        id: `r${r.id}`,
        kind: cancelled ? 'redeemCancelled' : 'redeemed',
        group: 'redeemed',
        ...org(r),
        title: cancelled
          ? 'history.redemptionCancelled'
          : 'historyAll.redemption',
        detail: one(r.product)?.name ?? t('history.deletedProduct'),
        points: r.points_used ?? 0,
        at,
      };
    })
    .filter((m): m is Movement => m !== null);

  return [...bought, ...redeemed].sort((a, b) => b.at.localeCompare(a.at));
}

// Carga el feed y lo mantiene fresco: cualquier compra o canje del beneficiario
// bombea refreshKey y vuelve a pedir.
function useMovements(beneficiaryId: string | undefined, t: Translate) {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!beneficiaryId) return;
    let cancelled = false;
    (async () => {
      let next: Movement[] = [];
      try {
        next = await loadMovements(beneficiaryId, t);
      } catch {
        next = [];
      }
      if (cancelled) return;
      setMovements(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // `t` entra en las deps a proposito: al cambiar de idioma los nombres de
    // producto por defecto se rearman con el feed.
  }, [beneficiaryId, refreshKey, t]);

  useEffect(() => {
    if (!beneficiaryId) return;
    const channel = supabase.channel(`history-all-${beneficiaryId}`);
    const bump = () => setRefreshKey((k) => k + 1);
    const onRedemption = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'redemption',
        filter: `beneficiary_id=eq.${beneficiaryId}`,
      },
      bump,
    );
    const onPurchase = onRedemption.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'purchase',
        filter: `beneficiary_id=eq.${beneficiaryId}`,
      },
      bump,
    );
    onPurchase.subscribe();
    return () => {
      onPurchase.unsubscribe();
      onRedemption.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [beneficiaryId]);

  return { movements, loading };
}

// Los totales de las tres fichas se calculan sobre el periodo elegido, no sobre
// el chip de tipo: las fichas son el resumen del periodo y el chip filtra la
// lista de abajo.
const summarize = (movements: Movement[]) => ({
  assigned: movements
    .filter((m) => m.kind === 'assigned')
    .reduce((sum, m) => sum + m.points, 0),
  cancelled: movements
    .filter((m) => m.kind === 'cancelled')
    .reduce((sum, m) => sum + m.points, 0),
  redemptions: movements.filter((m) => m.kind === 'redeemed').length,
});

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const TONE: Record<Kind, { fg: string; bg: string; sign: string }> = {
  assigned: { fg: colors.green, bg: colors.greenSoft, sign: '+ ' },
  cancelled: { fg: colors.danger, bg: colors.dangerBg, sign: '- ' },
  redeemed: { fg: colors.magenta, bg: colors.magentaSoft, sign: '- ' },
  redeemCancelled: { fg: colors.slate, bg: colors.line, sign: '' },
};

function SummaryCards({
  movements,
  t,
}: {
  movements: Movement[];
  t: Translate;
}) {
  const totals = summarize(movements);
  const cards = [
    {
      key: 'assigned',
      Icon: FiPlus,
      fg: colors.green,
      bg: colors.greenSoft,
      value: formatPoints(totals.assigned),
      label: 'historyAll.assignedPoints',
    },
    {
      key: 'cancelled',
      Icon: FiMinus,
      fg: colors.magenta,
      bg: colors.magentaSoft,
      value: formatPoints(totals.cancelled),
      label: 'historyAll.cancelledPoints',
    },
    {
      key: 'redeemed',
      Icon: FiGift,
      fg: colors.violet,
      bg: colors.violetSoft,
      value: String(totals.redemptions),
      label: 'historyAll.redemptionsDone',
    },
  ] as const satisfies readonly {
    key: string;
    Icon: React.ComponentType<{ size?: number; color?: string }>;
    fg: string;
    bg: string;
    value: string;
    label: MessageKey;
  }[];

  return (
    <div className="mt-4 flex gap-[9px] px-4">
      {cards.map(({ key, Icon, fg, bg, value, label }) => (
        <div
          key={key}
          className="flex min-h-[84px] flex-1 items-center gap-[7px] rounded-2xl bg-card px-[9px] py-3 shadow-[0px_4px_14px_rgba(23,10,60,0.05)]"
        >
          <span
            className="flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: bg }}
          >
            <Icon size={17} color={fg} />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-[17px] font-extrabold tracking-[-0.4px]"
              style={{ color: fg }}
            >
              {value}
            </p>
            {/* "Canjes realizados" no entra de una en una ficha de un tercio de
                pantalla: se deja en dos lineas. */}
            <p className="mt-[3px] line-clamp-2 text-[10.5px] text-slate">
              {t(label)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterChips({
  filter,
  onSelect,
  t,
}: {
  filter: FilterKey;
  onSelect: (key: FilterKey) => void;
  t: Translate;
}) {
  return (
    // El scroll horizontal es del mockup, para que los 4 chips con icono no se
    // corten en pantallas angostas.
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-4">
      {FILTERS.map(({ key, label, Icon }) => {
        const on = filter === key;
        const tone = key === 'all' ? null : TONE[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            className={cn(
              'pressable flex h-[42px] shrink-0 items-center gap-2 rounded-[14px] px-[15px] shadow-[0px_3px_10px_rgba(23,10,60,0.05)]',
              on ? '' : 'bg-card',
            )}
            style={on ? { backgroundColor: CHIP_ON } : undefined}
            onClick={() => onSelect(key)}
          >
            {Icon && tone ? (
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full"
                style={{
                  backgroundColor: on ? 'rgba(255,255,255,0.22)' : tone.fg,
                }}
              >
                <Icon size={12} color="#FFFFFF" />
              </span>
            ) : null}
            <span
              className={cn(
                'whitespace-nowrap text-[14px] font-bold',
                on ? 'text-white' : 'text-ink',
              )}
            >
              {t(label)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Desplegable de periodo: una lista propia en vez de un <select> nativo, que
// no se puede pintar como el mockup.
function PeriodSelect({
  period,
  onSelect,
  t,
}: {
  period: Period;
  onSelect: (ix: number) => void;
  t: Translate;
}) {
  const [open, setOpen] = useState(false);
  const current = PERIODS[period.ix];

  return (
    <div className="mx-4 overflow-hidden rounded-[14px] bg-card shadow-[0px_3px_10px_rgba(23,10,60,0.05)]">
      <button
        type="button"
        aria-label={t('historyAll.periodLabel')}
        aria-expanded={open}
        className="pressable flex h-[52px] w-full items-center gap-2.5 px-[14px]"
        onClick={() => setOpen((v) => !v)}
      >
        <FiCalendar size={17} color={colors.violet} />
        <span className="flex-1 text-left text-[14.5px] font-semibold text-ink">
          {t(current.label)}
        </span>
        {open ? (
          <FiChevronUp size={18} color={colors.violet} />
        ) : (
          <FiChevronDown size={18} color={colors.violet} />
        )}
      </button>

      {open
        ? PERIODS.map((p, ix) => (
            <button
              key={p.days}
              type="button"
              className="pressable flex w-full items-center justify-between border-t border-line px-[14px] py-3"
              onClick={() => {
                onSelect(ix);
                setOpen(false);
              }}
            >
              <span
                className={cn(
                  'text-[14px]',
                  ix === period.ix ? 'font-bold text-violet' : 'text-slate',
                )}
              >
                {t(p.label)}
              </span>
              {ix === period.ix ? (
                <FiCheck size={16} color={colors.violet} />
              ) : null}
            </button>
          ))
        : null}
    </div>
  );
}

function MovementRow({ item, t }: { item: Movement; t: Translate }) {
  const router = useRouter();
  const tone = TONE[item.kind];
  return (
    <button
      type="button"
      className="pressable mx-4 mb-2 flex min-h-[84px] w-[calc(100%-32px)] items-center gap-2.5 rounded-2xl bg-card px-3 py-3 text-left shadow-[0px_3px_10px_rgba(23,10,60,0.04)]"
      onClick={() => router.push(`/organization/${item.organizationId}`)}
    >
      {item.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.logoUrl}
          alt=""
          className="h-11 w-11 shrink-0 rounded-full border border-line bg-[#FCFCFE] object-contain"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-soft text-[19px] font-extrabold text-violet">
          {item.organizationName.trim().charAt(0).toUpperCase()}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-extrabold text-navy">
          {item.organizationName}
        </span>
        <span className="mt-[3px] block truncate text-[12.5px] text-slate-soft">
          {t(item.title)}
        </span>
        {item.detail ? (
          <span className="mt-[3px] block truncate text-[12.5px] text-slate-soft">
            {item.detail}
          </span>
        ) : null}
        <span className="mt-[3px] block text-[12.5px] text-slate-soft">
          {formatTime(item.at)}
        </span>
      </span>

      <span
        className="shrink-0 rounded-[11px] px-[11px] py-2 text-[14.5px] font-extrabold"
        style={{ backgroundColor: tone.bg, color: tone.fg }}
      >
        {tone.sign}
        {formatPoints(item.points)}{' '}
        <span className="text-[11px] font-bold">{t('common.pts')}</span>
      </span>
      <FiChevronRight size={20} color={colors.violet} className="shrink-0" />
    </button>
  );
}

// Cuerpo de la lista: carga / vacio / feed agrupado por dia + "Cargar mas".
function Feed({
  loading,
  total,
  page,
  shown,
  onLoadMore,
  t,
}: {
  loading: boolean;
  total: number;
  page: Movement[];
  shown: number;
  onLoadMore: () => void;
  t: Translate;
}) {
  if (loading) {
    return (
      <div className="mt-7 flex justify-center">
        <Spinner size={20} color={colors.violet} />
      </div>
    );
  }

  if (page.length === 0) {
    return (
      <div className="flex flex-col items-center px-8 py-[30px]">
        <p className="text-[32px] leading-none">{total ? '🔍' : '🎁'}</p>
        <p className="mt-2.5 text-[15px] font-bold text-ink">
          {t(total ? 'historyAll.noResultsTitle' : 'historyAll.emptyTitle')}
        </p>
        <p className="mt-1.5 text-center text-[13px] text-slate">
          {t(total ? 'historyAll.noResultsBody' : 'historyAll.emptyBody')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* El titulo del dia ocupa la fila entera y los movimientos van de a dos
          en una ventana ancha; en el telefono es una columna, como en la app. */}
      <div className="lg:grid lg:grid-cols-2">
        {page.map((item, i) => (
          <React.Fragment key={item.id}>
            {i === 0 ||
            formatLongDate(page[i - 1].at) !== formatLongDate(item.at) ? (
              <p
                className={cn(
                  'mb-2.5 px-4 text-[14.5px] text-slate lg:col-span-2',
                  i > 0 ? 'mt-[22px]' : 'mt-5',
                )}
              >
                {dayLabel(item.at, t)}
              </p>
            ) : null}
            <MovementRow item={item} t={t} />
          </React.Fragment>
        ))}
      </div>

      {page.length < shown ? (
        <button
          type="button"
          className="pressable mx-4 mt-[18px] flex h-12 w-[calc(100%-32px)] items-center justify-center gap-2.5 rounded-[14px] bg-lilac md:mx-auto md:w-[320px]"
          onClick={onLoadMore}
        >
          <FiChevronDown size={18} color={colors.violet} />
          <span className="text-[15px] font-bold text-violet">
            {t('historyAll.loadMore')}
          </span>
        </button>
      ) : null}
    </>
  );
}

export default function GeneralHistoryPage() {
  const { beneficiary } = useAuth();
  const t = useT();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [period, setPeriod] = useState<Period>(() => periodFrom(DEFAULT_PERIOD));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const { movements, loading } = useMovements(beneficiary?.id, t);

  const inPeriod = movements.filter(
    (m) => !period.since || Date.parse(m.at) >= period.since,
  );
  const filtered = inPeriod.filter((m) => filter === 'all' || m.group === filter);
  const page = filtered.slice(0, visibleCount);

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader
        title={t('historyAll.header')}
        subtitle={t('historyAll.subtitle')}
      />
      <div className="page-column no-scrollbar flex-1 overflow-y-auto pb-[110px]">
        <SummaryCards movements={inPeriod} t={t} />

        <FilterChips
          filter={filter}
          onSelect={(key) => {
            setFilter(key);
            setVisibleCount(PAGE_SIZE);
          }}
          t={t}
        />

        <PeriodSelect
          period={period}
          onSelect={(ix) => {
            setPeriod(periodFrom(ix));
            setVisibleCount(PAGE_SIZE);
          }}
          t={t}
        />

        <Feed
          loading={loading}
          total={movements.length}
          page={page}
          shown={filtered.length}
          onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)}
          t={t}
        />
      </div>
      <TabBar active="history" />
    </div>
  );
}
