import { useEffect, useState } from 'react'
import { Plus, UsersRound, CalendarCheck, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { errMsg, fmtDay } from '@/lib/data'
import { loadGroups, type GroupRow } from '@/lib/groups'
import { navigate } from '@/lib/router'

export default function Groups() {
  const [groups, setGroups] = useState<GroupRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadGroups().then(setGroups).catch((e) => setError(errMsg(e))) }, [])

  return (
    <div>
      <PageHeader title="Grupos" description="Grupos fijos con horario, rutina común y asistencia">
        <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nuevo grupo</Button>
      </PageHeader>
      {error && <p className="text-sm text-destructive mb-4">{error.includes('groups_overview') ? 'Falta activar los grupos en el servidor (013-centros-grupos.sql).' : error}</p>}
      {!groups && !error ? <Skeleton className="h-40 w-full" /> : groups && groups.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aún no tienes grupos. Crea el primero, por ejemplo «Lunes y miércoles 19:00 · Fuerza».
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups?.map((g) => (
            <button key={g.id} onClick={() => navigate(`/grupos/${g.id}`)} className="text-left rounded-lg border border-border bg-card p-5 hover:bg-muted/40 transition-colors">
              <div className="font-semibold">{g.name}</div>
              {g.schedule && <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5"><Clock className="h-3.5 w-3.5" strokeWidth={1.5} />{g.schedule}</div>}
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5"><UsersRound className="h-4 w-4" strokeWidth={1.5} /> {g.members}/{g.capacity} plazas</span>
                <span className="flex items-center gap-1.5 text-muted-foreground"><CalendarCheck className="h-4 w-4" strokeWidth={1.5} /> {g.sessions_4w} sesiones (4 sem.)</span>
              </div>
              <Progress className="mt-2 h-1.5" value={Math.min(100, (g.members / g.capacity) * 100)} />
              <div className="mt-3 text-xs text-muted-foreground">
                Asistencia: <b className="text-foreground">{g.attendance_4w !== null ? `${g.attendance_4w}%` : '—'}</b>
                {g.last_session && <> · última sesión {fmtDay(g.last_session, { weekday: 'short', day: 'numeric', month: 'short' })}</>}
              </div>
            </button>
          ))}
        </div>
      )}
      <GroupDialog open={creating} onClose={() => setCreating(false)} onSaved={(id) => navigate(`/grupos/${id}`)} />
    </div>
  )
}

export function GroupDialog({ open, onClose, onSaved, group }: {
  open: boolean; onClose: () => void; onSaved: (id: string) => void
  group?: { id: string; name: string; schedule: string | null; capacity: number }
}) {
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState('')
  const [capacity, setCapacity] = useState('8')

  useEffect(() => {
    if (!open) return
    setName(group?.name || ''); setSchedule(group?.schedule || ''); setCapacity(String(group?.capacity || 8))
  }, [open, group])

  async function save() {
    const row = { name: name.trim(), schedule: schedule.trim() || null, capacity: Math.max(1, Math.min(50, parseInt(capacity) || 8)) }
    const { data, error } = group
      ? await supabase.from('training_groups').update(row).eq('id', group.id).select('id').single()
      : await supabase.from('training_groups').insert(row).select('id').single()
    if (error) return toast.error(errMsg(error))
    toast.success(group ? 'Grupo actualizado' : 'Grupo creado')
    onClose(); onSaved(data.id)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{group ? 'Editar grupo' : 'Nuevo grupo'}</DialogTitle>
          <DialogDescription>Luego podrás añadir miembros y su rutina.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="gn">Nombre</Label><Input id="gn" placeholder="Ej. Fuerza · Iniciación" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2"><Label htmlFor="gs">Horario</Label><Input id="gs" placeholder="Ej. L y X · 19:00" value={schedule} onChange={(e) => setSchedule(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="gc">Plazas</Label><Input id="gc" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={!name.trim()}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
