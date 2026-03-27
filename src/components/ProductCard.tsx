import { Link } from 'wouter';
import type { Product } from '../api';
import { resolveImageUrl } from '../api';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const imageUrl = resolveImageUrl(product.imageUrl);
  const displayPrice = product.isOnSale && product.salePrice != null
    ? product.salePrice
    : product.price;
  const originalPrice = product.isOnSale && product.salePrice != null
    ? product.price
    : null;

  const totalStock = product.variants.length > 0
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : null;
  const outOfStock = !product.isActive || (totalStock !== null && totalStock === 0);

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
            🛍
          </div>
        )}
      </div>
      <h3 className="font-medium text-sm leading-snug group-hover:underline">
        {product.name}
      </h3>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-sm font-semibold">${(displayPrice / 100).toFixed(2)}</span>
        {originalPrice && (
          <span className="text-sm text-gray-400 line-through">${(originalPrice / 100).toFixed(2)}</span>
        )}
      </div>
      {outOfStock && (
        <span className="text-xs text-red-500 mt-0.5 block">Out of stock</span>
      )}
    </Link>
  );
}
