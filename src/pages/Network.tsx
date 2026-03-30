import { useState, useEffect } from 'react';
  import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
  import L from 'leaflet';
  import { MapPin, List, Map as MapIcon, Phone, Globe, Mail, Search, ExternalLink } from 'lucide-react';
  import { getDirectoryTypes, getDirectoryEntries, resolveImageUrl } from '../api';
  import type { DirectoryType, DirectoryEntry, DirectoryFieldDef } from '../api';

  // Fix Leaflet default marker icon paths broken by bundlers
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  function makeColoredIcon(color: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="white" opacity="0.9"/>
    </svg>`;
    return L.divIcon({ html: svg, className: '', iconSize: [24, 36], iconAnchor: [12, 36], popupAnchor: [0, -36] });
  }

  function FitBounds({ entries }: { entries: DirectoryEntry[] }) {
    const map = useMap();
    useEffect(() => {
      const withCoords = entries.filter(e => e.lat && e.lng);
      if (withCoords.length === 0) return;
      if (withCoords.length === 1) {
        map.setView([parseFloat(withCoords[0].lat!), parseFloat(withCoords[0].lng!)], 10);
        return;
      }
      const bounds = L.latLngBounds(withCoords.map(e => [parseFloat(e.lat!), parseFloat(e.lng!)] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }, [entries, map]);
    return null;
  }

  function FieldValue({ def, value }: { def: DirectoryFieldDef; value: string }) {
    if (!value) return null;
    if (def.type === 'url') return (
      <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{value.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    );
    if (def.type === 'phone') return (
      <a href={`tel:${value}`} className="flex items-center gap-1 text-sm hover:underline">
        <Phone className="w-3.5 h-3.5 shrink-0 text-gray-500" />{value}
      </a>
    );
    if (def.type === 'email') return (
      <a href={`mailto:${value}`} className="flex items-center gap-1 text-sm hover:underline">
        <Mail className="w-3.5 h-3.5 shrink-0 text-gray-500" />{value}
      </a>
    );
    if (def.type === 'image') return (
      <img src={resolveImageUrl(value)} alt={def.label} className="w-full h-32 object-cover rounded-md mt-1" />
    );
    if (def.type === 'textarea') return <p className="text-sm text-gray-500 leading-relaxed">{value}</p>;
    return <p className="text-sm">{value}</p>;
  }

  function EntryCard({ entry, type }: { entry: DirectoryEntry; type?: DirectoryType }) {
    const fields: DirectoryFieldDef[] = (type?.fields as DirectoryFieldDef[]) || [];
    const values: Record<string, string> = (entry.fields as Record<string, string>) || {};
    const location = [entry.city, entry.state].filter(Boolean).join(', ');

    return (
      <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
        <div className="flex items-start gap-3">
          <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: type?.color || '#3b82f6' }} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="font-semibold leading-tight">{entry.name}</h3>
              {type && (
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium shrink-0"
                  style={{ borderColor: type.color || '#3b82f6', color: type.color || '#3b82f6' }}>
                  {type.icon ? `${type.icon} ` : ''}{type.name}
                </span>
              )}
            </div>
            {location && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{location}
              </p>
            )}
            {fields.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {fields.map(def => values[def.key] ? (
                  <div key={def.key}>
                    {def.type !== 'textarea' && def.type !== 'image' && (
                      <span className="text-xs font-medium text-gray-500">{def.label}: </span>
                    )}
                    <FieldValue def={def} value={values[def.key]} />
                  </div>
                ) : null)}
              </div>
            )}
            {entry.address && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent([entry.address, entry.city, entry.state, entry.zip].filter(Boolean).join(', '))}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                <MapPin className="w-3 h-3" /> Get Directions
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  function PopupContent({ entry, type }: { entry: DirectoryEntry; type?: DirectoryType }) {
    const fields: DirectoryFieldDef[] = (type?.fields as DirectoryFieldDef[]) || [];
    const values: Record<string, string> = (entry.fields as Record<string, string>) || {};
    const location = [entry.city, entry.state].filter(Boolean).join(', ');
    return (
      <div className="min-w-[180px] max-w-[240px]">
        <p className="font-semibold text-sm">{entry.name}</p>
        {location && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</p>}
        {fields.slice(0, 4).map(def => values[def.key] ? (
          <div key={def.key} className="mt-1">
            {def.type === 'url' ? (
              <a href={values[def.key].startsWith('http') ? values[def.key] : `https://${values[def.key]}`}
                target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline flex items-center gap-1">
                <Globe className="w-3 h-3" />{def.label}
              </a>
            ) : def.type === 'phone' ? (
              <a href={`tel:${values[def.key]}`} className="text-xs flex items-center gap-1">
                <Phone className="w-3 h-3" />{values[def.key]}
              </a>
            ) : def.type === 'email' ? (
              <a href={`mailto:${values[def.key]}`} className="text-xs flex items-center gap-1">
                <Mail className="w-3 h-3" />{values[def.key]}
              </a>
            ) : def.type === 'image' ? null : (
              <p className="text-xs text-gray-600">{values[def.key]}</p>
            )}
          </div>
        ) : null)}
        {entry.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent([entry.address, entry.city, entry.state, entry.zip].filter(Boolean).join(', '))}`}
            target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1.5">
            <MapPin className="w-3 h-3" />Directions
          </a>
        )}
      </div>
    );
  }

  export default function Network() {
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [activeTypeId, setActiveTypeId] = useState('');
    const [search, setSearch] = useState('');
    const [types, setTypes] = useState<DirectoryType[]>([]);
    const [allEntries, setAllEntries] = useState<DirectoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      Promise.all([getDirectoryTypes(), getDirectoryEntries()])
        .then(([t, e]) => { setTypes(t); setAllEntries(e); })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }, []);

    const activeType = types.find(t => t.id === activeTypeId);
    const pageTitle = activeType?.pageTitle || (types.length > 0 ? 'Our Network' : 'The Network');
    const pageSubtitle = activeType?.pageSubtitle || 'Find us near you';

    useEffect(() => { document.title = pageTitle; }, [pageTitle]);

    const filteredEntries = allEntries.filter(e => {
      if (activeTypeId && e.typeId !== activeTypeId) return false;
      if (search) {
        const q = search.toLowerCase();
        const vals = Object.values((e.fields as Record<string, string>) || {}).join(' ').toLowerCase();
        return e.name.toLowerCase().includes(q) ||
          (e.city || '').toLowerCase().includes(q) ||
          (e.state || '').toLowerCase().includes(q) ||
          vals.includes(q);
      }
      return true;
    });

    const mapEntries = filteredEntries.filter(e => e.lat && e.lng);
    const typeMap = Object.fromEntries(types.map(t => [t.id, t]));
    const typeCounts = types.reduce<Record<string, number>>((acc, t) => {
      acc[t.id] = allEntries.filter(e => e.typeId === t.id).length;
      return acc;
    }, {});

    return (
      <div className="min-h-screen">
        <section className="bg-gradient-to-b from-gray-50 to-white py-10 md:py-14">
          <div className="max-w-6xl mx-auto px-4">
            <h1 className="text-4xl md:text-5xl font-bold text-center mb-3">{pageTitle}</h1>
            <p className="text-lg text-gray-500 text-center max-w-2xl mx-auto">{pageSubtitle}</p>
          </div>
        </section>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-gray-800 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : types.length === 0 ? (
          <div className="text-center py-20">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold mb-2">Coming Soon</h3>
            <p className="text-gray-500">The Network is growing. Check back soon!</p>
          </div>
        ) : (
          <section className="py-6">
            <div className="max-w-6xl mx-auto px-4 space-y-4">
              {/* Controls */}
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActiveTypeId('')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${!activeTypeId ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'}`}>
                    All ({allEntries.length})
                  </button>
                  {types.map(t => (
                    <button key={t.id} onClick={() => setActiveTypeId(prev => prev === t.id ? '' : t.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeTypeId === t.id ? 'text-white border-transparent' : 'border-gray-300 hover:bg-gray-50'}`}
                      style={activeTypeId === t.id ? { backgroundColor: t.color || '#3b82f6' } : {}}>
                      {t.icon ? `${t.icon} ` : ''}{t.name} ({typeCounts[t.id] || 0})
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" placeholder="Search..."
                      value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md w-40 focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  </div>
                  <div className="flex rounded-md border border-gray-300 overflow-hidden">
                    <button onClick={() => setViewMode('map')}
                      className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'map' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                      <MapIcon className="w-4 h-4" /> Map
                    </button>
                    <button onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                      <List className="w-4 h-4" /> List
                    </button>
                  </div>
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="text-center py-16">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No results found</p>
                  <p className="text-gray-500 text-sm">Try a different filter or search term.</p>
                </div>
              ) : viewMode === 'map' ? (
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden border shadow-sm" style={{ height: '520px' }}>
                    <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <FitBounds entries={mapEntries} />
                      {mapEntries.map(entry => {
                        const type = typeMap[entry.typeId];
                        return (
                          <Marker key={entry.id}
                            position={[parseFloat(entry.lat!), parseFloat(entry.lng!)]}
                            icon={makeColoredIcon(type?.color || '#3b82f6')}>
                            <Popup><PopupContent entry={entry} type={type} /></Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  </div>
                  {mapEntries.length < filteredEntries.length && (
                    <p className="text-xs text-gray-400 text-center">
                      {filteredEntries.length - mapEntries.length} {filteredEntries.length - mapEntries.length === 1 ? 'entry' : 'entries'} not shown on map (no coordinates). Switch to List view to see all.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEntries.map(entry => (
                    <EntryCard key={entry.id} entry={entry} type={typeMap[entry.typeId]} />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    );
  }
  