-- =============================================================
-- StayAgent AI — Schema PostgreSQL + PostGIS
-- Plataforma de alquileres temporarios con agentes de IA
-- =============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------
-- USUARIOS Y ROLES
-- ----------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'huesped', 'anfitrion');

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    phone           VARCHAR(50),
    photo_url       TEXT,
    role            user_role NOT NULL DEFAULT 'huesped',
    bio             TEXT,
    id_verified     BOOLEAN DEFAULT FALSE,
    locale          VARCHAR(10) DEFAULT 'es',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_role ON users(role);

-- ----------------------------------------------------------
-- INMUEBLES (LISTINGS) — con geolocalización PostGIS
-- ----------------------------------------------------------
CREATE TYPE property_class AS ENUM (
    'monoambiente', '1_dormitorio', '2_dormitorios', '3plus_dormitorios'
);
CREATE TYPE property_status AS ENUM (
    'apto_listo',        -- limpio, equipado, heladera recargada
    'apto_usado',        -- huésped salió, pendiente de limpieza
    'apto_ocupado',      -- huésped dentro
    'apto_mantenimiento',
    'inactivo'
);

CREATE TABLE listings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    class            property_class NOT NULL,
    base_price       NUMERIC(10,2) NOT NULL,          -- precio base por noche
    currency         CHAR(3) DEFAULT 'USD',
    -- Pricing dinámico (3er agente)
    dynamic_pricing  BOOLEAN DEFAULT FALSE,
    price_min        NUMERIC(10,2),
    price_max        NUMERIC(10,2),
    current_price    NUMERIC(10,2),                   -- seteado por el agente
    -- Geografía
    address          TEXT,
    city             VARCHAR(120),
    country          VARCHAR(120),
    geom             GEOGRAPHY(Point, 4326) NOT NULL, -- PostGIS point
    -- Amenities / capacidad
    max_guests       INT DEFAULT 2,
    bathrooms        INT DEFAULT 1,
    amenities        JSONB DEFAULT '[]',
    -- Estado operativo
    status           property_status DEFAULT 'apto_listo',
    -- Agente Anfitrión Automático
    auto_host_enabled BOOLEAN DEFAULT FALSE,
    auto_host_prompt  TEXT,                           -- instrucciones del dueño al agente
    rating_avg       NUMERIC(3,2) DEFAULT 0,
    rating_count     INT DEFAULT 0,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_listings_geom   ON listings USING GIST(geom);
CREATE INDEX idx_listings_host   ON listings(host_id);
CREATE INDEX idx_listings_class  ON listings(class);
CREATE INDEX idx_listings_price  ON listings(current_price);
CREATE INDEX idx_listings_status ON listings(status);

CREATE TABLE listing_photos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    is_cover    BOOLEAN DEFAULT FALSE,
    sort_order  INT DEFAULT 0
);
CREATE INDEX idx_photos_listing ON listing_photos(listing_id);

-- Disponibilidad / calendario
CREATE TABLE listing_calendar (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    available   BOOLEAN DEFAULT TRUE,
    price_override NUMERIC(10,2),
    UNIQUE(listing_id, date)
);

-- ----------------------------------------------------------
-- CONFIGURACIÓN DE AGENTES IA POR USUARIO
-- ----------------------------------------------------------
CREATE TABLE ai_agent_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Huésped Automático (actúa en nombre del inquilino)
    auto_guest_enabled   BOOLEAN DEFAULT FALSE,
    auto_guest_budget_max NUMERIC(10,2),
    auto_guest_prefs     JSONB DEFAULT '{}',  -- fechas, clase, zonas, reglas
    -- Límites y comportamiento
    require_confirmation_above NUMERIC(10,2), -- monto que exige OK humano
    language        VARCHAR(10) DEFAULT 'es',
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- ----------------------------------------------------------
-- CONVERSACIONES Y MENSAJES (chat con agentes)
-- ----------------------------------------------------------
CREATE TYPE sender_kind AS ENUM ('huesped', 'anfitrion', 'ai_host', 'ai_guest', 'sistema');

CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    guest_id    UUID NOT NULL REFERENCES users(id),
    host_id     UUID NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_conv_guest ON conversations(guest_id);
CREATE INDEX idx_conv_host  ON conversations(host_id);

CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_kind     sender_kind NOT NULL,
    sender_id       UUID REFERENCES users(id),   -- NULL si es IA pura
    body            TEXT NOT NULL,
    metadata        JSONB DEFAULT '{}',          -- propuestas, booking_draft, etc.
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at);

-- ----------------------------------------------------------
-- RESERVAS (BOOKINGS)
-- ----------------------------------------------------------
CREATE TYPE booking_status AS ENUM (
    'pendiente', 'aceptada', 'rechazada', 'pagada',
    'checkin', 'checkout', 'completada', 'cancelada'
);

CREATE TABLE bookings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id   UUID NOT NULL REFERENCES listings(id),
    guest_id     UUID NOT NULL REFERENCES users(id),
    check_in     DATE NOT NULL,
    check_out    DATE NOT NULL,
    nights       INT GENERATED ALWAYS AS (check_out - check_in) STORED,
    price_night  NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    currency     CHAR(3) DEFAULT 'USD',
    status       booking_status DEFAULT 'pendiente',
    closed_by_ai BOOLEAN DEFAULT FALSE,   -- TRUE si la cerró un agente
    created_at   TIMESTAMPTZ DEFAULT now(),
    updated_at   TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_dates CHECK (check_out > check_in)
);
CREATE INDEX idx_bookings_listing ON bookings(listing_id, status);
CREATE INDEX idx_bookings_guest   ON bookings(guest_id);
CREATE INDEX idx_bookings_dates   ON bookings(check_in, check_out);

-- ----------------------------------------------------------
-- PAGOS — Stripe + Mercado Pago
-- ----------------------------------------------------------
CREATE TYPE payment_provider AS ENUM ('stripe', 'mercadopago');
CREATE TYPE payment_status AS ENUM ('pendiente', 'aprobado', 'rechazado', 'reembolsado');

CREATE TABLE payments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID NOT NULL REFERENCES bookings(id),
    provider       payment_provider NOT NULL,
    provider_ref   TEXT,                        -- payment_intent / payment id
    amount         NUMERIC(12,2) NOT NULL,
    currency       CHAR(3) NOT NULL,
    status         payment_status DEFAULT 'pendiente',
    platform_fee   NUMERIC(12,2) DEFAULT 0,     -- comisión de la plataforma
    host_payout    NUMERIC(12,2) DEFAULT 0,
    raw_response   JSONB,
    created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_payments_booking ON payments(booking_id);

-- ----------------------------------------------------------
-- CONTABILIDAD — costos, impuestos, estados financieros
-- ----------------------------------------------------------
CREATE TYPE cost_category AS ENUM (
    'limpieza', 'mantenimiento', 'servicios', 'reposicion_ropa',
    'impuestos', 'comision_plataforma', 'seguro', 'otro'
);

CREATE TABLE expenses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID REFERENCES listings(id),
    booking_id  UUID REFERENCES bookings(id),
    category    cost_category NOT NULL,
    description TEXT,
    amount      NUMERIC(12,2) NOT NULL,
    currency    CHAR(3) DEFAULT 'USD',
    incurred_on DATE DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_expenses_listing ON expenses(listing_id, incurred_on);

-- Eventos de estado del inmueble (APTO_USADO / APTO_LISTO etc.)
CREATE TABLE property_status_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id),
    old_status  property_status,
    new_status  property_status NOT NULL,
    changed_by  UUID REFERENCES users(id),
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- REVIEWS
-- ----------------------------------------------------------
CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID UNIQUE REFERENCES bookings(id),
    listing_id  UUID REFERENCES listings(id),
    author_id   UUID REFERENCES users(id),
    rating      INT CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------
-- BÚSQUEDAS POR ÁREA (rectángulos dibujados por el huésped)
-- ----------------------------------------------------------
CREATE TABLE search_areas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    name        VARCHAR(120),
    geom        GEOGRAPHY(Polygon, 4326) NOT NULL,  -- rectángulo(s)
    filters     JSONB DEFAULT '{}',                 -- precio, clase, etc.
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_search_areas_geom ON search_areas USING GIST(geom);

-- ============================================================
-- VISTAS PARA REPORTES
-- ============================================================

-- Facturación mensual por inmueble
CREATE VIEW v_facturacion_mensual AS
SELECT l.id AS listing_id, l.title,
       date_trunc('month', b.check_in) AS mes,
       COUNT(*) AS reservas,
       SUM(b.total_amount) AS facturacion
FROM bookings b JOIN listings l ON l.id = b.listing_id
WHERE b.status IN ('pagada','checkin','checkout','completada')
GROUP BY l.id, l.title, mes;

-- Ocupación mensual (noches ocupadas / noches del mes)
CREATE VIEW v_ocupacion_mensual AS
SELECT l.id AS listing_id,
       date_trunc('month', d) AS mes,
       COUNT(*) FILTER (WHERE b.id IS NOT NULL) AS noches_ocupadas,
       COUNT(*) AS noches_mes,
       ROUND(100.0 * COUNT(*) FILTER (WHERE b.id IS NOT NULL) / COUNT(*), 2) AS pct_ocupacion
FROM listings l
CROSS JOIN generate_series('2025-01-01'::date, '2027-12-31'::date, '1 day') d
LEFT JOIN bookings b ON b.listing_id = l.id
     AND d BETWEEN b.check_in AND b.check_out - 1
     AND b.status IN ('pagada','checkin','checkout','completada')
GROUP BY l.id, mes;

-- P&L por inmueble
CREATE VIEW v_profit_loss AS
SELECT l.id AS listing_id, l.title,
       COALESCE(SUM(b.total_amount), 0)                    AS ingresos,
       COALESCE((SELECT SUM(e.amount) FROM expenses e
                 WHERE e.listing_id = l.id), 0)            AS gastos,
       COALESCE(SUM(p.platform_fee), 0)                    AS comisiones,
       COALESCE((SELECT SUM(e.amount) FROM expenses e
                 WHERE e.listing_id = l.id AND e.category='impuestos'), 0) AS impuestos,
       COALESCE(SUM(b.total_amount), 0)
         - COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.listing_id = l.id), 0)
         - COALESCE(SUM(p.platform_fee), 0)                AS resultado_neto
FROM listings l
LEFT JOIN bookings b ON b.listing_id = l.id
    AND b.status IN ('pagada','checkin','checkout','completada')
LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'aprobado'
GROUP BY l.id, l.title;

-- Cash flow mensual (entradas vs salidas)
CREATE VIEW v_cash_flow AS
SELECT mes,
       SUM(entrada)  AS entradas,
       SUM(salida)   AS salidas,
       SUM(entrada) - SUM(salida) AS flujo_neto
FROM (
  SELECT date_trunc('month', created_at) AS mes, amount AS entrada, 0::numeric AS salida
  FROM payments WHERE status = 'aprobado'
  UNION ALL
  SELECT date_trunc('month', incurred_on), 0::numeric, amount
  FROM expenses
) t
GROUP BY mes ORDER BY mes;

-- ============================================================
-- FUNCIÓN: búsqueda de inmuebles dentro de N rectángulos
-- ============================================================
CREATE OR REPLACE FUNCTION search_listings_in_areas(
    polygons GEOGRAPHY[],        -- rectángulos dibujados en el mapa
    p_class  property_class DEFAULT NULL,
    p_min    NUMERIC DEFAULT NULL,
    p_max    NUMERIC DEFAULT NULL
)
RETURNS SETOF listings AS $$
    SELECT DISTINCT l.*
    FROM listings l
    WHERE l.status IN ('apto_listo','apto_ocupado')
      AND (p_class IS NULL OR l.class = p_class)
      AND (p_min IS NULL OR COALESCE(l.current_price, l.base_price) >= p_min)
      AND (p_max IS NULL OR COALESCE(l.current_price, l.base_price) <= p_max)
      AND EXISTS (
          SELECT 1 FROM unnest(polygons) poly
          WHERE ST_Intersects(l.geom, poly)
      );
$$ LANGUAGE sql STABLE;

-- Trigger: actualizar updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_touch    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_listings_touch BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER trg_bookings_touch BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
