import { useQuery } from '@tanstack/react-query'
import { LANGUAGE_LABELS, SWITCH_REASON_LABELS, type Language } from '@skillflex/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Alert, Card, Empty, ErrorNote, Loading, Meter, Pill } from '../../components/ui'

interface Report {
  cohortSize: number
  totalSubmissions: number
  totalReviewed: number
  reviewRate: number
  skillAverages: Array<{ key: string; label: string; average: number; sampleSize: number }>
  switchReasons: Array<{ reasonCode: string; count: number }>
  note: string
}

interface RosterStudent {
  studentId: string
  name: string
  email: string
  cohort: string | null
  languages: Language[]
  submissions: number
  reviewed: number
  currentMentor: string | null
}

interface SubscriptionInfo {
  org: { id: string; name: string; slug: string }
  seats: number
  seatsUsed: number
  status: string
}

export default function AdminPage() {
  const { me } = useAuth()

  const isPlatform = me?.role === 'platform_admin'

  const report = useQuery({
    queryKey: ['org-report'],
    queryFn: () => api.get<Report>('/orgs/report'),
    enabled: !isPlatform,
  })

  const students = useQuery({
    queryKey: ['org-students'],
    queryFn: () => api.get<{ students: RosterStudent[] }>('/orgs/students'),
    enabled: !isPlatform,
  })

  const subscription = useQuery({
    queryKey: ['org-subscription'],
    queryFn: () => api.get<SubscriptionInfo>('/orgs/subscription'),
    enabled: !isPlatform,
  })

  if (isPlatform) {
    return (
      <div className="stack">
        <h1>Platform admin</h1>
        <Alert tone="info">
          Signed in as platform admin. Provisioning colleges and authoring curriculum runs through
          the API (<span className="mono">POST /api/orgs</span>,{' '}
          <span className="mono">POST /api/curriculum/tracks</span>) — there's no console screen for
          it in this build.
        </Alert>
      </div>
    )
  }

  const r = report.data

  return (
    <div className="stack">
      <div>
        <h1>{subscription.data?.org.name ?? 'Your college'}</h1>
        <p className="small">Placement-readiness evidence, ready for the accreditation file.</p>
      </div>

      {subscription.data && (
        <Card>
          <div className="row-between">
            <div>
              <div className="tiny faint">SEATS</div>
              <div className="strong mono" style={{ fontSize: '1.3rem' }}>
                {subscription.data.seatsUsed}
                <span className="faint small"> / {subscription.data.seats}</span>
              </div>
            </div>
            <Pill tone={subscription.data.status === 'active' ? 'ok' : 'warn'}>
              {subscription.data.status}
            </Pill>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <Meter value={subscription.data.seatsUsed} max={subscription.data.seats} />
          </div>
        </Card>
      )}

      <ErrorNote error={report.error} />

      {report.isLoading ? (
        <Loading rows={3} />
      ) : r ? (
        <>
          <div className="row" style={{ gap: '0.5rem' }}>
            <Card className="card-tight grow">
              <div className="tiny faint">STUDENTS</div>
              <div className="strong mono" style={{ fontSize: '1.25rem' }}>{r.cohortSize}</div>
            </Card>
            <Card className="card-tight grow">
              <div className="tiny faint">SUBMISSIONS</div>
              <div className="strong mono" style={{ fontSize: '1.25rem' }}>{r.totalSubmissions}</div>
            </Card>
            <Card className="card-tight grow">
              <div className="tiny faint">REVIEWED</div>
              <div className="strong mono" style={{ fontSize: '1.25rem' }}>
                {Math.round(r.reviewRate * 100)}%
              </div>
            </Card>
          </div>

          <div className="section-title">Skill averages</div>
          {r.skillAverages.length === 0 ? (
            <Empty icon="▤" title="No scored work yet" body="Averages appear once mentors start reviewing." />
          ) : (
            <Card>
              <div className="stack">
                {r.skillAverages.map((s) => (
                  <div key={s.key}>
                    <div className="row-between tiny" style={{ marginBottom: 3 }}>
                      <span className="dim">{s.label}</span>
                      <span className="mono strong">
                        {s.average}
                        <span className="faint"> (n={s.sampleSize})</span>
                      </span>
                    </div>
                    <Meter value={s.average} max={5} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {r.switchReasons.length > 0 && (
            <>
              <div className="section-title">Why students switched mentors</div>
              <Card>
                <div className="stack-sm">
                  {r.switchReasons.map((s) => (
                    <div key={s.reasonCode} className="row-between small">
                      <span className="dim">
                        {SWITCH_REASON_LABELS[s.reasonCode as keyof typeof SWITCH_REASON_LABELS] ??
                          s.reasonCode}
                      </span>
                      <span className="mono strong">{s.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* Say out loud what this report does NOT contain. A TPO asking
              "can I see the videos?" should get the answer from the screen. */}
          <Alert tone="info">{r.note}</Alert>
        </>
      ) : null}

      <div className="section-title">Roster</div>
      {students.isLoading ? (
        <Loading rows={2} />
      ) : (
        <div className="stack-sm">
          {(students.data?.students ?? []).map((s) => (
            <Card key={s.studentId} className="card-tight">
              <div className="row-between">
                <div>
                  <div className="small strong">{s.name}</div>
                  <div className="tiny faint">
                    {s.cohort ?? 'No cohort'} · mentor: {s.currentMentor ?? 'none'}
                  </div>
                </div>
                <div className="row" style={{ gap: '0.25rem' }}>
                  <Pill tone={s.reviewed > 0 ? 'ok' : 'default'}>
                    {s.reviewed}/{s.submissions}
                  </Pill>
                  {s.languages.slice(0, 1).map((l) => (
                    <Pill key={l}>{LANGUAGE_LABELS[l].split(' / ')[0]}</Pill>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
