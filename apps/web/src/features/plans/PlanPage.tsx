import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Empty, ErrorNote, Loading, formatDate } from '../../components/ui'

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
  const items = plan?.items ?? []
  const doneCount = items.filter((i) => i.done).length
  const totalCount = items.length
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    <div className="master-container">
      {/* Title & Subtitle from SkillFlex_Master */}
      <div className="master-header">
        <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 52px)', letterSpacing: '-2px', margin: '0 0 10px', fontWeight: 850 }}>
          This week's plan
        </h1>
        <p className="master-lead" style={{ fontSize: '17px', color: '#59677b' }}>
          Built from what your mentor actually wrote.<br />
          Every line traces back to real feedback.
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
          {/* How this was made box from SkillFlex_Master */}
          <section
            style={{
              background: '#dff3ea',
              border: '1px solid #d6eee3',
              borderRadius: '22px',
              padding: '18px 20px',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: '22px',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(30, 80, 60, 0.08)',
              }}
            >
              💡
            </div>
            <div>
              <b style={{ display: 'block', color: '#178a5c', fontSize: '15px', marginBottom: '4px', fontWeight: 800 }}>
                HOW THIS WAS MADE
              </b>
              <span style={{ display: 'block', color: '#4f6075', fontSize: '14px', lineHeight: 1.45 }}>
                Restructured from {plan.sourceFeedbackIds.length} piece
                {plan.sourceFeedbackIds.length === 1 ? '' : 's'} of your mentor's feedback. No AI watched or scored your videos — it only reorganised what a human already told you.
              </span>
            </div>
          </section>

          {/* Week heading & progress */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: '#5b697d',
              fontWeight: 750,
              fontSize: '15px',
              margin: '0 2px 8px',
            }}
          >
            <span>WEEK OF {formatDate(plan.weekOf).toUpperCase()}</span>
            <span>{doneCount}/{totalCount} done</span>
          </div>

          <div
            style={{
              height: '8px',
              background: '#dfe8e4',
              borderRadius: '99px',
              overflow: 'hidden',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'var(--master-green)',
                borderRadius: '99px',
                width: `${pct}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          <ErrorNote error={toggle.error} />

          {/* Tasks List */}
          <section style={{ display: 'grid', gap: '11px', marginBottom: '22px' }}>
            {items.map((item, i) => (
              <article
                key={`${plan.id}-${i}`}
                style={{
                  background: '#fff',
                  border: '1px solid #edf3f0',
                  borderRadius: '21px',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  boxShadow: '0 6px 18px rgba(41, 75, 59, 0.06)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                onClick={() => toggle.mutate({ planId: plan.id, index: i, done: !item.done })}
              >
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    border: `2px solid ${item.done ? 'var(--master-green)' : '#9aa3ad'}`,
                    borderRadius: '6px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '15px',
                    background: item.done ? 'var(--master-green)' : '#fff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {item.done ? '✓' : ''}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3
                    style={{
                      fontSize: '16px',
                      lineHeight: 1.35,
                      margin: '0 0 4px',
                      fontWeight: 750,
                      color: item.done ? '#7b8490' : 'var(--master-ink)',
                      textDecoration: item.done ? 'line-through' : 'none',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '13px', lineHeight: 1.4, color: 'var(--master-muted)', margin: 0 }}>
                    {item.why}
                  </p>
                </div>

                <div style={{ marginLeft: 'auto', color: '#56667d', fontSize: '24px', lineHeight: 1, paddingLeft: '4px' }}>
                  ›
                </div>
              </article>
            ))}
          </section>

          {/* Motivation banner from SkillFlex_Master */}
          <div
            style={{
              background: 'linear-gradient(90deg, #dff4e9, #edf8f4)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 4px 14px rgba(30, 80, 60, 0.06)',
            }}
          >
            <div style={{ fontSize: '32px' }}>🌱</div>
            <div>
              <b style={{ color: '#178e5f', fontSize: '16px' }}>Small steps. Big progress.</b>
              <span style={{ display: 'block', color: '#617084', fontSize: '14px', marginTop: '2px' }}>
                Keep showing up!
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
