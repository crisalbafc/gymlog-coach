import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MetricChart } from '@/components/MetricChart'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fmtDay, isoDay, round, type ClientRow } from '@/lib/data'

type Entry = { id: string; day: string; meal: string; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number }
const MEALS = ['desayuno', 'comida', 'merienda', 'cena', 'snacks']

export function DietTab({ client }: { client: ClientRow }) {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [day, setDay] = useState<string | null>(null)

  useEffect(() => {
    const from = isoDay(new Date(Date.now() - 29 * 86400000))
    supabase.from('food_entries').select('id,day,meal,name,grams,kcal,protein,carbs,fat')
      .eq('user_id', client.client_id).gte('day', from).order('day').order('created_at')
      .then(({ data }) => setEntries((data as Entry[]) || []))
  }, [client.client_id])

  const days = useMemo(() => {
    const m = new Map<string, { kcal: number; p: number; c: number; f: number }>()
    for (const e of entries || []) {
      const t = m.get(e.day) || { kcal: 0, p: 0, c: 0, f: 0 }
      m.set(e.day, { kcal: t.kcal + +e.kcal, p: t.p + +e.protein, c: t.c + +e.carbs, f: t.f + +e.fat })
    }
    return [...m.entries()].sort().map(([d, t]) => ({ day: d, ...t }))
  }, [entries])

  if (!entries) return <Skeleton className="h-48 w-full" />
  if (!entries.length) return <p className="text-sm text-muted-foreground">No ha apuntado comidas en los últimos 30 días.</p>

  const selected = day || days[days.length - 1]?.day
  const dayEntries = entries.filter((e) => e.day === selected)

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Calorías por día (30 días)</h2>
        <p className="text-xs text-muted-foreground">Línea naranja: objetivo de {client.kcal_goal} kcal</p>
        <MetricChart kind="bar" data={days.map((d) => ({ date: fmtDay(d.day), value: round(d.kcal) }))} label="Kcal" goal={client.kcal_goal} />
      </section>
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Proteína por día</h2>
        <p className="text-xs text-muted-foreground">Objetivo: {client.protein_goal} g</p>
        <MetricChart data={days.map((d) => ({ date: fmtDay(d.day), value: round(d.p) }))} label="Proteína" unit=" g" goal={client.protein_goal} />
      </section>

      <section>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mr-2">Diario</h2>
          {days.slice(-10).map((d) => (
            <button key={d.day} onClick={() => setDay(d.day)}
              className={`h-8 px-3 rounded-full text-xs border ${d.day === selected ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {fmtDay(d.day, { weekday: 'short', day: 'numeric' })}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Comida</TableHead><TableHead>Alimento</TableHead><TableHead className="text-right">g</TableHead><TableHead className="text-right">Kcal</TableHead><TableHead className="text-right">P</TableHead><TableHead className="text-right">H</TableHead><TableHead className="text-right">G</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {[...dayEntries].sort((a, b) => MEALS.indexOf(a.meal) - MEALS.indexOf(b.meal)).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="capitalize text-muted-foreground">{e.meal}</TableCell>
                  <TableCell>{e.name}</TableCell>
                  <TableCell className="text-right">{round(+e.grams)}</TableCell>
                  <TableCell className="text-right">{round(+e.kcal)}</TableCell>
                  <TableCell className="text-right">{round(+e.protein)}</TableCell>
                  <TableCell className="text-right">{round(+e.carbs)}</TableCell>
                  <TableCell className="text-right">{round(+e.fat)}</TableCell>
                </TableRow>
              ))}
              {(() => { const t = days.find((d) => d.day === selected); return t && (
                <TableRow className="font-semibold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right">{round(t.kcal)}</TableCell>
                  <TableCell className="text-right">{round(t.p)}</TableCell>
                  <TableCell className="text-right">{round(t.c)}</TableCell>
                  <TableCell className="text-right">{round(t.f)}</TableCell>
                </TableRow>) })()}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
