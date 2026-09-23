'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Product } from '@/types';

// El catalogo lo miran dos pantallas: el carrusel del detalle de organizacion
// y la lista completa de "Canjea tus puntos". Vive aca para que las dos lean
// exactamente los mismos productos (y el mismo filtro de stock).

// Returns 'error' rather than [] when the query fails: a failed load and an
// empty catalog look identical to the user otherwise, which is how a schema
// change (the dropped `stock` table) read as "no hay productos" for weeks.
export async function loadOrganizationProducts(
  organizationId: string,
): Promise<Product[] | 'error'> {
  try {
    const { data, error } = await supabase
      .from('product')
      .select(
        `
        *,
        category:category_id(id, name)
      `,
      )
      .eq('organization_id', parseInt(organizationId))
      .gt('stock', 0)
      .order('required_points', { ascending: true });

    if (error || !data) {
      console.warn('[products] load failed', error?.message);
      return 'error';
    }

    return data as Product[];
  } catch (e) {
    console.warn('[products] load threw', e);
    return 'error';
  }
}

// Un topic por instancia del hook. `supabase.channel(topic)` NO crea un canal
// nuevo si el topic ya existe: devuelve el que esta abierto, y hacerle `.on()`
// a un canal ya suscripto tira. El detalle de organizacion se queda montado
// debajo del catalogo completo, asi que los dos piden el mismo organizationId
// a la vez: sin el sufijo, abrir "Ver todos" reventaba el arbol entero.
let channelSeq = 0;

// Carga el catalogo y lo mantiene fresco con la suscripcion de stock. Llama a
// setState solo despues de un `await`, para no dejarle al React Compiler un
// setState sincronico dentro del efecto.
export function useOrganizationProducts(organizationId: string | undefined) {
  // El catalogo se guarda junto a la organizacion que lo pidio. Si solo se
  // guardaran los productos, al cambiar de organizacion se verian un instante
  // los de la anterior, hasta que resuelve el fetch nuevo.
  const [loaded, setLoaded] = useState<{
    organizationId: string;
    products: Product[] | 'error';
  } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [channelKey] = useState(() => (channelSeq += 1));

  // Realtime subscription for stock updates — bumps refreshKey on every change.
  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase.channel(
      `org-stock-${organizationId}-${channelKey}`,
    );
    const bound = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product',
        // Sin el filtro, el stock de cualquier organizacion recargaba esta.
        filter: `organization_id=eq.${parseInt(organizationId, 10)}`,
      },
      () => {
        setRefreshKey((k) => k + 1);
      },
    );
    const subscription = bound.subscribe();

    // `.on()` y `.subscribe()` devuelven el mismo RealtimeChannel, asi que las
    // tres bajas son el mismo objeto y removeChannel solo alcanzaria. Se deja
    // la forma explicita: es el idiom del repo (AuthContext, history) y
    // react-doctor/effect-needs-cleanup no reconoce removeChannel como cleanup.
    return () => {
      subscription.unsubscribe();
      bound.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [organizationId, channelKey]);

  // Loader effect — keyed by id + refreshKey so we re-fetch on stock updates.
  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      const next = await loadOrganizationProducts(organizationId);
      if (!cancelled) setLoaded({ organizationId, products: next });
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, refreshKey]);

  // `loaded &&` y no `loaded?.`: con las dos cosas en undefined la comparacion
  // daba true y se leia .products de null.
  return loaded && loaded.organizationId === organizationId
    ? loaded.products
    : null;
}
