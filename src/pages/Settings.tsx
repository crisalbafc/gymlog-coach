import { useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { errMsg, isAdmin, type Coach } from '@/lib/data'
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
      {isAdmin(coach) && <CenterSettings coach={coach} onChange={onChange} />}
      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Tu código de entrenador</h2>
        <div className="text-3xl font-semibold tracking-[0.2em] text-brand">{coach.coach_code}</div>
        <p className="text-sm text-muted-foreground">Tus clientes lo meten en GymLog → Ajustes → Mi entrenador, y eligen qué compartir contigo (entrenos, dieta, peso, fotos). Pueden desconectarse cuando quieran.</p>
        <Button variant="outline" onClick={() => { navigator.clipboard.writeText(inviteText(coach)); toast.success('Invitación copiada') }}>
          <Copy className="h-4 w-4" strokeWidth={1.5} /> Copiar invitación para WhatsApp
        </Button>
      </section>
      {coach.my_role && coach.my_role !== 'dueño' && (
        <section className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h2 className="font-semibold">Tu equipo</h2>
          <p className="text-sm text-muted-foreground">Trabajas en <b className="text-foreground">{coach.center_name || coach.name}</b> como <b className="text-foreground">{coach.my_role}</b>. Tu nombre es el de tu perfil de GymLog.</p>
          <Button variant="outline" className="text-destructive" onClick={async () => {
            if (!confirm('¿Salir de este centro? Dejarás de ver sus socios y clases.')) return
            const { data: { user } } = await supabase.auth.getUser()
            const { error } = await supabase.rpc('remove_staff', { p_user: user?.id })
            if (error) return toast.error(errMsg(error))
            onChange()
          }}>Salir del equipo</Button>
        </section>
      )}
      {(!coach.my_role || coach.my_role === 'dueño') && <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Tu nombre como entrenador</h2>
        <div className="space-y-2">
          <Label htmlFor="n">Lo ven tus clientes en GymLog y en tus mensajes</Label>
          <Input id="n" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Button onClick={save} disabled={!name.trim() || name === coach.name}>Guardar</Button>
      </section>}
      <section className="rounded-lg border border-border bg-card p-6 space-y-2 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Privacidad</h2>
        <p>Solo ves lo que cada cliente decide compartir. Tus notas son privadas: el cliente no las ve. Trata estos datos con cuidado: incluyen información de salud.</p>
      </section>
    </div>
  )
}
