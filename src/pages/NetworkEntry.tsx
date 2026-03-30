import { useState, useEffect } from 'react';
  import { useParams, Link } from 'wouter';
  import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
  import L from 'leaflet';
  import { MapPin, ArrowLeft, Navigation, ExternalLink } from 'lucide-react';
  import { getDirectoryTypes, getDirectoryEntries } from '../api';
  import type { DirectoryType, DirectoryEntry, DirectoryFieldDef, LocationPoint } from '../api';
  import { extractLocationPins, FieldValue } from './Network';

  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  function makeIcon(color: string, small = false) {
    const w = small ? 16 : 24; const h = small ? 24 : 36; const r = small ? 3 : 4.5;
    return L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${w}" height="${h}">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z"
          fill="${color}" stroke="white" stroke-width="1.5" opacity="${small ? 0.75 : 1}"/>
        <circle cx="12" cy="12" r="${r}" fill="white" opacity="0.9"/></svg>`,
      className: '', iconSize: [w, h], iconAnchor: [w / 2, h], popupAnchor: [0, -h],
    });
  }

  function EntryMap({ entry, typeDefs, color }: { entry: DirectoryEntry; typeDefs: DirectoryFieldDef[]; color: string }) {
    const locationPins = extractLocationPins(entry, typeDefs);
    const hasMain = !!(entry.lat && entry.lng);
    const allCoords: [number, number][] = [
      ...(hasMain ? [[parseFloat(entry.lat!), parseFloat(entry.lng!)]] as [number, number][] : []),
      ...locationPins.map(p => [parseFloat(p.lat), parseFloat(p.lng)] as [number, number]),
    ];

    function FitAll() {
      const map = useMap();
      useEffect(() => {
        if (allCoords.length === 0) return;
        if (allCoords.length === 1) { map.setView(allCoords[0], 10); return; }
        map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
      }, [map]);
      return null;
    }

    if (allCoords.length === 0) return null;
    return (
      <div className="rounded-xl overflow-hidden border shadow-sm" style={{ height: '340px' }}>
        <MapContainer center={allCoords[0]} zoom={7} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FitAll />
          {hasMain && (
            <Marker position={[parseFloat(entry.lat!), parseFloat(entry.lng!)]} icon={makeIcon(color)}>
              <Popup><p className="font-semibold text-sm">{entry.name}</p></Popup>
            </Marker>
          )}
          {locationPins.map((pin, i) => (
            <Marker key={i} position={[parseFloat(pin.lat), parseFloat(pin.lng)]} icon={makeIcon(color, true)}>
              <Popup>
                <p className="font-medium text-sm">{pin.name}</p>
                <p className="text-xs text-gray-500">{pin.fieldLabel}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    );
  }

  export default function NetworkEntry() {
    const { entryId } = useParams<{ typeSlug: string; entryId: string }>();
    const [entry, setEntry] = useState<DirectoryEntry | null>(null);
    const [types, setTypes] = useState<DirectoryType[]>([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
      if (!entryId) return;
      Promise.all([
        fetch(`/api/directory/entries/${entryId}`).then(r => r.ok ? r.json() : Promise.reject()),
        getDirectoryTypes(),
      ])
        .then(([e, t]) => { setEntry(e); setTypes(t); })
        .catch(() => setNotFound(true))
        .finally(() => setLoading(false));
    }, [entryId]);

    useEffect(() => {
      if (entry) document.title = entry.name;
    }, [entry]);

    if (loading) return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );

    if (notFound || !entry) return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h2 className="text-xl font-semibold mb-2">Entry not found</h2>
          <Link href="/network" className="text-sm text-blue-600 hover:underline">Back to Network</Link>
        </div>
      </div>
    );

    const type = types.find(t => t.id === entry.typeId);
    const typeDefs: DirectoryFieldDef[] = (type?.fields as DirectoryFieldDef[]) || [];
    const values: Record<string, any> = (entry.fields as Record<string, any>) || {};
    const color = type?.color || '#3b82f6';
    const locationPins = extractLocationPins(entry, typeDefs);
    const location = [entry.city, entry.state].filter(Boolean).join(', ');
    const regularFields = typeDefs.filter(d => d.type !== 'location' && values[d.key]);
    const locationFields = typeDefs.filter(d => d.type === 'location');

    return (
      <div className="min-h-screen">
        <div className="border-b bg-white sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <Link href="/network" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> Back to Network
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0"
              style={{ backgroundColor: color }}>
              {type?.icon || entry.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold">{entry.name}</h1>
                {type && (
                  <span className="text-sm px-2.5 py-0.5 rounded-full border font-medium"
                    style={{ borderColor: color, color }}>
                    {type.icon ? `${type.icon} ` : ''}{type.name}
                  </span>
                )}
              </div>
              {location && <p className="text-gray-500 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {location}</p>}
              {locationPins.length > 0 && (
                <p className="text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Navigation className="w-4 h-4" />
                  {locationPins.map(p => p.name).join(' · ')}
                </p>
              )}
            </div>
          </div>

          <hr />

          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 space-y-6">
              {regularFields.map(def => (
                <div key={def.key}>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{def.label}</p>
                  <FieldValue def={def} value={values[def.key]} />
                </div>
              ))}
              {locationFields.map(def => {
                const pins = extractLocationPins(entry, [def]);
                if (!pins.length) return null;
                return (
                  <div key={def.key}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{def.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {pins.map((pin, i) => (
                        <a key={i}
                          href={`https://maps.google.com/?q=${encodeURIComponent(pin.name)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm hover:bg-gray-50 transition-colors">
                          <Navigation className="w-3.5 h-3.5 text-gray-400" />
                          {pin.name}
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
              {entry.address && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Address</p>
                  <p className="text-sm">{[entry.address, entry.city, entry.state, entry.zip].filter(Boolean).join(', ')}</p>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent([entry.address, entry.city, entry.state, entry.zip].filter(Boolean).join(', '))}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mt-1">
                    <MapPin className="w-3.5 h-3.5" /> Get Directions
                  </a>
                </div>
              )}
            </div>
            <div className="lg:col-span-2">
              <EntryMap entry={entry} typeDefs={typeDefs} color={color} />
            </div>
          </div>
        </div>
      </div>
    );
  }
  