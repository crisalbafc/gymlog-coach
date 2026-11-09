import { supabase } from './supabase'

export type Plan = { id: string; name: string; price: number; type: 'ilimitado' | 'creditos'; credits: number | null; active: boolean }
export type MemberPlanRow = {
  client_id: string; membership_id: string | null; plan_name: string | null; plan_type: Plan['type'] | null; price: number | null
  start_date: string | null; end_date: string | null
  status: 'sin_plan' | 'activa' | 'expira_pronto' | 'expirada' | 'cancelada'
  credits_left: number | null; credits: number | null; last_payment: string | null; paid_this_month: number
}
export type Payment = {
  id: string; client_id: string; membership_id: string | null; amount: number; paid_on: string
  method: 'efectivo' | 'tarjeta' | 'domiciliacion' | 'bizum' | 'otro'; notes: string | null
}

export const METHOD_LABEL: Record<Payment['method'], string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', domiciliacion: 'Domiciliación', bizum: 'Bizum', otro: 'Otro',
}
export const STATUS_LABEL: Record<MemberPlanRow['status'], string> = {
  activa: 'Activo', expira_pronto: 'Expira pronto', expirada: 'Expirado', cancelada: 'Cancelado', sin_plan: 'Sin plan',
}
export const eur = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

export async function loadPlans(): Promise<Plan[]> {
  const { data, error } = await supabase.from('membership_plans').select('*').order('price')
  if (error) throw error
  return (data as Plan[]) || []
}
export async function loadMemberPlans(): Promise<MemberPlanRow[]> {
  const { data, error } = await supabase.rpc('coach_memberships')
  if (error) throw error
  return (data as MemberPlanRow[]) || []
}
export async function loadPayments(clientId?: string): Promise<Payment[]> {
  let q = supabase.from('payments').select('*').order('paid_on', { ascending: false }).order('created_at', { ascending: false }).limit(200)
  if (clientId) q = q.eq('client_id', clientId)
  const { data, error } = await q
  if (error) throw error
  return (data as Payment[]) || []
}
