'use client';

import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  FiArrowDown,
  FiArrowUp,
  FiChevronDown,
  FiSearch,
  FiXCircle,
} from 'react-icons/fi';
import { IoOptionsOutline } from 'react-icons/io5';

import ScreenHeader from '@/components/ScreenHeader';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { MessageKey, Translate } from '@/i18n';
import { supabase } from '@/lib/supabase/client';
import {
  colors,
  formatLongDate,
  formatPoints,
  formatTime,
  matches,
  norm,
} from '@/lib/theme';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const CHIP_ON = '#7F3FF7';

type ActivityKind = 'earned' | 'redeemed' | 'cancelled';

type Activity = {
  id: string;
  kind: ActivityKind;
  // Lo que decide bajo que chip cae: una compra cancelada sigue siendo un
  // movimiento de "Ganados" aunque se pinte como cancelado.
  group: 'earned' | 'redeemed';
  title: string;
  subtitle: string;
  points: number;
  at: string; // ISO
};

// Cada chip trae su color de reposo (lavanda / verde / rosa); el activo se
// pinta morado solido, como en el mockup.
const FILTERS = [
  { key: 'all', label: 'history.filterAll', bg: '#F1E9FE', fg: '#6627F5' },
  { key: 'earned', label: 'history.filterEarned', bg: '#F0FAF2', fg: '#0FA347' },
  {
    key: 'redeemed',
    label: 'history.filterRedeemed',
    bg: '#FEECF3',
    fg: '#F5056B',
  },
] as const satisfies readonly {
  key: string;
  label: MessageKey;
  bg: string;
  fg: string;
}[];

type FilterKey = (typeof FILTERS)[number]['key'];

// Rangos rapidos en dias. Para "el canje de tal dia" alcanza con escribir la
// fecha en el buscador: el texto indexado incluye el dia largo del item.
const PERIODS = [
  { key: 0, label: 'history.periodAll' },
  { key: 7, label: 'history.period7' },
  { key: 30, label: 'history.period30' },
  { key: 365, label: 'history.period365' },
] as const satisfies readonly { key: number; label: MessageKey }[];

const DAY_MS = 86_400_000;

// El corte se calcula al tocar el chip, no en el render: `Date.now()` durante
// el render es impuro.
type Period = { days: number; since: number };

const NO_PERIOD: Period = { days: 0, since: 0 };

const periodFrom = (days: number): Period => ({
  days,
  since: days ? Date.now() - days * DAY_MS : 0,
});

// La clave de grupo es la misma cadena que la cabecera: asi no puede pasar que
// dos filas del mismo dia caigan en grupos distintos con el mismo titulo.
const dayKey = (iso: string) => formatLongDate(iso);

// Lo que ve el buscador: tipo de movimiento, producto/tienda y la fecha larga,
// para que "chocolate", "canje" y "21 de agosto" caigan todos en el mismo campo.
const haystack = (a: Activity) =>
  `${a.title} ${a.subtitle} ${formatLongDate(a.at)}`;

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type PurchaseRow = {
  id: number;
  points_earned: number | null;
  purchase_date: string | null;
  created_at: string | null;
  status: 'active' | 'cancelled' | null;
  cancelled_at: string | null;
};

type RedemptionRow = {
  id: number;
  points_used: number | null;
  status: 'pending' | 'delivered' | 'cancelled' | null;
  requested_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  redemption_date: string | null;
  product: { name: string } | { name: string }[] | null;
};

const productName = (product: RedemptionRow['product'], t: Translate) =>
  (Array.isArray(product) ? product[0]?.name : product?.name) ??
  t('history.deletedProduct');

// Compras (puntos ganados) + canjes (puntos gastados) en un solo feed, que es
// lo que muestra la pantalla de historial del mockup. Ambas tablas ya tienen
// organization_id, asi que se filtra en la query y no en memoria.
async function loadActivity(
  beneficiaryId: string,
  organizationId: string,
  organizationName: string,
  t: Translate,
): Promise<Activity[]> {
  const [purchases, redemptions] = await Promise.all([
    supabase
      .from('purchase')
      .select(
        'id, points_earned, purchase_date, created_at, status, cancelled_at',
      )
      .eq('beneficiary_id', beneficiaryId)
      .eq('organization_id', organizationId)
      .order('purchase_date', { ascending: false }),
    supabase
      .from('redemption')
      .select(
        'id, points_used, status, requested_at, delivered_at, cancelled_at, redemption_date, product:product_id(name)',
      )
      .eq('beneficiary_id', beneficiaryId)
      .eq('organization_id', organizationId)
      .order('requested_at', { ascending: false }),
  ]);

  const earned: Activity[] = ((purchases.data ?? []) as PurchaseRow[])
    .map((p) => {
      const cancelled = p.status === 'cancelled';
      const at =
        (cancelled ? p.cancelled_at : null) ?? p.purchase_date ?? p.created_at;
      return at
        ? ({
            id: `p${p.id}`,
            kind: cancelled ? 'cancelled' : 'earned',
            group: 'earned',
            title: t(
              cancelled ? 'history.purchaseCancelled' : 'history.purchase',
            ),
            subtitle: t('history.purchaseAt', { name: organizationName }),
            points: p.points_earned ?? 0,
            at,
          } as Activity)
        : null;
    })
    .filter((a): a is Activity => a !== null);

  const spent: Activity[] = (
    (redemptions.data ?? []) as unknown as RedemptionRow[]
  )
    .map((r) => {
      const cancelled = r.status === 'cancelled';
      // Se muestra la fecha relevante para el estado actual del canje.
      const at =
        (cancelled ? r.cancelled_at : (r.delivered_at ?? r.redemption_date)) ??
        r.requested_at;
      return at
        ? ({
            id: `r${r.id}`,
            kind: cancelled ? 'cancelled' : 'redeemed',
            group: 'redeemed',
            title: t(
              cancelled ? 'history.redemptionCancelled' : 'history.redemption',
            ),
            subtitle: productName(r.product, t),
            points: r.points_used ?? 0,
            at,
          } as Activity)
        : null;
    })
    .filter((a): a is Activity => a !== null);

  return [...earned, ...spent].sort((a, b) => b.at.localeCompare(a.at));
}

// Carga el feed y lo mantiene fresco: cualquier compra o canje del beneficiario
// bombea refreshKey y vuelve a pedir.
function useActivity(
  beneficiaryId: string | undefined,
  organizationId: string | undefined,
  organizationName: string,
  t: Translate,
) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!beneficiaryId || !organizationId) return;
    let cancelled = false;
    (async () => {
      let next: Activity[] = [];
      try {
        next = await loadActivity(
          beneficiaryId,
          organizationId,
          organizationName,
          t,
        );
      } catch {
        next = [];
      }
      if (cancelled) return;
      setActivity(next);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // `t` entra en las deps a proposito: al cambiar de idioma los titulos
    // ("Compra realizada" / "Purchase") se rearman con el feed.
  }, [beneficiaryId, organizationId, organizationName, refreshKey, t]);

  useEffect(() => {
    if (!beneficiaryId) return;
    const channel = supabase.channel(`history-activity-${beneficiaryId}`);
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

  return { activity, loading };
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const TONE: Record<
  ActivityKind,
  { fg: string; bg: string; letter: string; sign: string }
> = {
  earned: { fg: colors.green, bg: colors.greenSoft, letter: 'G', sign: '+ ' },
  redeemed: {
    fg: colors.magenta,
    bg: colors.magentaSoft,
    letter: 'C',
    sign: '- ',
  },
  cancelled: { fg: colors.slate, bg: colors.line, letter: 'C', sign: '' },
};

function ActivityRow({ item, t }: { item: Activity; t: Translate }) {
  const tone = TONE[item.kind];
  return (
    <div className="mx-4 mt-[3px] flex h-[84px] items-center rounded-[14px] bg-card px-[14px] shadow-[0px_3px_10px_rgba(23,10,60,0.04)]">
      <span
        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-[18px] font-extrabold"
        style={{ backgroundColor: tone.bg, color: tone.fg }}
      >
        {tone.letter}
      </span>
      <div className="ml-[14px] min-w-0 flex-1">
        <p className="truncate text-[14px] font-extrabold text-navy">
          {item.title}
        </p>
        <p className="mt-1 truncate text-[13px] text-slate-soft">
          {item.subtitle}
        </p>
      </div>
      <div className="ml-2 shrink-0 text-right">
        <p className="text-[16px] font-extrabold" style={{ color: tone.fg }}>
          {tone.sign}
          {formatPoints(item.points)}{' '}
          <span className="text-[12px] font-bold">{t('common.pts')}</span>
        </p>
        <p className="mt-[5px] text-[12.5px] text-slate-soft">
          {formatTime(item.at)}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  earned,
  redeemed,
  available,
  t,
}: {
  earned: number;
  redeemed: number;
  available: number;
  t: Translate;
}) {
  const items = [
    { key: 'earned', color: colors.green, value: earned, label: 'org.pointsEarned' },
    {
      key: 'redeemed',
      color: colors.magenta,
      value: redeemed,
      label: 'org.pointsRedeemed',
    },
    {
      key: 'available',
      color: colors.violet,
      value: available,
      label: 'org.pointsAvailable',
    },
  ] as const;

  return (
    <div className="mx-4 flex h-[101px] items-center rounded-[18px] bg-card shadow-[0px_4px_14px_rgba(23,10,60,0.05)]">
      {items.map((item, i) => (
        <React.Fragment key={item.key}>
          {i > 0 ? <span className="h-[52px] w-px bg-line" /> : null}
          <div className="flex min-w-0 flex-1 flex-col items-center">
            <p
              className="text-[24px] font-extrabold tracking-[-0.5px]"
              style={{ color: item.color }}
            >
              {formatPoints(item.value)}
            </p>
            <p className="mt-1.5 text-[12.5px] text-slate">
              {t(item.label as MessageKey)}
            </p>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// Panel de busqueda avanzada: se despliega con el boton de filtros y no ocupa
// lugar mientras esta cerrado.
function SearchPanel({
  query,
  onQuery,
  period,
  onPeriod,
  oldestFirst,
  onOldestFirst,
  count,
  t,
}: {
  query: string;
  onQuery: (next: string) => void;
  period: number;
  onPeriod: (next: number) => void;
  oldestFirst: boolean;
  onOldestFirst: () => void;
  count: number;
  t: Translate;
}) {
  return (
    <div className="mx-4 mt-3 rounded-2xl bg-card p-3 shadow-[0px_4px_14px_rgba(23,10,60,0.05)]">
      <div className="flex h-[46px] items-center gap-2 rounded-xl border border-[#E6E8EF] px-3">
        <FiSearch size={16} color={colors.muted} className="shrink-0" />
        <input
          type="search"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent p-0 text-[14.5px] text-[#0C0F1A] outline-none placeholder:text-[#868B9A] [&::-webkit-search-cancel-button]:appearance-none"
          placeholder={t('history.searchPlaceholder')}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
        {query ? (
          <button
            type="button"
            className="pressable shrink-0"
            aria-label={t('common.clearSearch')}
            onClick={() => onQuery('')}
          >
            <FiXCircle size={16} color={colors.chevron} />
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {PERIODS.map((p) => {
          const on = period === p.key;
          return (
            <button
              key={p.key}
              type="button"
              className={cn(
                'pressable rounded-full px-[13px] py-[7px] text-[12.5px] font-bold',
                on ? 'text-white' : 'bg-violet-soft text-violet',
              )}
              style={on ? { backgroundColor: CHIP_ON } : undefined}
              onClick={() => onPeriod(p.key)}
            >
              {t(p.label)}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12.5px] text-slate">
          {count === 1
            ? t('history.countOne')
            : t('history.countMany', { count })}
        </span>
        <button
          type="button"
          className="pressable flex items-center gap-1.5"
          aria-label={t(
            oldestFirst ? 'history.sortNewestLabel' : 'history.sortOldestLabel',
          )}
          onClick={onOldestFirst}
        >
          {oldestFirst ? (
            <FiArrowUp size={14} color={colors.violet} />
          ) : (
            <FiArrowDown size={14} color={colors.violet} />
          )}
          <span className="text-[12.5px] font-bold text-violet">
            {t(oldestFirst ? 'history.sortOldest' : 'history.sortNewest')}
          </span>
        </button>
      </div>
    </div>
  );
}

// Fila de chips de tipo + boton de busqueda/filtros.
function FilterRow({
  filter,
  onSelectFilter,
  panelOn,
  panelOpen,
  filtersOn,
  onTogglePanel,
  t,
}: {
  filter: FilterKey;
  onSelectFilter: (key: FilterKey) => void;
  panelOn: boolean;
  panelOpen: boolean;
  filtersOn: boolean;
  onTogglePanel: () => void;
  t: Translate;
}) {
  return (
    <div className="mt-[23px] flex items-center gap-2 px-4">
      {FILTERS.map((f) => {
        const active = filter === f.key;
        return (
          <button
            key={f.key}
            type="button"
            className="pressable flex h-[37px] items-center justify-center rounded-xl px-[17px] text-[13.5px] font-bold"
            style={{
              backgroundColor: active ? CHIP_ON : f.bg,
              color: active ? '#FFFFFF' : f.fg,
            }}
            onClick={() => onSelectFilter(f.key)}
          >
            {t(f.label)}
          </button>
        );
      })}
      <button
        type="button"
        className={cn(
          'pressable relative ml-auto flex h-[38px] w-10 items-center justify-center rounded-xl shadow-[0px_3px_10px_rgba(23,10,60,0.06)]',
          panelOn ? '' : 'bg-card',
        )}
        style={panelOn ? { backgroundColor: CHIP_ON } : undefined}
        aria-label={t('history.filtersLabel')}
        onClick={onTogglePanel}
      >
        <IoOptionsOutline size={19} color={panelOn ? '#FFFFFF' : colors.slate} />
        {filtersOn && !panelOpen ? (
          <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full bg-magenta" />
        ) : null}
      </button>
    </div>
  );
}

// Cuerpo de la lista: carga / vacio / feed agrupado por dia + "Cargar mas".
function ActivityFeed({
  loading,
  activity,
  page,
  totalOrdered,
  organizationName,
  onLoadMore,
  t,
}: {
  loading: boolean;
  activity: Activity[];
  page: Activity[];
  totalOrdered: number;
  organizationName: string;
  onLoadMore: () => void;
  t: Translate;
}) {
  if (loading) {
    return (
      <div className="mt-6 flex justify-center">
        <Spinner size={20} color={colors.violet} />
      </div>
    );
  }

  if (page.length === 0) {
    return (
      <div className="flex flex-col items-center px-8 py-7">
        <p className="text-[32px] leading-none">{activity.length ? '🔍' : '🎁'}</p>
        <p className="mt-2.5 text-[15px] font-bold text-ink">
          {t(activity.length ? 'common.noResults' : 'history.emptyTitle')}
        </p>
        <p className="mt-1.5 text-center text-[13px] text-slate">
          {activity.length
            ? t('history.noResultsBody')
            : t('history.emptyBody', { name: organizationName })}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* La pastilla del dia ocupa la fila entera y los movimientos van de a
          dos en una ventana ancha; en el telefono es una columna. */}
      <div className="lg:grid lg:grid-cols-2">
        {page.map((item, i) => (
          <React.Fragment key={item.id}>
            {i === 0 || dayKey(page[i - 1].at) !== dayKey(item.at) ? (
              <div
                className={cn(
                  'mx-4 flex h-8 items-center rounded-xl bg-lilac-row px-[14px] lg:col-span-2',
                  i > 0 && 'mt-[21px]',
                )}
              >
                <span className="text-[13px] text-[#6B6796]">
                  {formatLongDate(item.at)}
                </span>
              </div>
            ) : null}
            <ActivityRow item={item} t={t} />
          </React.Fragment>
        ))}
      </div>

      {page.length < totalOrdered ? (
        <button
          type="button"
          className="pressable mx-4 mt-7 flex h-[45px] w-[calc(100%-32px)] items-center justify-center gap-2.5 rounded-[14px] bg-lilac md:mx-auto md:w-[320px]"
          onClick={onLoadMore}
        >
          <span className="text-[15px] font-bold text-violet">
            {t('history.loadMore')}
          </span>
          <FiChevronDown size={18} color={colors.violet} />
        </button>
      ) : null}
    </>
  );
}

export default function ActivityHistoryPage() {
  const id = String(useParams().id ?? '');
  const { userOrganizations, beneficiary } = useAuth();
  const t = useT();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [oldestFirst, setOldestFirst] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [panelOpen, setPanelOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<Period>(NO_PERIOD);

  const membership = userOrganizations.find(
    (org) => org.organization_id.toString() === id,
  );
  const organizationName =
    membership?.organization?.name ?? t('history.theOrganization');

  const { activity, loading } = useActivity(
    beneficiary?.id,
    id,
    organizationName,
    t,
  );

  const q = norm(query.trim());
  const filtered = activity.filter(
    (a) =>
      (filter === 'all' || a.group === filter) &&
      (!period.since || Date.parse(a.at) >= period.since) &&
      (!q || matches(haystack(a), q)),
  );
  const ordered = oldestFirst ? [...filtered].reverse() : filtered;
  const page = ordered.slice(0, visibleCount);
  const filtersOn = q !== '' || period.days !== 0;
  const panelOn = panelOpen || filtersOn;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader title={t('history.header')} />
      <div className="page-column no-scrollbar flex-1 overflow-y-auto pb-8">
        <FilterRow
          filter={filter}
          onSelectFilter={(key) => {
            setFilter(key);
            setVisibleCount(PAGE_SIZE);
          }}
          panelOn={panelOn}
          panelOpen={panelOpen}
          filtersOn={filtersOn}
          onTogglePanel={() => setPanelOpen((v) => !v)}
          t={t}
        />

        {panelOpen ? (
          <SearchPanel
            query={query}
            onQuery={(next) => {
              setQuery(next);
              setVisibleCount(PAGE_SIZE);
            }}
            period={period.days}
            onPeriod={(days) => {
              setPeriod(periodFrom(days));
              setVisibleCount(PAGE_SIZE);
            }}
            oldestFirst={oldestFirst}
            onOldestFirst={() => setOldestFirst((v) => !v)}
            count={ordered.length}
            t={t}
          />
        ) : null}

        <h2 className="mb-3 mt-5 px-4 text-[16.5px] font-extrabold text-ink">
          {t('history.summary')}
        </h2>
        <SummaryCard
          earned={membership?.total_points_earned ?? 0}
          redeemed={membership?.total_points_redeemed ?? 0}
          available={membership?.available_points ?? 0}
          t={t}
        />

        <h2 className="mb-3 mt-[30px] px-4 text-[16.5px] font-extrabold text-ink">
          {t('history.recent')}
        </h2>

        <ActivityFeed
          loading={loading}
          activity={activity}
          page={page}
          totalOrdered={ordered.length}
          organizationName={organizationName}
          onLoadMore={() => setVisibleCount((v) => v + PAGE_SIZE)}
          t={t}
        />
      </div>
    </div>
  );
}
