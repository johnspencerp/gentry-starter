/*
  api.ts — Gentry Commerce headless API client
  ─────────────────────────────────────────────
  Every request automatically includes the X-Store-Api-Key header.
  Set VITE_STORE_URL and VITE_STORE_API_KEY in your .env file.
*/

const BASE_URL = (import.meta.env.VITE_STORE_URL as string) || 'https://gentrycommerce.com';
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

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  position: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: string;
  compareAtPrice?: string;
  stock?: number;
  sku?: string;
  attributes?: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  category?: string;
  slug?: string;
  images: ProductImage[];
  variants: ProductVariant[];
  inStock: boolean;
  isFeatured?: boolean;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
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

export interface TripType {
  id: string;
  name: string;
  description?: string;
  duration?: number;
  price?: string;
  imageUrl?: string;
  category?: string;
}

export interface Provider {
  id: string;
  name: string;
  bio?: string;
  imageUrl?: string;
  specialties?: string[];
}

export interface BookingAvailability {
  date: string;
  slots: { time: string; available: boolean }[];
}

// ─── Products ──────────────────────────────────────────────────────────────

export function getProducts(params?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  featured?: boolean;
}) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.search)   qs.set('search', params.search);
  if (params?.limit)    qs.set('limit', String(params.limit));
  if (params?.offset)   qs.set('offset', String(params.offset));
  if (params?.featured) qs.set('featured', '1');
  const query = qs.toString();
  return request<Product[]>(`/api/products${query ? `?${query}` : ''}`);
}

export function getProduct(id: string) {
  return request<Product>(`/api/products/${id}`);
}

export function getCollections() {
  return request<Collection[]>('/api/collections');
}

// ─── Store info ─────────────────────────────────────────────────────────────

export function getStoreName() {
  return request<StoreSettings>('/api/settings/store-name');
}

export function getHeroSettings() {
  return request<HeroSettings>('/api/settings/hero');
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export function getTripTypes() {
  return request<TripType[]>('/api/trip-types');
}

export function getProviders() {
  return request<Provider[]>('/api/providers');
}

export function getAvailability(params: {
  providerId?: string;
  tripTypeId?: string;
  startDate: string;
  endDate: string;
}) {
  const qs = new URLSearchParams(params as Record<string, string>);
  return request<BookingAvailability[]>(`/api/bookings/availability?${qs}`);
}

export function createBooking(data: {
  customerName: string;
  customerEmail: string;
  providerId?: string;
  tripTypeId: string;
  date: string;
  time: string;
  guests?: number;
  notes?: string;
}) {
  return request('/api/bookings', { method: 'POST', body: JSON.stringify(data) });
}

// ─── Checkout ───────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export function createCheckout(items: CartItem[], successUrl: string, cancelUrl: string) {
  return request<{ url: string }>('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ items, successUrl, cancelUrl }),
  });
}
