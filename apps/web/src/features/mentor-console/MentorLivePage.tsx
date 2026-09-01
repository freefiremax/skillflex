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
  Card,
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

/** What serializeForMentor() returns, Dates as ISO strings. */
interface MentorClassView {
  id: string
  title: string
  description: string | null
  skill: string | null
  language: Language
  status: LiveClassStatus
  /** The stored value, before the clock-derived override. Shown when they differ. */
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

/** Everything the schedule form edits. Shared by "new" and "edit". */
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

/**
 * A `datetime-local` value, which has to be `YYYY-MM-DDTHH:mm` in *local* time.
 *
 * Not toISOString(): that converts to UTC, so an IST mentor would open the form
 * and be shown a time five and a half hours off their own clock.
 */
function localDateTimeValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** A blank lecture, provisionally an hour from now on the hour. */
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
    capacity: 100,
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

/**
 * `skill` and `joinUrl` are dropped when blank rather than sent as `''`, which
 * the contract's `.enum()` / `.url()` would reject. So a room link can be
 * corrected but not removed — an edge nobody has ever asked for.
 */
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

/**
 * Duration read off the file itself, so the completion threshold means something.
 *
 * Resolves undefined rather than rejecting on failure: a missing duration costs
 * a progress bar, and refusing to publish the recording over it would be absurd.
 */
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

/** The same fields whether the lecture exists yet or not. */
function ClassForm({
  draft,
  onChange,
  idPrefix,
}: {
  draft: ClassDraft
  onChange: (next: ClassDraft) => void
  idPrefix: string
}) {
  const set = <K extends keyof ClassDraft>(key: K, value: ClassDraft[K]) =>
    onChange({ ...draft, [key]: value })

  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-title`}>Title</label>
        <input
          id={`${idPrefix}-title`}
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Cracking the 'tell me about yourself' question"
          maxLength={160}
        />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-desc`}>What it covers (optional)</label>
        <textarea
          id={`${idPrefix}-desc`}
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Who this is for, and what they'll walk away able to do."
        />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-when`}>When</label>
        <input
          id={`${idPrefix}-when`}
          type="datetime-local"
          value={draft.scheduledAt}
          onChange={(e) => set('scheduledAt', e.target.value)}
        />
        <div className="hint">
          Students can enter the room 10 minutes early, and it stays open 20 minutes past the end.
        </div>
      </div>

      <div className="row" style={{ gap: '0.6rem' }}>
        <div className="field grow">
          <label htmlFor={`${idPrefix}-dur`}>Minutes</label>
          <input
            id={`${idPrefix}-dur`}
            type="number"
            min={10}
            max={240}
            value={draft.durationMinutes}
            onChange={(e) => set('durationMinutes', Number(e.target.value))}
          />
        </div>
        <div className="field grow">
          <label htmlFor={`${idPrefix}-cap`}>Seats</label>
          <input
            id={`${idPrefix}-cap`}
            type="number"
            min={1}
            max={1000}
            value={draft.capacity}
            onChange={(e) => set('capacity', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-room`}>Room link</label>
        <input
          id={`${idPrefix}-room`}
          value={draft.joinUrl}
          onChange={(e) => set('joinUrl', e.target.value)}
          placeholder="https://meet.google.com/…"
        />
        <div className="hint">
          Meet, Zoom, Jitsi — whatever you already use. Students only see it once the room opens, and
          you can't start the lecture without it.
        </div>
      </div>

      <div className="field">
        <label>Language</label>
        <div className="row wrap" style={{ gap: '0.35rem' }}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              className={`btn btn-sm ${draft.language === l ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => set('language', l)}
            >
              {LANGUAGE_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div className="field" style={{ marginBottom: 0 }}>
        <label>Skill (optional)</label>
        <div className="row wrap" style={{ gap: '0.35rem' }}>
          {SKILLS.map((s) => (
            <button
              key={s}
              type="button"
              className={`btn btn-sm ${draft.skill === s ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => set('skill', draft.skill === s ? '' : s)}
            >
              {SKILL_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="hint">Tagging it puts the lecture in front of the right students.</div>
      </div>
    </>
  )
}

export default function MentorLivePage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [draft, setDraft] = useState<ClassDraft>(emptyDraft)

  /** Which lecture is open for editing, and its in-flight edits. */
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

  /**
   * Reschedule, retitle, or paste in the room link the mentor didn't have when
   * they created the lecture. Registered students keep their seats.
   */
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

  /**
   * Publish a recording: reserve a media asset, push the bytes wherever the
   * provider wants them, then attach it. Same three steps as a student
   * submission — only the kind and the final attach call differ.
   */
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

  return (
    <div className="stack">
      <div>
        <h1>Live lectures</h1>
        <p className="small">
          Teach a room instead of one student. Publish the recording afterwards and it stays in the
          library for everyone who couldn't make it.
        </p>
      </div>

      <button
        className={`btn ${showForm ? 'btn-ghost' : 'btn-primary'} btn-block`}
        onClick={() => setShowForm((v) => !v)}
      >
        {showForm ? 'Cancel' : '+ Schedule a lecture'}
      </button>

      {showForm && (
        <>
          <Card>
            <ClassForm draft={draft} onChange={setDraft} idPrefix="lc-new" />
          </Card>
          <ErrorNote error={create.error} />
          <button
            className="btn btn-primary btn-block"
            disabled={create.isPending || draft.title.trim().length < 4}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Scheduling…' : 'Schedule it'}
          </button>
        </>
      )}

      <ErrorNote error={classes.error ?? action.error ?? publish.error ?? update.error} />

      {publish.isPending && (
        <Alert tone="info">Uploading the recording — keep this screen open.</Alert>
      )}

      <div className="section-title">Scheduled</div>
      {classes.isLoading ? (
        <Loading rows={2} />
      ) : upcoming.length === 0 ? (
        <Empty
          icon="◉"
          title="Nothing scheduled"
          body="Schedule a lecture and every student who matches its language and skill will see it."
        />
      ) : (
        <div className="stack-sm">
          {upcoming.map((c) => (
            <MentorClassCard key={c.id} {...cardProps(c)} />
          ))}
        </div>
      )}

      <div className="section-title">Finished</div>
      {past.length === 0 ? (
        <Empty icon="▤" title="No past lectures" body="Ended lectures and their recordings live here." />
      ) : (
        <div className="stack-sm">
          {past.map((c) => (
            <MentorClassCard key={c.id} {...cardProps(c)} />
          ))}
        </div>
      )}
    </div>
  )
}

interface EditHandle {
  /** Non-null only while *this* card is the one being edited. */
  draft: ClassDraft | null
  saving: boolean
  onOpen: () => void
  onCancel: () => void
  onChange: (next: ClassDraft) => void
  onSave: () => void
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
  edit: EditHandle
}) {
  const canStart = cls.status === 'scheduled' || cls.status === 'live'
  /** The API refuses to edit an ended class, so don't offer it. */
  const canEdit = canStart
  /** The mentor never pressed End and the clock closed the room instead. */
  const autoEnded = cls.status === 'ended' && cls.storedStatus === 'live'

  return (
    <Card>
      <div className="row-between" style={{ marginBottom: '0.4rem' }}>
        <span className="tiny faint">
          {cls.skill ? (SKILL_LABELS[cls.skill as Skill] ?? cls.skill).toUpperCase() : 'LECTURE'}
        </span>
        <LiveStatusPill status={cls.status} />
      </div>

      <div className="strong">{cls.title}</div>

      <div className="row wrap" style={{ gap: '0.35rem', marginTop: '0.5rem' }}>
        <Pill>{formatDateTime(cls.scheduledAt)}</Pill>
        {cls.status === 'scheduled' && <Pill tone="brand">{formatRelative(cls.scheduledAt)}</Pill>}
        <Pill>{cls.durationMinutes} min</Pill>
        <Pill tone={cls.seatsTaken > 0 ? 'ok' : 'default'}>
          {cls.seatsTaken} / {cls.capacity} registered
        </Pill>
        {cls.hasRecording && <Pill tone="brand">Recording published</Pill>}
        {!cls.joinUrl && canStart && <Pill tone="warn">No room link</Pill>}
      </div>

      {autoEnded && (
        <div className="tiny faint" style={{ marginTop: '0.5rem' }}>
          Closed automatically — the join window ran out while it was still marked live.
        </div>
      )}

      <div className="row wrap" style={{ gap: '0.4rem', marginTop: '0.7rem' }}>
        {cls.status === 'scheduled' && (
          <button
            className="btn btn-record btn-sm"
            disabled={busy || !cls.joinUrl}
            onClick={() => onAction('start')}
            title={cls.joinUrl ? undefined : 'Add a room link first'}
          >
            Start
          </button>
        )}
        {cls.status === 'live' && (
          <>
            {cls.joinUrl && (
              <a
                className="btn btn-primary btn-sm"
                href={cls.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open room →
              </a>
            )}
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction('end')}>
              End
            </button>
          </>
        )}
        {canEdit && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={edit.draft ? edit.onCancel : edit.onOpen}
          >
            {edit.draft ? 'Close editor' : 'Edit'}
          </button>
        )}
        {(cls.status === 'scheduled' || cls.status === 'live') && (
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction('cancel')}>
            Cancel
          </button>
        )}
        {cls.status !== 'cancelled' && (
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            {cls.hasRecording ? 'Replace recording' : 'Publish recording'}
            <input
              type="file"
              accept="video/*"
              hidden
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                // Reset so picking the same file twice still fires onChange.
                e.target.value = ''
                if (file) onPublish(file)
              }}
            />
          </label>
        )}
        {cls.hasRecording && (
          <button
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => onAction('unpublish')}
          >
            Unpublish
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onToggle}>
          {expanded ? 'Hide roster' : 'Roster'}
        </button>
      </div>

      {edit.draft && (
        <div style={{ marginTop: '0.8rem' }}>
          {cls.seatsTaken > 0 && (
            <Alert tone="warn">
              {cls.seatsTaken} student{cls.seatsTaken > 1 ? 's have' : ' has'} already registered.
              They keep their seat, but nothing tells them you moved the time — say so in the room.
            </Alert>
          )}
          <ClassForm draft={edit.draft} onChange={edit.onChange} idPrefix={`lc-${cls.id}`} />
          <div className="row" style={{ gap: '0.4rem', marginTop: '0.7rem' }}>
            <button
              className="btn btn-primary btn-sm"
              disabled={edit.saving || edit.draft.title.trim().length < 4}
              onClick={edit.onSave}
            >
              {edit.saving ? 'Saving…' : 'Save changes'}
            </button>
            <button className="btn btn-ghost btn-sm" disabled={edit.saving} onClick={edit.onCancel}>
              Discard
            </button>
          </div>
        </div>
      )}

      {expanded && <ClassRoster classId={cls.id} />}
    </Card>
  )
}

/** Fetched only when opened — a mentor with 30 lectures shouldn't load 30 rosters. */
function ClassRoster({ classId }: { classId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['mentor-live-roster', classId],
    queryFn: () =>
      api.get<{ roster: RosterRow[]; attendedCount: number }>(`/live/mentor/classes/${classId}`),
  })

  if (isLoading) return <div style={{ marginTop: '0.7rem' }}><Loading rows={2} /></div>
  if (error) return <div style={{ marginTop: '0.7rem' }}><ErrorNote error={error} /></div>

  const roster = data?.roster ?? []

  return (
    <div className="stack-sm" style={{ marginTop: '0.7rem' }}>
      <div className="row-between tiny faint">
        <span>{roster.length} REGISTERED</span>
        <span>{data?.attendedCount ?? 0} ATTENDED LIVE</span>
      </div>
      {roster.length === 0 ? (
        <div className="tiny faint">Nobody has registered yet.</div>
      ) : (
        roster.map((r) => (
          <div key={r.studentId} className="row-between small">
            <div>
              <span className="strong">{r.name}</span>
              <span className="tiny faint"> · {r.cohort ?? 'no cohort'}</span>
            </div>
            <div className="row" style={{ gap: '0.25rem' }}>
              {r.attendedAt ? (
                <Pill tone="ok">Live</Pill>
              ) : (
                <Pill>{formatDate(r.registeredAt)}</Pill>
              )}
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
