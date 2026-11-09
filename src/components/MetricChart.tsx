// Adaptado de FitBox (components/health/MetricChart.tsx)
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, Bar, BarChart } from 'recharts'

type Point = { date: string; value: number }
const tip = { contentStyle: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 } }

export function MetricChart({ data, label, unit = '', goal, kind = 'line' }: {
  data: Point[]; label: string; unit?: string; goal?: number; kind?: 'line' | 'bar'
}) {
  if (!data.length) return <p className="text-sm text-muted-foreground py-8 text-center">Sin datos todavía.</p>
  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} minTickGap={16} />
      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={40} />
      <Tooltip {...tip} formatter={(v) => [`${v}${unit}`, label]} />
      {goal ? <ReferenceLine y={goal} stroke="#f97316" strokeDasharray="4 3" /> : null}
    </>
  )
  return (
    <div className="h-56 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        {kind === 'bar' ? (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {common}
            <Bar dataKey="value" fill="var(--brand)" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {common}
            <Line type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
