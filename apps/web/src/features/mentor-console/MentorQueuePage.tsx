import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LANGUAGE_LABELS, type Language } from '@skillflex/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Empty, ErrorNote, Loading, formatDate } from '../../components/ui'

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

const STUDENT_AVATARS = [
  '/assets/master/mentor-queue/student-1.png',
  '/assets/master/mentor-queue/student-2.png',
  '/assets/master/mentor-queue/student-3.png',
  '/assets/master/mentor-queue/student-4.png',
]

const REVIEW_THUMBS = [
  '/assets/master/mentor-queue/demo-review.png',
  '/assets/master/mentor-queue/student-review.png',
]

export default function MentorQueuePage() {
  const { me } = useAuth()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const queue = useQuery({
    queryKey: ['mentor-queue'],
    queryFn: () => api.get<{ queue: QueueItem[] }>('/submissions/queue'),
  })

  const roster = useQuery({
    queryKey: ['mentor-roster'],
    queryFn: () => api.get<{ students: RosterStudent[] }>('/mentorship/students'),
  })

  const items = queue.data?.queue ?? []
  const allStudents = roster.data?.students ?? []
  const filteredStudents = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.cohort && s.cohort.toLowerCase().includes(search.toLowerCase()))
  )
  const capacity = me?.mentor?.maxActiveStudents ?? 25

  return (
    <div className="master-container">
      {/* Master Hero */}
      <section className="master-hero">
        <div className="master-hero-copy">
          <h1>Review queue</h1>
          <p>
            {items.length === 0
              ? 'Nothing waiting. You are clear for now.'
              : `${items.length} recording${items.length > 1 ? 's' : ''} waiting on you.`}
          </p>
        </div>
        <div className="master-hero-art-wrapper">
          <img
            className="master-hero-art"
            src="/assets/master/mentor-queue/queue-hero.png"
            alt="SkillFlex mentor reviewing learner work"
          />
        </div>
      </section>

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
          marginBottom: '28px',
        }}
      >
        <div
          className="master-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            padding: '24px',
            margin: 0,
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: '#e7f7ef',
              color: 'var(--master-green)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '24px',
            }}
          >
            👥
          </div>
          <div>
            <div
              style={{
                fontSize: '13px',
                letterSpacing: '0.6px',
                color: 'var(--master-muted)',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              Students
            </div>
            <div style={{ fontSize: '32px', fontWeight: 850 }}>
              {allStudents.length}
              <small style={{ color: 'var(--master-muted)', fontSize: '20px', fontWeight: 600 }}>
                {' '}
                / {capacity}
              </small>
            </div>
          </div>
        </div>

        <div
          className="master-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            padding: '24px',
            margin: 0,
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: '#e7f7ef',
              color: 'var(--master-green)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '24px',
            }}
          >
            ▤
          </div>
          <div>
            <div
              style={{
                fontSize: '13px',
                letterSpacing: '0.6px',
                color: 'var(--master-muted)',
                textTransform: 'uppercase',
                fontWeight: 700,
              }}
            >
              To review
            </div>
            <div style={{ fontSize: '32px', fontWeight: 850 }}>{items.length}</div>
          </div>
        </div>
      </div>

      <ErrorNote error={queue.error} />

      {/* Pending Reviews */}
      <section style={{ marginBottom: '36px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '0 0 16px',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Pending review</h2>
          <div
            style={{
              background: '#fff',
              border: '1px solid #e1eae6',
              padding: '10px 16px',
              borderRadius: '16px',
              fontWeight: 700,
              color: '#526177',
              fontSize: '14px',
              boxShadow: 'var(--master-shadow-soft)',
            }}
          >
            ☷ &nbsp; Newest first &nbsp;⌄
          </div>
        </div>

        {queue.isLoading ? (
          <Loading rows={2} />
        ) : items.length === 0 ? (
          <Empty
            icon="▤"
            title="Queue is empty"
            body="New student recordings will land here the moment students submit them."
          />
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {items.map((item, idx) => {
              const thumb = REVIEW_THUMBS[idx % REVIEW_THUMBS.length]
              return (
                <article
                  key={item.submissionId}
                  className="master-card"
                  onClick={() => navigate(`/review/${item.submissionId}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '150px 1fr auto',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '18px',
                    margin: 0,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      height: '100px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#14213d',
                    }}
                  >
                    <img
                      src={thumb}
                      alt={item.student}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 6,
                        right: 6,
                        background: 'rgba(0,0,0,0.75)',
                        color: '#fff',
                        padding: '3px 7px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      02:00
                    </span>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '20px', margin: '0 0 6px', fontWeight: 800 }}>
                      {item.student}
                    </h3>
                    <div style={{ fontSize: '17px', color: '#546377', marginBottom: '5px' }}>
                      {item.assignment}
                    </div>
                    <div style={{ fontSize: '14px', color: '#7a8492' }}>
                      Sent {formatDate(item.submittedAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span
                      style={{
                        padding: '10px 16px',
                        borderRadius: '20px',
                        background: item.status === 'submitted' ? '#fff8dd' : '#e6f7ef',
                        color: item.status === 'submitted' ? '#98721f' : 'var(--master-green-dark)',
                        fontWeight: 800,
                        fontSize: '14px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.status === 'submitted' ? 'Waiting on review' : 'Mentor watching'}
                    </span>
                    <span style={{ fontSize: '26px', color: '#223149' }}>›</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Your Students */}
      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
            margin: '0 0 16px',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Your students</h2>
          <input
            className="master-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="⌕  Search students..."
            aria-label="Search students"
            style={{ width: '280px', padding: '12px 16px' }}
          />
        </div>

        {roster.isLoading ? (
          <Loading rows={2} />
        ) : filteredStudents.length === 0 ? (
          <Empty
            icon="☺"
            title="No students matched"
            body="Students get matched to you by language and skill interest."
          />
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {filteredStudents.map((s, idx) => {
              const avatar = STUDENT_AVATARS[idx % STUDENT_AVATARS.length]
              return (
                <article
                  key={s.studentId}
                  className="master-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '14px 20px',
                    margin: 0,
                  }}
                >
                  <div
                    style={{
                      width: '58px',
                      height: '58px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: '#e1f5eb',
                    }}
                  >
                    <img
                      src={avatar}
                      alt={s.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 3px', fontSize: '18px', fontWeight: 800 }}>
                      {s.name}
                    </h3>
                    <p style={{ margin: 0, color: 'var(--master-muted)', fontSize: '14px' }}>
                      {s.cohort ?? 'No cohort'} · since {formatDate(s.since)}
                    </p>
                  </div>
                  <div
                    style={{
                      marginLeft: 'auto',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    {s.languages.map((l) => (
                      <span
                        key={l}
                        style={{
                          padding: '7px 12px',
                          background: '#f0faf5',
                          border: '1px solid #d7eee4',
                          borderRadius: '14px',
                          fontWeight: 700,
                          fontSize: '13px',
                          color: 'var(--master-green-dark)',
                        }}
                      >
                        {LANGUAGE_LABELS[l]?.split(' / ')[0] || l}
                      </span>
                    ))}
                    <span style={{ fontSize: '24px', color: '#56667d', marginLeft: '6px' }}>›</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
