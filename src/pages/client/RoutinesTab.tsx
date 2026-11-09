import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { errMsg } from '@/lib/data'
import { useExercises } from './WorkoutsTab'

type Item = { exercise_id: string; sets: number | null; reps: string }
type Tpl = { id: string; name: string; plan: Item[] | null; exercise_ids: string[] }

/** Rutinas que el entrenador asigna al cliente (le aparecen en «Mis rutinas» de GymLog). */
export function RoutinesTab({ clientId, coachId }: { clientId: string; coachId: string }) {
  const exercises = useExercises()
  const exName = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e.name])), [exercises])
  const [list, setList] = useState<Tpl[]>([])
  const [editing, setEditing] = useState<Tpl | 'new' | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase.from('templates').select('id,name,plan,exercise_ids')
      .eq('user_id', clientId).eq('assigned_by', coachId).order('created_at')
    setList((data as Tpl[]) || [])
  }, [clientId, coachId])
  useEffect(() => { load() }, [load])

  async function remove(t: Tpl) {
    if (!confirm(`¿Quitar la rutina «${t.name}» a este cliente?`)) return
    await supabase.from('templates').delete().eq('id', t.id)
    load()
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Las rutinas que crees aquí le aparecen al cliente en GymLog → Entreno → «Mis rutinas».</p>
        <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nueva rutina</Button>
      </div>
      {list.length === 0 && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Aún no le has asignado rutinas.</div>}
      <ul className="space-y-2">
        {list.map((t) => (
          <li key={t.id} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
            <div className="flex-1">
              <div className="font-medium">{t.name}</div>
              <div className="text-sm text-muted-foreground">
                {(t.plan?.length ? t.plan : t.exercise_ids.map((id) => ({ exercise_id: id, sets: null, reps: '' })))
                  .map((p) => `${exName[p.exercise_id] || 'Ejercicio'}${p.sets ? ` ${p.sets}×${p.reps || '?'}` : ''}`).join(' · ')}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditing(t)} aria-label="Editar"><Pencil className="h-4 w-4" strokeWidth={1.5} /></Button>
            <Button variant="ghost" size="icon" onClick={() => remove(t)} aria-label="Quitar"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></Button>
          </li>
        ))}
      </ul>
      <RoutineDialog
        routine={editing}
        clientId={clientId}
        coachId={coachId}
        exercises={exercises}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load() }}
      />
    </div>
  )
}

function RoutineDialog({ routine, clientId, coachId, exercises, onClose, onSaved }: {
  routine: Tpl | 'new' | null; clientId: string; coachId: string
  exercises: ReturnType<typeof useExercises>; onClose: () => void; onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [q, setQ] = useState('')
  const exName = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e.name])), [exercises])

  useEffect(() => {
    if (!routine) return
    setQ('')
    if (routine === 'new') { setName(''); setItems([]); return }
    setName(routine.name)
    setItems(routine.plan?.length ? routine.plan.map((p) => ({ ...p })) : routine.exercise_ids.map((id) => ({ exercise_id: id, sets: 3, reps: '10' })))
  }, [routine])

  const results = q.trim()
    ? exercises.filter((e) => e.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
        .includes(q.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''))).slice(0, 8)
    : []
  const upd = (i: number, p: Partial<Item>) => setItems((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const move = (i: number, d: number) => setItems((l) => {
    const j = i + d; if (j < 0 || j >= l.length) return l
    const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c
  })

  async function save() {
    const row = { name: name.trim(), exercise_ids: items.map((x) => x.exercise_id), plan: items }
    const { error } = routine && routine !== 'new'
      ? await supabase.from('templates').update(row).eq('id', routine.id)
      : await supabase.from('templates').insert({ ...row, user_id: clientId, assigned_by: coachId })
    if (error) return toast.error(errMsg(error))
    toast.success('Rutina guardada. El cliente ya la tiene en su app.')
    onSaved()
  }

  return (
    <Dialog open={!!routine} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{routine === 'new' ? 'Nueva rutina' : 'Editar rutina'}</DialogTitle>
          <DialogDescription>Ejercicios con series × repeticiones objetivo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rn">Nombre</Label>
            <Input id="rn" placeholder="Ej. Lunes · Pecho y tríceps" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <ol className="space-y-2">
            {items.map((it, i) => (
              <li key={`${it.exercise_id}-${i}`} className="rounded-md border border-border p-3 flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-sm w-5">{i + 1}.</span>
                <span className="flex-1 min-w-40 font-medium">{exName[it.exercise_id] || 'Ejercicio'}</span>
                <Input className="w-16 text-center" inputMode="numeric" value={it.sets ?? ''} placeholder="4"
                  onChange={(e) => upd(i, { sets: e.target.value ? Math.max(1, parseInt(e.target.value) || 1) : null })} aria-label="Series" />
                <span className="text-sm text-muted-foreground">×</span>
                <Input className="w-20 text-center" value={it.reps} placeholder="8-10" onChange={(e) => upd(i, { reps: e.target.value.slice(0, 12) })} aria-label="Repeticiones" />
                <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Bajar"><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} aria-label="Quitar"><X className="h-4 w-4" /></Button>
              </li>
            ))}
          </ol>

          <div className="space-y-2">
            <Label>Añadir ejercicio</Label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input className="pl-9" placeholder="Buscar (ej. press banca)" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {results.length > 0 && (
              <ul className="rounded-md border border-border divide-y divide-border">
                {results.map((e) => (
                  <li key={e.id}>
                    <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 flex justify-between"
                      onClick={() => { setItems((l) => [...l, { exercise_id: e.id, sets: 3, reps: '10' }]); setQ('') }}>
                      <span>{e.name}</span><span className="text-muted-foreground text-xs">{e.muscle}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={!name.trim() || items.length === 0}>Guardar y asignar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
