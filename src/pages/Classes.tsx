import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SessionCard, WeekNavigator } from '@/components/classes/ClassUI'
import { SessionSheet } from '@/components/classes/SessionSheet'
import { errMsg, loadClients, type ClientRow, type Coach } from '@/lib/data'
import { COLORS, DAYS, DAYS_SHORT, addDays, loadWeek, mondayOf, type Booking, type ClassSession, type ClassTemplate } from '@/lib/classes'
import { cn } from '@/lib/utils'

export default function Classes({ coach, onCoachChange }: { coach: Coach & { cancel_hours?: number }; onCoachChange: () => void }) {
  const [monday, setMonday] = useState(mondayOf())
  const [week, setWeek] = useState<{ sessions: ClassSession[]; bookings: Booking[] } | null>(null)
  const [templates, setTemplates] = useState<ClassTemplate[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [editing, setEditing] = useState<ClassTemplate | 'new' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hours, setHours] = useState(String(coach.cancel_hours ?? 2))

  const loadTemplates = useCallback(async () => {
    const { data, error } = await supabase.from('class_templates').select('*').order('name')
    if (error) setError(errMsg(error))
    setTemplates((data as ClassTemplate[]) || [])
  }, [])
  const reload = useCallback(async () => {
    try { setWeek(await loadWeek(monday)) } catch (e) { setError(errMsg(e)) }
  }, [monday])

  useEffect(() => { reload() }, [reload])
  useEffect(() => { loadTemplates(); loadClients().then(setClients).catch(() => {}) }, [loadTemplates])

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday])
  const count = (id: string, st: Booking['status']) => week?.bookings.filter((b) => b.session_id === id && b.status === st).length || 0

  async function publish() {
    const { data, error } = await supabase.rpc('generate_class_sessions', { p_weeks: 4 })
    if (error) return toast.error(errMsg(error))
    toast.success(data ? `${data} clases nuevas publicadas` : 'El horario ya estaba publicado'); reload()
  }
  async function saveHours() {
    const { error } = await supabase.rpc('update_cancel_hours', { p_hours: parseInt(hours) || 0 })
    if (error) return toast.error(errMsg(error))
    toast.success('Guardado'); onCoachChange()
  }

  if (error?.includes('class_')) return <p className="text-sm text-muted-foreground">Falta activar las clases en el servidor (014-clases-reservas.sql).</p>

  return (
    <div>
      <PageHeader title="Clases" description="Horario semanal, reservas y lista de espera">
        <Button variant="outline" onClick={publish}><CalendarPlus className="h-4 w-4" strokeWidth={1.5} /> Publicar 4 semanas</Button>
      </PageHeader>

      <Tabs defaultValue="horario">
        <TabsList className="mb-6">
          <TabsTrigger value="horario">Horario</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de clase</TabsTrigger>
        </TabsList>

        <TabsContent value="horario">
          <div className="mb-4"><WeekNavigator monday={monday} onPrev={() => setMonday(addDays(monday, -7))} onNext={() => setMonday(addDays(monday, 7))} onToday={() => setMonday(mondayOf())} /></div>
          {!week ? <Skeleton className="h-64 w-full" /> : week.sessions.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No hay clases esta semana. Crea tus <b>tipos de clase</b> con su horario y pulsa <b>«Publicar 4 semanas»</b>.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-7">
              {days.map((d) => {
                const list = week.sessions.filter((s) => new Date(s.starts_at).toDateString() === d.toDateString())
                const today = d.toDateString() === new Date().toDateString()
                return (
                  <div key={d.toISOString()} className="space-y-2">
                    <div className={cn('text-xs uppercase tracking-wide', today ? 'text-brand font-semibold' : 'text-muted-foreground')}>
                      {d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}
                    </div>
                    {list.map((s) => <SessionCard key={s.id} session={s} confirmed={count(s.id, 'confirmada')} waiting={count(s.id, 'espera')} onClick={() => setOpen(s.id)} />)}
                    {list.length === 0 && <div className="hidden md:block text-xs text-muted-foreground/50">—</div>}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tipos" className="space-y-6 max-w-3xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Cada tipo de clase tiene su horario semanal. Al publicar se crean las clases de las próximas semanas.</p>
            <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nuevo tipo</Button>
          </div>
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.id} className={cn('rounded-lg border border-border bg-card p-4 flex items-center gap-3', !t.active && 'opacity-60')}>
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <div className="flex-1">
                  <div className="font-medium">{t.name}{!t.active && <span className="text-xs text-muted-foreground"> · inactiva</span>}</div>
                  <div className="text-sm text-muted-foreground">
                    {t.weekdays.length ? [...t.weekdays].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAYS[d].slice(0, 3)).join(', ') : 'Sin días'}
                    {t.start_time && ` · ${t.start_time.slice(0, 5)}`} · {t.duration_min} min · {t.capacity} plazas
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditing(t)} aria-label="Editar"><Pencil className="h-4 w-4" strokeWidth={1.5} /></Button>
                <Button variant="ghost" size="icon" aria-label="Borrar" onClick={async () => {
                  if (!confirm(`¿Borrar «${t.name}»? Las clases ya publicadas se mantienen.`)) return
                  await supabase.from('class_templates').delete().eq('id', t.id); loadTemplates()
                }}><Trash2 className="h-4 w-4" strokeWidth={1.5} /></Button>
              </li>
            ))}
            {templates.length === 0 && <li className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Aún no hay tipos de clase. Ej.: «Pilates suelo» lunes, miércoles y viernes a las 9:00.</li>}
          </ul>

          <section className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Política de cancelación</h2>
            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label htmlFor="ch">Los socios pueden cancelar hasta (horas antes)</Label>
                <Input id="ch" className="w-24" inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value)} />
              </div>
              <Button variant="outline" onClick={saveHours}>Guardar</Button>
            </div>
            <p className="text-xs text-muted-foreground">Desde la lista de espera no hay plazo. El centro puede quitar reservas siempre.</p>
          </section>
        </TabsContent>
      </Tabs>

      <SessionSheet session={week?.sessions.find((s) => s.id === open) || null} bookings={week?.bookings || []} clients={clients}
        onClose={() => setOpen(null)} onChange={reload} />
      <TemplateDialog template={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); loadTemplates() }} />
    </div>
  )
}

function TemplateDialog({ template, onClose, onSaved }: { template: ClassTemplate | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', color: COLORS[0], duration: '60', capacity: '10', time: '19:00', days: [] as number[], active: true })
  useEffect(() => {
    if (!template) return
    if (template === 'new') setF({ name: '', color: COLORS[0], duration: '60', capacity: '10', time: '19:00', days: [], active: true })
    else setF({ name: template.name, color: template.color, duration: String(template.duration_min), capacity: String(template.capacity),
      time: template.start_time?.slice(0, 5) || '', days: template.weekdays, active: template.active })
  }, [template])

  async function save() {
    const row = {
      name: f.name.trim(), color: f.color, duration_min: parseInt(f.duration) || 60, capacity: parseInt(f.capacity) || 10,
      start_time: f.time || null, weekdays: f.days, active: f.active,
    }
    const { error } = template && template !== 'new'
      ? await supabase.from('class_templates').update(row).eq('id', template.id)
      : await supabase.from('class_templates').insert(row)
    if (error) return toast.error(errMsg(error))
    toast.success('Guardado. Pulsa «Publicar 4 semanas» para crear las clases.'); onSaved()
  }

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{template === 'new' ? 'Nuevo tipo de clase' : 'Editar tipo de clase'}</DialogTitle>
          <DialogDescription>Nombre, plazas y horario semanal.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="tn">Nombre</Label><Input id="tn" placeholder="Ej. Pilates suelo" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2"><Label htmlFor="tt">Hora</Label><Input id="tt" type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="td">Minutos</Label><Input id="td" inputMode="numeric" value={f.duration} onChange={(e) => setF({ ...f, duration: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="tc">Plazas</Label><Input id="tc" inputMode="numeric" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /></div>
          </div>
          <div className="space-y-2">
            <Label>Días</Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <button key={d} type="button" onClick={() => setF({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] })}
                  className={cn('h-10 w-10 rounded-md border text-sm font-medium', f.days.includes(d) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground')}
                  aria-label={DAYS[d]}>{DAYS_SHORT[d]}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setF({ ...f, color: c })} aria-label={`Color ${c}`}
                  className={cn('h-8 w-8 rounded-full border-2', f.color === c ? 'border-foreground' : 'border-transparent')} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between"><span className="text-sm">Activa</span><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /></label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={!f.name.trim()}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
