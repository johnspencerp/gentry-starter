# Gentry Starter Kit

A minimal headless storefront for [Gentry Commerce](https://gentrycommerce.com) — built with Vite + React + TypeScript + Tailwind CSS.

---

## Quick start

```bash
cp .env.example .env
# edit .env — see configuration below
npm install
npm run dev
```

---

## Configuration (`.env`)

```env
# The Gentry Commerce platform URL.
# ALWAYS set this to https://gentrycommerce.com (or your self-hosted domain).
# Do NOT include your store slug here — the API key scopes the request to your store.
VITE_STORE_URL=https://gentrycommerce.com

# Your headless API key.
# Find this in your admin panel → Integrations → Access & Headless API.
VITE_STORE_API_KEY=sk_live_xxxxxxxxxxxxx
```

> **Common mistake:** setting `VITE_STORE_URL` to something like `https://gentrycommerce.com/my-store`.
> The `/my-store` slug is your storefront path, not the API base. The API always lives at the root domain.

---

## API overview

All requests include `X-Store-Api-Key: <your key>` — this is what tells the platform which store to return data for.

| Function | Endpoint | Notes |
|---|---|---|
| `getProducts()` | `GET /api/products?public=1` | `category`, `search`, `limit`, `offset` params |
| `getProduct(id)` | `GET /api/products/:id` | Includes `variants[]` and `images[]` |
| `getCollections()` | `GET /api/collections` | Named collections/categories |
| `getCategories()` | `GET /api/categories` | Flat list of category names |
| `getStoreName()` | `GET /api/settings/store-name` | Returns `{ name }` |
| `getHeroSettings()` | `GET /api/settings/hero` | Returns hero banner settings |
| `createCheckout(items)` | `POST /api/checkout/create-session` | Returns `{ url }` — redirect to it |

---

## Data shapes

### Product
```ts
{
  id: string
  name: string
  description?: string
  price: number          // cents — divide by 100 to display ($29.99 = 2999)
  salePrice?: number     // cents — present when isOnSale is true
  isOnSale: boolean
  imageUrl?: string      // relative path — use resolveImageUrl() to display
  category: string
  isActive: boolean      // false = unavailable / out of stock
  images: ProductImage[] // full gallery (may be empty; fall back to imageUrl)
  variants: ProductVariant[]
}
```

### ProductVariant
```ts
{
  id: string
  productId: string
  size?: string
  color?: string
  stock: number          // 0 = out of stock for this option
  sku?: string
  imageUrl?: string
}
```
> Variants do **not** have their own price. Always use `product.price` for pricing.

### ProductImage
```ts
{
  id: string
  productId: string
  imageUrl: string       // relative path — use resolveImageUrl()
  isDefault: boolean
  displayOrder: number
}
```

---

## Image URLs

The API returns relative image paths like `/objects/uploads/hat.png`.
Use the `resolveImageUrl()` helper from `api.ts` to get a displayable URL:

```ts
import { resolveImageUrl } from './api';
<img src={resolveImageUrl(product.imageUrl)} alt={product.name} />
```

---

## What the public API does NOT expose

- `?featured=true` — no featured products filter; show all products and sort client-side
- `/api/trip-types`, `/api/providers`, `/api/bookings` POST — booking management is not part of the public headless API; link customers to your hosted storefront for bookings
- `/api/store`, `/api/hero` (old paths) — use `/api/settings/store-name` and `/api/settings/hero`
