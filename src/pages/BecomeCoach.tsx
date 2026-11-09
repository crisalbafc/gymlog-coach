import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { errMsg } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function BecomeCoach({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.rpc('become_coach', { p_name: name })
    setBusy(false)
    if (error) return setError(errMsg(error).includes('become_coach') ? 'El servidor aún no tiene activado el modo entrenador.' : errMsg(error))
    onDone()
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-background">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-semibold tracking-tight">Activa tu cuenta de entrenador</h1>
        <p className="text-sm text-muted-foreground">
          Recibirás un <b>código de entrenador</b>. Tus clientes lo meterán en GymLog (Ajustes → Mi entrenador) y elegirán qué datos compartir contigo.
        </p>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre que verán tus clientes</Label>
          <Input id="name" required placeholder="Ej. Cristóbal · Entrenador personal" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => supabase.auth.signOut()}>Salir</Button>
          <Button type="submit" className="flex-1" disabled={busy || !name.trim()}>{busy ? 'Activando…' : 'Activar'}</Button>
        </div>
      </form>
    </div>
  )
}
