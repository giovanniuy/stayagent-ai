import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, CalendarDays, CreditCard, Sparkles, User } from 'lucide-react';
import {
  hostAgentRespond, hostAgentCloseDraft, guestAgentEvaluate,
  type Booking, type Listing, type Message,
} from '@/lib/data';

interface Props {
  listing: Listing;
  autoGuest: boolean;
  guestBudget: number;
  onClose: () => void;
  onBooking: (b: Booking) => void;
}

const BUBBLE: Record<Message['from'], string> = {
  huesped: 'bg-rose-600 text-white self-end',
  anfitrion: 'bg-slate-200 text-slate-800 self-start',
  ai_host: 'bg-violet-100 text-violet-900 border border-violet-300 self-start',
  ai_guest: 'bg-sky-100 text-sky-900 border border-sky-300 self-end',
  sistema: 'bg-amber-50 text-amber-800 border border-amber-200 self-center text-center',
};

const NAME: Record<Message['from'], string> = {
  huesped: 'Vos', anfitrion: 'Anfitrión', ai_host: '🤖 Anfitrión Automático',
  ai_guest: '🧳 Huésped Automático', sistema: 'Sistema',
};

export default function ChatPanel({ listing, autoGuest, guestBudget, onClose, onBooking }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [offer, setOffer] = useState<number | ''>('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paid, setPaid] = useState(false);
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  useEffect(() => {
    const intro: Message[] = listing.autoHost
      ? hostAgentRespond(listing, 'hola')
      : [{ id: 'm0', from: 'sistema', body: `Conversación con el anfitrión de "${listing.title}"`, at: new Date() }];
    setMessages(intro);
    if (autoGuest && listing.autoHost) {
      setTimeout(() => setMessages((m) => [...m, guestAgentEvaluate(listing, guestBudget)]), 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  const send = () => {
    if (!input.trim()) return;
    const mine: Message = { id: `u${Date.now()}`, from: 'huesped', body: input, at: new Date() };
    setMessages((m) => [...m, mine]);
    setInput('');
    if (!listing.autoHost) return;
    setThinking(true);
    setTimeout(() => {
      setMessages((m) => [...m, ...hostAgentRespond(listing, input)]);
      if (autoGuest) setTimeout(() => setMessages((m) => [...m, guestAgentEvaluate(listing, guestBudget)]), 800);
      setThinking(false);
    }, 900);
  };

  const requestBooking = () => {
    if (!checkIn || !checkOut) return;
    setThinking(true);
    setTimeout(() => {
      const { messages: newMsgs, booking: b } = hostAgentCloseDraft(
        listing, checkIn, checkOut, offer === '' ? undefined : Number(offer));
      setMessages((m) => [...m,
        { id: `r${Date.now()}`, from: 'huesped', body: `Solicito reserva: ${checkIn} → ${checkOut}${offer ? ` (ofrezco USD ${offer}/noche)` : ''}`, at: new Date() },
        ...newMsgs]);
      setBooking(b);
      onBooking(b);
      setThinking(false);
    }, 1000);
  };

  const pay = (provider: 'stripe' | 'mercadopago') => {
    if (!booking) return;
    setPaid(true);
    setMessages((m) => [...m, {
      id: `p${Date.now()}`, from: 'sistema',
      body: `Pago de USD ${booking.total} aprobado vía ${provider === 'stripe' ? 'Stripe (tarjeta)' : 'Mercado Pago'} ✅ Comisión plataforma 12% · payout al anfitrión USD ${(booking.total * 0.88).toFixed(0)}`,
      at: new Date(),
    }]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-rose-600 to-rose-500 text-white">
          <img src={listing.photos[0]} className="w-11 h-11 rounded-lg object-cover" alt="" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{listing.title}</p>
            <p className="text-xs text-rose-100 flex items-center gap-1">
              {listing.autoHost ? <><Bot size={12} /> Anfitrión Automático activo</> : <><User size={12} /> Anfitrión humano</>}
              {autoGuest && <span className="ml-2 flex items-center gap-1"><Sparkles size={12} /> Huésped Auto</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-[200px]">
          {messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${BUBBLE[m.from]}`}>
              <p className="text-[10px] font-semibold opacity-70 mb-0.5">{NAME[m.from]}</p>
              <p className="leading-snug">{m.body}</p>
            </div>
          ))}
          {thinking && (
            <div className="self-start bg-violet-50 border border-violet-200 rounded-2xl px-4 py-2.5 text-sm text-violet-700 flex items-center gap-2">
              <Bot size={14} className="animate-pulse" /> El agente está pensando…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Solicitud de reserva */}
        <div className="border-t p-3 bg-slate-50">
          <p className="text-[11px] font-semibold text-slate-500 mb-2 flex items-center gap-1">
            <CalendarDays size={12} /> SOLICITAR RESERVA {listing.autoHost && '— la decide el agente IA'}
          </p>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs" />
            <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)}
              className="border rounded-lg px-2 py-1.5 text-xs" />
            <input type="number" placeholder={`Oferta (mín ${listing.priceMin})`} value={offer}
              onChange={(e) => setOffer(e.target.value === '' ? '' : Number(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-xs" />
          </div>
          {!booking ? (
            <button onClick={requestBooking} disabled={!checkIn || !checkOut}
              className="w-full bg-violet-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-violet-700 disabled:opacity-40">
              {listing.autoHost ? '🤖 Enviar al Anfitrión Automático' : 'Enviar solicitud'}
            </button>
          ) : !paid ? (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => pay('stripe')}
                className="bg-[#635bff] text-white text-sm font-medium py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5">
                <CreditCard size={14} /> Pagar con Stripe
              </button>
              <button onClick={() => pay('mercadopago')}
                className="bg-[#00b1ea] text-white text-sm font-medium py-2 rounded-lg hover:opacity-90 flex items-center justify-center gap-1.5">
                <CreditCard size={14} /> Mercado Pago
              </button>
            </div>
          ) : (
            <p className="text-center text-sm font-semibold text-emerald-600 py-1.5">✅ ¡Reserva pagada! Total USD {booking.total}</p>
          )}
        </div>

        {/* Input chat */}
        <div className="border-t p-3 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={listing.autoHost ? 'Preguntale al anfitrión automático… (probá "¿me hacés descuento?")' : 'Escribí un mensaje…'}
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          <button onClick={send} className="bg-rose-600 text-white p-2.5 rounded-xl hover:bg-rose-700"><Send size={16} /></button>
        </div>
      </div>
    </div>
  );
}
