import { useCallback, useEffect, useState } from 'react'
import { Copy, RefreshCw, UserMinus, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { errMsg, fmtDay, type Coach } from '@/lib/data'

type Member = { user_id: string; display_name: string | null; email: string; role: 'dueño' | 'admin' | 'entrenador'; since: string }

/** Equipo del centro: invitar entrenadores, roles y quitar. */
export default function Team({ coach }: { coach: Coach }) {
  const [team, setTeam] = useState<Member[] | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [t, c] = await Promise.all([supabase.rpc('center_team'), supabase.rpc('get_staff_code', { p_new: false })])
    if (t.error) return setError(errMsg(t.error))
    setTeam((t.data as Member[]) || []); setCode((c.data as string) || null)
  }, [])
  useEffect(() => { load() }, [load])

  const invite = code ? `¡Hola! Únete al equipo de ${coach.center_name || coach.name} en GymLog Coach:\n1. Crea tu cuenta en https://crisalbafc.github.io/gymlog/ (si no la tienes)\n2. Entra en https://crisalbafc.github.io/gymlog-coach/\n3. Pulsa «Tengo un código de equipo» y mete: ${code}` : ''

  async function newCode() {
    if (!confirm('¿Cambiar el código? El anterior dejará de funcionar (los que ya están en el equipo siguen).')) return
    const { data, error } = await supabase.rpc('get_staff_code', { p_new: true })
    if (error) return toast.error(errMsg(error))
    setCode(data as string); toast.success('Código nuevo creado')
  }
  async function setRole(m: Member, role: string) {
    const { error } = await supabase.rpc('set_staff_role', { p_user: m.user_id, p_role: role })
    if (error) return toast.error(errMsg(error))
    toast.success('Rol actualizado'); load()
  }
  async function remove(m: Member) {
    if (!confirm(`¿Quitar a ${m.display_name || m.email} del equipo? Dejará de ver los datos del centro.`)) return
    const { error } = await supabase.rpc('remove_staff', { p_user: m.user_id })
    if (error) return toast.error(errMsg(error))
    load()
  }

  if (error) return <p className="text-sm text-muted-foreground">{error.includes('center_team') ? 'Falta activar los equipos en el servidor (017-equipo.sql).' : error}</p>

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title="Equipo" description="Entrenadores que trabajan en tu centro" />

      <section className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Invitar a un entrenador</h2>
        <div className="text-3xl font-semibold tracking-[0.2em] text-brand">{code || '…'}</div>
        <p className="text-sm text-muted-foreground">
          Es el <b>código de equipo</b> (distinto del código para socios). El entrenador entra en GymLog Coach con su propia cuenta y pulsa «Tengo un código de equipo».
          Verá los socios, clases, grupos y rutinas del centro. Los pagos, el equipo y los ajustes del centro solo los ven los administradores.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!code} onClick={() => { navigator.clipboard.writeText(invite); toast.success('Invitación copiada') }}><Copy className="h-4 w-4" /> Copiar invitación</Button>
          <Button variant="ghost" onClick={newCode}><RefreshCw className="h-4 w-4" /> Cambiar código</Button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Equipo ({team?.length ?? 0})</h2>
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Rol</TableHead><TableHead>Desde</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {team?.map((m) => (
                <TableRow key={m.user_id}>
                  <TableCell><div className="font-medium">{m.display_name || 'Sin nombre'}</div><div className="text-xs text-muted-foreground">{m.email}</div></TableCell>
                  <TableCell>
                    {m.role === 'dueño' ? <Badge variant="outline" className="border-amber-500/40 text-amber-400"><Crown className="h-3 w-3 mr-1" />Dueño</Badge> : (
                      <Select value={m.role} onValueChange={(v) => setRole(m, v)}>
                        <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="entrenador">Entrenador</SelectItem><SelectItem value="admin">Administrador</SelectItem></SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmtDay(m.since, { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell className="text-right">{m.role !== 'dueño' && <Button variant="ghost" size="sm" onClick={() => remove(m)}><UserMinus className="h-4 w-4" /></Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Administrador: puede ver pagos, gestionar el equipo y cambiar los ajustes del centro.</p>
      </section>
    </div>
  )
}
