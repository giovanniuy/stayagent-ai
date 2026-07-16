import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  facturacionMensual, ocupacionMensual, cashFlow, costosPorCategoria, profitLoss, kpis,
} from '@/lib/data';
import {
  TrendingUp, BedDouble, CalendarCheck, DollarSign, Percent, Bot, Star, Wallet,
} from 'lucide-react';

const COLORS = ['#e11d48', '#7c3aed', '#0284c7', '#059669', '#d97706', '#db2777'];

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-start gap-3">
      <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
      <h3 className="font-semibold text-slate-800 mb-4 text-sm">{title}</h3>
      <div className="h-64">{children}</div>
    </div>
  );
}

const usd = (v: number) => `USD ${Math.round(v).toLocaleString('es-UY')}`;

export default function Reports() {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-3">Key Performance Indicators</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={<DollarSign size={20} />} label="Facturación total" value={usd(kpis.facturacionTotal)} sub="últimos 12 meses" />
          <KpiCard icon={<Percent size={20} />} label="Ocupación del mes" value={`${kpis.ocupacionMes}%`} sub={`RevPAR USD ${kpis.revpar}`} />
          <KpiCard icon={<BedDouble size={20} />} label="ADR (tarifa media)" value={`USD ${kpis.adr}`} sub={`${kpis.inmueblesActivos} inmuebles activos`} />
          <KpiCard icon={<CalendarCheck size={20} />} label="Reservas activas" value={String(kpis.reservasActivas)} sub="pagadas + aceptadas" />
          <KpiCard icon={<Bot size={20} />} label="Cerradas por IA" value={`${kpis.pctReservasIA}%`} sub="sin intervención humana" />
          <KpiCard icon={<Star size={20} />} label="Rating promedio" value={kpis.ratingPromedio.toFixed(2)} sub="todas las propiedades" />
          <KpiCard icon={<TrendingUp size={20} />} label="ROI promedio" value="34.2%" sub="anualizado" />
          <KpiCard icon={<Wallet size={20} />} label="Flujo neto del mes" value={usd(cashFlow[cashFlow.length - 1].neto)} sub="entradas − salidas" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <ChartCard title="📊 FACTURACIÓN mensual (USD)">
          <ResponsiveContainer>
            <BarChart data={facturacionMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => usd(v)} />
              <Bar dataKey="facturacion" fill="#e11d48" radius={[6, 6, 0, 0]} name="Facturación" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="📈 OCUPACIÓN mensual (%)">
          <ResponsiveContainer>
            <AreaChart data={ocupacionMensual}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Area type="monotone" dataKey="pct" stroke="#7c3aed" fill="#ede9fe" strokeWidth={2.5} name="Ocupación" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="💸 CASH FLOW mensual (USD)">
          <ResponsiveContainer>
            <LineChart data={cashFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => usd(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="entradas" stroke="#059669" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="salidas" stroke="#e11d48" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="neto" stroke="#0284c7" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="🧾 COSTOS por categoría (USD)">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={costosPorCategoria} dataKey="total" nameKey="category" outerRadius={90}
                label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {costosPorCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => usd(v)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* P&L */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4 text-sm">📒 PROFIT & LOSS por inmueble (USD)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 border-b">
                <th className="py-2 font-medium">Inmueble</th>
                <th className="text-right font-medium">Ingresos</th>
                <th className="text-right font-medium">Gastos</th>
                <th className="text-right font-medium">Comisiones</th>
                <th className="text-right font-medium">Resultado neto</th>
                <th className="text-right font-medium">Margen</th>
              </tr>
            </thead>
            <tbody>
              {profitLoss.map((r) => (
                <tr key={r.title} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="py-2.5 font-medium text-slate-700">{r.title}</td>
                  <td className="text-right text-emerald-600">{usd(r.ingresos)}</td>
                  <td className="text-right text-rose-500">{usd(r.gastos)}</td>
                  <td className="text-right text-rose-500">{usd(r.comisiones)}</td>
                  <td className="text-right font-bold text-slate-800">{usd(r.neto)}</td>
                  <td className="text-right text-slate-500">{((r.neto / r.ingresos) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance */}
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { t: 'BALANCE — Activos', items: [['Efectivo cobrado', 48200], ['Cuentas por cobrar', 6400]], c: 'text-emerald-600' },
          { t: 'BALANCE — Pasivos', items: [['Gastos acumulados', 5320], ['Impuestos a pagar', 720]], c: 'text-rose-500' },
          { t: 'Patrimonio neto', items: [['Neto del negocio', 48560], ['Comisiones plataforma', 5784]], c: 'text-sky-600' },
        ].map((b) => (
          <div key={b.t} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{b.t}</h4>
            {b.items.map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-1.5 text-sm border-b last:border-0">
                <span className="text-slate-600">{k}</span>
                <span className={`font-semibold ${b.c}`}>{usd(v as number)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
