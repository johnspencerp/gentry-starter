import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useCart } from '../context/CartContext';
import { getStore, getNavSettings, type NavSettings, type StoreInfo } from '../api';

export default function Nav() {
  const { count } = useCart();
  const [storeInfo, setStoreInfo] = useState<Pick<StoreInfo, 'name' | 'bookingsEnabled'>>({ name: 'My Store', bookingsEnabled: true });
  const [nav, setNav] = useState<NavSettings>({
    showShop: true,
    showBookings: false,
    showSocial: false,
    showEvents: false,
    showNewArrivals: false,
    showSubscriptions: false,
  });

  useEffect(() => {
    getStore().then(s => setStoreInfo({ name: s.name, bookingsEnabled: s.bookingsEnabled })).catch(() => {});
    getNavSettings().then(setNav).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {storeInfo.name}
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {nav.showShop && (
            <Link href="/" className="hover:underline">Shop</Link>
          )}
          {nav.showNewArrivals && (
            <Link href="/new-arrivals" className="hover:underline">New Arrivals</Link>
          )}
          {nav.showBookings && storeInfo.bookingsEnabled && (
            <Link href="/bookings" className="hover:underline">Book</Link>
          )}
          {nav.showSubscriptions && (
            <Link href="/membership" className="hover:underline">Membership</Link>
          )}
          {nav.showEvents && (
            <Link href="/events" className="hover:underline">Events</Link>
          )}
          {nav.showSocial && (
            <Link href="/social" className="hover:underline">Social</Link>
          )}
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
