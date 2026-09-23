import { createSupabaseMock } from '../_helpers/supabase';

const db = createSupabaseMock();
jest.mock('@/lib/supabase/client', () => ({
  get supabase() {
    return db.client;
  },
}));

import { translate, type MessageKey } from '@/i18n';
import {
  BUCKET_LABEL,
  bucketOf,
  getClearedAt,
  getSeenAt,
  loadNotifications,
  markCleared,
  markSeen,
  unreadCount,
  visible,
  type AppNotification,
} from '@/lib/notifications';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translate('es', key, params);

const org = { name: 'Cafe Lila', logo_url: 'https://x/logo.png' };

/** Las cinco fuentes, en el orden en que las pide loadNotifications. */
const sources = (rows: {
  purchases?: unknown[];
  redemptions?: unknown[];
  campaigns?: unknown[];
  memberships?: unknown[];
  products?: unknown[];
}) => {
  db.queueTable('purchase', { data: rows.purchases ?? [], error: null });
  db.queueTable('redemption', { data: rows.redemptions ?? [], error: null });
  db.queueTable('push_notifications', { data: rows.campaigns ?? [], error: null });
  db.queueTable('beneficiary_organization', {
    data: rows.memberships ?? [],
    error: null,
  });
  db.queueTable('product', { data: rows.products ?? [], error: null });
};

beforeEach(() => {
  db.reset();
  localStorage.clear();
});

describe('loadNotifications', () => {
  it('arma una fila por compra, canje, campana y alta', async () => {
    sources({
      purchases: [
        {
          id: 1,
          organization_id: 9,
          points_earned: 120,
          purchase_date: '2026-09-10T10:00:00Z',
          created_at: null,
          organization: org,
        },
      ],
      redemptions: [
        {
          id: 2,
          organization_id: 9,
          points_used: 500,
          delivered_at: '2026-09-11T10:00:00Z',
          redemption_date: null,
          requested_at: null,
          product: { name: 'Cafe gratis' },
          organization: org,
        },
      ],
      campaigns: [
        {
          id: 3,
          organization_id: 9,
          title: '2x1 los martes',
          body: 'Solo por hoy',
          sent_at: '2026-09-12T10:00:00Z',
          organization: org,
        },
      ],
      memberships: [
        { organization_id: 9, joined_date: '2026-01-01', organization: org },
      ],
    });

    const items = await loadNotifications('7', t);

    expect(items.map((n) => n.kind)).toEqual([
      'promo',
      'redeem',
      'points',
      'joined',
    ]);
    expect(items[0].title).toBe('2x1 los martes');
    expect(items[1].body).toContain('Cafe gratis');
    expect(items[2].body).toContain('120');
    expect(items.every((n) => n.organizationName === 'Cafe Lila')).toBe(true);
  });

  // PostgREST devuelve el embed como objeto o como array segun la cardinalidad.
  it('acepta el embed como array y cae al nombre generico sin embed', async () => {
    sources({
      purchases: [
        {
          id: 1,
          organization_id: 9,
          points_earned: 10,
          purchase_date: '2026-09-10T10:00:00Z',
          created_at: null,
          organization: [org],
        },
        {
          id: 2,
          organization_id: 8,
          points_earned: 10,
          purchase_date: '2026-09-09T10:00:00Z',
          created_at: null,
          organization: null,
        },
      ],
    });

    const items = await loadNotifications('7', t);
    expect(items[0].organizationName).toBe('Cafe Lila');
    expect(items[1].organizationName).toBe(t('history.theOrganization'));
    expect(items[1].logoUrl).toBeNull();
  });

  // points_earned es nullable en la base aunque el filtro pida > 0.
  it('una compra sin puntos muestra 0 en vez de "undefined"', async () => {
    sources({
      purchases: [
        {
          id: 1,
          organization_id: 9,
          points_earned: null,
          purchase_date: '2026-09-10T10:00:00Z',
          created_at: null,
          organization: org,
        },
      ],
    });

    const items = await loadNotifications('7', t);
    expect(items[0].body).toContain('0');
    expect(items[0].body).not.toContain('undefined');
  });

  it('usa created_at cuando la compra no tiene fecha, y descarta la que no tiene ninguna', async () => {
    sources({
      purchases: [
        {
          id: 1,
          organization_id: 9,
          points_earned: 10,
          purchase_date: null,
          created_at: '2026-09-10T10:00:00Z',
          organization: org,
        },
        {
          id: 2,
          organization_id: 9,
          points_earned: 10,
          purchase_date: null,
          created_at: null,
          organization: org,
        },
      ],
    });

    const items = await loadNotifications('7', t);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('p1');
  });

  it('el canje cae a redemption_date y despues a requested_at', async () => {
    sources({
      redemptions: [
        {
          id: 1,
          organization_id: 9,
          points_used: 1,
          delivered_at: null,
          redemption_date: '2026-09-08T10:00:00Z',
          requested_at: '2026-09-01T10:00:00Z',
          product: null,
          organization: org,
        },
        {
          id: 2,
          organization_id: 9,
          points_used: 1,
          delivered_at: null,
          redemption_date: null,
          requested_at: '2026-09-07T10:00:00Z',
          product: [{ name: 'Medialunas' }],
          organization: org,
        },
        {
          id: 3,
          organization_id: 9,
          points_used: 1,
          delivered_at: null,
          redemption_date: null,
          requested_at: null,
          product: null,
          organization: org,
        },
      ],
    });

    const items = await loadNotifications('7', t);
    expect(items.map((n) => n.id)).toEqual(['r1', 'r2']);
    // Sin producto (se borro del catalogo) el cuerpo dice "producto eliminado".
    expect(items[0].body).toContain(t('history.deletedProduct'));
    expect(items[1].body).toContain('Medialunas');
  });

  // Una fuente caida no es "no hay nada": marcar como vistas notificaciones que
  // nunca se mostraron es peor que mostrar el error.
  // PostgREST puede devolver data null sin error (una policy que no deja ver
  // nada): el panel tiene que quedar vacio, no romper.
  it('sobrevive a las cinco fuentes en null', async () => {
    db.queueTable('purchase', { data: null, error: null });
    db.queueTable('redemption', { data: null, error: null });
    db.queueTable('push_notifications', { data: null, error: null });
    db.queueTable('beneficiary_organization', { data: null, error: null });
    db.queueTable('product', { data: null, error: null });

    await expect(loadNotifications('7', t)).resolves.toEqual([]);
  });

  it('un embed vacio cae al nombre generico', async () => {
    sources({
      campaigns: [
        {
          id: 1,
          organization_id: 9,
          title: 'Promo',
          body: 'x',
          sent_at: '2026-09-12T10:00:00Z',
          organization: [],
        },
      ],
    });

    const items = await loadNotifications('7', t);
    expect(items[0].organizationName).toBe(t('history.theOrganization'));
  });

  it('relanza si una fuente falla, en vez de mostrar el panel vacio', async () => {
    db.queueTable('purchase', { data: null, error: { message: 'boom' } });
    db.queueTable('redemption', { data: [], error: null });
    db.queueTable('push_notifications', { data: [], error: null });
    db.queueTable('beneficiary_organization', { data: [], error: null });
    db.queueTable('product', { data: [], error: null });

    await expect(loadNotifications('7', t)).rejects.toEqual({ message: 'boom' });
  });

  describe('premios nuevos', () => {
    it('agrupa por organizacion y dia, y cuenta cuantos', async () => {
      sources({
        memberships: [
          { organization_id: 9, joined_date: '2026-01-01', organization: org },
        ],
        products: [
          { id: 1, organization_id: 9, creation_date: '2026-09-10', organization: org },
          { id: 2, organization_id: 9, creation_date: '2026-09-10', organization: org },
          { id: 3, organization_id: 9, creation_date: '2026-09-11', organization: org },
        ],
      });

      const items = await loadNotifications('7', t);
      const rewards = items.filter((n) => n.kind === 'rewards');
      expect(rewards).toHaveLength(2);
      expect(rewards.find((r) => r.at === '2026-09-10')?.body).toContain('2');
    });

    // Los premios que ya estaban al darse de alta no son novedad.
    it('ignora los anteriores al alta y los de organizaciones ajenas', async () => {
      sources({
        memberships: [
          {
            organization_id: 9,
            joined_date: '2026-06-01T10:00:00Z',
            organization: org,
          },
        ],
        products: [
          { id: 1, organization_id: 9, creation_date: '2026-05-31', organization: org },
          { id: 2, organization_id: 4, creation_date: '2026-09-01', organization: org },
        ],
      });

      const items = await loadNotifications('7', t);
      expect(items.filter((n) => n.kind === 'rewards')).toHaveLength(0);
    });
  });
});

describe('marcas locales', () => {
  it('guarda "visto" y "limpiado" por beneficiario', async () => {
    await markSeen('7');
    await markCleared('9');

    expect(await getSeenAt('7')).not.toBeNull();
    // Dos cuentas en el mismo equipo no comparten ni el badge ni lo borrado.
    expect(await getSeenAt('9')).toBeNull();
    expect(await getClearedAt('9')).not.toBeNull();
  });

  it('devuelve null cuando localStorage tira (ventana privada)', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(await getSeenAt('7')).toBeNull();
  });

  it('escribir y olvidar: si falla, el badge vuelve a contar lo mismo', async () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    await expect(markSeen('7')).resolves.toBeUndefined();
  });
});

describe('visible / unreadCount', () => {
  const item = (id: string, at: string): AppNotification => ({
    id,
    kind: 'points',
    organizationId: '9',
    organizationName: 'Cafe Lila',
    logoUrl: null,
    title: 'x',
    body: 'y',
    at,
  });

  it('sin marca se ve todo y se cuenta todo', () => {
    const items = [item('a', '2026-09-10T10:00:00Z')];
    expect(visible(items, null)).toHaveLength(1);
    expect(unreadCount(items, null)).toBe(1);
  });

  it('filtra lo anterior a la marca de limpiado', () => {
    const items = [
      item('viejo', '2026-09-01T10:00:00Z'),
      item('nuevo', '2026-09-20T10:00:00Z'),
    ];
    expect(visible(items, '2026-09-10T00:00:00Z').map((n) => n.id)).toEqual([
      'nuevo',
    ]);
  });

  // Una fila sin hora se completa al final del dia: un premio cargado hoy
  // cuenta como posterior a una marca de hoy a la manana.
  it('una fecha sin hora cuenta como fin del dia', () => {
    const items = [item('premio', '2026-09-10')];
    expect(unreadCount(items, '2026-09-10T08:00:00Z')).toBe(1);
  });
});

describe('bucketOf', () => {
  const now = new Date(2026, 8, 20, 12, 0, 0).getTime();
  const iso = (d: Date) => d.toISOString();

  it('separa hoy, ayer, la semana y lo viejo', () => {
    expect(bucketOf(iso(new Date(2026, 8, 20, 9)), now)).toBe('today');
    expect(bucketOf(iso(new Date(2026, 8, 19, 9)), now)).toBe('yesterday');
    expect(bucketOf(iso(new Date(2026, 8, 16, 9)), now)).toBe('week');
    expect(bucketOf(iso(new Date(2026, 7, 1, 9)), now)).toBe('older');
  });

  it('una fecha sin hora ya esta en dia local', () => {
    expect(bucketOf('2026-09-20', now)).toBe('today');
  });

  it('cada grupo tiene su rotulo', () => {
    expect(Object.keys(BUCKET_LABEL)).toEqual([
      'today',
      'yesterday',
      'week',
      'older',
    ]);
  });
});
