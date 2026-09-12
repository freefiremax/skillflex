import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Alert, Card, ErrorNote, Loading } from '../../components/ui'

/**
 * AI Support — the in-app help chat.
 *
 * Deliberately narrow: this answers questions about the *app*, not about
 * English and never about the student's work. The server enforces that (see
 * apps/api/src/modules/support/engine.ts — the model is handed the conversation
 * and a static description of the screens, and no student data at all), but the
 * header says it out loud too, because a bot that silently refuses reads as
 * broken rather than scoped.
 */

interface ChatMessage {
  id: string
  sender: 'user' | 'bot'
  body: string
  at: string
}

interface HistoryResponse {
  messages: ChatMessage[]
  engine: string
}

interface ChatResponse {
  reply: string
  engine: string
  /** false when the support table has not been created yet — see routes.ts. */
  saved: boolean
}

/** The three things people actually arrive here with. */
const STARTERS = [
  'My mic is not working in the pronunciation game',
  'I recorded a video but it never uploaded',
  "I can't find my mentor's feedback",
]

export default function AiSupportPage() {
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const history = useQuery({
    queryKey: ['support-history'],
    queryFn: () => api.get<HistoryResponse>('/support/history'),
  })

  const send = useMutation({
    mutationFn: (message: string) => api.post<ChatResponse>('/support/chat', { message }),
    onSuccess: () => {
      setPending(null)
      queryClient.invalidateQueries({ queryKey: ['support-history'] })
    },
    // The message stays on screen on failure: the server stored the user's turn
    // before it tried to answer, so dropping it here would contradict the thread
    // they see after a reload.
    onError: () => setPending(null),
  })

  const messages = history.data?.messages ?? []

  // Follow the thread down as it grows, including the optimistic turn.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, pending, send.isPending])

  const submit = (text: string) => {
    const message = text.trim()
    if (!message || send.isPending) return
    setDraft('')
    setPending(message)
    send.mutate(message)
  }

  const saved = send.data?.saved ?? true

  return (
    <div className="stack">
      <div>
        <Link to="/pet" className="back-link">
          ← Buddy
        </Link>
        <h1>AI Support</h1>
        <p className="small">
          This helps with the app itself — bugs, logins, things that won't load. For English
          practice, try <Link to="/fun-time">Fun Time</Link>.
        </p>
      </div>

      {!saved && (
        <Alert tone="warn">
          Answering, but not saving this thread — the support table hasn't been created on the
          server yet. Your messages won't be here after a reload.
        </Alert>
      )}

      <Card>
        <div className="chat-thread">
          {history.isLoading && <Loading rows={2} />}

          {!history.isLoading && messages.length === 0 && !pending && (
            <div className="chat-msg chat-msg-bot">
              Tell me what happened — which screen you were on, what you tapped, and what you saw
              instead. I can't see your account, so details help.
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={m.sender === 'user' ? 'chat-msg chat-msg-mine' : 'chat-msg chat-msg-bot'}>
              {m.body}
            </div>
          ))}

          {pending && <div className="chat-msg chat-msg-mine chat-msg-pending">{pending}</div>}
          {send.isPending && <div className="chat-msg chat-msg-bot chat-msg-typing">thinking…</div>}

          <div ref={endRef} />
        </div>

        <ErrorNote error={send.error} />
        <ErrorNote error={history.error} />

        {messages.length === 0 && !pending && (
          <div className="row wrap chat-starters">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => submit(s)}
                disabled={send.isPending}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form
          className="chat-compose"
          onSubmit={(e) => {
            e.preventDefault()
            submit(draft)
          }}
        >
          <textarea
            aria-label="Describe the problem"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter is a newline — the phone keyboard's
              // return key is the one people reach for.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit(draft)
              }
            }}
            placeholder="What went wrong?"
            rows={2}
            maxLength={1000}
            disabled={send.isPending}
          />
          <button className="btn btn-primary" type="submit" disabled={send.isPending || !draft.trim()}>
            Send
          </button>
        </form>
      </Card>

      <p className="tiny faint">
        Support messages are stored against your account so a human can read the thread. Nothing you
        record for a mentor is ever shared with this assistant.
      </p>
    </div>
  )
}
