// Adaptado de FitBox (routes/prs + components/prs/LeaderboardTable)
import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Sparkles, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errMsg, fmtDay } from '@/lib/data'
import { cn } from '@/lib/utils'

export type Movement = { id: string; name: string; category: 'fuerza' | 'olimpico' | 'benchmark_wod' | 'gimnastico' | 'cardio'; unit: 'kg' | 'tiempo' | 'reps' | 'metros' }
type Row = { user_id: string; display_name: string; value: number; rx: boolean; done_on: string; is_me: boolean }

export const CATEGORY_LABEL: Record<Movement['category'], string> = { fuerza: 'Fuerza', olimpico: 'Olímpicos', benchmark_wod: 'Benchmark WODs', gimnastico: 'Gimnásticos', cardio: 'Cardio' }
export function fmtMark(v: number, unit: Movement['unit']) {
  if (unit === 'tiempo') { const s = Math.round(v); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
  return `${Number(v).toLocaleString('es-ES')} ${unit === 'kg' ? 'kg' : unit === 'metros' ? 'm' : 'reps'}`
}

export default function Marks() {
  const [movs, setMovs] = useState<Movement[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [f, setF] = useState({ name: '', category: 'fuerza' as Movement['category'], unit: 'kg' as Movement['unit'] })
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('pr_movements').select('*').order('category').order('name')
    if (error) return setError(errMsg(error))
    setMovs((data as Movement[]) || [])
  }, [])
  useEffect(() => { load() }, [load])
  const current = movs.find((m) => m.id === sel) || movs[0]
  useEffect(() => {
    if (!current) return
    supabase.rpc('center_leaderboard', { p_movement: current.id }).then(({ data }) => {
      const r = (data as Row[]) || []
      setRows(r.sort((a, b) => Number(b.rx) - Number(a.rx) || (current.unit === 'tiempo' ? a.value - b.value : b.value - a.value)))
    })
  }, [current?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function seed() {
    const { data, error } = await supabase.rpc('seed_pr_movements')
    if (error) return toast.error(errMsg(error))
    toast.success(`${data} movimientos añadidos`); load()
  }
  async function add() {
    const { error } = await supabase.from('pr_movements').insert({ name: f.name.trim(), category: f.category, unit: f.unit })
    if (error) return toast.error(errMsg(error).includes('duplicate') ? 'Ya existe un movimiento con ese nombre' : errMsg(error))
    setF({ ...f, name: '' }); load()
  }
  async function remove(m: Movement) {
    if (!confirm(`¿Borrar «${m.name}» y todas sus marcas?`)) return
    await supabase.from('pr_movements').delete().eq('id', m.id); load()
  }

  if (error?.includes('pr_movements')) return <p className="text-sm text-muted-foreground">Falta activar las marcas en el servidor (016-wods-marcas-feed.sql).</p>

  return (
    <div>
      <PageHeader title="Marcas (PRs)" description="Tus socios apuntan sus marcas desde GymLog y compiten en el ranking del centro">
        {movs.length === 0 && <Button onClick={seed}><Sparkles className="h-4 w-4" strokeWidth={1.5} /> Añadir movimientos típicos</Button>}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside className="space-y-4">
          {(Object.keys(CATEGORY_LABEL) as Movement['category'][]).map((cat) => {
            const list = movs.filter((m) => m.category === cat)
            if (!list.length) return null
            return (
              <div key={cat}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{CATEGORY_LABEL[cat]}</div>
                <ul className="space-y-0.5">
                  {list.map((m) => (
                    <li key={m.id} className="flex items-center group">
                      <button onClick={() => setSel(m.id)} className={cn('flex-1 text-left px-3 h-9 rounded-md text-sm', current?.id === m.id ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground')}>{m.name}</button>
                      <button onClick={() => remove(m)} className="opacity-0 group-hover:opacity-100 h-9 w-8 text-muted-foreground hover:text-destructive" aria-label="Borrar"><Trash2 className="h-3.5 w-3.5 mx-auto" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="text-sm font-medium">Nuevo movimiento</div>
            <Input placeholder="Ej. Overhead Squat" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <div className="flex gap-2">
              <Select value={f.category} onValueChange={(v) => setF({ ...f, category: v as Movement['category'] })}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(CATEGORY_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={f.unit} onValueChange={(v) => setF({ ...f, unit: v as Movement['unit'] })}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="tiempo">tiempo</SelectItem><SelectItem value="reps">reps</SelectItem><SelectItem value="metros">metros</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full" variant="outline" onClick={add} disabled={!f.name.trim()}><Plus className="h-4 w-4" /> Añadir</Button>
          </div>
        </aside>

        <section>
          {!current ? <div className="rounded-lg border border-border bg-card p-8 text-sm text-muted-foreground text-center">Añade los movimientos típicos o crea los tuyos.</div> : (
            <>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><Trophy className="h-5 w-5 text-yellow-400" strokeWidth={1.5} />{current.name}
                <span className="text-sm text-muted-foreground font-normal">· {current.unit === 'tiempo' ? 'menos tiempo es mejor' : `más ${current.unit} es mejor`}</span></h2>
              <div className="rounded-lg border border-border bg-card overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-12">#</TableHead><TableHead>Socio</TableHead><TableHead>Marca</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={r.user_id}>
                        <TableCell className="font-semibold">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</TableCell>
                        <TableCell>{r.display_name}</TableCell>
                        <TableCell className="font-medium">{fmtMark(r.value, current.unit)} {r.rx ? <Badge variant="outline" className="ml-1 border-lime-500/40 text-lime-400">RX</Badge> : <Badge variant="outline" className="ml-1 text-muted-foreground">Scaled</Badge>}</TableCell>
                        <TableCell className="text-muted-foreground">{fmtDay(r.done_on)}</TableCell>
                      </TableRow>
                    ))}
                    {rows.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground">Nadie ha apuntado esta marca todavía.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
