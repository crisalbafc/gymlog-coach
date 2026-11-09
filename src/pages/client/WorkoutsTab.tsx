import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Trophy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { MetricChart } from '@/components/MetricChart'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { fmtDay, round } from '@/lib/data'

type Set = { id: string; exercise_id: string; weight: number; reps: number; created_at: string }
type W = { id: string; name: string | null; started_at: string; ended_at: string | null; workout_sets: Set[] }
export type Ex = { id: string; name: string; muscle: string; user_id: string | null }

export function useExercises() {
  const [ex, setEx] = useState<Ex[]>([])
  useEffect(() => {
    supabase.from('exercises').select('id,name,muscle,user_id').order('name').then(({ data }) => setEx((data as Ex[]) || []))
  }, [])
  return ex
}

const dur = (a: string, b: string | null) => {
  if (!b) return ''
  const m = Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000)
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`
}

export function WorkoutsTab({ clientId }: { clientId: string }) {
  const exercises = useExercises()
  const exName = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e.name])), [exercises])
  const [workouts, setWorkouts] = useState<W[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [exId, setExId] = useState<string>('')

  useEffect(() => {
    supabase.from('workouts').select('id,name,started_at,ended_at,workout_sets(id,exercise_id,weight,reps,created_at)')
      .eq('user_id', clientId).not('ended_at', 'is', null).order('started_at', { ascending: false }).limit(60)
      .then(({ data }) => setWorkouts((data as W[]) || []))
  }, [clientId])

  const allSets = useMemo(() => (workouts || []).flatMap((w) => w.workout_sets), [workouts])
  const used = useMemo(() => {
    const count = new Map<string, number>()
    for (const s of allSets) count.set(s.exercise_id, (count.get(s.exercise_id) || 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
  }, [allSets])
  const selected = exId || used[0] || ''

  const series = useMemo(() => {
    const byDay = new Map<string, number>()
    for (const s of allSets.filter((x) => x.exercise_id === selected)) {
      const d = s.created_at.slice(0, 10)
      byDay.set(d, Math.max(byDay.get(d) || 0, +s.weight))
    }
    return [...byDay.entries()].sort().map(([d, v]) => ({ date: fmtDay(d), value: round(v, 2) }))
  }, [allSets, selected])
  const best = allSets.filter((x) => x.exercise_id === selected).sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0]

  if (!workouts) return <Skeleton className="h-48 w-full" />
  if (!workouts.length) return <p className="text-sm text-muted-foreground">Aún no ha terminado ningún entreno.</p>

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Progreso por ejercicio</h2>
          <Select value={selected} onValueChange={setExId}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Ejercicio" /></SelectTrigger>
            <SelectContent>{used.map((id) => <SelectItem key={id} value={id}>{exName[id] || 'Ejercicio'}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {best && <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5"><Trophy className="h-4 w-4 text-yellow-400" strokeWidth={1.5} /> Mejor serie: <b className="text-foreground">{round(+best.weight, 2)} kg × {best.reps}</b></p>}
        <MetricChart data={series} label="Peso máximo" unit=" kg" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Historial</h2>
        <ul className="rounded-lg border border-border bg-card divide-y divide-border">
          {workouts.map((w) => {
            const sets = [...w.workout_sets].sort((a, b) => a.created_at.localeCompare(b.created_at))
            const byEx = new Map<string, Set[]>()
            for (const s of sets) byEx.set(s.exercise_id, [...(byEx.get(s.exercise_id) || []), s])
            const isOpen = open === w.id
            return (
              <li key={w.id}>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60" onClick={() => setOpen(isOpen ? null : w.id)}>
                  <div className="flex-1">
                    <div className="font-medium">{w.name || 'Entreno'} <span className="text-muted-foreground font-normal">· {fmtDay(w.started_at, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
                    <div className="text-xs text-muted-foreground">{dur(w.started_at, w.ended_at)} · {byEx.size} ejercicios · {sets.length} series</div>
                  </div>
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    {[...byEx.entries()].map(([id, ss]) => (
                      <div key={id} className="text-sm">
                        <span className="font-medium">{exName[id] || 'Ejercicio'}</span>
                        <span className="text-muted-foreground"> · {ss.map((s) => `${round(+s.weight, 2)}×${s.reps}`).join('  ·  ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
