// Adaptado de FitBox (components/classes/SessionDetailSheet + sessionDetail/*)
import { useEffect, useState } from 'react'
import { Check, X, UserPlus, Ban, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { OccupancyBar } from './ClassUI'
import { errMsg, type ClientRow } from '@/lib/data'
import { hhmm, type Booking, type ClassSession } from '@/lib/classes'

export function SessionSheet({ session, bookings, clients, onClose, onChange }: {
  session: ClassSession | null; bookings: Booking[]; clients: ClientRow[]; onClose: () => void; onChange: () => void
}) {
  const [adding, setAdding] = useState('')
  useEffect(() => setAdding(''), [session?.id])
  if (!session) return null

  const name = (id: string) => clients.find((c) => c.client_id === id)?.display_name || 'Socio'
  const mine = bookings.filter((b) => b.session_id === session.id)
  const confirmed = mine.filter((b) => b.status === 'confirmada').sort((a, b) => a.created_at.localeCompare(b.created_at))
  const waiting = mine.filter((b) => b.status === 'espera').sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const candidates = clients.filter((c) => c.status === 'activo' && !mine.some((b) => b.user_id === c.client_id))
  const cancelled = session.status === 'cancelada'
  const past = new Date(session.starts_at).getTime() < Date.now()

  const run = async (p: PromiseLike<{ error: unknown }>, ok?: string) => {
    const { error } = await p
    if (error) return toast.error(errMsg(error))
    if (ok) toast.success(ok)
    onChange()
  }

  return (
    <Sheet open={!!session} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: session.color }} />{session.name}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
            {new Date(session.starts_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {hhmm(session.starts_at)} · {session.duration_min} min
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-5">
          {cancelled ? <p className="text-sm text-red-400">Esta clase está cancelada.</p> : (
            <div className="space-y-1">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Ocupación</span><span className="font-medium">{confirmed.length}/{session.capacity}</span></div>
              <OccupancyBar confirmed={confirmed.length} capacity={session.capacity} />
            </div>
          )}

          <section>
            <h3 className="text-sm font-medium mb-2">Apuntados ({confirmed.length})</h3>
            <ul className="space-y-1">
              {confirmed.map((b) => (
                <li key={b.id} className="flex items-center gap-2 rounded-md border border-border px-3 h-11">
                  <span className="flex-1 text-sm truncate">{name(b.user_id)}</span>
                  <Button size="sm" variant={b.checked_in_at ? 'default' : 'outline'} className="h-8"
                    onClick={() => run(supabase.rpc('coach_checkin', { p_booking: b.id, p_on: !b.checked_in_at }))}>
                    <Check className="h-3.5 w-3.5" /> {b.checked_in_at ? 'Ha venido' : 'Asistencia'}
                  </Button>
                  {!cancelled && <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Quitar"
                    onClick={() => confirm(`¿Quitar a ${name(b.user_id)} de la clase?`) && run(supabase.rpc('coach_cancel_booking', { p_booking: b.id }), 'Reserva quitada')}>
                    <X className="h-4 w-4" /></Button>}
                </li>
              ))}
              {confirmed.length === 0 && <li className="text-sm text-muted-foreground">Nadie apuntado todavía.</li>}
            </ul>
          </section>

          {waiting.length > 0 && (
            <section>
              <h3 className="text-sm font-medium mb-2">Lista de espera ({waiting.length})</h3>
              <ul className="space-y-1">
                {waiting.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 rounded-md border border-border px-3 h-10 text-sm">
                    <span className="text-muted-foreground w-6">{b.position}.</span>
                    <span className="flex-1 truncate">{name(b.user_id)}</span>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Quitar de la lista"
                      onClick={() => run(supabase.rpc('coach_cancel_booking', { p_booking: b.id }))}><X className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-1">Si alguien cancela, pasa el primero automáticamente y le llega un aviso.</p>
            </section>
          )}

          {!cancelled && !past && (
            <section className="flex gap-2">
              <Select value={adding} onValueChange={setAdding}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Apuntar a un socio…" /></SelectTrigger>
                <SelectContent>{candidates.map((c) => <SelectItem key={c.client_id} value={c.client_id}>{c.display_name}</SelectItem>)}</SelectContent>
              </Select>
              <Button disabled={!adding} onClick={async () => {
                const { data, error } = await supabase.rpc('coach_add_attendee', { p_session: session.id, p_client: adding })
                if (error) return toast.error(errMsg(error))
                toast.success(data === 'espera' ? 'Clase llena: añadido a la lista de espera' : 'Apuntado'); setAdding(''); onChange()
              }}><UserPlus className="h-4 w-4" strokeWidth={1.5} /></Button>
            </section>
          )}

          {!cancelled && (
            <>
              <Separator />
              <Button variant="ghost" className="text-destructive" onClick={() => {
                if (!confirm('¿Cancelar esta clase? Se avisará a todos los apuntados.')) return
                run(supabase.rpc('coach_cancel_session', { p_session: session.id }), 'Clase cancelada y socios avisados')
              }}><Ban className="h-4 w-4" strokeWidth={1.5} /> Cancelar clase</Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
