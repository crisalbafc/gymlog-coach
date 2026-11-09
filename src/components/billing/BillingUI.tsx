// Adaptado de FitBox (components/members/MembershipBadge, CreditsBadge, AssignPlanDialog, PaymentDialog)
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { errMsg, isoDay } from '@/lib/data'
import { METHOD_LABEL, STATUS_LABEL, eur, type MemberPlanRow, type Payment, type Plan } from '@/lib/billing'

export function MembershipBadge({ status }: { status: MemberPlanRow['status'] }) {
  const cls = {
    activa: 'border-lime-500/40 text-lime-400',
    expira_pronto: 'border-amber-500/40 text-amber-400',
    expirada: 'border-red-500/40 text-red-400',
    cancelada: 'text-muted-foreground',
    sin_plan: 'text-muted-foreground',
  }[status]
  return <Badge variant="outline" className={cls}>{STATUS_LABEL[status]}</Badge>
}

export function CreditsBadge({ row }: { row: Pick<MemberPlanRow, 'plan_type' | 'credits_left' | 'credits' | 'status'> }) {
  if (row.plan_type !== 'creditos' || row.status === 'sin_plan') return null
  const low = (row.credits_left ?? 0) <= 1
  return <Badge variant="outline" className={low ? 'border-amber-500/40 text-amber-400' : ''}>{row.credits_left ?? 0}/{row.credits} créditos</Badge>
}

export function AssignPlanDialog({ open, clientName, clientId, plans, onClose, onDone }: {
  open: boolean; clientName: string; clientId: string | null; plans: Plan[]; onClose: () => void; onDone: () => void
}) {
  const active = plans.filter((p) => p.active)
  const [plan, setPlan] = useState('')
  const [start, setStart] = useState(isoDay())
  const [pay, setPay] = useState(true)
  const [method, setMethod] = useState<Payment['method']>('efectivo')
  useEffect(() => { if (open) { setPlan(active[0]?.id || ''); setStart(isoDay()); setPay(true) } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = plans.find((p) => p.id === plan)

  async function save() {
    if (!clientId || !plan) return
    const { data, error } = await supabase.rpc('assign_plan', { p_client: clientId, p_plan: plan, p_start: start })
    if (error) return toast.error(errMsg(error))
    if (pay && chosen && chosen.price > 0) {
      const { error: e2 } = await supabase.from('payments').insert({ client_id: clientId, membership_id: data, amount: chosen.price, method })
      if (e2) toast.error(errMsg(e2))
    }
    toast.success('Plan asignado'); onDone(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar plan</DialogTitle>
          <DialogDescription>{clientName}. Si ya tenía un plan activo, se cierra y empieza este.</DialogDescription>
        </DialogHeader>
        {active.length === 0 ? <p className="text-sm text-muted-foreground">Crea antes algún plan en «Planes y pagos → Planes».</p> : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{active.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {eur(p.price)}/mes{p.type === 'creditos' ? ` · ${p.credits} clases` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label htmlFor="st">Empieza el</Label><Input id="st" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            {chosen && chosen.price > 0 && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm flex-1">
                  <input type="checkbox" checked={pay} onChange={(e) => setPay(e.target.checked)} className="h-4 w-4 accent-lime-400" />
                  Registrar el pago de {eur(chosen.price)}
                </label>
                {pay && (
                  <Select value={method} onValueChange={(v) => setMethod(v as Payment['method'])}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(METHOD_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button onClick={save} disabled={!plan}>Asignar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function PaymentDialog({ open, clientName, clientId, membershipId, defaultAmount, onClose, onDone }: {
  open: boolean; clientName: string; clientId: string | null; membershipId?: string | null; defaultAmount?: number | null
  onClose: () => void; onDone: () => void
}) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Payment['method']>('efectivo')
  const [date, setDate] = useState(isoDay())
  const [notes, setNotes] = useState('')
  useEffect(() => { if (open) { setAmount(defaultAmount ? String(defaultAmount) : ''); setMethod('efectivo'); setDate(isoDay()); setNotes('') } }, [open, defaultAmount])

  async function save() {
    if (!clientId) return
    const { error } = await supabase.from('payments').insert({
      client_id: clientId, membership_id: membershipId || null, amount: Number(amount.replace(',', '.')) || 0, method, paid_on: date, notes: notes.trim() || null,
    })
    if (error) return toast.error(errMsg(error))
    toast.success('Pago registrado'); onDone(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Registrar pago</DialogTitle><DialogDescription>{clientName}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="am">Importe (€)</Label><Input id="am" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="pd">Fecha</Label><Input id="pd" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Forma de pago</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Payment['method'])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(METHOD_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label htmlFor="no">Nota (opcional)</Label><Input id="no" placeholder="Ej. mensualidad de marzo" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={!(Number(amount.replace(',', '.')) > 0)}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
