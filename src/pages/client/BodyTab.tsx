import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MetricChart } from '@/components/MetricChart'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtDay, round } from '@/lib/data'

type BW = { day: string; weight: number }
type M = { day: string; waist: number | null; chest: number | null; arm: number | null; leg: number | null }

export function BodyTab({ clientId }: { clientId: string }) {
  const [w, setW] = useState<BW[] | null>(null)
  const [m, setM] = useState<M[]>([])

  useEffect(() => {
    supabase.from('body_weights').select('day,weight').eq('user_id', clientId).order('day').limit(365).then(({ data }) => setW((data as BW[]) || []))
    supabase.from('measurements').select('day,waist,chest,arm,leg').eq('user_id', clientId).order('day', { ascending: false }).limit(30).then(({ data }) => setM((data as M[]) || []))
  }, [clientId])

  if (!w) return <Skeleton className="h-48 w-full" />

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Peso corporal</h2>
        {w.length > 0 && <p className="text-xs text-muted-foreground">Último: {round(+w[w.length - 1].weight, 1)} kg · {fmtDay(w[w.length - 1].day)} · {w.length} registros</p>}
        <MetricChart data={w.map((x) => ({ date: fmtDay(x.day), value: round(+x.weight, 1) }))} label="Peso" unit=" kg" />
      </section>
      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Medidas (cm)</h2>
        {m.length === 0 ? <p className="text-sm text-muted-foreground">Sin medidas apuntadas.</p> : (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead className="text-right">Cintura</TableHead><TableHead className="text-right">Pecho</TableHead><TableHead className="text-right">Brazo</TableHead><TableHead className="text-right">Pierna</TableHead></TableRow></TableHeader>
              <TableBody>
                {m.map((x) => (
                  <TableRow key={x.day}>
                    <TableCell>{fmtDay(x.day, { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                    {[x.waist, x.chest, x.arm, x.leg].map((v, i) => <TableCell key={i} className="text-right">{v ?? '—'}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
