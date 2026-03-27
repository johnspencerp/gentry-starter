import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useCart } from '../context/CartContext';
import { getStoreName } from '../api';

export default function Nav() {
  const { count } = useCart();
  const [storeName, setStoreName] = useState('My Store');

  useEffect(() => {
    getStoreName()
      .then(s => setStoreName(s.name))
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {storeName}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="hover:underline">Shop</Link>
        </nav>

        <Link
          href="/cart"
          className="relative flex items-center gap-1.5 text-sm font-medium"
        >
          <span>Cart</span>
          {count > 0 && (
            <span className="absolute -top-2 -right-4 bg-black text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
