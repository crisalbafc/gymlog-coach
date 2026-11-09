import { Lock } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { navigate } from '@/lib/router'
import { daysSince, fmtDay, relDays, round, type ClientRow } from '@/lib/data'

const NoShare = () => <span className="inline-flex items-center gap-1 text-muted-foreground"><Lock className="h-3 w-3" strokeWidth={1.5} />no comparte</span>

export function StatusBadge({ status }: { status: ClientRow['status'] }) {
  return status === 'activo'
    ? <Badge variant="outline" className="border-lime-500/40 text-lime-400">Activo</Badge>
    : <Badge variant="outline" className="text-muted-foreground">En pausa</Badge>
}

/** Tabla de clientes (mismo estilo que la de socios de FitBox). */
export function ClientTable({ clients }: { clients: ClientRow[] }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Último entreno</TableHead>
            <TableHead className="text-right">Entrenos 7 d</TableHead>
            <TableHead>Peso</TableHead>
            <TableHead>Dieta (7 d)</TableHead>
            <TableHead>Revisión</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((c) => {
            const inactive = (daysSince(c.last_workout_at) ?? 99) >= 5
            const reviewDue = c.next_review && (daysSince(c.next_review) ?? -1) >= 0
            return (
              <TableRow key={c.client_id} className="cursor-pointer" onClick={() => navigate(`/clientes/${c.client_id}`)}>
                <TableCell>
                  <div className="font-medium">{c.display_name}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className={inactive && c.share_workouts && c.status === 'activo' ? 'text-orange-400' : ''}>
                  {c.share_workouts ? relDays(c.last_workout_at) : <NoShare />}
                </TableCell>
                <TableCell className="text-right">{c.share_workouts ? c.workouts_7d ?? 0 : '—'}</TableCell>
                <TableCell>
                  {!c.share_body ? <NoShare /> : c.last_weight ? (
                    <span>{round(+c.last_weight, 1)} kg{c.weight_change_30d !== null && (
                      <span className={`ml-1 text-xs ${+c.weight_change_30d > 0 ? 'text-orange-400' : 'text-lime-400'}`}>
                        {+c.weight_change_30d > 0 ? '+' : ''}{round(+c.weight_change_30d, 1)}
                      </span>
                    )}</span>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  {!c.share_diet ? <NoShare /> : c.avg_kcal_7d ? (
                    <span>{c.avg_kcal_7d} / {c.kcal_goal} kcal <span className="text-xs text-muted-foreground">({c.diet_days_7d} d)</span></span>
                  ) : <span className="text-muted-foreground">sin registros</span>}
                </TableCell>
                <TableCell className={reviewDue ? 'text-orange-400 font-medium' : 'text-muted-foreground'}>
                  {c.next_review ? fmtDay(c.next_review) : '—'}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
