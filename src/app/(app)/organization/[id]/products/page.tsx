'use client';

import { useParams } from 'next/navigation';
import React, { useRef, useState } from 'react';
import { FiSearch, FiXCircle } from 'react-icons/fi';

import RedeemButton from '@/components/RedeemButton';
import ScreenHeader from '@/components/ScreenHeader';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/I18nContext';
import type { Translate } from '@/i18n';
import { useOrganizationProducts } from '@/lib/products';
import { colors, formatPoints, matches, norm } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

// Catalogo completo: es el destino de "Ver todos" en la ficha de la
// organizacion, que solo muestra un carrusel con los primeros productos.

const NO_PRODUCTS: Product[] = [];

const CARD =
  'mx-4 mt-3 rounded-[20px] bg-card p-[14px] shadow-[0px_4px_14px_rgba(23,10,60,0.05)]';

type CategoryChip = { id: string | null; name: string };

// Carrusel de imagenes del producto: el punto activo vive aca, no hace falta
// que ProductCard lo conozca.
function ProductImageCarousel({
  imageUrls,
  productId,
}: {
  imageUrls: string[];
  productId: Product['id'];
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActiveImageIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <div className="overflow-hidden rounded-[10px]">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        >
          {imageUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${productId}-image-${url}`}
              src={url}
              alt=""
              className="w-full shrink-0 snap-start object-cover"
              style={{ aspectRatio: 340 / 120 }}
            />
          ))}
        </div>
        {imageUrls.length > 1 ? (
          <div className="absolute inset-x-0 bottom-2 flex justify-center gap-[5px]">
            {imageUrls.map((imgUrl, index) => (
              <span
                key={`${productId}-dot-${imgUrl}`}
                className={cn(
                  'h-1.5 rounded-full',
                  activeImageIndex === index
                    ? 'w-3.5 bg-white'
                    : 'w-1.5 bg-white/55',
                )}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductCard({
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
  const totalStock = product.stock;
  const canAfford = availablePoints >= product.required_points;

  return (
    // `flex-col` + el `mt-auto` del boton: en la grilla las tarjetas de una
    // fila miden lo mismo, y sin esto el "Canjear" de la que no tiene imagen
    // (o descripcion) queda flotando a media altura.
    <div className={cn(CARD, 'flex flex-col')}>
      {product.image_urls && product.image_urls.length > 0 ? (
        <ProductImageCarousel
          imageUrls={product.image_urls}
          productId={product.id}
        />
      ) : null}

      <div className="mt-3 flex items-start">
        <p className="mr-3 line-clamp-2 flex-1 text-[16px] font-extrabold text-ink">
          {product.name}
        </p>
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-extrabold text-violet">
            {formatPoints(product.required_points)}
          </p>
          <p className="mt-px text-[12px] text-slate">{t('common.pts')}</p>
        </div>
      </div>

      {product.category ? (
        <span className="mt-2 self-start rounded-lg bg-violet-soft px-[9px] py-[3px] text-[12px] font-bold text-violet">
          {product.category.name}
        </span>
      ) : null}

      {product.description ? (
        <p className="mt-[9px] line-clamp-2 text-[13px] leading-[18px] text-slate">
          {product.description}
        </p>
      ) : null}

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-green">
          {t('products.stock', { count: totalStock })}
        </span>
        {!canAfford ? (
          <span className="text-[12.5px] font-bold text-magenta">
            {t('products.missingPoints', {
              points: formatPoints(product.required_points - availablePoints),
            })}
          </span>
        ) : null}
      </div>

      <div className="mt-auto">
        <RedeemButton
          product={product}
          beneficiaryId={beneficiaryId}
          organizationId={organizationId}
          canAfford={canAfford}
          totalStock={totalStock}
          onRedeemed={onRedeemed}
        />
      </div>
    </div>
  );
}

// Cabecera de la lista: buscador y chips de categoria.
function ProductsHeader({
  hasCatalog,
  query,
  onQuery,
  categories,
  category,
  onCategory,
  t,
}: {
  hasCatalog: boolean;
  query: string;
  onQuery: (next: string) => void;
  categories: CategoryChip[];
  category: string | null;
  onCategory: (next: string | null) => void;
  t: Translate;
}) {
  if (!hasCatalog) return null;
  return (
    <div className={CARD}>
      <div className="flex h-[46px] items-center gap-2 rounded-xl border border-[#E6E8EF] px-3">
        <FiSearch size={16} color={colors.muted} className="shrink-0" />
        <input
          type="search"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent p-0 text-[14.5px] text-[#0C0F1A] outline-none placeholder:text-[#868B9A] [&::-webkit-search-cancel-button]:appearance-none"
          placeholder={t('products.searchPlaceholder')}
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
      {categories.length > 2 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pr-0.5 pt-2.5">
          {categories.map((item) => {
            const on = category === item.id;
            return (
              <button
                key={item.id ?? 'all'}
                type="button"
                onClick={() => onCategory(item.id)}
                className={cn(
                  'pressable shrink-0 whitespace-nowrap rounded-full px-[13px] py-[7px] text-[12.5px] font-bold',
                  on ? 'bg-violet text-card' : 'bg-violet-soft text-violet',
                )}
              >
                {item.name}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// Cubre los cuatro motivos por los que la lista puede venir vacia, que para el
// usuario no son el mismo problema.
function ProductsEmpty({
  products,
  hasCatalog,
  t,
}: {
  products: Product[] | 'error' | null;
  hasCatalog: boolean;
  t: Translate;
}) {
  if (products === null) {
    return (
      <div className={cn(CARD, 'flex items-center justify-center')}>
        <Spinner size={20} color={colors.violet} />
        <span className="ml-2.5 text-[13px] text-slate">
          {t('products.loading')}
        </span>
      </div>
    );
  }

  const [icon, title, body] =
    products === 'error'
      ? (['⚠️', 'products.errorTitle', 'products.errorBody'] as const)
      : hasCatalog
        ? (['🔍', 'common.noResults', 'products.noResultsBody'] as const)
        : (['🎁', 'products.emptyTitle', 'products.emptyBody'] as const);

  return (
    <div className={cn(CARD, 'flex flex-col items-center py-6')}>
      <p className="text-[30px] leading-none">{icon}</p>
      <p className="mt-2 text-[14.5px] font-bold text-ink">{t(title)}</p>
      <p className="mt-1 text-center text-[12.5px] text-slate">{t(body)}</p>
    </div>
  );
}

export default function OrganizationProductsPage() {
  const id = String(useParams().id ?? '');
  const { userOrganizations, beneficiary, refreshOrganizations } = useAuth();
  const t = useT();
  const [query, setQuery] = useState('');
  const [pickedCategory, setPickedCategory] = useState<string | null>(null);

  const membership = userOrganizations.find(
    (org) => org.organization_id.toString() === id,
  );
  const products = useOrganizationProducts(id);

  // Las categorias salen de los productos ya cargados: evita una consulta mas
  // y no ofrece filtros que no devuelven nada (categorias sin stock).
  const catalog = Array.isArray(products) ? products : NO_PRODUCTS;
  const categoryNames = new Map<string, string>();
  catalog.forEach((p) => {
    if (p.category) categoryNames.set(p.category.id, p.category.name);
  });
  const categories: CategoryChip[] = [
    { id: null, name: t('products.allCategories') },
    ...Array.from(categoryNames, ([cid, name]) => ({ id: cid, name })),
  ];
  // Si la categoria elegida desaparece (se agoto el stock, llego un refresh),
  // su chip ya no esta para deseleccionarla: cae sola a "Todas".
  const category =
    pickedCategory && categoryNames.has(pickedCategory) ? pickedCategory : null;
  const search = norm(query.trim());
  const visible = catalog.filter(
    (p) =>
      (!category || p.category_id === category) &&
      (!search || matches(p.name, search)),
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-bg">
      <ScreenHeader title={t('products.header')} />
      <div className="page-column no-scrollbar flex-1 overflow-y-auto pb-7 pt-1">
        <ProductsHeader
          hasCatalog={catalog.length > 0}
          query={query}
          onQuery={setQuery}
          categories={categories}
          category={category}
          onCategory={setPickedCategory}
          t={t}
        />

        {visible.length === 0 ? (
          <ProductsEmpty
            products={products}
            hasCatalog={catalog.length > 0}
            t={t}
          />
        ) : (
          // Catalogo en grilla: es lo que mas gana con el ancho de una
          // ventana, y en el telefono sigue siendo una columna.
          <div className="md:grid md:grid-cols-2 md:gap-x-4 xl:grid-cols-3">
          {visible.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              availablePoints={membership?.available_points ?? 0}
              beneficiaryId={
                beneficiary?.id != null ? String(beneficiary.id) : undefined
              }
              organizationId={id}
              onRedeemed={refreshOrganizations}
              t={t}
            />
          ))}
          </div>
        )}
      </div>
    </div>
  );
}
