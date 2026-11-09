import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { errMsg } from '@/lib/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (error) setError(errMsg(error))
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="./icon-192.png" alt="" className="h-14 w-14 rounded-xl" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">GymLog Coach</h1>
          <p className="mt-1 text-sm text-muted-foreground text-center">Panel del entrenador. Entra con tu cuenta de GymLog.</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pw">Contraseña</Label>
            <Input id="pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          ¿No tienes cuenta? Créala en la app <a className="underline" href="https://crisalbafc.github.io/gym-app/">GymLog</a> y vuelve aquí.
        </p>
      </div>
    </div>
  )
}
