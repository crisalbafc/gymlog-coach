import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppLayout'
import { ClientTable } from '@/components/ClientTable'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { errMsg, loadClients, type ClientRow } from '@/lib/data'

export default function Clients() {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'todos' | 'activo' | 'pausa'>('activo')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadClients().then(setClients).catch((e) => setError(errMsg(e))) }, [])

  const list = useMemo(() => (clients || []).filter((c) =>
    (tab === 'todos' || c.status === tab) &&
    (c.display_name + ' ' + c.email).toLowerCase().includes(q.toLowerCase())), [clients, q, tab])

  return (
    <div>
      <PageHeader title="Clientes" description="Personas de GymLog conectadas contigo con tu código" />
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input className="pl-9" placeholder="Buscar por nombre o email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="activo">Activos</TabsTrigger>
            <TabsTrigger value="pausa">En pausa</TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {!clients ? <Skeleton className="h-40 w-full" /> : list.length === 0
        ? <p className="text-sm text-muted-foreground py-8 text-center">No hay clientes que coincidan.</p>
        : <ClientTable clients={list} />}
    </div>
  )
}
