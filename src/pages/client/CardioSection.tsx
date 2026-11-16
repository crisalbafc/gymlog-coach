import { useEffect, useState } from 'react'
import { Footprints, Bike } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtDay, round } from '@/lib/data'

type C = {
  id: string; day: string; sport: string; surface: string | null; kind: string | null; quality_type: string | null; details: string | null
  duration_s: number | null; distance_km: number | null; avg_pace_s: number | null; hr_max: number | null
  elevation_m: number | null; incline_pct: number | null; power_w: number | null
}
const KIND: Record<string, string> = { trote_suave: 'Trote suave', calidad: 'Calidad', tirada_larga: 'Tirada larga' }
const Q: Record<string, string> = { series: 'Series', progresiones: 'Progresiones', fartlek: 'Fartlek', cuestas: 'Cuestas', otro: 'Otro' }
const dur = (s: number | null) => { if (!s) return '—'; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}` }
const pace = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}/km` : '—')

/** Ficha del cliente > Entrenos: sesiones de cardio (correr, ciclismo…) */
export function CardioSection({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<C[] | null>(null)
  useEffect(() => {
    supabase.from('cardio_sessions').select('*').eq('user_id', clientId).order('day', { ascending: false }).limit(40)
      .then(({ data, error }) => setItems(error ? [] : ((data as C[]) || [])))
  }, [clientId])
  if (!items || items.length === 0) return null

  const km = items.reduce((t, s) => t + +(s.distance_km || 0), 0)
  return (
    <section>
      <h2 className="mb-1 text-sm font-medium text-muted-foreground uppercase tracking-wide">Cardio</h2>
      <p className="text-xs text-muted-foreground mb-3">{items.length} sesiones recientes · {round(km, 1)} km</p>
      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Sesión</TableHead><TableHead>Duración</TableHead><TableHead>Km</TableHead><TableHead>Ritmo / W</TableHead><TableHead>FC máx</TableHead><TableHead>Desnivel</TableHead></TableRow></TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-muted-foreground whitespace-nowrap">{fmtDay(s.day)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 font-medium">
                    {s.sport === 'ciclismo' ? <Bike className="h-4 w-4" strokeWidth={1.5} /> : <Footprints className="h-4 w-4" strokeWidth={1.5} />}
                    {s.sport === 'correr' ? `${s.kind ? KIND[s.kind] : 'Carrera'}${s.kind === 'calidad' && s.quality_type ? ` · ${Q[s.quality_type]}` : ''}` : s.sport === 'ciclismo' ? 'Ciclismo' : s.sport}
                    <span className="text-xs text-muted-foreground">{s.surface}</span>
                  </div>
                  {s.details && <div className="text-xs text-muted-foreground">{s.details}</div>}
                </TableCell>
                <TableCell>{dur(s.duration_s)}</TableCell>
                <TableCell>{s.distance_km != null ? round(+s.distance_km, 2) : '—'}</TableCell>
                <TableCell>{s.sport === 'ciclismo' ? (s.power_w ? `${s.power_w} W` : '—') : pace(s.avg_pace_s)}</TableCell>
                <TableCell>{s.hr_max ?? '—'}</TableCell>
                <TableCell>{s.elevation_m != null ? `+${s.elevation_m} m` : s.incline_pct != null ? `${+s.incline_pct}%` : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
