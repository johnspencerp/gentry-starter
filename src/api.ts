/*
  api.ts — Gentry Commerce headless API client
  ─────────────────────────────────────────────
  VITE_STORE_URL  — The Gentry Commerce platform base URL.
                    Always set this to https://gentrycommerce.com (or your
                    self-hosted domain). Do NOT include the store slug here.
                    The API key in the header scopes every request to your store.

  VITE_STORE_API_KEY — Your headless API key from the admin → Integrations panel.
*/

const BASE_URL = (import.meta.env.VITE_STORE_URL as string)?.replace(/\/$/, '') || 'https://gentrycommerce.com';
const API_KEY  = (import.meta.env.VITE_STORE_API_KEY as string) || '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Store-Api-Key': API_KEY,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Resolve a potentially-relative image path to a full URL.
 * The API returns image paths like /objects/uploads/hat.png — prefix them
 * with the platform base URL so they render correctly in your app.
 */
export function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────

/** A product image from the gallery (may be color/variant-linked). */
export interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  color?: string | null;
  isDefault: boolean;
  isHover: boolean;
  variantId?: string | null;
  displayOrder: number;
}

/**
 * A product variant (size/color combination).
 * Variants do NOT have their own price — price is always on the parent product.
 * Use product.price (cents) for all pricing; variants only track stock.
 */
export interface ProductVariant {
  id: string;
  productId: string;
  size?: string | null;
  color?: string | null;
  stock: number;
  sku?: string | null;
  imageUrl?: string | null;
  lowStockThreshold?: number | null;
}

/**
 * A product as returned by /api/products and /api/products/:id.
 *
 * Key notes:
 *  • price and salePrice are integers in CENTS (e.g. 2999 = $29.99)
 *  • imageUrl is a single relative path — use resolveImageUrl() to display it
 *  • isActive indicates whether the product is available for purchase
 *  • isOnSale + salePrice replace the old compareAtPrice concept
 *  • images[] is the full gallery (shape above) — often empty if the merchant
 *    only used imageUrl; fall back to imageUrl when images is empty
 */
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  salePrice?: number | null;
  isOnSale: boolean;
  imageUrl?: string | null;
  category: string;
  isActive: boolean;
  hideFromWebsite: boolean;
  archivedAt?: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface StoreSettings {
  name: string;
  tagline?: string;
  logoUrl?: string;
}

export interface HeroSettings {
  headline?: string;
  subheadline?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaUrl?: string;
}

// ─── Products ──────────────────────────────────────────────────────────────

/**
 * Fetch the public product catalog.
 * Always pass public: true so hidden/archived products are excluded.
 * Category filtering is done server-side via the ?category= param.
 */
export function getProducts(params?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  qs.set('public', '1');
  if (params?.category) qs.set('category', params.category);
  if (params?.search)   qs.set('search', params.search);
  if (params?.limit)    qs.set('limit', String(params.limit));
  if (params?.offset)   qs.set('offset', String(params.offset));
  return request<Product[]>(`/api/products?${qs}`);
}

export function getProduct(id: string) {
  return request<Product>(`/api/products/${id}`);
}

// ─── Collections ─────────────────────────────────────────────────────────────

export function getCollections() {
  return request<Collection[]>('/api/collections');
}

// ─── Categories ──────────────────────────────────────────────────────────────

/** Returns a flat list of category name strings used by products in this store. */
export function getCategories() {
  return request<{ name: string }[]>('/api/categories');
}

// ─── Store info ─────────────────────────────────────────────────────────────

export function getStoreName() {
  return request<StoreSettings>('/api/settings/store-name');
}

export function getHeroSettings() {
  return request<HeroSettings>('/api/settings/hero');
}

export interface NavSettings {
  /** Show the Shop (products) link in the nav. Defaults to true. */
  showShop: boolean;
  /** Show the Bookings link in the nav. Defaults to true. */
  showBookings: boolean;
  /** Show the Social link in the nav. Defaults to false. */
  showSocial: boolean;
  /** Show the Events link in the nav. Defaults to false. */
  showEvents: boolean;
  /** Show a New Arrivals link in the nav. Defaults to false. */
  showNewArrivals: boolean;
}

export function getNavSettings() {
  return request<NavSettings>('/api/settings/nav');
}

export interface NewArrivalsSettings {
  /** Products added within this many days are shown as new arrivals. */
  days: number;
}

export function getNewArrivalsSettings() {
  return request<NewArrivalsSettings>('/api/settings/new-arrivals');
}

/**
 * Fetch products considered "new arrivals" for this store.
 * Uses the window configured in admin → Products → New Arrivals.
 */
export function getNewArrivals() {
  return request<Product[]>('/api/products?public=1&newArrivals=1');
}

// ─── Checkout ───────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

/**
 * Create a Stripe Checkout session.
 * The server determines success/cancel redirect URLs automatically.
 * Returns { url } — redirect the browser to that URL to complete payment.
 */
export function createCheckout(items: CartItem[]) {
  return request<{ url: string }>('/api/checkout/create-session', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}
