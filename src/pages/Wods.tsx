// Adaptado de FitBox (routes/... WODs + components/wods/WodEditor, WodViewer)
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Save, Eye, EyeOff, Megaphone } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errMsg, isoDay } from '@/lib/data'

export type WodBlock = { type: 'calentamiento' | 'fuerza' | 'metcon' | 'accesorio'; content: string }
export type Wod = { id: string; day: string; title: string; blocks: WodBlock[]; published: boolean }
export const BLOCK_LABEL: Record<WodBlock['type'], string> = { calentamiento: 'Calentamiento', fuerza: 'Fuerza', metcon: 'MetCon', accesorio: 'Accesorio' }

const shift = (day: string, n: number) => { const d = new Date(day + 'T12:00:00'); d.setDate(d.getDate() + n); return isoDay(d) }

export default function Wods() {
  const [day, setDay] = useState(isoDay())
  const [wod, setWod] = useState<Wod | null>(null)
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<WodBlock[]>([])
  const [published, setPublished] = useState(true)
  const [week, setWeek] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('wods').select('*').eq('day', day).maybeSingle()
    if (error) return setError(errMsg(error))
    const w = data as Wod | null
    setWod(w); setTitle(w?.title || ''); setBlocks(w?.blocks || [{ type: 'calentamiento', content: '' }, { type: 'fuerza', content: '' }, { type: 'metcon', content: '' }])
    setPublished(w?.published ?? true)
    const { data: ws } = await supabase.from('wods').select('day,title').gte('day', shift(day, -3)).lte('day', shift(day, 7))
    setWeek(Object.fromEntries(((ws as { day: string; title: string }[]) || []).map((x) => [x.day, x.title])))
  }, [day])
  useEffect(() => { load() }, [load])

  async function save(notify = false) {
    const row = { day, title: title.trim(), blocks: blocks.filter((b) => b.content.trim()), published }
    const { error } = wod ? await supabase.from('wods').update(row).eq('id', wod.id) : await supabase.from('wods').insert(row)
    if (error) return toast.error(errMsg(error))
    if (notify && published) {
      const { data } = await supabase.rpc('notify_members', { p_title: `🔥 WOD del ${new Date(day + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}`, p_body: row.title })
      toast.success(`WOD guardado y aviso enviado a ${data ?? 0} socios`)
    } else toast.success('WOD guardado')
    load()
  }
  async function remove() {
    if (!wod || !confirm('¿Borrar el WOD de este día?')) return
    await supabase.from('wods').delete().eq('id', wod.id); load()
  }

  if (error?.includes('wods')) return <p className="text-sm text-muted-foreground">Falta activar los WODs en el servidor (016-wods-marcas-feed.sql).</p>

  return (
    <div className="max-w-3xl">
      <PageHeader title="WOD del día" description="Lo que verán tus socios en la app" />

      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="icon" onClick={() => setDay(shift(day, -1))} aria-label="Día anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" onClick={() => setDay(shift(day, 1))} aria-label="Día siguiente"><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" onClick={() => setDay(isoDay())}>Hoy</Button>
        <Input type="date" className="w-44" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-4">
        {Array.from({ length: 11 }, (_, i) => shift(day, i - 3)).map((d) => (
          <button key={d} onClick={() => setDay(d)} title={week[d] || 'Sin WOD'}
            className={`shrink-0 h-12 w-14 rounded-md border text-xs flex flex-col items-center justify-center ${d === day ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}>
            <span>{new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' })}</span>
            <span className="font-semibold">{new Date(d + 'T12:00:00').getDate()}</span>
            <span className={`h-1 w-1 rounded-full ${week[d] ? 'bg-brand' : 'bg-transparent'}`} />
          </button>
        ))}
      </div>

      <section className="rounded-lg border border-border bg-card p-6 space-y-5">
        <div className="space-y-2"><Label htmlFor="wt">Título</Label><Input id="wt" placeholder='Ej. "Fuerza + Chipper"' value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        {blocks.map((b, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Select value={b.type} onValueChange={(v) => setBlocks((l) => l.map((x, j) => (j === i ? { ...x, type: v as WodBlock['type'] } : x)))}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(BLOCK_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={() => setBlocks((l) => l.filter((_, j) => j !== i))} aria-label="Quitar bloque"><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea rows={4} placeholder={b.type === 'metcon' ? 'Ej. AMRAP 12 min:\n10 thrusters 40/30 kg\n10 pull-ups\n200 m run' : 'Escribe el bloque…'}
              value={b.content} onChange={(e) => setBlocks((l) => l.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))} />
          </div>
        ))}
        <Button variant="outline" onClick={() => setBlocks((l) => [...l, { type: 'accesorio', content: '' }])}><Plus className="h-4 w-4" /> Añadir bloque</Button>
        <label className="flex items-center justify-between">
          <span className="text-sm flex items-center gap-2">{published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{published ? 'Visible para los socios' : 'Borrador (solo tú lo ves)'}</span>
          <Switch checked={published} onCheckedChange={setPublished} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save()} disabled={!title.trim()}><Save className="h-4 w-4" /> Guardar</Button>
          <Button variant="outline" onClick={() => save(true)} disabled={!title.trim() || !published}><Megaphone className="h-4 w-4" /> Guardar y avisar a los socios</Button>
          {wod && <Button variant="ghost" className="text-destructive ml-auto" onClick={remove}><Trash2 className="h-4 w-4" /> Borrar</Button>}
        </div>
      </section>
    </div>
  )
}
