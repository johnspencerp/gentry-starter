import { useEffect, useState } from 'react';
import { getEvents, resolveImageUrl, type StoreEvent } from '../api';
import { Calendar, MapPin, ExternalLink } from 'lucide-react';

function formatDate(dateStr: string, endDateStr?: string | null) {
  const start = new Date(dateStr);
  const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  const startFmt = start.toLocaleDateString(undefined, opts);
  if (!endDateStr) return startFmt;
  const end = new Date(endDateStr);
  if (end.toDateString() === start.toDateString()) return startFmt;
  return `${startFmt} – ${end.toLocaleDateString(undefined, opts)}`;
}

export default function Events() {
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getEvents()
      .then(setEvents)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Events</h1>
      <p className="text-gray-500 mb-8">Upcoming events, tournaments, and community gatherings.</p>

      {loading && (
        <div className="text-center py-20 text-gray-400">Loading events…</div>
      )}

      {error && (
        <div className="text-center py-20 text-red-500">{error}</div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No events scheduled yet.</p>
          <p className="text-sm mt-1">Check back soon for upcoming events.</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {events.map(event => {
          const imageUrl = resolveImageUrl(event.imageUrl);
          return (
            <div
              key={event.id}
              className="border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt={event.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-5">
                <h2 className="text-lg font-semibold mb-2">{event.title}</h2>

                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(event.date, event.endDate)}</span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{event.location}</span>
                  </div>
                )}

                {event.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">{event.description}</p>
                )}

                {event.link && (
                  <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium underline"
                  >
                    Learn more <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
