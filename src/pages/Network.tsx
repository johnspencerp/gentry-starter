import { useState, useEffect } from 'react';
  import { Link } from 'wouter';
  import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
  import MarkerClusterGroup from 'react-leaflet-cluster';
  import 'react-leaflet-cluster/lib/assets/MarkerCluster.css';
  import 'react-leaflet-cluster/lib/assets/MarkerCluster.Default.css';
  import L from 'leaflet';
  import { MapPin, List, Map as MapIcon, Phone, Globe, Mail, Search, ExternalLink, ArrowRight, Navigation } from 'lucide-react';
  import { getDirectoryTypes, getDirectoryEntries, resolveImageUrl } from '../api';
  import type { DirectoryType, DirectoryEntry, DirectoryFieldDef, LocationPoint } from '../api';

  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  const PAGE_SIZE = 24;

  function makeColoredIcon(color: string, small = false) {
    const w = small ? 16 : 24; const h = small ? 24 : 36; const r = small ? 3 : 4.5;
    return L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${w}" height="${h}">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24s12-15 12-24c0-6.627-5.373-12-12-12z"
          fill="${color}" stroke="white" stroke-width="1.5" opacity="${small ? 0.75 : 1}"/>
        <circle cx="12" cy="12" r="${r}" fill="white" opacity="0.9"/>
      </svg>`,
      className: '', iconSize: [w, h], iconAnchor: [w / 2, h], popupAnchor: [0, -h],
    });
  }

  export function extractLocationPins(entry: DirectoryEntry, typeDefs: DirectoryFieldDef[]) {
    const pins: Array<LocationPoint & { fieldLabel: string }> = [];
    const values = (entry.fields as Record<string, any>) || {};
    for (const def of typeDefs) {
      if (def.type !== 'location') continue;
      const val = values[def.key];
      if (!val) continue;
      const raw: LocationPoint[] = Array.isArray(val) ? val : [val];
      pins.push(...raw.filter(p => p.lat && p.lng).map(p => ({ ...p, fieldLabel: def.label })));
    }
    return pins;
  }

  export function FieldValue({ def, value }: { def: DirectoryFieldDef; value: any }) {
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
    if (def.type === 'location') {
      const pts: LocationPoint[] = Array.isArray(value) ? value : [value];
      return (
        <div className="space-y-0.5">
          {pts.filter(p => p.name).map((p, i) => (
            <p key={i} className="text-sm flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 shrink-0 text-gray-500" />{p.name}
            </p>
          ))}
        </div>
      );
    }
    if (def.type === 'textarea') return <p className="text-sm text-gray-500 leading-relaxed">{value}</p>;
    return <p className="text-sm">{value}</p>;
  }

  function FitBounds({ main, locs }: { main: [number,number][]; locs: [number,number][] }) {
    const map = useMap();
    useEffect(() => {
      const all = [...main, ...locs];
      if (all.length === 0) return;
      if (all.length === 1) { map.setView(all[0], 10); return; }
      map.fitBounds(L.latLngBounds(all), { padding: [40, 40] });
    }, [main, locs, map]);
    return null;
  }

  function EntryCard({ entry, type }: { entry: DirectoryEntry; type?: DirectoryType }) {
    const fields: DirectoryFieldDef[] = (type?.fields as DirectoryFieldDef[]) || [];
    const values: Record<string, any> = (entry.fields as Record<string, any>) || {};
    const location = [entry.city, entry.state].filter(Boolean).join(', ');
    const locationPins = extractLocationPins(entry, fields);
    return (
      <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow flex flex-col">
        <div className="flex items-start gap-3 flex-1">
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
            {locationPins.length > 0 && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <Navigation className="w-3 h-3" />
                {locationPins.slice(0, 3).map(p => p.name).join(', ')}
                {locationPins.length > 3 ? ` +${locationPins.length - 3} more` : ''}
              </p>
            )}
            {fields.filter(d => d.type !== 'location' && values[d.key]).slice(0, 3).map(def => (
              <div key={def.key} className="mt-1.5">
                {def.type !== 'textarea' && def.type !== 'image' && (
                  <span className="text-xs font-medium text-gray-500">{def.label}: </span>
                )}
                <FieldValue def={def} value={values[def.key]} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t gap-2">
          {entry.address ? (
            <a href={`https://maps.google.com/?q=${encodeURIComponent([entry.address, entry.city, entry.state, entry.zip].filter(Boolean).join(', '))}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <MapPin className="w-3 h-3" /> Directions
            </a>
          ) : <span />}
          <Link href={`/network/${type?.slug || 'entry'}/${entry.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline">
            View Profile <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    );
  }

  export default function Network() {
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [activeTypeId, setActiveTypeId] = useState('');
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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

    useEffect(() => { setVisibleCount(PAGE_SIZE); }, [activeTypeId, search]);

    const activeType = types.find(t => t.id === activeTypeId);
    const pageTitle = activeType?.pageTitle || (types.length > 0 ? 'Our Network' : 'The Network');
    const pageSubtitle = activeType?.pageSubtitle || 'Find us near you';
    const typeMap = Object.fromEntries(types.map(t => [t.id, t]));
    const typeCounts = types.reduce<Record<string, number>>((acc, t) => {
      acc[t.id] = allEntries.filter(e => e.typeId === t.id).length; return acc;
    }, {});

    useEffect(() => { document.title = pageTitle; }, [pageTitle]);

    const filteredEntries = allEntries.filter(e => {
      if (activeTypeId && e.typeId !== activeTypeId) return false;
      if (search) {
        const q = search.toLowerCase();
        const vals = Object.values((e.fields as Record<string, any>) || {}).map((v: any) =>
          typeof v === 'string' ? v : Array.isArray(v) ? v.map((p: any) => p.name || '').join(' ') : ''
        ).join(' ').toLowerCase();
        return e.name.toLowerCase().includes(q) || (e.city||'').toLowerCase().includes(q) ||
          (e.state||'').toLowerCase().includes(q) || vals.includes(q);
      }
      return true;
    });

    const mainPins = filteredEntries.filter(e => e.lat && e.lng)
      .map(e => ({ entry: e, coord: [parseFloat(e.lat!), parseFloat(e.lng!)] as [number,number] }));
    const locPins = filteredEntries.flatMap(e => {
      const defs = (typeMap[e.typeId]?.fields as DirectoryFieldDef[]) || [];
      return extractLocationPins(e, defs).map(p => ({ entry: e, name: p.name, coord: [parseFloat(p.lat), parseFloat(p.lng)] as [number,number] }));
    });

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
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setActiveTypeId('')}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${!activeTypeId ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 hover:bg-gray-50'}`}>
                    All ({allEntries.length})
                  </button>
                  {types.map(t => (
                    <button key={t.id} onClick={() => setActiveTypeId(p => p === t.id ? '' : t.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${activeTypeId === t.id ? 'text-white border-transparent' : 'border-gray-300 hover:bg-gray-50'}`}
                      style={activeTypeId === t.id ? { backgroundColor: t.color || '#3b82f6' } : {}}>
                      {t.icon ? `${t.icon} ` : ''}{t.name} ({typeCounts[t.id] || 0})
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md w-40 focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  </div>
                  <div className="flex rounded-md border border-gray-300 overflow-hidden">
                    <button onClick={() => setViewMode('map')}
                      className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'map' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                      <MapIcon className="w-4 h-4" /> Map
                    </button>
                    <button onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 text-sm flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}>
                      <List className="w-4 h-4" /> List
                    </button>
                  </div>
                </div>
              </div>

              {filteredEntries.length === 0 ? (
                <div className="text-center py-16">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No results found</p>
                </div>
              ) : viewMode === 'map' ? (
                <div className="rounded-xl overflow-hidden border shadow-sm" style={{ height: '520px' }}>
                  <MapContainer center={[39.5, -98.35]} zoom={4} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <FitBounds main={mainPins.map(p => p.coord)} locs={locPins.map(p => p.coord)} />
                    <MarkerClusterGroup chunkedLoading>
                      {mainPins.map(({ entry }) => {
                        const type = typeMap[entry.typeId];
                        return (
                          <Marker key={`main-${entry.id}`} position={[parseFloat(entry.lat!), parseFloat(entry.lng!)]}
                            icon={makeColoredIcon(type?.color || '#3b82f6')}>
                            <Popup>
                              <p className="font-semibold text-sm">{entry.name}</p>
                              {[entry.city, entry.state].filter(Boolean).length > 0 && (
                                <p className="text-xs text-gray-500">{[entry.city, entry.state].filter(Boolean).join(', ')}</p>
                              )}
                              <Link href={`/network/${type?.slug || 'entry'}/${entry.id}`}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                View Profile <ArrowRight className="w-3 h-3" />
                              </Link>
                            </Popup>
                          </Marker>
                        );
                      })}
                      {locPins.map((pin, i) => {
                        const type = typeMap[pin.entry.typeId];
                        return (
                          <Marker key={`loc-${pin.entry.id}-${i}`} position={pin.coord}
                            icon={makeColoredIcon(type?.color || '#3b82f6', true)}>
                            <Popup>
                              <p className="font-medium text-sm">{pin.name}</p>
                              <p className="text-xs text-gray-500">{pin.entry.name}</p>
                              <Link href={`/network/${type?.slug || 'entry'}/${pin.entry.id}`}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                                View Profile <ArrowRight className="w-3 h-3" />
                              </Link>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MarkerClusterGroup>
                  </MapContainer>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEntries.slice(0, visibleCount).map(entry => (
                      <EntryCard key={entry.id} entry={entry} type={typeMap[entry.typeId]} />
                    ))}
                  </div>
                  {visibleCount < filteredEntries.length && (
                    <div className="flex justify-center pt-2">
                      <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                        className="px-6 py-2 rounded-full border text-sm font-medium hover:bg-gray-50 transition-colors">
                        Load more ({filteredEntries.length - visibleCount} remaining)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    );
  }
  