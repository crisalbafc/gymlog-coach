import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { errMsg } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/** Primera vez en GymLog Coach: crear mi centro o unirme al equipo de uno. */
export default function BecomeCoach({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function create(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.rpc('become_coach', { p_name: name })
    setBusy(false)
    if (error) return setError(errMsg(error).includes('become_coach') ? 'El servidor aún no tiene activado el modo entrenador.' : errMsg(error))
    onDone()
  }
  async function join(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.rpc('join_center_staff', { p_code: code })
    setBusy(false)
    if (error) return setError(errMsg(error).includes('no válido') ? 'Ese código de equipo no existe. Pídeselo al administrador del centro.' : errMsg(error))
    onDone()
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6">
        <Tabs defaultValue="crear">
          <TabsList className="w-full mb-5">
            <TabsTrigger value="crear" className="flex-1">Crear mi centro</TabsTrigger>
            <TabsTrigger value="unirme" className="flex-1">Tengo un código de equipo</TabsTrigger>
          </TabsList>

          <TabsContent value="crear">
            <form onSubmit={create} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para dueños de centro o entrenadores por libre. Recibirás un <b>código para tus socios</b>: lo meterán en GymLog (Ajustes → Mi entrenador).
              </p>
              <div className="space-y-2">
                <Label htmlFor="name">Tu nombre (lo verán tus clientes)</Label>
                <Input id="name" required placeholder="Ej. Cristóbal · Entrenador personal" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy || !name.trim()}>{busy ? 'Creando…' : 'Crear mi centro'}</Button>
            </form>
          </TabsContent>

          <TabsContent value="unirme">
            <form onSubmit={join} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Si trabajas en un centro que ya usa GymLog Coach, pide al administrador el <b>código de equipo</b> (empieza por «T»).
              </p>
              <div className="space-y-2">
                <Label htmlFor="code">Código de equipo</Label>
                <Input id="code" required placeholder="Ej. T1A2B3C" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={7} />
              </div>
              <Button type="submit" className="w-full" disabled={busy || code.trim().length < 7}>{busy ? 'Uniéndote…' : 'Unirme al equipo'}</Button>
            </form>
          </TabsContent>
        </Tabs>
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        <Button variant="ghost" className="w-full mt-3" onClick={() => supabase.auth.signOut()}>Salir</Button>
      </div>
    </div>
  )
}
