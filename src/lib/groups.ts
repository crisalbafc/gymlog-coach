import { supabase } from './supabase'

export type GroupRow = {
  id: string; name: string; schedule: string | null; capacity: number; members: number
  sessions_4w: number; attendance_4w: number | null; last_session: string | null
}
export type Group = { id: string; name: string; schedule: string | null; capacity: number }
export type PlanItem = { exercise_id: string; sets: number | null; reps: string }
export type GroupRoutine = { id: string; group_id: string; name: string; plan: PlanItem[] }
export type Session = { id: string; group_id: string; routine_id: string | null; starts_at: string; status: 'en_curso' | 'terminada' }
export type Attendance = { session_id: string; client_id: string; present: boolean; workout_id: string | null }

export async function loadGroups(): Promise<GroupRow[]> {
  const { data, error } = await supabase.rpc('groups_overview')
  if (error) throw error
  return (data as GroupRow[]) || []
}

/** Crea una sesión con todos los miembros marcados como presentes y devuelve su id. */
export async function startSession(groupId: string, routineId: string | null): Promise<string> {
  const { data: s, error } = await supabase.from('group_sessions')
    .insert({ group_id: groupId, routine_id: routineId }).select('id').single()
  if (error) throw error
  const { data: members } = await supabase.from('training_group_members').select('client_id').eq('group_id', groupId)
  if (members?.length) {
    await supabase.from('session_attendance').insert(members.map((m) => ({ session_id: s.id, client_id: m.client_id, present: true })))
  }
  return s.id
}
