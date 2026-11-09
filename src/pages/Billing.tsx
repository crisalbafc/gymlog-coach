import { useCallback, useEffect, useMemo, useState } from 'react'
import { Euro, UserCheck, AlertTriangle, UserX, Plus, Pencil, RefreshCw, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { PageHeader, KpiCard } from '@/components/layout/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AssignPlanDialog, CreditsBadge, MembershipBadge, PaymentDialog } from '@/components/billing/BillingUI'
import { errMsg, fmtDay, loadClients, type ClientRow, type Coach } from '@/lib/data'
import { METHOD_LABEL, eur, loadMemberPlans, loadPayments, loadPlans, type MemberPlanRow, type Payment, type Plan } from '@/lib/billing'
import { navigate } from '@/lib/router'

export default function Billing({ coach, onCoachChange }: { coach: Coach & { require_plan?: boolean }; onCoachChange: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [rows, setRows] = useState<MemberPlanRow[] | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [assignFor, setAssignFor] = useState<string | null>(null)
  const [payFor, setPayFor] = useState<MemberPlanRow | null>(null)
  const [editPlan, setEditPlan] = useState<Plan | 'new' | null>(null)

  const load = useCallback(async () => {
    try {
      const [p, r, pay, c] = await Promise.all([loadPlans(), loadMemberPlans(), loadPayments(), loadClients()])
      setPlans(p); setRows(r); setPayments(pay); setClients(c)
    } catch (e) { setError(errMsg(e)) }
  }, [])
  useEffect(() => { load() }, [load])

  const name = (id: string) => clients.find((c) => c.client_id === id)?.display_name || 'Socio'
  const month = new Date().toISOString().slice(0, 7)
  const income = payments.filter((p) => p.paid_on.startsWith(month)).reduce((s, p) => s + Number(p.amount), 0)
  const counts = useMemo(() => {
    const r = rows || []
    return { activa: r.filter((x) => x.status === 'activa').length, pronto: r.filter((x) => x.status === 'expira_pronto').length,
      sin: r.filter((x) => ['sin_plan', 'expirada', 'cancelada'].includes(x.status)).length }
  }, [rows])

  async function renew(r: MemberPlanRow) {
    if (!r.membership_id) return
    const amount = prompt(`Renovar «${r.plan_name}» de ${name(r.client_id)} un mes más.\n\nImporte cobrado (déjalo vacío si no ha pagado):`, String(r.price ?? ''))
    if (amount === null) return
    const n = Number(amount.replace(',', '.'))
    const { error } = await supabase.rpc('renew_membership', { p_membership: r.membership_id, p_amount: amount.trim() && n > 0 ? n : null, p_method: 'efectivo' })
    if (error) return toast.error(errMsg(error))
    toast.success('Plan renovado'); load()
  }
  async function toggleRequire(on: boolean) {
    const { error } = await supabase.rpc('update_require_plan', { p_on: on })
    if (error) return toast.error(errMsg(error))
    toast.success(on ? 'Ahora hace falta un plan activo para reservar' : 'Se puede reservar sin plan'); onCoachChange()
  }

  if (error?.includes('membership') || error?.includes('coach_memberships')) return <p className="text-sm text-muted-foreground">Falta activar los planes en el servidor (015-planes-pagos.sql).</p>

  return (
    <div>
      <PageHeader title="Planes y pagos" description="Bonos, mensualidades, créditos y cobros" />
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <KpiCard label="Ingresos del mes" value={rows ? eur(income) : '…'} icon={<Euro className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Con plan activo" value={rows ? counts.activa + counts.pronto : '…'} icon={<UserCheck className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Expiran en 7 días" value={rows ? counts.pronto : '…'} icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Sin plan / expirado" value={rows ? counts.sin : '…'} icon={<UserX className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      <Tabs defaultValue="socios">
        <TabsList className="mb-6">
          <TabsTrigger value="socios">Socios</TabsTrigger>
          <TabsTrigger value="planes">Planes</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
        </TabsList>

        <TabsContent value="socios">
          {!rows ? <Skeleton className="h-48 w-full" /> : (
            <div className="rounded-lg border border-border bg-card overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Socio</TableHead><TableHead>Plan</TableHead><TableHead>Estado</TableHead><TableHead>Vence</TableHead><TableHead>Último pago</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>
                  {[...rows].sort((a, b) => ['expirada', 'expira_pronto', 'sin_plan', 'cancelada', 'activa'].indexOf(a.status) - ['expirada', 'expira_pronto', 'sin_plan', 'cancelada', 'activa'].indexOf(b.status)).map((r) => (
                    <TableRow key={r.client_id}>
                      <TableCell><button className="font-medium hover:underline" onClick={() => navigate(`/clientes/${r.client_id}`)}>{name(r.client_id)}</button></TableCell>
                      <TableCell><div className="flex flex-wrap items-center gap-1.5">{r.plan_name || '—'}<CreditsBadge row={r} /></div></TableCell>
                      <TableCell><MembershipBadge status={r.status} /></TableCell>
                      <TableCell className="text-muted-foreground">{r.end_date ? fmtDay(r.end_date) : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{r.last_payment ? fmtDay(r.last_payment) : '—'}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {r.membership_id && r.status !== 'cancelada' && <Button size="sm" variant="ghost" onClick={() => renew(r)}><RefreshCw className="h-3.5 w-3.5" /> Renovar</Button>}
                        <Button size="sm" variant="ghost" onClick={() => setAssignFor(r.client_id)}>{r.membership_id ? 'Cambiar' : 'Asignar'}</Button>
                        <Button size="sm" variant="ghost" onClick={() => setPayFor(r)}><Receipt className="h-3.5 w-3.5" /> Pago</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="planes" className="space-y-6 max-w-3xl">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Planes de 1 mes: ilimitado o con un número de clases (créditos). Cada reserva gasta un crédito y se devuelve si cancela a tiempo.</p>
            <Button onClick={() => setEditPlan('new')}><Plus className="h-4 w-4" strokeWidth={1.5} /> Nuevo plan</Button>
          </div>
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id} className={`rounded-lg border border-border bg-card p-4 flex items-center gap-3 ${p.active ? '' : 'opacity-60'}`}>
                <div className="flex-1">
                  <div className="font-medium">{p.name}{!p.active && <span className="text-xs text-muted-foreground"> · inactivo</span>}</div>
                  <div className="text-sm text-muted-foreground">{eur(p.price)}/mes · {p.type === 'creditos' ? `${p.credits} clases al mes` : 'Clases ilimitadas'}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setEditPlan(p)} aria-label="Editar"><Pencil className="h-4 w-4" strokeWidth={1.5} /></Button>
              </li>
            ))}
            {plans.length === 0 && <li className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Aún no hay planes. Ej.: «Ilimitado · 55 €» y «Bono 8 clases · 40 €».</li>}
          </ul>
          <section className="rounded-lg border border-border bg-card p-5">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block font-semibold">Exigir plan activo para reservar</span>
                <span className="block text-sm text-muted-foreground">Si está desactivado, los socios sin plan pueden reservar. Los que tienen bono gastan créditos igualmente.</span>
              </span>
              <Switch checked={!!coach.require_plan} onCheckedChange={toggleRequire} />
            </label>
          </section>
        </TabsContent>

        <TabsContent value="pagos">
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Socio</TableHead><TableHead>Forma</TableHead><TableHead>Nota</TableHead><TableHead className="text-right">Importe</TableHead></TableRow></TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{fmtDay(p.paid_on, { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell>{name(p.client_id)}</TableCell>
                    <TableCell>{METHOD_LABEL[p.method]}</TableCell>
                    <TableCell className="text-muted-foreground">{p.notes || ''}</TableCell>
                    <TableCell className="text-right font-medium">{eur(p.amount)}</TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground">Sin pagos registrados.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <AssignPlanDialog open={!!assignFor} clientId={assignFor} clientName={assignFor ? name(assignFor) : ''} plans={plans} onClose={() => setAssignFor(null)} onDone={load} />
      <PaymentDialog open={!!payFor} clientId={payFor?.client_id || null} clientName={payFor ? name(payFor.client_id) : ''}
        membershipId={payFor?.membership_id} defaultAmount={payFor?.price} onClose={() => setPayFor(null)} onDone={load} />
      <PlanDialog plan={editPlan} onClose={() => setEditPlan(null)} onSaved={() => { setEditPlan(null); load() }} />
    </div>
  )
}

function PlanDialog({ plan, onClose, onSaved }: { plan: Plan | 'new' | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ name: '', price: '', type: 'ilimitado' as Plan['type'], credits: '8', active: true })
  useEffect(() => {
    if (!plan) return
    if (plan === 'new') setF({ name: '', price: '', type: 'ilimitado', credits: '8', active: true })
    else setF({ name: plan.name, price: String(plan.price), type: plan.type, credits: String(plan.credits ?? 8), active: plan.active })
  }, [plan])

  async function save() {
    const row = { name: f.name.trim(), price: Number(f.price.replace(',', '.')) || 0, type: f.type, credits: f.type === 'creditos' ? Math.max(1, parseInt(f.credits) || 1) : null, active: f.active }
    const { error } = plan && plan !== 'new'
      ? await supabase.from('membership_plans').update(row).eq('id', plan.id)
      : await supabase.from('membership_plans').insert(row)
    if (error) return toast.error(errMsg(error))
    toast.success('Plan guardado'); onSaved()
  }

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{plan === 'new' ? 'Nuevo plan' : 'Editar plan'}</DialogTitle><DialogDescription>Duración: 1 mes, renovable.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="pn">Nombre</Label><Input id="pn" placeholder="Ej. Bono 8 clases" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="pp">Precio al mes (€)</Label><Input id="pp" inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={f.type} onValueChange={(v) => setF({ ...f, type: v as Plan['type'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ilimitado">Ilimitado</SelectItem><SelectItem value="creditos">Con créditos</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          {f.type === 'creditos' && <div className="space-y-2"><Label htmlFor="pc">Clases al mes</Label><Input id="pc" inputMode="numeric" value={f.credits} onChange={(e) => setF({ ...f, credits: e.target.value })} /></div>}
          <label className="flex items-center justify-between"><span className="text-sm">Activo (se puede asignar)</span><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} /></label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={save} disabled={!f.name.trim()}>Guardar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
