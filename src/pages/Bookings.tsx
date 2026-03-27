import { useEffect, useState } from 'react';
import {
  getTripTypes, getProviders, getAvailabilitySlots, postBooking,
  type TripType, type PublicProvider, type BookingInput,
} from '../api';

type Step = 'service' | 'details' | 'confirm' | 'success';

function formatDate(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export default function Bookings() {
  const [tripTypes, setTripTypes] = useState<TripType[]>([]);
  const [providers, setProviders] = useState<PublicProvider[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [step, setStep] = useState<Step>('service');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<BookingInput & { providerId?: string }>({
    tripTypeId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    preferredDate: '',
    alternateDate: '',
    partySize: 1,
    message: '',
  });

  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [slotsBlocked, setSlotsBlocked] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    Promise.all([
      getTripTypes().catch(() => []),
      getProviders().catch(() => []),
    ]).then(([tt, pv]) => {
      setTripTypes(tt);
      setProviders(pv);
    }).finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => {
    if (!form.tripTypeId || !form.preferredDate) return;
    setLoadingSlots(true);
    getAvailabilitySlots(form.tripTypeId, form.preferredDate)
      .then(r => { setSlotsBlocked(r.isBlocked); setSlots(r.availSlots); })
      .catch(() => { setSlotsBlocked(false); setSlots([]); })
      .finally(() => setLoadingSlots(false));
  }, [form.tripTypeId, form.preferredDate]);

  const selectedService = tripTypes.find(t => t.id === form.tripTypeId);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const booking = await postBooking({
        ...form,
        guideId: (form as any).providerId || undefined,
      });
      setConfirmedBookingId(booking.id);
      setStep('success');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'success') {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold mb-2">Booking Request Received</h1>
        <p className="text-gray-500 mb-6 leading-relaxed">
          Thanks, {form.customerName}! We've received your request for{' '}
          <strong>{selectedService?.name}</strong> on{' '}
          <strong>{formatDate(form.preferredDate)}</strong>.
          We'll be in touch shortly to confirm.
        </p>
        <button
          onClick={() => { setStep('service'); setForm({ tripTypeId: '', customerName: '', customerEmail: '', customerPhone: '', preferredDate: '', alternateDate: '', partySize: 1, message: '' }); }}
          className="bg-black text-white font-semibold px-8 py-3 rounded-xl hover:bg-gray-800 transition-colors"
        >
          Book another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Book a Session</h1>
      <p className="text-gray-500 mb-8">Fill in the details below and we'll confirm your booking.</p>

      {/* Step 1 — Choose service */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">1. Choose a service</h2>
        {loadingServices ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-xl" />
            ))}
          </div>
        ) : tripTypes.length === 0 ? (
          <p className="text-gray-400 text-sm">No services available right now.</p>
        ) : (
          <div className="space-y-3">
            {tripTypes.map(t => (
              <button
                key={t.id}
                onClick={() => set('tripTypeId', t.id)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-colors ${form.tripTypeId === t.id ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-400'}`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    {t.tagline && <p className="text-sm text-gray-500 mt-0.5">{t.tagline}</p>}
                    <p className="text-xs text-gray-400 mt-1">{t.duration} · up to {t.maxGuests} guests</p>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap">${(t.price / 100).toFixed(2)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Step 2 — Date & details */}
      {form.tripTypeId && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">2. Pick a date</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Preferred date *</label>
              <input
                type="date"
                min={today}
                value={form.preferredDate || ''}
                onChange={e => set('preferredDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Alternate date</label>
              <input
                type="date"
                min={today}
                value={form.alternateDate || ''}
                onChange={e => set('alternateDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          {/* Availability slots */}
          {form.preferredDate && (
            <div className="mb-4">
              {loadingSlots ? (
                <p className="text-xs text-gray-400">Checking availability…</p>
              ) : slotsBlocked ? (
                <p className="text-xs text-amber-600 font-medium">⚠ This date is unavailable. Please choose another.</p>
              ) : slots.length > 0 ? (
                <div>
                  <p className="text-sm font-medium mb-2">Available time slots</p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map(s => (
                      <button
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => set('startTime', s.time)}
                        className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          (form as any).startTime === s.time ? 'bg-black text-white border-black' : 'border-gray-300 hover:border-black'
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">No specific time slots configured — any time works.</p>
              )}
            </div>
          )}

          {/* Provider selector */}
          {providers.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Preferred guide / provider</label>
              <select
                value={(form as any).providerId || ''}
                onChange={e => set('providerId' as any, e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">No preference</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.displayName || p.name}{p.role ? ` — ${p.role}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <h2 className="text-lg font-semibold mb-3 mt-6">3. Your details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                placeholder="Full name"
                value={form.customerName}
                onChange={e => set('customerName', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Party size</label>
              <input
                type="number"
                min={1}
                max={selectedService?.maxGuests ?? 20}
                value={form.partySize ?? 1}
                onChange={e => set('partySize', parseInt(e.target.value, 10) || 1)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.customerEmail || ''}
                onChange={e => set('customerEmail', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                placeholder="(555) 000-0000"
                value={form.customerPhone || ''}
                onChange={e => set('customerPhone', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Message / special requests</label>
              <textarea
                rows={3}
                placeholder="Any notes for us?"
                value={form.message || ''}
                onChange={e => set('message', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
              />
            </div>
          </div>
        </section>
      )}

      {/* Submit */}
      {form.tripTypeId && form.preferredDate && form.customerName && (
        <div>
          {submitError && (
            <p className="text-sm text-red-500 mb-3">{submitError}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting || slotsBlocked}
            className="w-full bg-black text-white font-semibold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Request Booking'}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            We'll confirm your booking by email or phone.
          </p>
        </div>
      )}
    </div>
  );
}
