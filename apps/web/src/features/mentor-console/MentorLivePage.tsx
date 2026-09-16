import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LANGUAGE_LABELS,
  SKILLS,
  SKILL_LABELS,
  SUPPORTED_LANGUAGES,
  type Language,
  type LiveClassStatus,
  type Skill,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import {
  Alert,
  Empty,
  ErrorNote,
  Loading,
  Pill,
  formatDate,
  formatDateTime,
  formatDuration,
  formatRelative,
} from '../../components/ui'
import { LiveStatusPill } from '../live/LiveBits'

interface MentorClassView {
  id: string
  title: string
  description: string | null
  skill: string | null
  language: Language
  status: LiveClassStatus
  storedStatus: string
  scheduledAt: string
  durationMinutes: number
  capacity: number
  seatsTaken: number
  joinUrl: string | null
  startedAt: string | null
  endedAt: string | null
  hasRecording: boolean
  recordingPublishedAt: string | null
}

interface RosterRow {
  studentId: string
  name: string
  cohort: string | null
  registeredAt: string
  attendedAt: string | null
  watchedSeconds: number
  completedAt: string | null
}

interface ClassDraft {
  title: string
  description: string
  skill: Skill | ''
  language: Language
  scheduledAt: string
  durationMinutes: number
  capacity: number
  joinUrl: string
}

function localDateTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function emptyDraft(): ClassDraft {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  return {
    title: '',
    description: '',
    skill: '',
    language: 'en',
    scheduledAt: localDateTimeValue(d),
    durationMinutes: 45,
    capacity: 50,
    joinUrl: '',
  }
}

function draftFrom(cls: MentorClassView): ClassDraft {
  return {
    title: cls.title,
    description: cls.description ?? '',
    skill: (cls.skill as Skill | null) ?? '',
    language: cls.language,
    scheduledAt: localDateTimeValue(new Date(cls.scheduledAt)),
    durationMinutes: cls.durationMinutes,
    capacity: cls.capacity,
    joinUrl: cls.joinUrl ?? '',
  }
}

function draftToPayload(d: ClassDraft) {
  return {
    title: d.title.trim(),
    description: d.description.trim(),
    language: d.language,
    scheduledAt: new Date(d.scheduledAt).toISOString(),
    durationMinutes: d.durationMinutes,
    capacity: d.capacity,
    ...(d.skill ? { skill: d.skill } : {}),
    ...(d.joinUrl.trim() ? { joinUrl: d.joinUrl.trim() } : {}),
  }
}

function readVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const probe = document.createElement('video')
    const done = (value: number | undefined) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    probe.preload = 'metadata'
    probe.onloadedmetadata = () =>
      done(Number.isFinite(probe.duration) ? Math.round(probe.duration) : undefined)
    probe.onerror = () => done(undefined)
    probe.src = url
  })
}

export default function MentorLivePage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [draft, setDraft] = useState<ClassDraft>(emptyDraft)
  const [saveRecording, setSaveRecording] = useState(true)
  const [editing, setEditing] = useState<{ id: string; draft: ClassDraft } | null>(null)

  const classes = useQuery({
    queryKey: ['mentor-live-classes'],
    queryFn: () =>
      api.get<{ upcoming: MentorClassView[]; past: MentorClassView[] }>('/live/mentor/classes'),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mentor-live-classes'] })

  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>('/live/classes', draftToPayload(draft)),
    onSuccess: async () => {
      setShowForm(false)
      setDraft(emptyDraft())
      await invalidate()
    },
  })

  const update = useMutation({
    mutationFn: ({ id, draft: d }: { id: string; draft: ClassDraft }) =>
      api.patch(`/live/classes/${id}`, draftToPayload(d)),
    onSuccess: async () => {
      setEditing(null)
      await invalidate()
    },
  })

  const action = useMutation({
    mutationFn: ({ id, verb }: { id: string; verb: 'start' | 'end' | 'cancel' | 'unpublish' }) => {
      if (verb === 'cancel') return api.del(`/live/classes/${id}`)
      if (verb === 'unpublish') return api.del(`/live/classes/${id}/recording`)
      return api.post(`/live/classes/${id}/${verb}`)
    },
    onSuccess: invalidate,
  })

  const publish = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const contentType = file.type || 'video/mp4'
      const durationSeconds = await readVideoDuration(file)

      const ticket = await api.post<{
        mediaId: string
        uploadUrl: string
        headers: Record<string, string>
      }>('/media', { kind: 'lecture_recording', contentType, ...(durationSeconds ? { durationSeconds } : {}) })

      if (/^https?:\/\//i.test(ticket.uploadUrl)) {
        const res = await fetch(ticket.uploadUrl, {
          method: 'PUT',
          headers: { 'content-type': contentType, ...ticket.headers },
          body: file,
        })
        if (!res.ok) throw new Error(`Upload failed (${res.status}). Check your connection and try again.`)
        await api.post(`/media/${ticket.mediaId}/complete`, {
          sizeBytes: file.size,
          ...(durationSeconds ? { durationSeconds } : {}),
        })
      } else {
        await api.upload(`/media/${ticket.mediaId}/upload`, file, file.name)
      }

      return api.post(`/live/classes/${id}/recording`, {
        mediaId: ticket.mediaId,
        ...(durationSeconds ? { durationSeconds } : {}),
      })
    },
    onSuccess: invalidate,
  })

  const upcoming = classes.data?.upcoming ?? []
  const past = classes.data?.past ?? []

  const cardProps = (c: MentorClassView) => ({
    cls: c,
    expanded: expanded === c.id,
    onToggle: () => setExpanded((prev) => (prev === c.id ? null : c.id)),
    onAction: (verb: 'start' | 'end' | 'cancel' | 'unpublish') => action.mutate({ id: c.id, verb }),
    onPublish: (file: File) => publish.mutate({ id: c.id, file }),
    busy: action.isPending || publish.isPending,
    edit: {
      draft: editing?.id === c.id ? editing.draft : null,
      saving: update.isPending,
      onOpen: () => setEditing({ id: c.id, draft: draftFrom(c) }),
      onCancel: () => setEditing(null),
      onChange: (d: ClassDraft) => setEditing({ id: c.id, draft: d }),
      onSave: () => editing && update.mutate(editing),
    },
  })

  // If Mentor is scheduling a new lecture: render Master Schedule view
  if (showForm) {
    return (
      <div className="master-container">
        <section className="master-hero">
          <div className="master-hero-copy">
            <h1>Schedule a live lecture</h1>
            <p>
              Share your knowledge with a room full of learners. Go live, help more students, and make a bigger impact.
            </p>
            <div className="master-hero-features">
              <div className="master-feature-item">
                <span className="master-feature-icon">👥</span>
                <div>Reach many<br />students</div>
              </div>
              <div className="master-feature-item">
                <span className="master-feature-icon">▶</span>
                <div>Recorded<br />automatically</div>
              </div>
              <div className="master-feature-item">
                <span className="master-feature-icon">◷</span>
                <div>Build your<br />mentor profile</div>
              </div>
            </div>
          </div>
          <div className="master-hero-art-wrapper">
            <img
              className="master-hero-art"
              src="/assets/master/mentor-schedule/schedule-hero.png"
              alt="Mentor scheduling a live lecture"
            />
          </div>
        </section>

        <div className="master-2col">
          {/* Lecture Form */}
          <article className="master-card">
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Lecture details</h2>
            <div style={{ color: 'var(--master-muted)', marginBottom: '20px', fontSize: '15px' }}>
              Fill in the details and let the right students find your session.
            </div>

            <ErrorNote error={create.error} />

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                Title *
              </label>
              <input
                className="master-input"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Interview preparation for freshers"
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                Description *
              </label>
              <textarea
                className="master-textarea"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="In this session we will cover common interview questions, answer structure, and confidence tips..."
              />
              <div style={{ textAlign: 'right', color: '#738092', fontSize: '13px', marginTop: '4px' }}>
                {draft.description.length}/500
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                Skills covered *
              </label>
              <div className="master-chips">
                {SKILLS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`master-chip ${draft.skill === s ? 'active' : ''}`}
                    onClick={() => setDraft({ ...draft, skill: draft.skill === s ? '' : s })}
                  >
                    {draft.skill === s ? `✓ ${SKILL_LABELS[s]}` : SKILL_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                  Language *
                </label>
                <select
                  className="master-select"
                  value={draft.language}
                  onChange={(e) => setDraft({ ...draft, language: e.target.value as Language })}
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {LANGUAGE_LABELS[l]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                  Max participants
                </label>
                <select
                  className="master-select"
                  value={draft.capacity}
                  onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })}
                >
                  <option value={25}>25 students</option>
                  <option value={50}>50 students</option>
                  <option value={100}>100 students</option>
                  <option value={200}>200 students</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                  Date & time *
                </label>
                <input
                  className="master-input"
                  type="datetime-local"
                  value={draft.scheduledAt}
                  onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                  Duration (mins)
                </label>
                <input
                  className="master-input"
                  type="number"
                  min={15}
                  max={240}
                  value={draft.durationMinutes}
                  onChange={(e) => setDraft({ ...draft, durationMinutes: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                Room link (Google Meet, Zoom, Jitsi)
              </label>
              <input
                className="master-input"
                value={draft.joinUrl}
                onChange={(e) => setDraft({ ...draft, joinUrl: e.target.value })}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 0 20px',
              }}
            >
              <div
                className={`master-toggle ${saveRecording ? '' : 'off'}`}
                onClick={() => setSaveRecording(!saveRecording)}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '15px' }}>Save recording to library</strong>
                <span style={{ color: 'var(--master-muted)', fontSize: '13px' }}>
                  Let students who couldn't attend watch it later.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="master-btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                disabled={create.isPending || draft.title.trim().length < 4}
                onClick={() => create.mutate()}
              >
                {create.isPending ? 'Scheduling…' : '▣ Schedule lecture'}
              </button>
              <button
                type="button"
                className="master-chip"
                style={{ padding: '14px 22px' }}
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </article>

          {/* Sidebar */}
          <aside style={{ display: 'grid', gap: '20px' }}>
            <div className="master-card">
              <h3 style={{ fontSize: '20px', margin: '0 0 16px', fontWeight: 800 }}>💡 Before you go live</h3>
              <div style={{ display: 'grid', gap: '12px', fontSize: '15px', color: '#4b5b71' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Choose a clear and specific title</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Add a short and helpful description</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Select relevant skills and language</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Pick a suitable date and time</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Make sure you have a stable internet connection</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Be ready to engage with students</span>
                </div>
              </div>
            </div>

            <div className="master-card">
              <img
                src="/assets/master/mentor-schedule/schedule-side.png"
                alt="Mentor encouraging students"
                style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '18px' }}
              />
              <div
                style={{
                  marginTop: '16px',
                  background: 'linear-gradient(145deg, #ede5fc, #ded0f7)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '16px',
                  padding: '16px',
                  color: 'var(--brand-deep)',
                  fontSize: '17px',
                  fontWeight: 800,
                  lineHeight: 1.35,
                }}
              >
                “One session” can change someone's journey.
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  // Master Live view
  return (
    <div className="master-container">
      {/* Master Hero */}
      <section className="master-hero">
        <div className="master-hero-copy">
          <h1>Live lectures</h1>
          <p>
            Teach a room instead of one student. Publish the recording afterwards and it stays in the library for everyone who couldn't make it.
          </p>
        </div>
        <div
          style={{
            width: '100%',
            height: '240px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, #d6f4e6, #aee8cb)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '90px',
            boxShadow: 'var(--master-shadow-soft)',
          }}
        >
          🧑‍🏫
        </div>
      </section>

      <button
        type="button"
        className="master-btn-primary"
        style={{ width: '100%', justifyContent: 'center', padding: '18px', fontSize: '20px', marginBottom: '28px' }}
        onClick={() => setShowForm(true)}
      >
        ＋ Schedule a lecture
      </button>

      <ErrorNote error={classes.error ?? action.error ?? publish.error ?? update.error} />
      {publish.isPending && (
        <Alert tone="info">Uploading the recording — keep this screen open.</Alert>
      )}

      {/* Scheduled Section */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#56667a', margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Scheduled
        </h2>

        {classes.isLoading ? (
          <Loading rows={2} />
        ) : upcoming.length === 0 ? (
          <div className="master-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: '#effaf5',
                color: 'var(--master-green)',
                fontSize: '34px',
                margin: '0 auto 16px',
              }}
            >
              ◉
            </div>
            <h3 style={{ fontSize: '24px', margin: '0 0 8px', fontWeight: 800 }}>Nothing scheduled</h3>
            <p style={{ fontSize: '16px', color: 'var(--master-muted)', maxWidth: '500px', margin: '0 auto' }}>
              Schedule a lecture and every student who matches its language and skill will see it.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {upcoming.map((c) => (
              <MentorClassCard key={c.id} {...cardProps(c)} />
            ))}
          </div>
        )}
      </section>

      {/* Finished Section */}
      <section>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#56667a', margin: '0 0 18px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Finished
        </h2>

        {past.length === 0 ? (
          <div className="master-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: '#effaf5',
                color: '#657487',
                fontSize: '34px',
                margin: '0 auto 16px',
              }}
            >
              ▤
            </div>
            <h3 style={{ fontSize: '24px', margin: '0 0 8px', fontWeight: 800 }}>No past lectures</h3>
            <p style={{ fontSize: '16px', color: 'var(--master-muted)', maxWidth: '500px', margin: '0 auto' }}>
              Ended lectures and their recordings live here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {past.map((c) => (
              <MentorClassCard key={c.id} {...cardProps(c)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function MentorClassCard({
  cls,
  expanded,
  onToggle,
  onAction,
  onPublish,
  busy,
  edit,
}: {
  cls: MentorClassView
  expanded: boolean
  onToggle: () => void
  onAction: (verb: 'start' | 'end' | 'cancel' | 'unpublish') => void
  onPublish: (file: File) => void
  busy: boolean
  edit: {
    draft: ClassDraft | null
    saving: boolean
    onOpen: () => void
    onCancel: () => void
    onChange: (next: ClassDraft) => void
    onSave: () => void
  }
}) {
  const canStart = cls.status === 'scheduled' || cls.status === 'live'
  const canEdit = canStart

  return (
    <article className="master-card" style={{ margin: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--master-muted)', letterSpacing: '0.8px' }}>
          {cls.skill ? (SKILL_LABELS[cls.skill as Skill] ?? cls.skill).toUpperCase() : 'LECTURE'}
        </span>
        <LiveStatusPill status={cls.status} />
      </div>

      <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: '10px' }}>{cls.title}</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <Pill>{formatDateTime(cls.scheduledAt)}</Pill>
        {cls.status === 'scheduled' && <Pill tone="brand">{formatRelative(cls.scheduledAt)}</Pill>}
        <Pill>{cls.durationMinutes} min</Pill>
        <Pill tone={cls.seatsTaken > 0 ? 'ok' : 'default'}>
          {cls.seatsTaken} / {cls.capacity} registered
        </Pill>
        {cls.hasRecording && <Pill tone="brand">Recording published</Pill>}
        {!cls.joinUrl && canStart && <Pill tone="warn">No room link</Pill>}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {cls.status === 'scheduled' && (
          <button
            type="button"
            className="btn btn-record btn-sm"
            disabled={busy || !cls.joinUrl}
            onClick={() => onAction('start')}
            title={cls.joinUrl ? undefined : 'Add a room link first'}
          >
            Start lecture
          </button>
        )}
        {cls.status === 'live' && (
          <>
            {cls.joinUrl && (
              <a
                className="master-btn-primary"
                style={{ padding: '8px 16px', fontSize: '14px', textDecoration: 'none' }}
                href={cls.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open room →
              </a>
            )}
            <button
              type="button"
              className="master-chip"
              disabled={busy}
              onClick={() => onAction('end')}
            >
              End
            </button>
          </>
        )}
        {canEdit && (
          <button
            type="button"
            className="master-chip"
            onClick={edit.draft ? edit.onCancel : edit.onOpen}
          >
            {edit.draft ? 'Close editor' : 'Edit'}
          </button>
        )}
        {(cls.status === 'scheduled' || cls.status === 'live') && (
          <button
            type="button"
            className="master-chip"
            disabled={busy}
            onClick={() => onAction('cancel')}
          >
            Cancel
          </button>
        )}
        {cls.status !== 'cancelled' && (
          <label className="master-chip" style={{ cursor: 'pointer', display: 'inline-flex' }}>
            {cls.hasRecording ? 'Replace recording' : 'Publish recording'}
            <input
              type="file"
              accept="video/*"
              hidden
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) onPublish(file)
              }}
            />
          </label>
        )}
        <button type="button" className="master-chip" onClick={onToggle}>
          {expanded ? 'Hide roster' : 'View roster'}
        </button>
      </div>

      {expanded && <ClassRoster classId={cls.id} />}
    </article>
  )
}

function ClassRoster({ classId }: { classId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mentor-live-roster', classId],
    queryFn: () =>
      api.get<{ roster: RosterRow[]; attendedCount: number }>(`/live/mentor/classes/${classId}`),
  })

  if (isLoading) return <div style={{ marginTop: '12px' }}><Loading rows={2} /></div>
  if (error) return <div style={{ marginTop: '12px' }}><ErrorNote error={error} /></div>

  const roster = data?.roster ?? []

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid #eef3f0', paddingTop: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: 'var(--master-muted)', marginBottom: '8px' }}>
        <span>{roster.length} REGISTERED</span>
        <span>{data?.attendedCount ?? 0} ATTENDED LIVE</span>
      </div>
      {roster.length === 0 ? (
        <div style={{ color: 'var(--master-muted)', fontSize: '14px' }}>Nobody has registered yet.</div>
      ) : (
        roster.map((r) => (
          <div key={r.studentId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <div>
              <strong>{r.name}</strong>
              <span style={{ color: 'var(--master-muted)' }}> · {r.cohort ?? 'no cohort'}</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {r.attendedAt ? <Pill tone="ok">Live</Pill> : <Pill>{formatDate(r.registeredAt)}</Pill>}
              {r.completedAt ? (
                <Pill tone="ok">Watched</Pill>
              ) : r.watchedSeconds > 0 ? (
                <Pill tone="warn">{formatDuration(r.watchedSeconds)}</Pill>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
