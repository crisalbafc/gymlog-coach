import { useCallback, useEffect, useState } from 'react'
import { Receipt, CreditCard, RefreshCw, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AssignPlanDialog, CreditsBadge, MembershipBadge, PaymentDialog } from '@/components/billing/BillingUI'
import { errMsg, fmtDay, type ClientRow } from '@/lib/data'
import { METHOD_LABEL, eur, loadMemberPlans, loadPayments, loadPlans, type MemberPlanRow, type Payment, type Plan } from '@/lib/billing'

/** Ficha del socio > Plan y pagos (como las pestañas Membresía y Pagos de FitBox). */
export function BillingTab({ client }: { client: ClientRow }) {
  const [row, setRow] = useState<MemberPlanRow | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [assign, setAssign] = useState(false)
  const [pay, setPay] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [r, p, pay] = await Promise.all([loadMemberPlans(), loadPlans(), loadPayments(client.client_id)])
      setRow(r.find((x) => x.client_id === client.client_id) || null); setPlans(p); setPayments(pay)
    } catch (e) { setError(errMsg(e)) }
  }, [client.client_id])
  useEffect(() => { load() }, [load])

  async function renew() {
    if (!row?.membership_id) return
    const { error } = await supabase.rpc('renew_membership', { p_membership: row.membership_id, p_amount: row.price || null, p_method: 'efectivo' })
    if (error) return toast.error(errMsg(error))
    toast.success(`Renovado un mes${row.price ? ` y registrado el pago de ${eur(row.price)}` : ''}`); load()
  }
  async function cancel() {
    if (!row?.membership_id || !confirm('¿Cancelar el plan de este socio?')) return
    await supabase.rpc('cancel_membership', { p_membership: row.membership_id }); load()
  }

  if (error) return <p className="text-sm text-muted-foreground">{error.includes('coach_memberships') ? 'Falta activar los planes en el servidor (015-planes-pagos.sql).' : error}</p>

  return (
    <div className="space-y-6 max-w-3xl">
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          <h2 className="font-semibold mr-auto">{row?.plan_name || 'Sin plan'}</h2>
          {row && <MembershipBadge status={row.status} />}
          {row && <CreditsBadge row={row} />}
        </div>
        {row?.membership_id && (
          <p className="mt-2 text-sm text-muted-foreground">
            {eur(row.price)}/mes · del {fmtDay(row.start_date!)} al {fmtDay(row.end_date!, { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => setAssign(true)}>{row?.membership_id ? 'Cambiar plan' : 'Asignar plan'}</Button>
          {row?.membership_id && row.status !== 'cancelada' && <Button variant="outline" onClick={renew}><RefreshCw className="h-4 w-4" /> Renovar 1 mes{row.price ? ` (${eur(row.price)})` : ''}</Button>}
          <Button variant="outline" onClick={() => setPay(true)}><Receipt className="h-4 w-4" /> Registrar pago</Button>
          {row?.membership_id && row.status !== 'cancelada' && <Button variant="ghost" className="text-destructive" onClick={cancel}><XCircle className="h-4 w-4" /> Cancelar plan</Button>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Pagos</h2>
        <div className="rounded-lg border border-border bg-card overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Forma</TableHead><TableHead>Nota</TableHead><TableHead className="text-right">Importe</TableHead></TableRow></TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{fmtDay(p.paid_on, { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell>{METHOD_LABEL[p.method]}</TableCell>
                  <TableCell className="text-muted-foreground">{p.notes || ''}</TableCell>
                  <TableCell className="text-right font-medium">{eur(p.amount)}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground">Sin pagos todavía.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>

      <AssignPlanDialog open={assign} clientId={client.client_id} clientName={client.display_name} plans={plans} onClose={() => setAssign(false)} onDone={load} />
      <PaymentDialog open={pay} clientId={client.client_id} clientName={client.display_name} membershipId={row?.membership_id}
        defaultAmount={row?.price} onClose={() => setPay(false)} onDone={load} />
    </div>
  )
}
