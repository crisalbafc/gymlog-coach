import { createClient } from '@supabase/supabase-js'

// Misma base de datos que GymLog: el entrenador entra con su cuenta de GymLog
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
)
