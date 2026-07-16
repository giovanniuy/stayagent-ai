# StayAgent AI 🏠🤖

Plataforma de alquileres temporarios (alternativa a Airbnb) con **3 agentes de IA**:

| Agente | Qué hace |
|---|---|
| 🤖 **Anfitrión Automático** | El propietario activa el modo y el agente responde consultas, negocia y **cierra la reserva solo** |
| 🧳 **Huésped Automático** | El inquilino lo activa y el agente negocia con el anfitrión (humano o bot) y da el **visto bueno** a ofertas dentro de su presupuesto |
| 📈 **Pricing Dinámico** | Ajusta el precio por noche dentro de un rango `[mín, máx]` según demanda, ocupación y temporada |

## Stack

- **Frontend**: React + Vite + Tailwind (PWA) — mapa con dibujo de rectángulos de búsqueda
- **Backend**: Node.js + Express
- **DB**: PostgreSQL 16 + PostGIS (búsquedas geoespaciales)
- **IA**: capa agnóstica → OpenAI / Anthropic / Ollama (local) / mock
- **Pagos**: Stripe (tarjetas internacionales) + Mercado Pago (LatAm)
- **Reportes**: Facturación, Ocupación, Costos, Impuestos, ROI, P&L, Cash Flow, Balance, KPIs

## Estructura

```
stayagent/
├── db/
│   ├── schema.sql          # 14 tablas + vistas de reportes + función geo
│   └── seed.sql            # datos demo (anfitrion@demo.com / huesped@demo.com — pass: demo1234)
├── backend/
│   └── src/
│       ├── routes/         # auth, listings, search, bookings, chat, payments, reports, agents
│       └── services/
│           ├── aiProvider.js    # capa agnóstica de IA
│           ├── hostAgent.js     # Agente 1: Anfitrión Automático
│           ├── guestAgent.js    # Agente 2: Huésped Automático
│           ├── pricingAgent.js  # Agente 3: Pricing Dinámico
│           └── payments/        # stripe.js + mercadopago.js
├── frontend/               # React PWA
├── docker-compose.yml
└── docs/DEPLOY_HOSTINGER.md
```

## Quickstart local

```bash
cp .env.example .env
docker compose up --build
# Frontend: http://localhost    Backend: http://localhost:4000/health
```

## Estados del inmueble

`apto_listo` → limpio/equipado/heladera recargada · `apto_usado` → huésped salió, pendiente limpieza · `apto_ocupado` · `apto_mantenimiento`

Ver **[docs/DEPLOY_HOSTINGER.md](docs/DEPLOY_HOSTINGER.md)** para el despliegue en VPS Hostinger KVM2.
