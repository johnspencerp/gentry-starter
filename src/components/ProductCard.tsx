import { Link } from 'wouter';
import type { Product } from '../api';

interface Props {
  product: Product;
}

export default function ProductCard({ product }: Props) {
  const image = product.images?.[0];
  const price = parseFloat(product.price);
  const compare = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null;

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3">
        {image ? (
          <img
            src={image.url}
            alt={image.altText ?? product.name}
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
        <span className="text-sm font-semibold">${price.toFixed(2)}</span>
        {compare && compare > price && (
          <span className="text-sm text-gray-400 line-through">${compare.toFixed(2)}</span>
        )}
      </div>
      {!product.inStock && (
        <span className="text-xs text-red-500 mt-0.5 block">Out of stock</span>
      )}
    </Link>
  );
}
