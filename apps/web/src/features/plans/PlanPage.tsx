import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Empty, ErrorNote, Loading, formatDate } from '../../components/ui'
import { useTranslation, translatePlanTitle, translatePlanWhy } from '../../lib/i18n'

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
  const { language, t } = useTranslation()

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
          {t('plan.title')}
        </h1>
        <p className="master-lead" style={{ fontSize: '17px', color: '#59677b' }}>
          {t('plan.subtitle_1')}<br />
          {t('plan.subtitle_2')}
        </p>
      </div>

      {!plan ? (
        <Empty
          icon="✓"
          title={t('plan.no_plan')}
          body={data?.message ?? t('plan.no_plan_sub')}
        />
      ) : (
        <>
          {/* How this was made box - less lavender, more white mixed pattern */}
          <section
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #faf7fe 45%, #f2eafc 100%)',
              border: '1px solid rgba(139, 92, 246, 0.18)',
              borderRadius: '22px',
              padding: '18px 20px',
              display: 'flex',
              gap: '14px',
              alignItems: 'flex-start',
              marginBottom: '24px',
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffffff, #f7f3ff)',
                border: '1px solid rgba(139, 92, 246, 0.14)',
                display: 'grid',
                placeItems: 'center',
                fontSize: '22px',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.08)',
              }}
            >
              💡
            </div>
            <div>
              <b style={{ display: 'block', color: 'var(--brand-deep)', fontSize: '15px', marginBottom: '4px', fontWeight: 800 }}>
                {t('plan.how_made_title')}
              </b>
              <span style={{ display: 'block', color: '#4f6075', fontSize: '14px', lineHeight: 1.45 }}>
                {plan.sourceFeedbackIds.length === 1
                  ? t('plan.how_made_desc_1')
                  : t('plan.how_made_desc_plural').replace('{count}', String(plan.sourceFeedbackIds.length))}
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
            <span>
              {t('plan.week_of').replace('{date}', formatDate(plan.weekOf, language).toUpperCase())}
            </span>
            <span>
              {t('plan.done_count').replace('{done}', String(doneCount)).replace('{total}', String(totalCount))}
            </span>
          </div>

          <div
            style={{
              height: '8px',
              background: 'var(--surface-sunken)',
              borderRadius: '99px',
              overflow: 'hidden',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--cta-from), var(--cta-to))',
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
                  border: '1px solid var(--border)',
                  borderRadius: '21px',
                  padding: '16px 18px',
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  boxShadow: 'var(--shadow)',
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
                    {translatePlanTitle(item.title, language)}
                  </h3>
                  <p style={{ fontSize: '13px', lineHeight: 1.4, color: 'var(--master-muted)', margin: 0 }}>
                    {translatePlanWhy(item.why, language)}
                  </p>
                </div>

                <div style={{ marginLeft: 'auto', color: '#56667d', fontSize: '24px', lineHeight: 1, paddingLeft: '4px' }}>
                  ›
                </div>
              </article>
            ))}
          </section>

          {/* Motivation banner from SkillFlex_Master - less lavender, more white mixed pattern */}
          <div
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #faf7fe 45%, #f2eafc 100%)',
              border: '1px solid rgba(139, 92, 246, 0.18)',
              borderRadius: '20px',
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.05), 0 1px 3px rgba(0, 0, 0, 0.03)',
            }}
          >
            <div style={{ fontSize: '32px' }}>🌱</div>
            <div>
              <b style={{ color: 'var(--brand-deep)', fontSize: '16px' }}>{t('plan.motivation_title')}</b>
              <span style={{ display: 'block', color: '#617084', fontSize: '14px', marginTop: '2px' }}>
                {t('plan.motivation_sub')}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
