import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { errMsg, type Coach } from '@/lib/data'
import { PageHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { inviteText } from './Dashboard'
import { CenterSettings } from '@/components/CenterSettings'

export default function SettingsPage({ coach, onChange }: { coach: Coach; onChange: () => void }) {
  const [name, setName] = useState(coach.name)

  async function save() {
    const { error } = await supabase.rpc('become_coach', { p_name: name })
    if (error) return toast.error(errMsg(error))
    toast.success('Guardado'); onChange()
  }

  return (
    <div className="max-w-xl space-y-8">
      <PageHeader title="Ajustes" />
      <CenterSettings coach={coach} onChange={onChange} />
      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Tu código de entrenador</h2>
        <div className="text-3xl font-semibold tracking-[0.2em] text-brand">{coach.coach_code}</div>
        <p className="text-sm text-muted-foreground">Tus clientes lo meten en GymLog → Ajustes → Mi entrenador, y eligen qué compartir contigo (entrenos, dieta, peso, fotos). Pueden desconectarse cuando quieran.</p>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(inviteText(coach)); toast.success('Invitación copiada') }}>
          <Copy className="h-4 w-4" strokeWidth={1.5} /> Copiar invitación para WhatsApp
        </Button>
      </section>
      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Tu nombre como entrenador</h2>
        <div className="space-y-2">
          <Label htmlFor="n">Lo ven tus clientes en GymLog y en tus mensajes</Label>
          <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={save} disabled={!name.trim() || name === coach.name}>Guardar</Button>
      </section>
      <section className="rounded-lg border border-border bg-card p-6 space-y-2 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Privacidad</h2>
        <p>Solo ves lo que cada cliente decide compartir. Tus notas son privadas: el cliente no las ve. Trata estos datos con cuidado: incluyen información de salud.</p>
      </section>
    </div>
  )
}
