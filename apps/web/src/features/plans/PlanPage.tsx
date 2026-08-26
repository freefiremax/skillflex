import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Card, Empty, ErrorNote, Loading, formatDate } from '../../components/ui'

interface PlanItem {
  title: string
  why: string
  sourceFeedbackId: string
  done: boolean
}

interface PlanResponse {
  plan: {
    id: string
    weekOf: string
    items: PlanItem[]
    sourceFeedbackIds: string[]
    model: string | null
    derivedFromHumanFeedback: boolean
  } | null
  message?: string
}

export default function PlanPage() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['plan-current'],
    queryFn: () => api.get<PlanResponse>('/plans/current'),
  })

  const toggle = useMutation({
    mutationFn: ({ planId, index, done }: { planId: string; index: number; done: boolean }) =>
      api.patch(`/plans/${planId}/items/${index}`, { done }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['plan-current'] }),
  })

  if (isLoading) return <Loading rows={3} />
  if (error) return <ErrorNote error={error} />

  const plan = data?.plan

  return (
    <div className="stack">
      <div>
        <h1>This week's plan</h1>
        <p className="small">
          Built from what your mentor actually wrote. Every line traces back to real feedback.
        </p>
      </div>

      {!plan ? (
        <Empty
          icon="✓"
          title="No plan yet"
          body={data?.message ?? 'Your plan appears once a mentor reviews your work.'}
        />
      ) : (
        <>
          {/* The provenance banner is the product's honesty about AI. It states
              plainly that nothing here was assessed by a machine. */}
          <div className="ai-note">
            <div className="tiny strong" style={{ color: 'var(--accent)', marginBottom: '0.2rem' }}>
              HOW THIS WAS MADE
            </div>
            <div className="tiny dim">
              Restructured from {plan.sourceFeedbackIds.length} piece
              {plan.sourceFeedbackIds.length === 1 ? '' : 's'} of your mentor's feedback. No AI
              watched or scored your videos — it only reorganised what a human already told you.
            </div>
          </div>

          <div className="row-between">
            <span className="tiny faint">WEEK OF {formatDate(plan.weekOf).toUpperCase()}</span>
            <span className="tiny faint">
              {plan.items.filter((i) => i.done).length}/{plan.items.length} done
            </span>
          </div>

          {/* A failed tick used to be invisible: the mutation succeeded as far as
              react-query was concerned, the refetch put the box back, and the
              student got no reason. Now the API 404s a stale index and this says
              so. */}
          <ErrorNote error={toggle.error} />

          <div className="stack-sm">
            {plan.items.map((item, i) => (
              <Card key={`${plan.id}-${i}`} className="card-tight">
                <label
                  className="row"
                  style={{ alignItems: 'flex-start', gap: '0.7rem', marginBottom: 0, cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) =>
                      toggle.mutate({ planId: plan.id, index: i, done: e.target.checked })
                    }
                    style={{ width: 22, height: 22, minHeight: 22, marginTop: 2, flex: '0 0 auto' }}
                  />
                  <span style={{ flex: 1 }}>
                    <span
                      className="small strong"
                      style={{
                        display: 'block',
                        textDecoration: item.done ? 'line-through' : 'none',
                        opacity: item.done ? 0.55 : 1,
                        color: 'var(--text)',
                        fontWeight: 600,
                      }}
                    >
                      {item.title}
                    </span>
                    <span className="tiny faint" style={{ display: 'block', marginTop: 2, fontWeight: 400 }}>
                      {item.why}
                    </span>
                  </span>
                </label>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
