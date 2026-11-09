import { useEffect, useState } from 'react'
import { Users, Activity, AlertTriangle, CalendarClock, Dumbbell, Apple, Scale, Copy, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader, KpiCard } from '@/components/layout/AppLayout'
import { ClientTable } from '@/components/ClientTable'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { buildAlerts, daysSince, errMsg, loadClients, type Alert, type ClientRow, type Coach } from '@/lib/data'
import { navigate } from '@/lib/router'
import { centerOf } from '@/lib/centers'
import { loadMemberPlans, type MemberPlanRow } from '@/lib/billing'

const ICON: Record<Alert['kind'], typeof Dumbbell> = { inactivo: Dumbbell, dieta: Apple, revision: CalendarClock, peso: Scale, plan: Wallet }

export function inviteText(coach: Coach) {
  return `¡Hola! Para que pueda seguir tu progreso:\n1. Instala GymLog: https://crisalbafc.github.io/gymlog/\n2. Crea tu cuenta\n3. Ve a Ajustes → Mi entrenador y mete mi código: ${coach.coach_code}`
}

export default function Dashboard({ coach }: { coach: Coach }) {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [plans, setPlans] = useState<MemberPlanRow[]>([])
  useEffect(() => {
    loadClients().then(setClients).catch((e) => setError(errMsg(e)))
    if (centerOf(coach).has('pagos')) loadMemberPlans().then(setPlans).catch(() => {})
  }, [coach])

  const active = clients?.filter((c) => c.status === 'activo') || []
  const trainedWeek = active.filter((c) => (c.workouts_7d ?? 0) > 0).length
  const alerts: Alert[] = clients ? [
    ...plans.filter((r) => r.status === 'expirada' || r.status === 'expira_pronto').flatMap((r) => {
      const c = clients.find((x) => x.client_id === r.client_id)
      return c ? [{ client: c, kind: 'plan' as const, level: (r.status === 'expirada' ? 'alta' : 'media') as Alert['level'],
        text: r.status === 'expirada' ? `Su plan «${r.plan_name}» ha caducado` : `Su plan «${r.plan_name}» caduca pronto` }] : []
    }),
    ...buildAlerts(clients),
  ] : []
  const reviews = active.filter((c) => { const d = daysSince(c.next_review); return d !== null && d >= -7 }).length

  return (
    <div>
      <PageHeader title={`Hola, ${coach.name.split(' ')[0]}`} description="Resumen de tus clientes de GymLog">
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(inviteText(coach)); toast.success('Invitación copiada. Pégala en WhatsApp.') }}>
          <Copy className="h-4 w-4" strokeWidth={1.5} /> Invitar cliente
        </Button>
      </PageHeader>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Clientes activos" value={clients ? active.length : '…'} hint={clients ? `${clients.length - active.length} en pausa` : undefined} icon={<Users className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Entrenaron esta semana" value={clients ? `${trainedWeek}/${active.length}` : '…'} icon={<Activity className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Alertas" value={clients ? alerts.length : '…'} hint="Necesitan tu atención" icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.5} />} />
        <KpiCard label="Revisiones (7 días)" value={clients ? reviews : '…'} icon={<CalendarClock className="h-4 w-4" strokeWidth={1.5} />} />
      </div>

      <h2 className="mt-10 mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Alertas</h2>
      {!clients ? <Skeleton className="h-24 w-full" /> : alerts.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          {clients.length === 0 ? 'Aún no tienes clientes. Pulsa «Invitar cliente» y mándales tu código.' : 'Todo en orden: ningún cliente necesita atención ahora mismo. 👌'}
        </div>
      ) : (
        <ul className="rounded-lg border border-border bg-card divide-y divide-border">
          {alerts.map((a, i) => {
            const Icon = ICON[a.kind]
            return (
              <li key={i}>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60" onClick={() => navigate(`/clientes/${a.client.client_id}`)}>
                  <Icon className={`h-4 w-4 shrink-0 ${a.level === 'alta' ? 'text-destructive' : 'text-orange-400'}`} strokeWidth={1.5} />
                  <span className="font-medium">{a.client.display_name}</span>
                  <span className="text-sm text-muted-foreground">{a.text}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <h2 className="mt-10 mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wide">Clientes</h2>
      {!clients ? <Skeleton className="h-40 w-full" /> : clients.length > 0 && <ClientTable clients={clients} />}
    </div>
  )
}
