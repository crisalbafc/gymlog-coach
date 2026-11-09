import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pencil, Trash2, Plus, Play, UserPlus, X, Clock, Check, Minus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PlanDialog } from '@/components/PlanDialog'
import { GroupDialog } from './Groups'
import { useExercises } from './client/WorkoutsTab'
import { errMsg, fmtDay, loadClients, type ClientRow, type Coach } from '@/lib/data'
import { centerOf } from '@/lib/centers'
import { startSession, type Attendance, type Group, type GroupRoutine, type PlanItem, type Session } from '@/lib/groups'
import { navigate } from '@/lib/router'

export default function GroupDetail({ groupId, coach }: { groupId: string; coach: Coach }) {
  const center = centerOf(coach)
  const exercises = useExercises()
  const exName = useMemo(() => Object.fromEntries(exercises.map((e) => [e.id, e.name])), [exercises])
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  const [members, setMembers] = useState<string[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [routines, setRoutines] = useState<GroupRoutine[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [editGroup, setEditGroup] = useState(false)
  const [editing, setEditing] = useState<GroupRoutine | 'new' | null>(null)
  const [adding, setAdding] = useState('')
  const [routineForSession, setRoutineForSession] = useState<string>('none')

  const load = useCallback(async () => {
    const [g, m, r, s, cl] = await Promise.all([
      supabase.from('training_groups').select('id,name,schedule,capacity').eq('id', groupId).maybeSingle(),
      supabase.from('training_group_members').select('client_id').eq('group_id', groupId),
      supabase.from('group_routines').select('*').eq('group_id', groupId).order('created_at'),
      supabase.from('group_sessions').select('*').eq('group_id', groupId).order('starts_at', { ascending: false }).limit(12),
      loadClients().catch(() => [] as ClientRow[]),
    ])
    setGroup((g.data as Group) || null)
    setMembers(((m.data as { client_id: string }[]) || []).map((x) => x.client_id))
    setRoutines((r.data as GroupRoutine[]) || [])
    const ss = (s.data as Session[]) || []
    setSessions(ss)
    setClients(cl)
    if (ss.length) {
      const { data } = await supabase.from('session_attendance').select('*').in('session_id', ss.map((x) => x.id))
      setAttendance((data as Attendance[]) || [])
    } else setAttendance([])
  }, [groupId])
  useEffect(() => { load() }, [load])

  const byId = useMemo(() => Object.fromEntries(clients.map((c) => [c.client_id, c])), [clients])
  const candidates = clients.filter((c) => !members.includes(c.client_id))
  const running = sessions.find((s) => s.status === 'en_curso')

  async function addMember() {
    if (!adding) return
    if (group && members.length >= group.capacity && !confirm('El grupo está lleno. ¿Añadir igualmente?')) return
    const { error } = await supabase.from('training_group_members').insert({ group_id: groupId, client_id: adding })
    if (error) return toast.error(errMsg(error))
    await supabase.rpc('sync_group_routines', { p_group: groupId })
    setAdding(''); load()
  }
  async function removeMember(id: string) {
    if (!confirm(`¿Quitar a ${byId[id]?.display_name || 'este miembro'} del grupo?`)) return
    await supabase.from('training_group_members').delete().eq('group_id', groupId).eq('client_id', id)
    await supabase.from('templates').delete().eq('user_id', id).not('group_routine_id', 'is', null).in('group_routine_id', routines.map((r) => r.id))
    load()
  }
  async function saveRoutine(name: string, plan: PlanItem[]) {
    const isNew = editing === 'new'
    const { data, error } = isNew
      ? await supabase.from('group_routines').insert({ group_id: groupId, name, plan }).select('id').single()
      : await supabase.from('group_routines').update({ name, plan }).eq('id', (editing as GroupRoutine).id).select('id').single()
    if (error) return void toast.error(errMsg(error))
    const { data: n } = await supabase.rpc('sync_group_routine', { p_routine: data.id })
    toast.success(`Rutina guardada y enviada a ${n ?? members.length} miembros`)
    setEditing(null); load()
  }
  async function deleteRoutine(r: GroupRoutine) {
    if (!confirm(`¿Borrar la rutina «${r.name}»? Se quitará también a los miembros.`)) return
    await supabase.from('group_routines').delete().eq('id', r.id)
    load()
  }
  async function deleteGroup() {
    if (!confirm('¿Borrar este grupo, sus rutinas y su historial de sesiones? Los entrenos de los alumnos se conservan.')) return
    await supabase.from('training_groups').delete().eq('id', groupId)
    navigate('/grupos')
  }
  async function newSession() {
    try {
      const id = await startSession(groupId, routineForSession === 'none' ? null : routineForSession)
      navigate(`/sesion/${id}`)
    } catch (e) { toast.error(errMsg(e)) }
  }

  if (group === undefined) return <Skeleton className="h-64 w-full" />
  if (group === null) return <p className="text-sm text-muted-foreground">Este grupo no existe.</p>

  return (
    <div>
      <a href="#/grupos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Grupos
      </a>
      <PageHeader title={group.name} description={[group.schedule, `${members.length}/${group.capacity} plazas`].filter(Boolean).join(' · ')}>
        <Button variant="outline" size="sm" onClick={() => setEditGroup(true)}><Pencil className="h-4 w-4" strokeWidth={1.5} /> Editar</Button>
      </PageHeader>

      {center.has('sesion') && (
        <section className="rounded-lg border border-border bg-card p-5 mb-8 flex flex-wrap items-center gap-3">
          {running ? (
            <>
              <span className="text-sm">Hay una sesión en curso desde {fmtDay(running.starts_at, { hour: '2-digit', minute: '2-digit' })}.</span>
              <Button onClick={() => navigate(`/sesion/${running.id}`)}><Play className="h-4 w-4" strokeWidth={1.5} /> Abrir sesión</Button>
            </>
          ) : (
            <>
              <span className="text-sm font-medium mr-auto">Empezar sesión de hoy</span>
              <Select value={routineForSession} onValueChange={setRoutineForSession}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin rutina</SelectItem>
                  {routines.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={newSession} disabled={members.length === 0}><Play className="h-4 w-4" strokeWidth={1.5} /> Empezar</Button>
            </>
          )}
        </section>
      )}

      <Tabs defaultValue="miembros">
        <TabsList className="mb-6">
          <TabsTrigger value="miembros">Miembros</TabsTrigger>
          <TabsTrigger value="rutinas">Rutinas</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
        </TabsList>

        <TabsContent value="miembros" className="space-y-4 max-w-2xl">
          <div className="flex gap-2">
            <Select value={adding} onValueChange={setAdding}>
              <SelectTrigger className="flex-1"><SelectValue placeholder={candidates.length ? `Añadir ${center.cfg.person}…` : `No hay más ${center.cfg.people.toLowerCase()} conectados`} /></SelectTrigger>
              <SelectContent>{candidates.map((c) => <SelectItem key={c.client_id} value={c.client_id}>{c.display_name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={addMember} disabled={!adding}><UserPlus className="h-4 w-4" strokeWidth={1.5} /> Añadir</Button>
          </div>
          <ul className="rounded-lg border border-border bg-card divide-y divide-border">
            {members.map((id) => (
              <li key={id} className="flex items-center gap-3 px-4 py-3">
                <button className="flex-1 text-left" onClick={() => navigate(`/clientes/${id}`)}>
                  <div className="font-medium">{byId[id]?.display_name || 'Miembro'}</div>
                  <div className="text-xs text-muted-foreground">{byId[id]?.email}</div>
                </button>
                {byId[id] && !byId[id].share_workouts && <Badge variant="outline" className="text-muted-foreground">no comparte entrenos</Badge>}
                <Button variant="ghost" size="icon" onClick={() => removeMember(id)} aria-label="Quitar del grupo"><X className="h-4 w-4" /></Button>
              </li>
            ))}
            {members.length === 0 && <li className="px-4 py-6 text-sm text-muted-foreground">Añade {center.cfg.people.toLowerCase()} al grupo. Deben estar conectados contigo con tu código.</li>}
          </ul>
        </TabsContent>

        <TabsContent value="rutinas" className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Cada rutina del grupo le aparece a todos los miembros en GymLog → «Mis rutinas».</p>
            <Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nueva rutina</Button>
          </div>
          {routines.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
              <div className="flex-1">
                <div className="font-medium">{r.name}</div>
                <div className="text-sm text-muted-foreground">{r.plan.map((p) => `${exName[p.exercise_id] || 'Ejercicio'}${p.sets ? ` ${p.sets}×${p.reps || '?'}` : ''}`).join(' · ')}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditing(r)} aria-label="Editar"><Pencil className="h-4 w-4" strokeWidth={1.5} /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteRoutine(r)} aria-label="Borrar"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></Button>
            </div>
          ))}
          {routines.length === 0 && <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Sin rutinas todavía.</div>}
        </TabsContent>

        <TabsContent value="asistencia">
          {sessions.length === 0 ? <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Todavía no hay sesiones.</div> : (
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{center.cfg.people}</TableHead>
                    {[...sessions].reverse().map((s) => (
                      <TableHead key={s.id} className="text-center whitespace-nowrap">
                        <button onClick={() => navigate(`/sesion/${s.id}`)} className="hover:text-foreground">{fmtDay(s.starts_at, { day: 'numeric', month: 'numeric' })}</button>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((id) => {
                    const rows = [...sessions].reverse().map((s) => attendance.find((a) => a.session_id === s.id && a.client_id === id))
                    const counted = rows.filter(Boolean)
                    const pct = counted.length ? Math.round((100 * counted.filter((a) => a!.present).length) / counted.length) : null
                    return (
                      <TableRow key={id}>
                        <TableCell className="font-medium whitespace-nowrap">{byId[id]?.display_name || 'Miembro'}</TableCell>
                        {rows.map((a, i) => (
                          <TableCell key={i} className="text-center">
                            {!a ? <Minus className="h-4 w-4 mx-auto text-muted-foreground/40" /> : a.present
                              ? <Check className="h-4 w-4 mx-auto text-lime-400" /> : <X className="h-4 w-4 mx-auto text-destructive" />}
                          </TableCell>
                        ))}
                        <TableCell className={`text-right ${pct !== null && pct < 60 ? 'text-orange-400' : ''}`}>{pct !== null ? `${pct}%` : '—'}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Últimas 12 sesiones. Toca una fecha para abrirla.</p>
        </TabsContent>
      </Tabs>

      <Button variant="ghost" className="mt-10 text-destructive" onClick={deleteGroup}><Trash2 className="h-4 w-4" strokeWidth={1.5} /> Borrar grupo</Button>

      <GroupDialog open={editGroup} group={group} onClose={() => setEditGroup(false)} onSaved={() => load()} />
      <PlanDialog
        open={!!editing}
        title={editing === 'new' ? 'Nueva rutina del grupo' : 'Editar rutina del grupo'}
        description="Se enviará a todos los miembros del grupo."
        initial={editing && editing !== 'new' ? { name: editing.name, plan: editing.plan } : null}
        exercises={exercises}
        onClose={() => setEditing(null)}
        onSave={saveRoutine}
      />
    </div>
  )
}
