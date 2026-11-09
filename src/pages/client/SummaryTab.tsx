import { useCallback, useEffect, useState } from 'react'
import { Dumbbell, Scale, Apple, CalendarClock, Trash2, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { KpiCard } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errMsg, fmtDay, relDays, round, type ClientRow } from '@/lib/data'
import { navigate } from '@/lib/router'

type Note = { id: string; body: string; created_at: string }

export function SummaryTab({ client, onChange }: { client: ClientRow; onChange: () => void }) {
  const [status, setStatus] = useState(client.status)
  const [review, setReview] = useState(client.next_review || '')
  const [notes, setNotes] = useState<Note[]>([])
  const [note, setNote] = useState('')
  const [goals, setGoals] = useState({ kcal: '', p: '', c: '', f: '' })

  const loadNotes = useCallback(async () => {
    const { data } = await supabase.from('coach_notes').select('id,body,created_at').eq('client_id', client.client_id).order('created_at', { ascending: false })
    setNotes((data as Note[]) || [])
  }, [client.client_id])

  useEffect(() => {
    loadNotes()
    supabase.from('profiles').select('kcal_goal,protein_goal,carbs_goal,fat_goal').eq('id', client.client_id).single().then(({ data }) => {
      if (data) setGoals({ kcal: String(data.kcal_goal), p: String(data.protein_goal), c: String(data.carbs_goal), f: String(data.fat_goal) })
    })
  }, [client.client_id, loadNotes])

  async function saveFollowUp() {
    const { error } = await supabase.rpc('coach_update_client', { p_client: client.client_id, p_status: status, p_next_review: review || null })
    if (error) return toast.error(errMsg(error))
    toast.success('Seguimiento guardado'); onChange()
  }
  async function addNote() {
    const { error } = await supabase.from('coach_notes').insert({ client_id: client.client_id, body: note.trim() })
    if (error) return toast.error(errMsg(error))
    setNote(''); loadNotes()
  }
  async function delNote(id: string) {
    await supabase.from('coach_notes').delete().eq('id', id); loadNotes()
  }
  async function saveGoals() {
    const n = (s: string) => Math.round(Number(s.replace(',', '.')) || 0)
    const { error } = await supabase.rpc('coach_set_goals', { p_client: client.client_id, p_kcal: n(goals.kcal), p_protein: n(goals.p), p_carbs: n(goals.c), p_fat: n(goals.f) })
    if (error) return toast.error(errMsg(error))
    toast.success('Objetivos actualizados. El cliente ya los ve en su app.'); onChange()
  }
  async function removeClient() {
    if (!confirm(`¿Quitar a ${client.display_name} de tus clientes? Dejarás de ver sus datos.`)) return
    await supabase.from('coach_clients').delete().eq('client_id', client.client_id)
    navigate('/clientes')
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Último entreno" value={client.share_workouts ? relDays(client.last_workout_at) : '🔒'}
          hint={client.share_workouts ? `${client.workouts_7d ?? 0} esta semana · ${client.workouts_30d ?? 0} en 30 días` : 'No comparte entrenos'} icon={<Dumbbell className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Peso" value={client.share_body ? (client.last_weight ? `${round(+client.last_weight, 1)} kg` : '—') : '🔒'}
          hint={client.share_body && client.weight_change_30d !== null ? `${+client.weight_change_30d > 0 ? '+' : ''}${round(+client.weight_change_30d, 1)} kg en 30 días` : undefined} icon={<Scale className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Kcal media (7 d)" value={client.share_diet ? (client.avg_kcal_7d ?? '—') : '🔒'}
          hint={client.share_diet ? `Objetivo ${client.kcal_goal} · proteína ${client.avg_protein_7d ?? '—'}/${client.protein_goal} g` : 'No comparte dieta'} icon={<Apple className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Próxima revisión" value={client.next_review ? fmtDay(client.next_review) : '—'} hint={`Cliente desde ${fmtDay(client.joined_at, { day: 'numeric', month: 'short', year: 'numeric' })}`} icon={<CalendarClock className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Seguimiento</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ClientRow['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="pausa">En pausa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rev">Próxima revisión</Label>
              <Input id="rev" type="date" value={review} onChange={(e) => setReview(e.target.value)} />
            </div>
          </div>
          <Button onClick={saveFollowUp}>Guardar</Button>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold">Objetivos diarios de dieta</h2>
          <div className="grid grid-cols-4 gap-2">
            {([['kcal', 'Kcal'], ['p', 'Prot. (g)'], ['c', 'Hidr. (g)'], ['f', 'Grasa (g)']] as const).map(([k, l]) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs">{l}</Label>
                <Input inputMode="numeric" value={goals[k]} onChange={(e) => setGoals({ ...goals, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={saveGoals}>Actualizar objetivos</Button>
        </section>
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Notas privadas</h2>
          <p className="text-xs text-muted-foreground">Solo las ves tú: lesiones, objetivos, cómo se siente…</p>
        </div>
        <div className="flex gap-2 items-start">
          <Textarea rows={2} placeholder="Escribe una nota…" value={note} onChange={(e) => setNote(e.target.value)} />
          <Button onClick={addNote} disabled={!note.trim()}>Añadir</Button>
        </div>
        <ul className="divide-y divide-border">
          {notes.map((n) => (
            <li key={n.id} className="py-3 flex gap-3">
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">{fmtDay(n.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <p className="text-sm whitespace-pre-wrap">{n.body}</p>
              </div>
              <button onClick={() => delNote(n.id)} className="text-muted-foreground hover:text-destructive" aria-label="Borrar nota"><Trash2 className="h-4 w-4" strokeWidth={1.5} /></button>
            </li>
          ))}
          {notes.length === 0 && <li className="py-3 text-sm text-muted-foreground">Sin notas todavía.</li>}
        </ul>
      </section>

      <Button variant="ghost" className="text-destructive" onClick={removeClient}>
        <UserMinus className="h-4 w-4" strokeWidth={1.5} /> Quitar cliente
      </Button>
    </div>
  )
}
