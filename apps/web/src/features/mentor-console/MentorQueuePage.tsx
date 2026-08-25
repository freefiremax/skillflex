import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LANGUAGE_LABELS, type Language } from '@skillswitch/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Card, Empty, ErrorNote, Loading, Pill, StatusPill, formatDate } from '../../components/ui'

interface QueueItem {
  submissionId: string
  status: string
  submittedAt: string | null
  student: string
  assignment: string
  playbackUrl: string | null
}

interface RosterStudent {
  studentId: string
  name: string
  cohort: string | null
  languages: Language[]
  since: string
}

export default function MentorQueuePage() {
  const { me } = useAuth()
  const navigate = useNavigate()

  const queue = useQuery({
    queryKey: ['mentor-queue'],
    queryFn: () => api.get<{ queue: QueueItem[] }>('/submissions/queue'),
  })

  const roster = useQuery({
    queryKey: ['mentor-roster'],
    queryFn: () => api.get<{ students: RosterStudent[] }>('/mentorship/students'),
  })

  const items = queue.data?.queue ?? []
  const students = roster.data?.students ?? []
  const capacity = me?.mentor?.maxActiveStudents ?? 25

  return (
    <div className="stack">
      <div>
        <h1>Review queue</h1>
        <p className="small">
          {items.length === 0
            ? 'Nothing waiting. You are clear.'
            : `${items.length} recording${items.length > 1 ? 's' : ''} waiting on you.`}
        </p>
      </div>

      <div className="row" style={{ gap: '0.5rem' }}>
        <Card className="card-tight grow">
          <div className="tiny faint">STUDENTS</div>
          <div className="strong mono" style={{ fontSize: '1.3rem' }}>
            {students.length}
            <span className="faint small"> / {capacity}</span>
          </div>
        </Card>
        <Card className="card-tight grow">
          <div className="tiny faint">TO REVIEW</div>
          <div className="strong mono" style={{ fontSize: '1.3rem' }}>{items.length}</div>
        </Card>
      </div>

      <ErrorNote error={queue.error} />

      {queue.isLoading ? (
        <Loading rows={2} />
      ) : items.length === 0 ? (
        <Empty icon="▤" title="Queue is empty" body="New submissions land here the moment students send them." />
      ) : (
        items.map((item) => (
          <Card
            key={item.submissionId}
            accent={item.status === 'submitted'}
            onClick={() => navigate(`/review/${item.submissionId}`)}
          >
            <div className="row-between" style={{ marginBottom: '0.3rem' }}>
              <span className="strong">{item.student}</span>
              <StatusPill status={item.status} />
            </div>
            <div className="small dim">{item.assignment}</div>
            <div className="tiny faint" style={{ marginTop: '0.3rem' }}>
              Sent {formatDate(item.submittedAt)}
            </div>
          </Card>
        ))
      )}

      <div className="section-title">Your students</div>
      {roster.isLoading ? (
        <Loading rows={2} />
      ) : students.length === 0 ? (
        <Empty icon="☺" title="No students yet" body="Students get matched to you by language and skill." />
      ) : (
        <div className="stack-sm">
          {students.map((s) => (
            <Card key={s.studentId} className="card-tight">
              <div className="row-between">
                <div>
                  <div className="small strong">{s.name}</div>
                  <div className="tiny faint">
                    {s.cohort ?? 'No cohort'} · since {formatDate(s.since)}
                  </div>
                </div>
                <div className="row" style={{ gap: '0.25rem' }}>
                  {s.languages.map((l) => (
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
