import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'
import { PageHeader } from '@/components/layout/AppLayout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ClientTable'
import { errMsg, loadClients, type ClientRow, type Coach } from '@/lib/data'
import { SummaryTab } from './client/SummaryTab'
import { WorkoutsTab } from './client/WorkoutsTab'
import { DietTab } from './client/DietTab'
import { BodyTab } from './client/BodyTab'
import { PhotosTab } from './client/PhotosTab'
import { RoutinesTab } from './client/RoutinesTab'
import { MessagesTab } from './client/MessagesTab'

export function NotShared({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      <Lock className="h-5 w-5 mx-auto mb-2" strokeWidth={1.5} />
      Este cliente no comparte {what} contigo. Puede activarlo en GymLog → Ajustes → Mi entrenador.
    </div>
  )
}

export default function ClientDetail({ clientId, coach }: { clientId: string; coach: Coach }) {
  const [client, setClient] = useState<ClientRow | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try { setClient((await loadClients()).find((c) => c.client_id === clientId) || null) }
    catch (e) { setError(errMsg(e)) }
  }, [clientId])
  useEffect(() => { reload() }, [reload])

  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (client === undefined) return <Skeleton className="h-64 w-full" />
  if (client === null) return <p className="text-sm text-muted-foreground">Este cliente ya no está conectado contigo.</p>

  return (
    <div>
      <a href="#/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} /> Clientes
      </a>
      <PageHeader title={client.display_name} description={client.email}>
        <StatusBadge status={client.status} />
      </PageHeader>

      <Tabs defaultValue="resumen">
        <div className="overflow-x-auto -mx-4 px-4 mb-6">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="entrenos">Entrenos</TabsTrigger>
            <TabsTrigger value="dieta">Dieta</TabsTrigger>
            <TabsTrigger value="cuerpo">Cuerpo</TabsTrigger>
            <TabsTrigger value="fotos">Fotos</TabsTrigger>
            <TabsTrigger value="rutinas">Rutinas</TabsTrigger>
            <TabsTrigger value="mensajes">Mensajes</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="resumen"><SummaryTab client={client} onChange={reload} /></TabsContent>
        <TabsContent value="entrenos">{client.share_workouts ? <WorkoutsTab clientId={clientId} /> : <NotShared what="sus entrenos" />}</TabsContent>
        <TabsContent value="dieta">{client.share_diet ? <DietTab client={client} /> : <NotShared what="su dieta" />}</TabsContent>
        <TabsContent value="cuerpo">{client.share_body ? <BodyTab clientId={clientId} /> : <NotShared what="su peso y medidas" />}</TabsContent>
        <TabsContent value="fotos">{client.share_photos ? <PhotosTab clientId={clientId} /> : <NotShared what="sus fotos" />}</TabsContent>
        <TabsContent value="rutinas"><RoutinesTab clientId={clientId} coachId={coach.user_id} /></TabsContent>
        <TabsContent value="mensajes"><MessagesTab clientId={clientId} /></TabsContent>
      </Tabs>
    </div>
  )
}
