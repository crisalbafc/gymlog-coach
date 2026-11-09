import { useEffect, useMemo, useState } from 'react'
import { ArrowUp, ArrowDown, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Ex } from '@/pages/client/WorkoutsTab'
import type { PlanItem } from '@/lib/groups'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')

/** Editor de rutina (nombre + ejercicios con series × reps). */
export function PlanDialog({ open, title, description, initial, exercises, onClose, onSave }: {
  open: boolean; title: string; description?: string
  initial?: { name: string; plan: PlanItem[] } | null
  exercises: Ex[]; onClose: () => void; onSave: (name: string, plan: PlanItem[]) => Promise<void> | void
}) {
  const [name, setName] = useState('')
  const [items, setItems] = useState<PlanItem[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const exName = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e.name])), [exercises])

  useEffect(() => {
    if (!open) return
    setQ(''); setName(initial?.name || ''); setItems(initial?.plan.map((p) => ({ ...p })) || [])
  }, [open, initial])

  const results = q.trim() ? exercises.filter((e) => norm(e.name).includes(norm(q))).slice(0, 8) : []
  const upd = (i: number, p: Partial<PlanItem>) => setItems((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const move = (i: number, d: number) => setItems((l) => {
    const j = i + d; if (j < 0 || j >= l.length) return l
    const c = [...l]; [c[i], c[j]] = [c[j], c[i]]; return c
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pn">Nombre</Label>
            <Input id="pn" placeholder="Ej. Sesión A · Fuerza" value={name} onChange={(e) => setName(e.target.value)} />
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
              <Input className="pl-9" placeholder="Buscar (ej. sentadilla)" value={q} onChange={(e) => setQ(e.target.value)} />
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
            <Button disabled={busy || !name.trim() || items.length === 0} onClick={async () => { setBusy(true); try { await onSave(name.trim(), items) } finally { setBusy(false) } }}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
