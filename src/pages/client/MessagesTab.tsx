import { useCallback, useEffect, useState } from 'react'
import { Send, Check, CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { errMsg, fmtDay } from '@/lib/data'

type Msg = { id: string; body: string; created_at: string; read_at: string | null }

export function MessagesTab({ clientId }: { clientId: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase.from('coach_messages').select('id,body,created_at,read_at').eq('client_id', clientId).order('created_at', { ascending: false }).limit(50)
    setMsgs((data as Msg[]) || [])
  }, [clientId])
  useEffect(() => { load() }, [load])

  async function send() {
    setBusy(true)
    const { error } = await supabase.rpc('coach_send_message', { p_client: clientId, p_body: text })
    setBusy(false)
    if (error) return toast.error(errMsg(error))
    toast.success('Enviado. Le llega como notificación si las tiene activadas.')
    setText(''); load()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <section className="rounded-lg border border-border bg-card p-6 space-y-3">
        <h2 className="font-semibold">Nuevo mensaje</h2>
        <p className="text-xs text-muted-foreground">Lo verá en la pantalla «Hoy» de GymLog y le llegará como notificación al móvil.</p>
        <Textarea rows={3} placeholder="Ej. ¡Buen trabajo esta semana! Mañana sube 2,5 kg en sentadilla 💪" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <Button onClick={send} disabled={busy || !text.trim()}><Send className="h-4 w-4" strokeWidth={1.5} /> Enviar</Button>
      </section>
      <ul className="space-y-2">
        {msgs.map((m) => (
          <li key={m.id} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {fmtDay(m.created_at, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {m.read_at ? <span className="flex items-center gap-1 text-lime-400"><CheckCheck className="h-3.5 w-3.5" /> leído</span> : <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5" /> enviado</span>}
            </div>
            <p className="mt-1 text-sm whitespace-pre-wrap">{m.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
