import { useEffect, useState } from 'react';
import { getNewArrivals, getNewArrivalsSettings, type Product } from '../api';
import ProductCard from '../components/ProductCard';

export default function NewArrivals() {
  const [products, setProducts] = useState<Product[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'New Arrivals | Shop';
    Promise.all([
      getNewArrivals().catch(() => [] as Product[]),
      getNewArrivalsSettings().catch(() => ({ days: 30 })),
    ]).then(([prods, settings]) => {
      setProducts(prods);
      setDays(settings.days);
    }).catch(err => setError(err.message))
      .finally(() => setLoading(false));
    return () => { document.title = 'Shop'; };
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Arrivals</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Fresh finds added in the last {days} {days === 1 ? 'day' : 'days'}.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-3">
              <div className="aspect-square bg-gray-200 rounded-lg" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="py-24 text-center text-gray-500">
          <p>Couldn't load new arrivals. Please try again later.</p>
          <a href="/" className="text-sm underline mt-2 inline-block">Back to shop</a>
        </div>
      ) : products.length === 0 ? (
        <div className="py-24 text-center">
          <p className="text-4xl mb-4">✨</p>
          <p className="font-medium text-gray-700">No new arrivals right now.</p>
          <p className="text-sm text-gray-500 mt-1">Check back soon — new products get added regularly.</p>
          <a href="/" className="inline-block mt-6 text-sm font-medium underline">Browse all products</a>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {products.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
