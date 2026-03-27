import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { getProduct, resolveImageUrl, type Product, type ProductVariant } from '../api';
import { useCart } from '../context/CartContext';

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

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { add } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProduct(id)
      .then(p => {
        setProduct(p);
        // Set page title
        document.title = `${p.name} | Shop`;
        if (p.variants?.length) setSelectedVariant(p.variants[0]);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    return () => { document.title = 'Shop'; };
  }, [id]);

  // Variant image switching: if the selected variant has its own imageUrl, show it first
  useEffect(() => {
    if (!selectedVariant?.imageUrl || !product) return;
    const variantImgResolved = resolveImageUrl(selectedVariant.imageUrl);
    if (!variantImgResolved) return;
    const gallery = buildGallery(product);
    const idx = gallery.indexOf(variantImgResolved);
    if (idx >= 0) setGalleryIndex(idx);
    else setGalleryIndex(0); // variant image not in gallery — fall back to main
  }, [selectedVariant?.id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 animate-pulse">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-gray-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-5 bg-gray-200 rounded w-1/4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-xl mx-auto py-32 text-center text-gray-500">
        <p className="font-medium">Product not found</p>
        <a href="/" className="text-sm underline mt-2 inline-block">Back to shop</a>
      </div>
    );
  }

  const saleActive = product.isOnSale && product.salePrice != null
    && (!product.saleEndDate || new Date(product.saleEndDate) > new Date());

  const displayPrice = saleActive ? product.salePrice! : product.price;
  const originalPrice = saleActive ? product.price : null;

  // Build gallery: prefer images[] array, fall back to imageUrl
  function buildGallery(p: Product): string[] {
    if (p.images.length > 0) return p.images.map(img => resolveImageUrl(img.imageUrl) ?? '').filter(Boolean);
    const fallback = resolveImageUrl(p.imageUrl);
    return fallback ? [fallback] : [];
  }
  const gallery = buildGallery(product);

  // Show variant image if the selected variant has one and it's not already in gallery
  const variantImg = selectedVariant?.imageUrl ? resolveImageUrl(selectedVariant.imageUrl) : null;
  const displayGallery = variantImg && !gallery.includes(variantImg)
    ? [variantImg, ...gallery]
    : gallery;

  const totalStock = product.variants.length > 0
    ? product.variants.reduce((s, v) => s + v.stock, 0)
    : product.stock ?? null;
  const threshold = product.lowStockThreshold ?? 5;
  const outOfStock = !product.isActive || (totalStock !== null && totalStock === 0);
  const lowStock = !outOfStock && totalStock !== null && totalStock > 0 && totalStock <= threshold;

  const variantLabel = (v: ProductVariant) =>
    [v.size, v.color].filter(Boolean).join(' / ') || `Variant ${v.id.slice(-4)}`;

  const countdown = useSaleCountdown(saleActive ? product.saleEndDate : null);

  const handleAddToCart = () => {
    const variantSuffix = selectedVariant ? ` — ${variantLabel(selectedVariant)}` : '';
    add({
      productId: product.id,
      variantId: selectedVariant?.id,
      quantity: 1,
      name: product.name + variantSuffix,
      price: (displayPrice / 100).toFixed(2),
      imageUrl: displayGallery[0] || gallery[0],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-500 hover:underline mb-8 inline-block"
      >
        ← Back to shop
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-3">
            {displayGallery[galleryIndex] ? (
              <img
                src={displayGallery[galleryIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl text-gray-300">🛍</div>
            )}
          </div>
          {displayGallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {displayGallery.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setGalleryIndex(i)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === galleryIndex ? 'border-black' : 'border-transparent hover:border-gray-300'}`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div>
            {product.category && (
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">{product.category}</p>
            )}
            <h1 className="text-3xl font-bold">{product.name}</h1>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-semibold">${(displayPrice / 100).toFixed(2)}</span>
            {originalPrice && (
              <span className="text-lg text-gray-400 line-through">${(originalPrice / 100).toFixed(2)}</span>
            )}
            {saleActive && (
              <span className="text-sm bg-red-100 text-red-600 font-medium px-2 py-0.5 rounded">Sale</span>
            )}
          </div>

          {countdown && (
            <p className="text-sm text-red-500 font-medium -mt-3">⏱ {countdown}</p>
          )}

          {product.description && (
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          )}

          {/* Variant selector */}
          {product.variants.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Select option</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    disabled={v.stock === 0}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      selectedVariant?.id === v.id
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-black border-gray-300 hover:border-black'
                    }`}
                  >
                    {variantLabel(v)}
                    {v.stock > 0 && v.stock <= (threshold) && (
                      <span className="ml-1 text-amber-500 text-xs">({v.stock} left)</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {lowStock && (
            <p className="text-sm text-amber-600 font-medium">
              Only {totalStock} left — order soon!
            </p>
          )}

          <button
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="mt-2 w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {outOfStock ? 'Out of stock' : added ? '✓ Added to cart' : 'Add to cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
