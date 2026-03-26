import { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem } from '../api';

interface CartEntry extends CartItem {
  name: string;
  price: string;
  imageUrl?: string;
}

interface CartCtx {
  items: CartEntry[];
  count: number;
  add: (item: CartEntry) => void;
  remove: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, variantId: string | undefined, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartCtx | null>(null);

const STORAGE_KEY = 'gentry_cart';

function matchEntry(a: CartEntry, productId: string, variantId?: string) {
  return a.productId === productId && (a.variantId ?? '') === (variantId ?? '');
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const add = (item: CartEntry) => {
    setItems(prev => {
      const existing = prev.find(e => matchEntry(e, item.productId, item.variantId));
      if (existing) {
        return prev.map(e =>
          matchEntry(e, item.productId, item.variantId)
            ? { ...e, quantity: e.quantity + item.quantity }
            : e
        );
      }
      return [...prev, item];
    });
  };

  const remove = (productId: string, variantId?: string) => {
    setItems(prev => prev.filter(e => !matchEntry(e, productId, variantId)));
  };

  const updateQty = (productId: string, variantId: string | undefined, qty: number) => {
    if (qty < 1) { remove(productId, variantId); return; }
    setItems(prev =>
      prev.map(e =>
        matchEntry(e, productId, variantId) ? { ...e, quantity: qty } : e
      )
    );
  };

  const clear = () => setItems([]);

  const count = items.reduce((s, e) => s + e.quantity, 0);

  return (
    <CartContext.Provider value={{ items, count, add, remove, updateQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
