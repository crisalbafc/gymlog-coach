import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { loadCoach, type Coach } from '@/lib/data'
import { useRoute } from '@/lib/router'
import { Toaster } from '@/components/ui/sonner'
import { AppLayout } from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import BecomeCoach from '@/pages/BecomeCoach'
import Dashboard from '@/pages/Dashboard'
import Clients from '@/pages/Clients'
import ClientDetail from '@/pages/ClientDetail'
import SettingsPage from '@/pages/Settings'
import Groups from '@/pages/Groups'
import GroupDetail from '@/pages/GroupDetail'
import LiveSession from '@/pages/LiveSession'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [coach, setCoach] = useState<Coach | null | undefined>(undefined)
  const path = useRoute()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const refreshCoach = useCallback(async () => setCoach(await loadCoach()), [])
  useEffect(() => {
    if (session) refreshCoach()
    else setCoach(undefined)
  }, [session?.user.id]) // eslint-disable-line react-hooks/exhaustive-deps

  let content
  if (session === undefined || (session && coach === undefined)) content = <div className="min-h-dvh bg-background" />
  else if (!session) content = <Login />
  else if (!coach) content = <BecomeCoach onDone={refreshCoach} />
  else {
    const m = path.match(/^\/clientes\/([0-9a-f-]{36})/)
    const g = path.match(/^\/grupos\/([0-9a-f-]{36})/)
    const ses = path.match(/^\/sesion\/([0-9a-f-]{36})/)
    content = (
      <AppLayout coach={coach} email={session.user.email || ''} path={path}>
        {m ? <ClientDetail clientId={m[1]} coach={coach} />
          : ses ? <LiveSession sessionId={ses[1]} />
          : g ? <GroupDetail groupId={g[1]} coach={coach} />
          : path.startsWith('/grupos') ? <Groups />
          : path.startsWith('/clientes') ? <Clients />
          : path.startsWith('/ajustes') ? <SettingsPage coach={coach} onChange={refreshCoach} />
          : <Dashboard coach={coach} />}
      </AppLayout>
    )
  }

  return (
    <>
      {content}
      <Toaster position="top-center" theme="dark" />
    </>
  )
}
