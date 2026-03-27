import { useEffect, useState } from 'react';
import { getProducts, getHeroSettings, type Product, type HeroSettings } from '../api';
import { resolveImageUrl } from '../api';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [hero, setHero] = useState<HeroSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getHeroSettings().then(setHero).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getProducts({ search: query || undefined, limit: 48 })
      .then(setProducts)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
  };

  const heroImageUrl = resolveImageUrl(hero?.imageUrl);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      {hero && (hero.headline || hero.imageUrl) && (
        <section
          className="relative flex items-center justify-center min-h-[60vh] bg-gray-900 text-white text-center px-4"
          style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {heroImageUrl && <div className="absolute inset-0 bg-black/50" />}
          <div className="relative z-10 max-w-2xl mx-auto">
            {hero.headline && <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">{hero.headline}</h1>}
            {hero.subheadline && <p className="text-lg md:text-xl mb-8 text-white/80">{hero.subheadline}</p>}
            {hero.ctaText && hero.ctaUrl && (
              <a
                href={hero.ctaUrl}
                className="inline-block bg-white text-black font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
              >
                {hero.ctaText}
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── Products ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <h2 className="text-2xl font-bold">Shop</h2>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-lg mb-3" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 text-red-500">
            <p className="font-medium">Could not load products</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            {query ? `No products found for "${query}"` : 'No products yet.'}
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
