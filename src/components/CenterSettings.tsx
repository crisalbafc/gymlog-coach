import { useState } from 'react'
import { toast } from 'sonner'
import { Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { errMsg, type Coach } from '@/lib/data'
import { CENTER_TYPES, FITBOX_MODULES, MODULES, centerOf, type CenterType, type ModuleId } from '@/lib/centers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/** Ajustes > Tu centro: tipo de centro y módulos activos. */
export function CenterSettings({ coach, onChange }: { coach: Coach; onChange: () => void }) {
  const current = centerOf(coach)
  const [name, setName] = useState(coach.center_name || '')
  const [type, setType] = useState<CenterType>(current.type)
  const [modules, setModules] = useState<ModuleId[]>(current.modules)
  const cfg = CENTER_TYPES[type]
  const ready = 'center_type' in coach

  // Al cambiar de tipo se aplica al momento con sus módulos por defecto
  async function pickType(t: CenterType) {
    setType(t)
    setModules(CENTER_TYPES[t].modules)
    const { error } = await supabase.rpc('update_center', { p_name: name, p_type: t, p_modules: CENTER_TYPES[t].modules })
    if (error) return toast.error(errMsg(error))
    toast.success(`Ahora tu centro es: ${CENTER_TYPES[t].label}`); onChange()
  }
  async function save() {
    const { error } = await supabase.rpc('update_center', { p_name: name, p_type: type, p_modules: modules })
    if (error) return toast.error(errMsg(error))
    toast.success('Centro guardado'); onChange()
  }
  const menuPreview = [
    'Panel',
    ...(modules.includes('clases') ? ['Clases'] : []),
    cfg.people,
    ...(modules.includes('grupos') ? ['Grupos'] : []),
    ...(modules.includes('pagos') ? ['Pagos'] : []),
    ...(modules.includes('wods') ? ['WOD'] : []),
    ...(modules.includes('prs') ? ['Marcas'] : []),
    ...(modules.includes('feed') ? ['Novedades'] : []),
    'Ajustes',
  ]

  if (!ready) {
    return <section className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Falta activar los tipos de centro en el servidor (013-centros-grupos.sql).</section>
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6 space-y-5">
      <h2 className="font-semibold">Tu centro</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cn">Nombre del centro</Label>
          <Input id="cn" placeholder="Ej. Estudio Fuerza Norte" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tipo de centro</Label>
          <Select value={type} onValueChange={(v) => pickType(v as CenterType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CENTER_TYPES) as CenterType[]).map((t) => <SelectItem key={t} value={t}>{CENTER_TYPES[t].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{cfg.description}</p>
      <div className="rounded-md bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Menú:</span> {menuPreview.join(' · ')}
      </div>

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">Módulos</div>
        {MODULES.map((m) => (
          <label key={m.id} className="flex items-start justify-between gap-4 cursor-pointer">
            <span>
              <span className="block text-sm font-medium">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.description}</span>
            </span>
            <Switch checked={modules.includes(m.id)} onCheckedChange={(on) => setModules((l) => on ? [...l, m.id] : l.filter((x) => x !== m.id))} />
          </label>
        ))}
      </div>

      {cfg.fitbox && FITBOX_MODULES.length > 0 && (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2">
          <Info className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span>Para este tipo de centro también se usan los módulos de FitBox: {FITBOX_MODULES.join(', ')}. Se integrarán aquí más adelante.</span>
        </div>
      )}
      <Button onClick={save} disabled={modules.length === 0}>Guardar nombre y módulos</Button>
    </section>
  )
}
