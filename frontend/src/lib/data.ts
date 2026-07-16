// =============================================================
// StayAgent AI — capa de datos del MVP demo.
// Replica 1:1 las respuestas del backend real (mismos endpoints).
// En producción: reemplazar por fetch a VITE_API_URL.
// =============================================================

export type PropertyClass = 'monoambiente' | '1_dormitorio' | '2_dormitorios' | '3plus_dormitorios';
export type PropertyStatus = 'apto_listo' | 'apto_usado' | 'apto_ocupado' | 'apto_mantenimiento';
export type Role = 'huesped' | 'anfitrion';

export interface Listing {
  id: string;
  title: string;
  description: string;
  class: PropertyClass;
  price: number;
  basePrice: number;
  priceMin: number;
  priceMax: number;
  dynamicPricing: boolean;
  currency: string;
  city: string;
  lat: number;
  lng: number;
  maxGuests: number;
  amenities: string[];
  status: PropertyStatus;
  autoHost: boolean;
  autoHostPrompt?: string;
  rating: number;
  reviews: number;
  photos: string[];
}

export interface Message {
  id: string;
  from: 'huesped' | 'anfitrion' | 'ai_host' | 'ai_guest' | 'sistema';
  body: string;
  at: Date;
}

export interface Booking {
  id: string;
  listingId: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  priceNight: number;
  total: number;
  status: 'pendiente' | 'aceptada' | 'pagada' | 'checkout' | 'completada';
  closedByAI: boolean;
  provider?: 'stripe' | 'mercadopago';
}

export const CLASS_LABELS: Record<PropertyClass, string> = {
  monoambiente: 'Monoambiente',
  '1_dormitorio': '1 dormitorio',
  '2_dormitorios': '2 dormitorios',
  '3plus_dormitorios': '3+ dormitorios',
};

export const STATUS_LABELS: Record<PropertyStatus, string> = {
  apto_listo: 'APTO LISTO',
  apto_usado: 'APTO USADO',
  apto_ocupado: 'APTO OCUPADO',
  apto_mantenimiento: 'MANTENIMIENTO',
};

export const listings: Listing[] = [
  {
    id: 'aaaaaaa1', title: 'Loft moderno en Pocitos',
    description: 'Luminoso loft a 2 cuadras de la rambla. Ideal parejas, trabajo remoto, fibra óptica.',
    class: '1_dormitorio', price: 72, basePrice: 65, priceMin: 45, priceMax: 120, dynamicPricing: true,
    currency: 'USD', city: 'Montevideo', lat: -34.912, lng: -56.157, maxGuests: 2,
    amenities: ['wifi', 'aire acondicionado', 'smart tv', 'heladera'], status: 'apto_listo',
    autoHost: true, autoHostPrompt: 'Aceptar desde 2 noches. No mascotas. Flexible con el check-in.',
    rating: 4.8, reviews: 23,
    photos: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
  },
  {
    id: 'aaaaaaa2', title: 'Monoambiente céntrico',
    description: 'Práctico monoambiente en pleno Centro, a pasos de 18 de Julio.',
    class: 'monoambiente', price: 45, basePrice: 40, priceMin: 30, priceMax: 80, dynamicPricing: true,
    currency: 'USD', city: 'Montevideo', lat: -34.9052, lng: -56.188, maxGuests: 2,
    amenities: ['wifi', 'cocina'], status: 'apto_listo', autoHost: false,
    rating: 4.5, reviews: 11,
    photos: ['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'],
  },
  {
    id: 'aaaaaaa3', title: 'Casa familiar con parrillero',
    description: 'Casa de 3 dormitorios con fondo y parrillero en Carrasco.',
    class: '3plus_dormitorios', price: 168, basePrice: 150, priceMin: 110, priceMax: 260, dynamicPricing: true,
    currency: 'USD', city: 'Montevideo', lat: -34.889, lng: -56.056, maxGuests: 6,
    amenities: ['wifi', 'parrillero', 'estacionamiento', 'jardín', 'lavadora'], status: 'apto_usado',
    autoHost: true, autoHostPrompt: 'Mínimo 3 noches. Depósito reembolsable USD 200.',
    rating: 4.9, reviews: 34,
    photos: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
  },
  {
    id: 'aaaaaaa4', title: 'Vista al mar, Punta del Este',
    description: '2 dormitorios con terraza y vista oceánica sobre la rambla.',
    class: '2_dormitorios', price: 135, basePrice: 120, priceMin: 90, priceMax: 240, dynamicPricing: true,
    currency: 'USD', city: 'Punta del Este', lat: -34.962, lng: -54.947, maxGuests: 4,
    amenities: ['wifi', 'piscina', 'terraza', 'vista al mar'], status: 'apto_listo',
    autoHost: true, rating: 4.7, reviews: 19,
    photos: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
  },
  {
    id: 'aaaaaaa5', title: 'Estudio en Ciudad Vieja',
    description: 'Estudio reciclado a nuevo en el casco histórico, cerca del puerto.',
    class: 'monoambiente', price: 38, basePrice: 38, priceMin: 28, priceMax: 65, dynamicPricing: false,
    currency: 'USD', city: 'Montevideo', lat: -34.9068, lng: -56.2085, maxGuests: 2,
    amenities: ['wifi', 'aire acondicionado'], status: 'apto_listo', autoHost: false,
    rating: 4.3, reviews: 8,
    photos: ['https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800'],
  },
  {
    id: 'aaaaaaa6', title: 'Apartamento en Punta Carretas',
    description: '1 dormitorio amplio, balcón, a 3 cuadras del shopping.',
    class: '1_dormitorio', price: 85, basePrice: 80, priceMin: 60, priceMax: 140, dynamicPricing: true,
    currency: 'USD', city: 'Montevideo', lat: -34.9235, lng: -56.1605, maxGuests: 3,
    amenities: ['wifi', 'balcón', 'gimnasio', 'portero 24h'], status: 'apto_ocupado',
    autoHost: true, rating: 4.6, reviews: 15,
    photos: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
  },
];

// ---- Búsqueda por rectángulos (misma lógica que ST_Intersects) ----
export interface Rect { minLng: number; minLat: number; maxLng: number; maxLat: number }

export function searchInAreas(
  areas: Rect[],
  klass?: PropertyClass | '',
  minPrice?: number,
  maxPrice?: number,
): Listing[] {
  if (!areas.length) return [];
  return listings.filter((l) => {
    if (l.status === 'apto_mantenimiento') return false;
    if (klass && l.class !== klass) return false;
    if (minPrice != null && l.price < minPrice) return false;
    if (maxPrice != null && l.price > maxPrice) return false;
    return areas.some((a) => l.lat >= a.minLat && l.lat <= a.maxLat && l.lng >= a.minLng && l.lng <= a.maxLng);
  });
}

// ---- Simulación de los agentes IA (igual contrato que el backend) ----
let msgId = 0;
const msg = (from: Message['from'], body: string): Message => ({ id: `m${++msgId}`, from, body, at: new Date() });

export function hostAgentRespond(l: Listing, guestText: string): Message[] {
  const out: Message[] = [];
  const wantsDiscount = /descuento|rebaja|menos|barato/i.test(guestText);
  const asksDates = /\d{4}-\d{2}-\d{2}|fecha|disponib/i.test(guestText);

  if (wantsDiscount) {
    const floor = Math.max(l.priceMin, l.price * 0.88);
    out.push(msg('ai_host', `Gracias por tu interés en "${l.title}". Puedo ofrecerte una tarifa especial de USD ${floor.toFixed(0)}/noche (mi precio habitual es USD ${l.price}). ¿Qué fechas tenés en mente?`));
  } else if (asksDates || guestText.length > 3) {
    out.push(msg('ai_host', `¡Hola! Soy el anfitrión automático de "${l.title}" 🤖. El inmueble está disponible. Precio actual: USD ${l.price}/noche (${CLASS_LABELS[l.class]}, hasta ${l.maxGuests} huéspedes). ${l.autoHostPrompt ?? ''} ¿Para qué fechas querés reservar?`));
  }
  return out;
}

export function hostAgentCloseDraft(l: Listing, checkIn: string, checkOut: string, offer?: number): { messages: Message[]; booking: Booking } {
  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  let price = offer ?? l.price;
  price = Math.max(l.priceMin, Math.min(l.priceMax, price));
  const total = price * nights;
  const booking: Booking = {
    id: `b${Date.now()}`, listingId: l.id, listingTitle: l.title, checkIn, checkOut,
    priceNight: price, total, status: 'aceptada', closedByAI: true,
  };
  return {
    booking,
    messages: [
      msg('ai_host', `Perfecto, te confirmo: ${nights} noche${nights > 1 ? 's' : ''} del ${checkIn} al ${checkOut} a USD ${price}/noche. Total: USD ${total}. Genero la reserva ahora mismo ✅`),
      msg('sistema', `Reserva #${booking.id.slice(-6)} creada automáticamente por el Anfitrión Automático. Estado: ACEPTADA — pendiente de pago.`),
    ],
  };
}

export function guestAgentEvaluate(l: Listing, budgetMax: number): Message {
  if (l.price <= budgetMax) {
    return msg('ai_guest', `🧳 Huésped Automático: la oferta de USD ${l.price}/noche entra en mi presupuesto (máx. USD ${budgetMax}). GUEST_APPROVAL: doy el visto bueno ✅`);
  }
  const counter = Math.max(l.priceMin, budgetMax);
  return msg('ai_guest', `🧳 Huésped Automático: USD ${l.price} supera mi presupuesto de USD ${budgetMax}. Contraoferta: USD ${counter}/noche. ¿La aceptás?`);
}

// ---- Datos de reportes (mismo shape que las vistas SQL) ----
const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const facturacionMensual = months.map((mes, i) => ({
  mes, facturacion: 3200 + Math.sin(i / 2.4) * 1400 + i * 180,
  reservas: Math.round(8 + Math.sin(i / 2) * 4 + i * 0.5),
}));
export const ocupacionMensual = months.map((mes, i) => ({
  mes, pct: Math.min(96, Math.round(52 + Math.sin(i / 1.9) * 18 + (i > 9 ? 22 : 0))),
}));
export const cashFlow = months.map((mes, i) => {
  const entradas = 3400 + Math.sin(i / 2.4) * 1300 + i * 170;
  const salidas = 1400 + Math.cos(i / 3) * 350 + (i % 4 === 0 ? 500 : 0);
  return { mes, entradas: Math.round(entradas), salidas: Math.round(salidas), neto: Math.round(entradas - salidas) };
});
export const costosPorCategoria = [
  { category: 'limpieza', total: 1240 }, { category: 'servicios', total: 980 },
  { category: 'impuestos', total: 720 }, { category: 'comision_plataforma', total: 1530 },
  { category: 'reposicion_ropa', total: 310 }, { category: 'mantenimiento', total: 540 },
];
export const profitLoss = listings.slice(0, 4).map((l) => {
  const ingresos = Math.round(l.price * 22 * (0.55 + l.rating / 12));
  const gastos = Math.round(ingresos * (0.28 + (l.reviews % 5) / 40));
  const comisiones = Math.round(ingresos * 0.12);
  return { title: l.title, ingresos, gastos, comisiones, neto: ingresos - gastos - comisiones };
});
export const kpis = {
  inmueblesActivos: listings.length,
  reservasActivas: 14,
  facturacionTotal: facturacionMensual.reduce((a, m) => a + m.facturacion, 0),
  ocupacionMes: 74,
  adr: Math.round(listings.reduce((a, l) => a + l.price, 0) / listings.length),
  revpar: 0,
  pctReservasIA: 62,
  ratingPromedio: 4.65,
};
kpis.revpar = Math.round(kpis.adr * kpis.ocupacionMes) / 100;
