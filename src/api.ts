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
  saleEndDate?: string | null;
  isOnSale: boolean;
  imageUrl?: string | null;
  category: string;
  isActive: boolean;
  lowStockThreshold?: number | null;
  stock?: number | null;
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

export interface StoreInfo {
  name: string;
  tagline: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  bookingsEnabled: boolean;
}

export interface TripType {
  id: string;
  name: string;
  slug: string;
  tagline?: string | null;
  description: string;
  duration: string;
  price: number;
  maxGuests: number;
  imageUrl?: string | null;
  features?: string[] | null;
  serviceTypeKey: string;
  serviceConfig?: Record<string, unknown> | null;
}

export interface PublicProvider {
  id: string;
  name: string;
  displayName?: string | null;
  role?: string | null;
  bio?: string | null;
  profilePhoto?: string | null;
  slug?: string | null;
  specialties?: string[] | null;
}

export interface BookingInput {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  tripTypeId: string;
  guideId?: string;
  preferredDate: string;
  alternateDate?: string;
  startTime?: string;
  partySize?: number;
  duration?: string;
  timeSlot?: string;
  message?: string;
  intakeAnswers?: Record<string, unknown>;
}

export interface AvailabilitySlots {
  isBlocked: boolean;
  availSlots: { time: string; available: boolean }[];
  bookingCount: number;
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
  /** Show the Membership plans link in the nav. Defaults to false. */
  showSubscriptions?: boolean;
}

export function getNavSettings() {
  return request<NavSettings>('/api/settings/nav');
}

/** Public store info — name, tagline, contact details, bookingsEnabled toggle. */
export function getStore() {
  return request<StoreInfo>('/api/store');
}

/** Active service types (trip types) available for booking. */
export function getTripTypes() {
  return request<TripType[]>('/api/trip-types');
}

/** Publicly-visible providers (guides, stylists, etc.) for this store. */
export function getProviders() {
  return request<PublicProvider[]>('/api/providers');
}

/**
 * Check available time slots for a given service type and date.
 * Returns { isBlocked, availSlots, bookingCount }.
 */
export function getAvailabilitySlots(tripTypeId: string, date: string) {
  return request<AvailabilitySlots>(`/api/availability/slots?tripTypeId=${encodeURIComponent(tripTypeId)}&date=${encodeURIComponent(date)}`);
}

/**
 * Submit a booking request.
 * Required fields: customerName, tripTypeId, preferredDate.
 */
export function postBooking(data: BookingInput) {
  return request<{ id: string; status: string; cancelToken: string }>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
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

// ─── Membership / Subscriptions ─────────────────────────────────────────────

export type PlanType = 'booking_credits' | 'product_discount' | 'vip_access' | 'custom';

/**
 * A membership plan as returned by /api/subscriptions/plans.
 * priceMonthly is in CENTS (e.g. 4900 = $49.00).
 * planType controls which benefit fields are relevant:
 *   booking_credits → creditsPerMonth / creditLabel / rolloverCredits
 *   product_discount → discountPercent
 *   vip_access / custom → manually managed — description carries the details
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  planType: PlanType;
  priceMonthly: number;
  creditsPerMonth: number;
  creditLabel: string;
  rolloverCredits: boolean;
  maxRollover: number | null;
  discountPercent: number | null;
  stripePriceId: string | null;
  isActive: boolean;
}

export interface CustomerSubscription {
  id: string;
  status: string;
  creditBalance: number;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CustomerAuth {
  token: string;
  customer: { id: string; email: string; name: string };
}

export interface LedgerEntry {
  id: string;
  changeAmount: number;
  reason: string;
  createdAt: string;
}

export interface MySubscriptionResponse {
  subscription: CustomerSubscription;
  plan: SubscriptionPlan | null;
  ledger: LedgerEntry[];
}

/** Fetch all active membership plans for this store. No auth required. */
export function getSubscriptionPlans() {
  return request<SubscriptionPlan[]>('/api/subscriptions/plans');
}

/**
 * Step 1 of customer sign-in: send a 4-digit login code to the customer's email.
 * Pass `name` when the email is not yet registered — it will create the account.
 * Response includes `isNewAccount` so you can show/hide the name field.
 */
export function sendLoginCode(email: string, name?: string) {
  return request<{ success?: boolean; isNewAccount?: boolean; needsName?: boolean; name?: string; error?: string }>(
    '/api/customer/send-code',
    { method: 'POST', body: JSON.stringify({ email, name }) },
  );
}

/**
 * Step 2 of customer sign-in: verify the 4-digit code emailed in step 1.
 * Returns a session `token` — store it in localStorage and send it as
 * `Authorization: Bearer <token>` on authenticated requests.
 */
export function verifyLoginCode(email: string, code: string, name?: string) {
  return request<CustomerAuth>(
    '/api/customer/verify-code',
    { method: 'POST', body: JSON.stringify({ email, code, name }) },
  );
}

/** Fetch the currently signed-in customer's subscription, credit balance, and recent ledger. */
export function getMySubscription(token: string) {
  return request<MySubscriptionResponse | null>('/api/subscriptions/my', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/**
 * Start a Stripe Checkout session for the given plan.
 * Returns { url } — redirect the browser there to complete payment.
 * Requires a valid customer session token.
 */
export function createSubscriptionCheckout(
  token: string,
  planId: string,
  successUrl?: string,
  cancelUrl?: string,
) {
  return request<{ url: string }>('/api/subscriptions/checkout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ planId, successUrl, cancelUrl }),
  });
}

/**
 * Confirm a subscription after Stripe redirects back to the success URL.
 * Pass the `session_id` query param Stripe appends to the success URL.
 * This records the subscription in the database without needing a webhook.
 */
export function confirmSubscription(token: string, sessionId: string) {
  return request<{ subscription: CustomerSubscription; plan: SubscriptionPlan; alreadyActive: boolean }>(
    '/api/subscriptions/confirm',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId }),
    }
  );
}

/**
 * Open the Stripe Billing Portal so the customer can manage or cancel their subscription.
 * Returns { url } — redirect the browser there.
 * Requires a valid customer session token.
 */
export function getSubscriptionPortalUrl(token: string, returnUrl?: string) {
  return request<{ url: string }>('/api/subscriptions/portal', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ returnUrl }),
  });
}

// ─── Events ─────────────────────────────────────────────────────────────────

export interface StoreEvent {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  endDate?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  link?: string | null;
  isActive: boolean;
}

/** Fetch active (public) events. */
export function getEvents() {
  return request<StoreEvent[]>('/api/events');
}

// ─── Social Posts ────────────────────────────────────────────────────────────

export interface SocialPost {
  id: string;
  platform: string;
  postUrl: string;
  title?: string | null;
  displayOrder: number;
  isActive: boolean;
}

/** Fetch active social posts. */
export function getSocialPosts() {
  return request<SocialPost[]>('/api/social-posts');
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

  // ─── Directory / Network ──────────────────────────────────────────────────────

  export interface LocationPoint {
    name: string;
    lat: string;
    lng: string;
  }

  export interface DirectoryFieldDef {
    key: string;
    label: string;
    type: 'text' | 'url' | 'phone' | 'email' | 'textarea' | 'image' | 'select' | 'location';
    required?: boolean;
    halfWidth?: boolean;
    options?: string[];
    allowMultiple?: boolean;
  }

  export interface DirectoryType {
    id: string;
    name: string;
    slug: string;
    color: string | null;
    icon: string | null;
    pageTitle: string | null;
    pageSubtitle: string | null;
    fields: DirectoryFieldDef[];
    isActive: boolean;
    displayOrder: number;
  }

  export interface DirectoryEntry {
    id: string;
    typeId: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    lat: string | null;
    lng: string | null;
    fields: Record<string, string>;
    isActive: boolean;
  }

  /** Fetch active directory entity types for this store. */
  export function getDirectoryTypes() {
    return request<DirectoryType[]>('/api/directory/types');
  }

  /** Fetch active directory entries, optionally filtered by typeId. */
  export function getDirectoryEntries(typeId?: string) {
    const qs = typeId ? `?typeId=${encodeURIComponent(typeId)}` : '';
    return request<DirectoryEntry[]>(`/api/directory/entries${qs}`);
  }
  