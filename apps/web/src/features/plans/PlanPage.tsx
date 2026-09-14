import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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

const TASK_ICONS = ['▣', '◉', '▤', '▮▮▮', '✓']

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
  const deg = Math.round((pct / 100) * 360)

  return (
    <div className="master-container">
      {/* Master Hero */}
      <section className="master-hero">
        <div className="master-hero-copy">
          <h1>This week's plan</h1>
          <p>
            Built from what your mentor actually wrote. Every line traces back to real feedback.
          </p>
          <div className="master-hero-features">
            <div className="master-feature-item">
              <span className="master-feature-icon">◎</span>
              <div>Personalised<br />for you</div>
            </div>
            <div className="master-feature-item">
              <span className="master-feature-icon">▮▮▮</span>
              <div>Based on real<br />feedback</div>
            </div>
            <div className="master-feature-item">
              <span className="master-feature-icon">▣</span>
              <div>Small steps,<br />big progress</div>
            </div>
          </div>
        </div>
        <div className="master-hero-art-wrapper">
          <img
            className="master-hero-art"
            src="/assets/master/plan/plan-hero.png"
            alt="SkillFlex learner working on a weekly plan"
          />
        </div>
      </section>

      {!plan ? (
        <Empty
          icon="✓"
          title="No plan yet"
          body={data?.message ?? 'Your plan appears once a mentor reviews your work.'}
        />
      ) : (
        <>
          {/* Provenance note */}
          <div className="master-info-box">
            <h3>How this was made</h3>
            <p>
              Restructured from {plan.sourceFeedbackIds.length} piece
              {plan.sourceFeedbackIds.length === 1 ? '' : 's'} of your mentor's feedback. No AI
              watched or scored your videos — it only reorganised what a human already told you.
            </p>
          </div>

          <ErrorNote error={toggle.error} />

          <div className="master-2col">
            {/* Left: Tasks List */}
            <article className="master-card">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#4a5b70' }}>
                  ▣ &nbsp; WEEK OF {formatDate(plan.weekOf).toUpperCase()}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--master-green)' }}>
                  {doneCount}/{totalCount} <span style={{ color: 'var(--master-muted)', fontWeight: 600 }}>done</span>
                </div>
              </div>

              <div className="master-progress-bar">
                <div className="master-progress-bar-fill" style={{ width: `${pct}%` }} />
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {items.map((item, i) => {
                  const icon = TASK_ICONS[i % TASK_ICONS.length]
                  const badgeType = item.done
                    ? 'green'
                    : i === 0
                    ? 'red'
                    : i === 1
                    ? 'yellow'
                    : ''
                  const badgeLabel = item.done
                    ? 'Completed'
                    : i === 0
                    ? 'High Priority'
                    : i === 1
                    ? 'Important'
                    : 'Recommended'

                  return (
                    <div key={`${plan.id}-${i}`} className="master-task-item">
                      <div
                        className={`master-task-check ${item.done ? 'checked' : ''}`}
                        onClick={() =>
                          toggle.mutate({ planId: plan.id, index: i, done: !item.done })
                        }
                        title={item.done ? 'Mark as incomplete' : 'Mark as done'}
                      >
                        {item.done ? '✓' : ''}
                      </div>

                      <div className="master-task-icon">{icon}</div>

                      <div style={{ minWidth: 0 }}>
                        <div
                          className={`master-task-title ${item.done ? 'completed' : ''}`}
                          onClick={() =>
                            toggle.mutate({ planId: plan.id, index: i, done: !item.done })
                          }
                          style={{ cursor: 'pointer' }}
                        >
                          {item.title}
                        </div>
                        <div className="master-task-desc">{item.why}</div>
                        <span className={`master-badge ${badgeType}`}>{badgeLabel}</span>
                      </div>

                      <div style={{ color: '#7a899c', fontSize: '22px', userSelect: 'none' }}>›</div>
                    </div>
                  )
                })}
              </div>
            </article>

            {/* Right: Progress gauge & Help */}
            <aside style={{ display: 'grid', gap: '20px' }}>
              <div className="master-card" style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '22px', margin: '0 0 12px', fontWeight: 800 }}>
                  Your progress
                </h2>
                <div className="master-ringwrap">
                  <div
                    className="master-ring"
                    style={{
                      background: `conic-gradient(var(--master-green) 0deg ${deg}deg, #e3e6e9 ${deg}deg 360deg)`,
                    }}
                  />
                  <div className="master-ringtext">{doneCount}/{totalCount}</div>
                </div>
                <div style={{ color: 'var(--master-muted)', fontSize: '15px' }}>
                  Tasks completed
                  <strong style={{ display: 'block', color: 'var(--master-green-dark)', fontSize: '16px', marginTop: '4px' }}>
                    {pct >= 60 ? "You're on track! Keep going." : "Keep moving forward!"}
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: '20px',
                    background: '#effaf5',
                    borderRadius: '18px',
                    padding: '16px',
                    textAlign: 'left',
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px' }}>▣</span>
                    <div>
                      <b style={{ display: 'block', fontSize: '15px' }}>This week</b>
                      <span style={{ color: 'var(--master-muted)', fontSize: '13px' }}>Placement sprint</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px', color: 'var(--master-green)' }}>✓</span>
                    <div>
                      <b style={{ display: 'block', fontSize: '15px' }}>{doneCount} completed</b>
                      <span style={{ color: 'var(--master-muted)', fontSize: '13px' }}>verified steps</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px' }}>▮▮</span>
                    <div>
                      <b style={{ display: 'block', fontSize: '15px' }}>{totalCount - doneCount} remaining</b>
                      <span style={{ color: 'var(--master-muted)', fontSize: '13px' }}>keep it up!</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Need help card */}
              <div className="master-card">
                <img
                  src="/assets/master/plan/plan-progress.png"
                  alt="Encouraging learner illustration"
                  style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '18px' }}
                />
                <h3 style={{ fontSize: '20px', margin: '14px 0 6px', fontWeight: 800 }}>
                  Need help?
                </h3>
                <p style={{ color: 'var(--master-muted)', fontSize: '15px', lineHeight: 1.45, margin: '0 0 16px' }}>
                  Have a doubt about your plan? Ask your mentor or practice with your AI buddy anytime.
                </p>
                <Link
                  to="/mentor"
                  style={{
                    display: 'inline-block',
                    background: 'var(--master-green)',
                    color: '#fff',
                    padding: '12px 18px',
                    borderRadius: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    fontSize: '15px',
                  }}
                >
                  Message Mentor →
                </Link>
              </div>
            </aside>
          </div>
        </>
      )}

      {/* Bottom Inspiration Banner */}
      <section className="master-bottom-banner">
        <div className="master-banner-icon">🌱</div>
        <div>
          <strong>Consistent effort today, real opportunities tomorrow.</strong>
          <p>Follow your plan, improve your skills, and become placement ready!</p>
        </div>
      </section>
    </div>
  )
}
