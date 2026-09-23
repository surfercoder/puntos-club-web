'use client';

import type { MessageKey, Translate } from '@/i18n';
import { supabase } from '@/lib/supabase/client';
import { formatPoints } from '@/lib/theme';

// El panel de notificaciones no tiene tabla propia: se arma con lo que ya
// registra la base (compras, canjes, campanas enviadas, altas de membresia y
// premios nuevos). Una tabla de notificaciones por beneficiario obligaria a
// triggers en cinco tablas + backfill, y no agrega nada que el usuario vea: los
// eventos ya estan todos fechados.
// ponytail: por eso tampoco hay "leido" por fila en la base. Lo unico que se
// guarda es una marca local por beneficiario (ver seenAt / clearedAt abajo).

export type NotifKind = 'points' | 'redeem' | 'promo' | 'rewards' | 'joined';

export type AppNotification = {
  id: string;
  kind: NotifKind;
  organizationId: string;
  organizationName: string;
  logoUrl: string | null;
  title: string;
  body: string;
  /** ISO. 'YYYY-MM-DD' a secas cuando el origen es una columna date. */
  at: string;
};

// Techo de filas por fuente. El panel es un vistazo de lo reciente, no el
// historial: para eso ya esta /history, que pagina.
const LIMIT = 40;

// PostgREST devuelve el embed como objeto o como array segun infiera la
// cardinalidad; ambas formas llegan en la misma consulta.
type Org = { name: string; logo_url: string | null };
const one = <T,>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : value;

const orgOf = (
  row: { organization_id: number; organization: Org | Org[] | null },
  t: Translate,
) => {
  const embedded = one(row.organization);
  return {
    organizationId: String(row.organization_id),
    organizationName: embedded?.name ?? t('history.theOrganization'),
    logoUrl: embedded?.logo_url ?? null,
  };
};

const ORG_EMBED = 'organization:organization_id(name, logo_url)';

// ---------------------------------------------------------------------------
// Carga
// ---------------------------------------------------------------------------

type PurchaseRow = {
  id: number;
  organization_id: number;
  points_earned: number | null;
  purchase_date: string | null;
  created_at: string | null;
  organization: Org | Org[] | null;
};

type RedemptionRow = {
  id: number;
  organization_id: number;
  points_used: number | null;
  delivered_at: string | null;
  redemption_date: string | null;
  requested_at: string | null;
  product: { name: string } | { name: string }[] | null;
  organization: Org | Org[] | null;
};

type CampaignRow = {
  id: number;
  organization_id: number;
  title: string;
  body: string;
  sent_at: string;
  organization: Org | Org[] | null;
};

type MembershipRow = {
  organization_id: number;
  joined_date: string;
  organization: Org | Org[] | null;
};

type ProductRow = {
  id: number;
  organization_id: number;
  creation_date: string;
  organization: Org | Org[] | null;
};

export async function loadNotifications(
  beneficiaryId: string,
  t: Translate,
): Promise<AppNotification[]> {
  const [purchases, redemptions, campaigns, memberships, products] =
    await Promise.all([
      supabase
        .from('purchase')
        .select(`id, organization_id, points_earned, purchase_date, created_at, ${ORG_EMBED}`)
        .eq('beneficiary_id', beneficiaryId)
        .eq('status', 'active')
        .gt('points_earned', 0)
        // nullsFirst: false porque la columna es nullable y en DESC Postgres
        // pone los NULL arriba: sin esto, filas sin fecha se comen el LIMIT y
        // desplazan compras recientes. El fallback a created_at sigue abajo.
        .order('purchase_date', { ascending: false, nullsFirst: false })
        .limit(LIMIT),
      supabase
        .from('redemption')
        .select(`id, organization_id, points_used, delivered_at, redemption_date, requested_at, product:product_id(name), ${ORG_EMBED}`)
        .eq('beneficiary_id', beneficiaryId)
        .neq('status', 'cancelled')
        .order('requested_at', { ascending: false, nullsFirst: false })
        .limit(LIMIT),
      // Campanas de la organizacion. La policy de RLS ya recorta a las enviadas
      // a organizaciones donde la membresia esta activa y despues del alta, asi
      // que aca no se vuelve a filtrar.
      supabase
        .from('push_notifications')
        .select(`id, organization_id, title, body, sent_at, ${ORG_EMBED}`)
        .order('sent_at', { ascending: false })
        .limit(LIMIT),
      supabase
        .from('beneficiary_organization')
        .select(`organization_id, joined_date, ${ORG_EMBED}`)
        .eq('beneficiary_id', beneficiaryId)
        .eq('is_active', true)
        .order('joined_date', { ascending: false })
        .limit(LIMIT),
      // Sin filtro por organizacion: la policy `beneficiary_read_products` ya
      // deja ver solo los premios de las organizaciones del beneficiario.
      supabase
        .from('product')
        .select(`id, organization_id, creation_date, ${ORG_EMBED}`)
        .gt('stock', 0)
        .order('creation_date', { ascending: false })
        .limit(LIMIT),
    ]);

  // Una fuente caida no es "no hay nada": si se tragara el error, el panel
  // mostraria el vacio y de paso marcaria como vistas notificaciones que el
  // usuario nunca llego a ver. Corta aca y que decida la pantalla.
  const failed = [purchases, redemptions, campaigns, memberships, products].find(
    (r) => r.error,
  );
  if (failed?.error) throw failed.error;

  const rows = (memberships.data ?? []) as unknown as MembershipRow[];

  const joined = rows.map((m): AppNotification => {
    const org = orgOf(m, t);
    return {
      id: `j${m.organization_id}`,
      kind: 'joined',
      ...org,
      title: t('notif.joinedTitle'),
      body: t('notif.joinedBody', { org: org.organizationName }),
      at: m.joined_date,
    };
  });

  const earned = ((purchases.data ?? []) as unknown as PurchaseRow[])
    .map((p): AppNotification | null => {
      const at = p.purchase_date ?? p.created_at;
      if (!at) return null;
      const org = orgOf(p, t);
      return {
        id: `p${p.id}`,
        kind: 'points',
        ...org,
        title: t('notif.pointsTitle'),
        body: t('notif.pointsBody', {
          org: org.organizationName,
          points: formatPoints(p.points_earned ?? 0),
        }),
        at,
      };
    })
    .filter((n): n is AppNotification => n !== null);

  const redeemed = ((redemptions.data ?? []) as unknown as RedemptionRow[])
    .map((r): AppNotification | null => {
      const at = r.delivered_at ?? r.redemption_date ?? r.requested_at;
      if (!at) return null;
      const org = orgOf(r, t);
      return {
        id: `r${r.id}`,
        kind: 'redeem',
        ...org,
        title: t('notif.redeemTitle'),
        body: t('notif.redeemBody', {
          org: org.organizationName,
          product: one(r.product)?.name ?? t('history.deletedProduct'),
        }),
        at,
      };
    })
    .filter((n): n is AppNotification => n !== null);

  // Titulo y cuerpo los escribe la organizacion desde el portal: son los unicos
  // textos del panel que no pasan por i18n.
  const promos = ((campaigns.data ?? []) as unknown as CampaignRow[]).map(
    (c): AppNotification => ({
      id: `c${c.id}`,
      kind: 'promo',
      ...orgOf(c, t),
      title: c.title,
      body: c.body,
      at: c.sent_at,
    }),
  );

  return [...earned, ...redeemed, ...promos, ...joined, ...newRewards(products.data, rows, t)]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, LIMIT);
}

// Premios nuevos: una notificacion por organizacion y dia, no una por producto
// — cargar el catalogo de golpe llenaba el panel con veinte filas iguales.
// Solo cuentan los posteriores al alta: los que ya estaban cuando el
// beneficiario se sumo no son novedad para el.
// ponytail: product.creation_date es `date`, sin hora, asi que estas filas se
// ordenan al comienzo de su dia y muestran la fecha en vez de la hora. Si el
// disenador quiere la hora exacta, la columna tiene que pasar a timestamptz.
function newRewards(
  data: unknown,
  memberships: MembershipRow[],
  t: Translate,
): AppNotification[] {
  const joinedAt = new Map(
    memberships.map((m) => [String(m.organization_id), m.joined_date]),
  );

  const byOrgAndDay = new Map<string, AppNotification & { count: number }>();

  for (const p of (data ?? []) as ProductRow[]) {
    const org = orgOf(p, t);
    const since = joinedAt.get(org.organizationId);
    // El alta es un timestamp y creation_date una fecha: se comparan los
    // primeros 10 caracteres, que en ambos casos son 'YYYY-MM-DD'.
    if (!since || p.creation_date < since.slice(0, 10)) continue;

    const key = `${p.organization_id}-${p.creation_date}`;
    const seen = byOrgAndDay.get(key);
    if (seen) {
      seen.count += 1;
      seen.body = t('notif.rewardsBody', {
        org: seen.organizationName,
        count: seen.count,
      });
      continue;
    }
    byOrgAndDay.set(key, {
      id: `n${key}`,
      kind: 'rewards',
      ...org,
      title: t('notif.rewardsTitle'),
      body: t('notif.rewardsBody', { org: org.organizationName, count: 1 }),
      at: p.creation_date,
      count: 1,
    });
  }

  return [...byOrgAndDay.values()];
}

// ---------------------------------------------------------------------------
// Marcas locales: "visto" (badge) y "limpiado" (tacho de la cabecera)
// ---------------------------------------------------------------------------

// Por beneficiario y no por dispositivo: dos cuentas en el mismo telefono no
// comparten ni el badge ni lo que una de las dos borro.
const seenKey = (id: string) => `notifications.seenAt.${id}`;
const clearedKey = (id: string) => `notifications.clearedAt.${id}`;

// En movil esto es AsyncStorage; en web, localStorage. Las dos lecturas se
// envuelven en try/catch porque en ventana privada, con las cookies de sitio
// bloqueadas o durante el render en servidor el acceso directamente tira.
const read = async (key: string): Promise<string | null> => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Se escribe y se olvida: si falla, el peor caso es que el badge vuelva a
// contar lo mismo en la proxima visita.
const write = async (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ver arriba.
  }
};

export const getSeenAt = (beneficiaryId: string) => read(seenKey(beneficiaryId));
export const markSeen = (beneficiaryId: string) =>
  write(seenKey(beneficiaryId), new Date().toISOString());

export const getClearedAt = (beneficiaryId: string) =>
  read(clearedKey(beneficiaryId));
export const markCleared = (beneficiaryId: string) =>
  write(clearedKey(beneficiaryId), new Date().toISOString());

// Las filas que vienen de una columna `date` no tienen hora: comparadas contra
// una marca con hora, 'YYYY-MM-DD' < 'YYYY-MM-DDT..' siempre. Se les completa
// el final del dia para que un premio cargado hoy cuente como posterior a una
// marca de hoy a la manana.
const atLeast = (at: string) => (at.length <= 10 ? `${at}T23:59:59.999Z` : at);

export const visible = (items: AppNotification[], clearedAt: string | null) =>
  clearedAt ? items.filter((n) => atLeast(n.at) > clearedAt) : items;

export const unreadCount = (
  items: AppNotification[],
  seenAt: string | null,
) => (seenAt ? items.filter((n) => atLeast(n.at) > seenAt).length : items.length);

// ---------------------------------------------------------------------------
// Presentacion
// ---------------------------------------------------------------------------

export type Bucket = 'today' | 'yesterday' | 'week' | 'older';

const DAY_MS = 86_400_000;

// Se compara contra el dia local, que es el que ve el usuario. `now` entra por
// parametro para que la pantalla lo calcule una vez por render (Date.now() en
// medio del render es impuro y deja al compilador de React sin memoizar).
export function bucketOf(at: string, now: number): Bucket {
  const day = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  // Una fecha sin hora ya esta en dia local; un timestamp hay que bajarlo.
  const target = at.length <= 10 ? at : day(Date.parse(at));
  if (target === day(now)) return 'today';
  if (target === day(now - DAY_MS)) return 'yesterday';
  return target >= day(now - 7 * DAY_MS) ? 'week' : 'older';
}

export const BUCKET_LABEL: Record<Bucket, MessageKey> = {
  today: 'notif.today',
  yesterday: 'notif.yesterday',
  week: 'notif.thisWeek',
  older: 'notif.older',
};
