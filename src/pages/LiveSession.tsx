import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, Minus, Trash2, Flag, Lock, History, Search, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useExercises } from './client/WorkoutsTab'
import { errMsg, fmtDay, loadClients, round, type ClientRow } from '@/lib/data'
import type { Attendance, Group, GroupRoutine, Session } from '@/lib/groups'
import { navigate } from '@/lib/router'
import { cn } from '@/lib/utils'

type WSet = { id: string; workout_id: string; exercise_id: string; weight: number; reps: number; created_at: string; user_id: string }
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

/**
 * Modo sesión en directo: una pantalla para la tablet del entrenador con
 * todos los alumnos presentes, lo que hicieron la última vez en el ejercicio
 * y botones grandes para apuntar sus series.
 */
export default function LiveSession({ sessionId }: { sessionId: string }) {
  const exercises = useExercises()
  const exName = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e.name])), [exercises])
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [group, setGroup] = useState<Group | null>(null)
  const [routine, setRoutine] = useState<GroupRoutine | null>(null)
  const [att, setAtt] = useState<Attendance[]>([])
  const [clients, setClients] = useState<Record<string, ClientRow>>({})
  const [sets, setSets] = useState<WSet[]>([])
  const [extra, setExtra] = useState<string[]>([])
  const [current, setCurrent] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [elapsed, setElapsed] = useState('')

  const load = useCallback(async () => {
    const { data: s } = await supabase.from('group_sessions').select('*').eq('id', sessionId).maybeSingle()
    if (!s) return setSession(null)
    setSession(s as Session)
    const [g, r, a, cl] = await Promise.all([
      supabase.from('training_groups').select('id,name,schedule,capacity').eq('id', s.group_id).single(),
      s.routine_id ? supabase.from('group_routines').select('*').eq('id', s.routine_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from('session_attendance').select('*').eq('session_id', sessionId),
      loadClients().catch(() => [] as ClientRow[]),
    ])
    setGroup(g.data as Group)
    setRoutine((r.data as GroupRoutine) || null)
    const at = (a.data as Attendance[]) || []
    setAtt(at)
    setClients(Object.fromEntries(cl.map((c) => [c.client_id, c])))
    const wids = at.map((x) => x.workout_id).filter(Boolean) as string[]
    if (wids.length) {
      const { data } = await supabase.from('workout_sets').select('*').in('workout_id', wids).order('created_at')
      setSets((data as WSet[]) || [])
    }
  }, [sessionId])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!session) return
    const tick = () => {
      const m = Math.max(0, Math.round((Date.now() - new Date(session.starts_at).getTime()) / 60000))
      setElapsed(m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`)
    }
    tick(); const t = setInterval(tick, 30000); return () => clearInterval(t)
  }, [session])

  // Ejercicios de la sesión: los de la rutina + los añadidos + los que ya tienen series
  const exerciseIds = useMemo(() => {
    const ids = [...(routine?.plan.map((p) => p.exercise_id) || []), ...extra]
    for (const s of sets) if (!ids.includes(s.exercise_id)) ids.push(s.exercise_id)
    return ids
  }, [routine, extra, sets])
  const selected = current && exerciseIds.includes(current) ? current : exerciseIds[0] || null
  const target = routine?.plan.find((p) => p.exercise_id === selected)
  const present = att.filter((a) => a.present)
  const done = session?.status === 'terminada'

  async function toggle(a: Attendance) {
    const present = !a.present
    setAtt((l) => l.map((x) => (x.client_id === a.client_id ? { ...x, present } : x)))
    const { error } = await supabase.from('session_attendance').update({ present }).eq('session_id', sessionId).eq('client_id', a.client_id)
    if (error) { toast.error(errMsg(error)); load() }
  }

  /** Crea el entreno del alumno la primera vez que se le apunta una serie. */
  async function workoutFor(a: Attendance): Promise<string> {
    if (a.workout_id) return a.workout_id
    const { data, error } = await supabase.from('workouts').insert({
      user_id: a.client_id, name: group?.name || 'Sesión de grupo', started_at: session!.starts_at, session_id: sessionId,
      // Se crea ya "cerrado" para que al alumno no le salga como entreno en marcha en su GymLog
      ended_at: new Date().toISOString(),
    }).select('id').single()
    if (error) throw error
    await supabase.from('session_attendance').update({ workout_id: data.id }).eq('session_id', sessionId).eq('client_id', a.client_id)
    setAtt((l) => l.map((x) => (x.client_id === a.client_id ? { ...x, workout_id: data.id } : x)))
    return data.id
  }

  async function addSet(a: Attendance, weight: number, reps: number) {
    if (!selected) return
    try {
      const wid = await workoutFor(a)
      const { data, error } = await supabase.from('workout_sets')
        .insert({ user_id: a.client_id, workout_id: wid, exercise_id: selected, weight, reps }).select('*').single()
      if (error) throw error
      setSets((l) => [...l, data as WSet])
    } catch (e) { toast.error(errMsg(e)) }
  }
  async function delSet(id: string) {
    await supabase.from('workout_sets').delete().eq('id', id)
    setSets((l) => l.filter((s) => s.id !== id))
  }

  async function finish() {
    if (!confirm('¿Terminar la sesión? Los entrenos quedarán guardados en el GymLog de cada alumno.')) return
    const wids = att.map((a) => a.workout_id).filter(Boolean) as string[]
    if (wids.length) await supabase.from('workouts').update({ ended_at: new Date().toISOString() }).in('id', wids)
    // Entrenos sin ninguna serie no tienen sentido: se borran
    const empty = wids.filter((w) => !sets.some((s) => s.workout_id === w))
    if (empty.length) await supabase.from('workouts').delete().in('id', empty)
    await supabase.from('group_sessions').update({ status: 'terminada' }).eq('id', sessionId)
    toast.success(`Sesión terminada · ${present.length} asistentes · ${sets.length} series`)
    navigate(`/grupos/${session!.group_id}`)
  }

  if (session === undefined) return <Skeleton className="h-64 w-full" />
  if (session === null) return <p className="text-sm text-muted-foreground">Esta sesión no existe.</p>

  const results = q.trim() ? exercises.filter((e) => norm(e.name).includes(norm(q))).slice(0, 6) : []

  return (
    <div className="-m-4 sm:-m-6 md:-m-8 p-4 sm:p-6 min-h-dvh">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <a href={`#/grupos/${session.group_id}`} className="text-muted-foreground hover:text-foreground" aria-label="Volver"><ArrowLeft className="h-5 w-5" strokeWidth={1.5} /></a>
        <div className="mr-auto">
          <h1 className="text-xl font-semibold tracking-tight">{group?.name}{routine ? ` · ${routine.name}` : ''}</h1>
          <p className="text-sm text-muted-foreground">
            {done ? `Sesión del ${fmtDay(session.starts_at, { weekday: 'long', day: 'numeric', month: 'long' })}` : `En curso · ${elapsed}`} · {present.length}/{att.length} presentes · {sets.length} series
          </p>
        </div>
        {!done && <Button onClick={finish}><Flag className="h-4 w-4" strokeWidth={1.5} /> Terminar sesión</Button>}
      </div>

      {/* Asistencia */}
      <div className="flex flex-wrap gap-2 mb-5">
        {att.map((a) => (
          <button key={a.client_id} onClick={() => toggle(a)}
            className={cn('h-10 px-4 rounded-full border text-sm font-medium transition-colors',
              a.present ? 'bg-brand text-zinc-950 border-brand' : 'border-border text-muted-foreground line-through')}>
            {clients[a.client_id]?.display_name || 'Alumno'}
          </button>
        ))}
        <span className="self-center text-xs text-muted-foreground">Toca un nombre para marcar si ha venido</span>
      </div>

      {/* Ejercicios */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
        {exerciseIds.map((id, i) => (
          <button key={id} onClick={() => setCurrent(id)}
            className={cn('shrink-0 h-11 px-4 rounded-md border text-sm', id === selected ? 'bg-primary text-primary-foreground border-primary font-medium' : 'border-border text-muted-foreground hover:text-foreground')}>
            {i + 1}. {exName[id] || 'Ejercicio'}
          </button>
        ))}
      </div>
      <div className="relative max-w-sm mb-5">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
        <Input className="pl-9" placeholder="Añadir otro ejercicio…" value={q} onChange={(e) => setQ(e.target.value)} />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover divide-y divide-border">
            {results.map((e) => (
              <li key={e.id}><button className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60" onClick={() => { setExtra((l) => [...l, e.id]); setCurrent(e.id); setQ('') }}>{e.name}</button></li>
            ))}
          </ul>
        )}
      </div>

      {!selected ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">Elige o añade un ejercicio para empezar a apuntar series.</div>
      ) : (
        <>
          {target?.sets && <p className="mb-3 text-sm">🎯 Objetivo: <b>{target.sets} × {target.reps || '?'}</b></p>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {present.map((a) => (
              <MemberCard
                key={`${a.client_id}-${selected}`}
                name={clients[a.client_id]?.display_name || 'Alumno'}
                canLog={clients[a.client_id]?.share_workouts !== false}
                clientId={a.client_id}
                exerciseId={selected}
                workoutId={a.workout_id}
                today={sets.filter((s) => s.user_id === a.client_id && s.exercise_id === selected)}
                onAdd={(w, r) => addSet(a, w, r)}
                onDelete={delSet}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MemberCard({ name, canLog, clientId, exerciseId, workoutId, today, onAdd, onDelete }: {
  name: string; canLog: boolean; clientId: string; exerciseId: string; workoutId: string | null
  today: WSet[]; onAdd: (w: number, r: number) => Promise<void>; onDelete: (id: string) => void
}) {
  const [last, setLast] = useState<WSet[] | null>(null)
  const [w, setW] = useState('')
  const [r, setR] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!canLog) return
    let q = supabase.from('workout_sets').select('*').eq('user_id', clientId).eq('exercise_id', exerciseId)
      .order('created_at', { ascending: false }).limit(20)
    if (workoutId) q = q.neq('workout_id', workoutId)
    q.then(({ data }) => {
      const rows = (data as WSet[]) || []
      setLast(rows.filter((x) => x.workout_id === rows[0]?.workout_id).reverse())
    })
  }, [clientId, exerciseId, workoutId, canLog])

  // Prepara la siguiente serie con la misma serie de la última vez
  const next = today.length
  useEffect(() => {
    if (last === null) return
    const ref = last[next] || today[today.length - 1] || last[last.length - 1]
    if (ref) { setW(String(round(+ref.weight, 2))); setR(String(ref.reps)) }
  }, [next, last]) // eslint-disable-line react-hooks/exhaustive-deps

  const bump = (s: string, d: number, set: (v: string) => void) => set(String(Math.max(0, round((parseFloat(s.replace(',', '.')) || 0) + d, 2))))
  async function add(weight = parseFloat(w.replace(',', '.')) || 0, reps = parseInt(r) || 0) {
    if (reps <= 0) return
    setBusy(true); await onAdd(weight, reps); setBusy(false)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="font-semibold text-lg">{name}</div>
      {!canLog ? (
        <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1.5"><Lock className="h-4 w-4" strokeWidth={1.5} /> No comparte entrenos: no se pueden apuntar sus series.</p>
      ) : (
        <>
          <div className="mt-2 text-sm text-muted-foreground flex gap-1.5 min-h-5">
            <History className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            {last === null ? '…' : last.length === 0 ? 'Primera vez con este ejercicio' : (
              <span>Última vez ({fmtDay(last[0].created_at)}): {last.map((s, i) => (
                <span key={s.id} className={i === next ? 'text-foreground font-semibold' : ''}>{i ? ' · ' : ''}{round(+s.weight, 2)}×{s.reps}</span>
              ))}</span>
            )}
          </div>

          {today.length > 0 && (
            <ol className="mt-3 space-y-1">
              {today.map((s, i) => (
                <li key={s.id} className="flex items-center gap-2 rounded-md bg-muted px-3 h-9 text-sm">
                  <span className="text-muted-foreground w-12">Serie {i + 1}</span>
                  <span className="flex-1 font-medium">{round(+s.weight, 2)} kg × {s.reps}</span>
                  <button onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive" aria-label="Borrar serie"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button>
                </li>
              ))}
            </ol>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            {([['Kilos', w, setW, 2.5], ['Reps', r, setR, 1]] as const).map(([label, val, set, step]) => (
              <div key={label}>
                <div className="text-xs text-muted-foreground text-center mb-1">{label}</div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-11 w-10 shrink-0" onClick={() => bump(val, -step, set)} aria-label={`Restar ${label}`}><Minus className="h-4 w-4" /></Button>
                  <Input inputMode="decimal" className="h-11 text-center text-lg font-semibold" value={val} onChange={(e) => set(e.target.value)} onFocus={(e) => e.target.select()} />
                  <Button variant="outline" size="icon" className="h-11 w-10 shrink-0" onClick={() => bump(val, step, set)} aria-label={`Sumar ${label}`}><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Button className="flex-1 h-11" disabled={busy || !r} onClick={() => add()}><Plus className="h-4 w-4" /> Serie {next + 1}</Button>
            {today.length > 0 && (
              <Button variant="outline" className="h-11" disabled={busy} onClick={() => add(+today[today.length - 1].weight, today[today.length - 1].reps)} aria-label="Repetir serie"><Copy className="h-4 w-4" /></Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
