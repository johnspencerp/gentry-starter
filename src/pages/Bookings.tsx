/*
  Bookings.tsx — Placeholder page for booking-based stores.

  The Gentry Commerce headless API does not currently expose a public
  booking endpoint. Customers should book through your hosted storefront.

  To customise this page, replace the contents below with your own booking
  UI, embed a third-party scheduling widget, or link directly to your
  storefront booking flow.
*/

const STORE_URL = (import.meta.env.VITE_STORE_URL as string) || 'https://gentrycommerce.com';

export default function Bookings() {
  return (
    <div className="max-w-xl mx-auto px-4 py-32 text-center">
      <p className="text-4xl mb-4">📅</p>
      <h1 className="text-2xl font-bold mb-3">Book a Session</h1>
      <p className="text-gray-500 mb-8 leading-relaxed">
        Ready to book? Head to our main storefront to choose your service,
        pick a time, and complete your reservation.
      </p>
      <a
        href={STORE_URL}
        className="inline-block bg-black text-white font-semibold px-8 py-3 rounded-xl hover:bg-gray-800 transition-colors"
      >
        Go to storefront →
      </a>
    </div>
  );
}
