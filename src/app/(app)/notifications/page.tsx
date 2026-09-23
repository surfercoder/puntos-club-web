'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { FiChevronRight, FiTrash2 } from 'react-icons/fi';

import ScreenHeader from '@/components/ScreenHeader';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { Translate } from '@/i18n';
import {
  BUCKET_LABEL,
  bucketOf,
  getClearedAt,
  loadNotifications,
  markCleared,
  markSeen,
  visible,
  type AppNotification,
  type Bucket,
  type NotifKind,
} from '@/lib/notifications';
import { confirm } from '@/lib/confirm';
import { colors, formatDayMonth, formatTime } from '@/lib/theme';

// Fondo de tarjeta por tipo, como en el mockup: verde cuando entran puntos,
// rosa cuando salen y lila para todo lo informativo.
const TINT: Record<NotifKind, string> = {
  points: colors.notifGreen,
  redeem: colors.notifPink,
  promo: colors.notifLilac,
  rewards: colors.notifLilac,
  joined: colors.notifLilac,
};

const BUCKETS: Bucket[] = ['today', 'yesterday', 'week', 'older'];

// Hoy y ayer llevan la hora; de ahi para atras, la fecha — decir "19:45" de
// algo de hace tres semanas no ubica a nadie. Las filas que vienen de una
// columna `date` (premios nuevos) no tienen hora que mostrar.
const stamp = (item: AppNotification, bucket: Bucket) =>
  item.at.length > 10 && (bucket === 'today' || bucket === 'yesterday')
    ? formatTime(item.at)
    : formatDayMonth(item.at);

function useNotifications(beneficiaryId: string | undefined) {
  const t = useT();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!beneficiaryId) return;
    let cancelled = false;
    (async () => {
      let next: AppNotification[] = [];
      let clearedAt: string | null = null;
      let loaded = true;
      try {
        [next, clearedAt] = await Promise.all([
          loadNotifications(beneficiaryId, t),
          getClearedAt(beneficiaryId),
        ]);
      } catch {
        next = [];
        loaded = false;
      }
      if (cancelled) return;
      setItems(visible(next, clearedAt));
      setLoading(false);
      // Abrir el panel es haberlas visto: apaga el badge de la campana. Solo si
      // de verdad se cargo: marcar sobre un feed vacio por error silenciaria
      // para siempre notificaciones que nunca se mostraron.
      if (loaded) markSeen(beneficiaryId);
    })();
    return () => {
      cancelled = true;
    };
    // `t` entra en las deps a proposito: los textos se arman al cargar, asi que
    // cambiar de idioma tiene que rearmar el feed.
  }, [beneficiaryId, t]);

  return { items, loading, clear: () => setItems([]) };
}

function Row({ item, bucket }: { item: AppNotification; bucket: Bucket }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="pressable mx-4 mb-2.5 flex w-[calc(100%-32px)] items-center gap-3 rounded-2xl px-3 py-3.5 text-left"
      style={{ backgroundColor: TINT[item.kind] }}
      onClick={() => router.push(`/organization/${item.organizationId}`)}
    >
      {item.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.logoUrl}
          alt=""
          className="h-[50px] w-[50px] shrink-0 rounded-full bg-white object-contain"
        />
      ) : (
        <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full bg-violet-soft text-[21px] font-extrabold text-violet">
          {item.organizationName.trim().charAt(0).toUpperCase()}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[15.5px] font-extrabold text-ink">
          {item.title}
        </span>
        <span className="mt-1 line-clamp-3 block text-[13.5px] leading-[19px] text-ink-soft">
          {item.body}
        </span>
      </span>

      {/* La hora arriba y el chevron abajo, como en el mockup. El alto minimo
          evita que la columna se aplaste con un cuerpo de una sola linea. */}
      <span className="flex min-h-[56px] shrink-0 flex-col items-end justify-between">
        <span className="text-[12.5px] text-slate">{stamp(item, bucket)}</span>
        <FiChevronRight size={20} color={colors.violet} />
      </span>
    </button>
  );
}

function Feed({
  loading,
  items,
  now,
  t,
}: {
  loading: boolean;
  items: AppNotification[];
  now: number;
  t: Translate;
}) {
  if (loading) {
    return (
      <div className="mt-7 flex justify-center">
        <Spinner size={20} color={colors.violet} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center px-8 py-10">
        <p className="text-[34px] leading-none">🔔</p>
        <p className="mt-2.5 text-[15px] font-bold text-ink">
          {t('notif.emptyTitle')}
        </p>
        <p className="mt-1.5 text-center text-[13px] text-slate">
          {t('notif.emptyBody')}
        </p>
      </div>
    );
  }

  return (
    <>
      {BUCKETS.map((bucket) => {
        const group = items.filter((n) => bucketOf(n.at, now) === bucket);
        if (group.length === 0) return null;
        return (
          <div key={bucket}>
            <h2 className="mb-2.5 mt-5 px-4 text-[16px] font-bold text-ink">
              {t(BUCKET_LABEL[bucket])}
            </h2>
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-4">
              {group.map((item) => (
                <Row key={item.id} item={item} bucket={bucket} />
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

export default function NotificationsPage() {
  const { beneficiary } = useAuth();
  const t = useT();
  const { items, loading, clear } = useNotifications(beneficiary?.id);

  // Una sola lectura del reloj por render: `Date.now()` repartido por el arbol
  // es impuro y ademas puede cruzar la medianoche a mitad de lista.
  const [now] = useState(() => Date.now());

  // Borrar es local y no toca la base: se guarda la marca de "limpiado hasta" y
  // el feed se filtra contra ella. Nada de esto pierde datos — puntos y canjes
  // siguen enteros en el historial — pero igual se confirma, porque es
  // irreversible para el panel.
  const onClear = async () => {
    // El tacho esta deshabilitado cuando no hay nada que limpiar, asi que aca
    // solo queda el estrechamiento de tipo para markCleared.
    /* v8 ignore next */
    if (!beneficiary?.id) return;
    const ok = await confirm({
      title: t('notif.clearTitle'),
      message: t('notif.clearBody'),
      confirmText: t('notif.clearConfirm'),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    markCleared(beneficiary.id);
    clear();
  };

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader
        title={t('notif.header')}
        subtitle={t('notif.subtitle')}
        right={
          <button
            type="button"
            className="pressable px-[18px]"
            aria-label={t('notif.clear')}
            disabled={items.length === 0}
            onClick={onClear}
          >
            <FiTrash2
              size={21}
              color={items.length === 0 ? 'rgba(255,255,255,0.45)' : '#FFFFFF'}
            />
          </button>
        }
      />
      <div className="page-column no-scrollbar flex-1 overflow-y-auto pb-7">
        <Feed loading={loading} items={items} now={now} t={t} />
      </div>
    </div>
  );
}
