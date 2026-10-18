import { useQuery } from '@tanstack/react-query'
import {
  LANGUAGE_LABELS,
  MENTOR_HEALTH_LABELS,
  SWITCH_REASON_LABELS,
  type Language,
  type MentorHealthStatus,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Alert, Card, Empty, ErrorNote, Loading, Meter, Pill } from '../../components/ui'

interface Report {
  cohortSize: number
  totalSubmissions: number
  totalReviewed: number
  reviewRate: number
  live: {
    registrations: number
    attended: number
    attendanceRate: number
    recordingsWatched: number
    recordingsCompleted: number
  }
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

interface MentorHealthEntry {
  mentorId: string
  name: string
  metrics: {
    activeStudents: number
    maxActiveStudents: number
    pendingReviews: number
    avgReviewDelayHours: number | null
    oldestPendingHours: number | null
  }
  status: MentorHealthStatus
  reasons: string[]
  recommendation: string
}

interface MentorHealthResponse {
  mentors: MentorHealthEntry[]
  note: string
}

const STATUS_TONE: Record<MentorHealthStatus, 'ok' | 'warn' | 'danger'> = {
  healthy: 'ok',
  watch: 'warn',
  overloaded: 'danger',
}

/** "—", "18h", "3 days". Mirrors the server-side formatter. */
function fmtHours(hours: number | null): string {
  if (hours == null) return '—'
  const h = Math.round(hours)
  if (h < 48) return `${h}h`
  return `${Math.round(h / 24)} days`
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

  const health = useQuery({
    queryKey: ['mentor-health'],
    queryFn: () => api.get<MentorHealthResponse>('/mentorship/health'),
    enabled: isPlatform,
  })

  if (isPlatform) {
    const mentors = health.data?.mentors ?? []
    const counts = {
      overloaded: mentors.filter((m) => m.status === 'overloaded').length,
      watch: mentors.filter((m) => m.status === 'watch').length,
      healthy: mentors.filter((m) => m.status === 'healthy').length,
    }
    return (
      <div className="stack">
        <div>
          <h1>Mentor load</h1>
          <p className="small">
            Who is stretched, and why — so you can step in before students feel it. Detection only:
            nothing here changes an assignment on its own.
          </p>
        </div>

        <ErrorNote error={health.error} />

        {health.isLoading ? (
          <Loading rows={3} />
        ) : mentors.length === 0 ? (
          <Empty
            icon="☺"
            title="No mentors yet"
            body="Mentor load appears once mentors are onboarded."
          />
        ) : (
          <>
            <div className="row" style={{ gap: '0.5rem' }}>
              <Card className="card-tight grow">
                <div className="tiny faint">OVERLOADED</div>
                <div className="strong mono" style={{ fontSize: '1.25rem' }}>
                  {counts.overloaded}
                </div>
              </Card>
              <Card className="card-tight grow">
                <div className="tiny faint">WATCH</div>
                <div className="strong mono" style={{ fontSize: '1.25rem' }}>{counts.watch}</div>
              </Card>
              <Card className="card-tight grow">
                <div className="tiny faint">HEALTHY</div>
                <div className="strong mono" style={{ fontSize: '1.25rem' }}>{counts.healthy}</div>
              </Card>
            </div>

            <div className="stack-sm">
              {mentors.map((m) => (
                <Card key={m.mentorId} accent={m.status === 'overloaded'}>
                  <div className="row-between">
                    <div className="strong">{m.name}</div>
                    <Pill tone={STATUS_TONE[m.status]}>{MENTOR_HEALTH_LABELS[m.status]}</Pill>
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <div className="row-between tiny" style={{ marginBottom: 3 }}>
                      <span className="dim">Students</span>
                      <span className="mono strong">
                        {m.metrics.activeStudents} / {m.metrics.maxActiveStudents}
                      </span>
                    </div>
                    <Meter value={m.metrics.activeStudents} max={m.metrics.maxActiveStudents} />
                  </div>

                  <div className="row" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
                    <div className="grow">
                      <div className="tiny faint">PENDING</div>
                      <div className="mono strong">{m.metrics.pendingReviews}</div>
                    </div>
                    <div className="grow">
                      <div className="tiny faint">AVG TURNAROUND</div>
                      <div className="mono strong">{fmtHours(m.metrics.avgReviewDelayHours)}</div>
                    </div>
                    <div className="grow">
                      <div className="tiny faint">OLDEST WAITING</div>
                      <div className="mono strong">{fmtHours(m.metrics.oldestPendingHours)}</div>
                    </div>
                  </div>

                  {m.reasons.length > 0 && (
                    <ul className="small" style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                      {m.reasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  )}

                  {m.status !== 'healthy' && (
                    <div className="tiny dim" style={{ marginTop: '0.5rem' }}>
                      {m.recommendation}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {health.data?.note && <Alert tone="info">{health.data.note}</Alert>}
          </>
        )}

        <Alert tone="info">
          Provisioning colleges and authoring curriculum run through the API (
          <span className="mono">POST /api/orgs</span>,{' '}
          <span className="mono">POST /api/curriculum/tracks</span>) — there's no console screen for
          those in this build.
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

          {/* Attendance is the one number a TPO can act on the same week: a low
              rate means the lecture slot is wrong, not that the cohort is weak. */}
          <div className="section-title">Live lectures</div>
          {r.live.registrations === 0 ? (
            <Empty
              icon="◉"
              title="No registrations yet"
              body="Attendance appears once students sign up for a live lecture."
            />
          ) : (
            <Card>
              <div className="stack-sm">
                <div>
                  <div className="row-between tiny" style={{ marginBottom: 3 }}>
                    <span className="dim">Attendance</span>
                    <span className="mono strong">
                      {Math.round(r.live.attendanceRate * 100)}%
                      <span className="faint">
                        {' '}
                        ({r.live.attended}/{r.live.registrations})
                      </span>
                    </span>
                  </div>
                  <Meter value={r.live.attended} max={r.live.registrations} />
                </div>
                <div className="row-between small">
                  <span className="dim">Recordings started</span>
                  <span className="mono strong">{r.live.recordingsWatched}</span>
                </div>
                <div className="row-between small">
                  <span className="dim">Recordings finished</span>
                  <span className="mono strong">{r.live.recordingsCompleted}</span>
                </div>
              </div>
            </Card>
          )}

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
