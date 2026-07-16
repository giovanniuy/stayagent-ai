import { useState } from 'react';
import { Bot, Sparkles, TrendingUp, RefreshCw } from 'lucide-react';
import { STATUS_LABELS, CLASS_LABELS, type Listing, type PropertyStatus } from '@/lib/data';

interface Props {
  listings: Listing[];
  onUpdate: (l: Listing) => void;
}

const STATUS_STYLE: Record<PropertyStatus, string> = {
  apto_listo: 'bg-emerald-100 text-emerald-700',
  apto_usado: 'bg-amber-100 text-amber-700',
  apto_ocupado: 'bg-sky-100 text-sky-700',
  apto_mantenimiento: 'bg-slate-200 text-slate-600',
};

function Toggle({ on, onChange, color }: { on: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <button onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? color : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export default function HostPanel({ listings, onUpdate }: Props) {
  const [repricing, setRepricing] = useState<string | null>(null);

  const reprice = (l: Listing) => {
    setRepricing(l.id);
    setTimeout(() => {
      const occ = Math.random() * 0.35;
      const demand = Math.random() * 0.25;
      const next = Math.min(l.priceMax, Math.max(l.priceMin, Math.round(l.basePrice * (1 + occ + demand))));
      onUpdate({ ...l, price: next });
      setRepricing(null);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-violet-600 to-rose-500 rounded-2xl p-5 text-white">
        <h2 className="font-bold text-lg flex items-center gap-2"><Bot /> Panel del Anfitrión</h2>
        <p className="text-sm text-white/80 mt-1">
          Activá el <strong>Anfitrión Automático</strong> para liberar tu tiempo: el agente responde, negocia y cierra reservas por vos.
          El <strong>Pricing Dinámico</strong> ajusta tarifas entre tu mínimo y máximo.
        </p>
      </div>

      {listings.map((l) => (
        <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
          <img src={l.photos[0]} className="w-full md:w-40 h-32 object-cover rounded-xl" alt="" />
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-slate-800">{l.title}</p>
                <p className="text-xs text-slate-500">{CLASS_LABELS[l.class]} · {l.city} · ⭐ {l.rating}</p>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[l.status]}`}>
                {STATUS_LABELS[l.status]}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {/* Anfitrión automático */}
              <div className="flex items-center justify-between bg-violet-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm text-violet-800">
                  <Bot size={16} />
                  <div>
                    <p className="font-semibold leading-tight">Anfitrión Automático</p>
                    <p className="text-[10px] text-violet-500">responde y cierra solo</p>
                  </div>
                </div>
                <Toggle on={l.autoHost} color="bg-violet-600"
                  onChange={(v) => onUpdate({ ...l, autoHost: v })} />
              </div>
              {/* Pricing dinámico */}
              <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm text-emerald-800">
                  <TrendingUp size={16} />
                  <div>
                    <p className="font-semibold leading-tight">Pricing Dinámico</p>
                    <p className="text-[10px] text-emerald-600">USD {l.priceMin} – {l.priceMax}</p>
                  </div>
                </div>
                <Toggle on={l.dynamicPricing} color="bg-emerald-600"
                  onChange={(v) => onUpdate({ ...l, dynamicPricing: v })} />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm">
                <span className="text-slate-500">Precio actual:</span>{' '}
                <span className="font-bold text-rose-600 text-lg">USD {l.price}</span>
                <span className="text-xs text-slate-400">/noche (base {l.basePrice})</span>
              </p>
              {l.dynamicPricing && (
                <button onClick={() => reprice(l)} disabled={repricing === l.id}
                  className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50">
                  <RefreshCw size={12} className={repricing === l.id ? 'animate-spin' : ''} />
                  {repricing === l.id ? 'Agente calculando…' : 'Recalcular con IA'}
                </button>
              )}
              {l.status === 'apto_usado' && (
                <button onClick={() => onUpdate({ ...l, status: 'apto_listo' })}
                  className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600">
                  ✨ Marcar limpieza completa → APTO LISTO
                </button>
              )}
              {l.status === 'apto_ocupado' && (
                <button onClick={() => onUpdate({ ...l, status: 'apto_usado' })}
                  className="text-xs bg-sky-600 text-white px-3 py-1.5 rounded-lg hover:bg-sky-700">
                  🚪 Checkout huésped → APTO USADO
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="text-sky-600 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-sky-800">
          <strong>Huésped Automático</strong> (se activa desde la vista del huésped): tu agente negociará
          con anfitriones — humanos o bots — y dará el visto bueno a ofertas dentro de tu presupuesto.
          Si ambas partes activan sus agentes, <strong>los bots negocian entre sí</strong> y cierran la transacción.
        </p>
      </div>
    </div>
  );
}
