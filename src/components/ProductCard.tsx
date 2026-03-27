import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import type { Product } from '../api';
import { resolveImageUrl } from '../api';

interface Props {
  product: Product;
}

function useSaleCountdown(saleEndDate?: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!saleEndDate) return;
    const end = new Date(saleEndDate).getTime();
    function tick() {
      const diff = end - Date.now();
      if (diff <= 0) { setLabel(null); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setLabel(`Sale ends in ${d}d ${h}h`);
      else if (h > 0) setLabel(`Sale ends in ${h}h ${m}m`);
      else setLabel(`Sale ends in ${m}m`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [saleEndDate]);
  return label;
}

export default function ProductCard({ product }: Props) {
  const imageUrl = resolveImageUrl(product.imageUrl);

  const saleActive = product.isOnSale && product.salePrice != null
    && (!product.saleEndDate || new Date(product.saleEndDate) > new Date());

  const displayPrice = saleActive ? product.salePrice! : product.price;
  const originalPrice = saleActive ? product.price : null;

  const countdown = useSaleCountdown(saleActive ? product.saleEndDate : null);

  const totalStock = product.variants.length > 0
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : product.stock ?? null;
  const threshold = product.lowStockThreshold ?? 5;
  const outOfStock = !product.isActive || (totalStock !== null && totalStock === 0);
  const lowStock = !outOfStock && totalStock !== null && totalStock > 0 && totalStock <= threshold;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 relative">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">🛍</div>
        )}
        {saleActive && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded">
            Sale
          </span>
        )}
      </div>
      <h3 className="font-medium text-sm leading-snug group-hover:underline">{product.name}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-sm font-semibold">${(displayPrice / 100).toFixed(2)}</span>
        {originalPrice && (
          <span className="text-sm text-gray-400 line-through">${(originalPrice / 100).toFixed(2)}</span>
        )}
      </div>
      {countdown && (
        <p className="text-xs text-red-500 mt-0.5">{countdown}</p>
      )}
      {outOfStock && (
        <span className="text-xs text-red-500 mt-0.5 block">Out of stock</span>
      )}
      {lowStock && !outOfStock && (
        <span className="text-xs text-amber-600 mt-0.5 block">Only {totalStock} left</span>
      )}
    </Link>
  );
}
