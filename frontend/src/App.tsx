import { useMemo, useState } from 'react';
import { Bot, Building2, Compass, BarChart3, Sparkles, MapPin, Star, Eraser } from 'lucide-react';
import MapSearch from '@/components/MapSearch';
import ChatPanel from '@/components/ChatPanel';
import HostPanel from '@/components/HostPanel';
import Reports from '@/components/Reports';
import {
  CLASS_LABELS, searchInAreas, listings as seedListings,
  type Booking, type Listing, type PropertyClass, type Rect, type Role,
} from '@/lib/data';

type Tab = 'explorar' | 'anfitrion' | 'reportes';

export default function App() {
  const [tab, setTab] = useState<Tab>('explorar');
  const [role, setRole] = useState<Role>('huesped');
  const [listings, setListings] = useState<Listing[]>(seedListings);
  const [areas, setAreas] = useState<Rect[]>([]);
  const [klass, setKlass] = useState<PropertyClass | ''>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selected, setSelected] = useState<Listing | null>(null);
  const [autoGuest, setAutoGuest] = useState(false);
  const [guestBudget, setGuestBudget] = useState(100);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const results = useMemo(
    () => searchInAreas(areas, klass, minPrice ? Number(minPrice) : undefined, maxPrice ? Number(maxPrice) : undefined),
    [areas, klass, minPrice, maxPrice],
  );
  const shown = areas.length ? results : listings;

  const updateListing = (l: Listing) =>
    setListings((ls) => ls.map((x) => (x.id === l.id ? l : x)));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'explorar', label: 'Explorar', icon: <Compass size={16} /> },
    { id: 'anfitrion', label: 'Panel Anfitrión', icon: <Building2 size={16} /> },
    { id: 'reportes', label: 'Reportes & KPIs', icon: <BarChart3 size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-rose-600 to-violet-600 text-white p-2 rounded-xl"><Bot size={20} /></div>
            <div>
              <h1 className="font-extrabold text-slate-800 leading-none">StayAgent <span className="text-rose-600">AI</span></h1>
              <p className="text-[10px] text-slate-400">tu alquiler, tus agentes, tu tiempo libre</p>
            </div>
          </div>

          <nav className="flex-1 flex justify-center gap-1">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-rose-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                {t.icon}<span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>

          {/* Switch de rol demo */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 text-xs font-medium">
            {(['huesped', 'anfitrion'] as Role[]).map((r) => (
              <button key={r} onClick={() => { setRole(r); setTab(r === 'anfitrion' ? 'anfitrion' : 'explorar'); }}
                className={`px-3 py-1.5 rounded-lg capitalize transition-colors ${role === r ? 'bg-white shadow text-rose-600' : 'text-slate-500'}`}>
                {r === 'huesped' ? 'Huésped' : 'Anfitrión'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-5">
        {tab === 'explorar' && (
          <div className="space-y-4">
            {/* Barra de filtros + Huésped automático */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-wrap items-end gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Clase</label>
                <select value={klass} onChange={(e) => setKlass(e.target.value as PropertyClass | '')}
                  className="border rounded-lg px-2.5 py-2 text-sm">
                  <option value="">Todas</option>
                  {Object.entries(CLASS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Precio mín.</label>
                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="0"
                  className="border rounded-lg px-2.5 py-2 text-sm w-24" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Precio máx.</label>
                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="500"
                  className="border rounded-lg px-2.5 py-2 text-sm w-24" />
              </div>
              <button onClick={() => { setAreas([]); setKlass(''); setMinPrice(''); setMaxPrice(''); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 border rounded-lg px-3 py-2 hover:bg-slate-50">
                <Eraser size={14} /> Limpiar
              </button>

              <div className="flex-1" />

              {/* HUÉSPED AUTOMÁTICO */}
              <div className={`flex items-center gap-3 rounded-xl px-4 py-2 border transition-colors ${autoGuest ? 'bg-sky-50 border-sky-300' : 'bg-slate-50 border-slate-200'}`}>
                <Sparkles size={18} className={autoGuest ? 'text-sky-600' : 'text-slate-400'} />
                <div>
                  <p className="text-sm font-semibold text-slate-700 leading-tight">Huésped Automático</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    presupuesto máx.
                    <input type="number" value={guestBudget} onChange={(e) => setGuestBudget(Number(e.target.value))}
                      className="w-16 border rounded px-1 py-0.5 text-[11px]" /> USD/noche
                  </div>
                </div>
                <button onClick={() => setAutoGuest(!autoGuest)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${autoGuest ? 'bg-sky-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${autoGuest ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            <p className="text-sm text-slate-500 flex items-center gap-2">
              <MapPin size={14} className="text-rose-500" />
              {areas.length
                ? <><strong className="text-slate-700">{results.length}</strong>&nbsp;inmuebles dentro de {areas.length} área{areas.length > 1 ? 's' : ''} dibujada{areas.length > 1 ? 's' : ''} — usá la herramienta ▭ del mapa para agregar o editar rectángulos</>
                : <>Dibujá uno o más <strong>rectángulos</strong> sobre el mapa (herramienta ▭ arriba a la derecha) para buscar por zona</>}
            </p>

            <div className="grid lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 h-[560px] rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                <MapSearch listings={shown} onAreasChange={setAreas} onSelect={setSelected} />
              </div>

              <div className="lg:col-span-2 space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {shown.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm border border-dashed">
                    Sin resultados en esa zona con esos filtros. Probá ampliar el rectángulo o el rango de precios.
                  </div>
                )}
                {shown.map((l) => (
                  <div key={l.id} onClick={() => setSelected(l)}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 cursor-pointer hover:shadow-md hover:border-rose-200 transition-all flex">
                    <img src={l.photos[0]} className="w-32 h-28 object-cover" alt="" />
                    <div className="p-3 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-semibold text-sm text-slate-800 leading-tight truncate">{l.title}</p>
                        {l.autoHost && (
                          <span className="shrink-0 text-[9px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                            <Bot size={9} /> AUTO
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{CLASS_LABELS[l.class]} · hasta {l.maxGuests} · {l.city}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-rose-600 font-bold text-sm">USD {l.price}<span className="text-[10px] text-slate-400 font-normal">/noche</span></span>
                        <span className="text-[11px] text-slate-500 flex items-center gap-0.5"><Star size={11} className="text-amber-400 fill-amber-400" />{l.rating} ({l.reviews})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {bookings.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm mb-2">📋 Mis reservas ({bookings.length})</h3>
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                    <span>{b.listingTitle} · {b.checkIn} → {b.checkOut}</span>
                    <span className="flex items-center gap-2">
                      {b.closedByAI && <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-bold">🤖 cerrada por IA</span>}
                      <span className="font-semibold">USD {b.total}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'anfitrion' && <HostPanel listings={listings} onUpdate={updateListing} />}
        {tab === 'reportes' && <Reports />}
      </main>

      <footer className="border-t mt-8 py-6 text-center text-xs text-slate-400">
        StayAgent AI — MVP · PostgreSQL + PostGIS · Node.js · Stripe + Mercado Pago · Agentes IA (Anfitrión / Huésped / Pricing)
      </footer>

      {selected && (
        <ChatPanel listing={selected} autoGuest={autoGuest} guestBudget={guestBudget}
          onClose={() => setSelected(null)}
          onBooking={(b) => setBookings((bs) => [...bs, b])} />
      )}
    </div>
  );
}
