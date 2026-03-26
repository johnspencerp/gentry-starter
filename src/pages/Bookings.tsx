import { useEffect, useState } from 'react';
import { getTripTypes, getProviders, createBooking, type TripType, type Provider } from '../api';

export default function Bookings() {
  const [tripTypes, setTripTypes] = useState<TripType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    tripTypeId: '',
    providerId: '',
    date: '',
    time: '09:00',
    guests: 1,
    customerName: '',
    customerEmail: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([getTripTypes(), getProviders()])
      .then(([tt, pv]) => {
        setTripTypes(tt);
        setProviders(pv);
        if (tt.length) setForm(f => ({ ...f, tripTypeId: tt[0].id }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof typeof form, v: string | number) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createBooking({
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        tripTypeId: form.tripTypeId,
        providerId: form.providerId || undefined,
        date: form.date,
        time: form.time,
        guests: form.guests,
        notes: form.notes || undefined,
      });
      setSubmitted(true);
    } catch {
      alert('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-32 px-4 text-center">
        <p className="text-3xl mb-2">🎉</p>
        <h2 className="text-2xl font-bold mb-2">Booking confirmed!</h2>
        <p className="text-gray-500 mb-6">We'll be in touch with details.</p>
        <a href="/" className="underline text-sm">Back to home</a>
      </div>
    );
  }

  if (loading) {
    return <div className="max-w-xl mx-auto py-32 text-center text-gray-400">Loading…</div>;
  }

  const inputCls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black';
  const labelCls = 'block text-sm font-medium mb-1';

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">Book a Session</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        {tripTypes.length > 0 && (
          <div>
            <label className={labelCls}>Service</label>
            <select className={inputCls} value={form.tripTypeId} onChange={e => set('tripTypeId', e.target.value)} required>
              {tripTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {providers.length > 0 && (
          <div>
            <label className={labelCls}>Provider (optional)</label>
            <select className={inputCls} value={form.providerId} onChange={e => set('providerId', e.target.value)}>
              <option value="">No preference</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Date</label>
            <input type="date" className={inputCls} value={form.date} min={new Date().toISOString().split('T')[0]} onChange={e => set('date', e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Time</label>
            <input type="time" className={inputCls} value={form.time} onChange={e => set('time', e.target.value)} required />
          </div>
        </div>

        <div>
          <label className={labelCls}>Guests</label>
          <input type="number" className={inputCls} min={1} max={20} value={form.guests} onChange={e => set('guests', Number(e.target.value))} required />
        </div>

        <div>
          <label className={labelCls}>Your name</label>
          <input type="text" className={inputCls} value={form.customerName} onChange={e => set('customerName', e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" className={inputCls} value={form.customerEmail} onChange={e => set('customerEmail', e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Notes (optional)</label>
          <textarea className={inputCls} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-black text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Confirm booking'}
        </button>
      </form>
    </div>
  );
}
