import { useState, useRef } from 'react'
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
  recordingPlaybackUrl?: string | null
  recordingDurationSeconds?: number | null
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

interface RecordedLectureDraft {
  title: string
  description: string
  skill: Skill | ''
  language: Language
  durationMinutes: number
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

function emptyRecordedDraft(): RecordedLectureDraft {
  return {
    title: '',
    description: '',
    skill: '',
    language: 'en',
    durationMinutes: 45,
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Robust video uploader directly supporting R2 presigned PUTs and local storage,
 * with real-time byte & percentage progress reporting.
 */
async function uploadMediaFile(
  file: File,
  kind: 'lecture_recording',
  onProgress?: (percent: number, loaded: number, total: number) => void,
): Promise<{ mediaId: string; durationSeconds?: number }> {
  const contentType = file.type || 'video/mp4'
  const durationSeconds = await readVideoDuration(file)

  const ticket = await api.post<{
    mediaId: string
    uploadUrl: string
    headers: Record<string, string>
  }>('/media', {
    kind,
    contentType,
    ...(durationSeconds ? { durationSeconds } : {}),
  })

  if (/^https?:\/\//i.test(ticket.uploadUrl)) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', ticket.uploadUrl)
      xhr.setRequestHeader('Content-Type', contentType)
      if (ticket.headers) {
        for (const [k, v] of Object.entries(ticket.headers)) {
          if (k.toLowerCase() !== 'content-type') {
            xhr.setRequestHeader(k, v)
          }
        }
      }

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          const percent = Math.min(100, Math.round((evt.loaded / evt.total) * 100))
          onProgress(percent, evt.loaded, evt.total)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Video upload failed (${xhr.status}). Please check your connection and storage settings.`))
        }
      }

      xhr.onerror = () => {
        reject(new Error('Network error during video upload. Please check your internet connection.'))
      }

      xhr.send(file)
    })

    await api.post(`/media/${ticket.mediaId}/complete`, {
      sizeBytes: file.size,
      ...(durationSeconds ? { durationSeconds } : {}),
    })
  } else {
    // Local dev direct multipart upload
    await api.upload(`/media/${ticket.mediaId}/upload`, file, file.name)
  }

  return { mediaId: ticket.mediaId, durationSeconds }
}

export default function MentorLivePage() {
  const queryClient = useQueryClient()

  // Navigation mode: 'list' | 'schedule' | 'upload_recorded'
  const [viewMode, setViewMode] = useState<'list' | 'schedule' | 'upload_recorded'>('list')
  const [activeTab, setActiveTab] = useState<'scheduled' | 'recordings' | 'all'>('scheduled')

  const [expanded, setExpanded] = useState<string | null>(null)
  const [draft, setDraft] = useState<ClassDraft>(emptyDraft)
  const [saveRecording, setSaveRecording] = useState(true)
  const [editing, setEditing] = useState<{ id: string; draft: ClassDraft } | null>(null)

  // Upload Recorded Lecture state
  const [recDraft, setRecDraft] = useState<RecordedLectureDraft>(emptyRecordedDraft)
  const [recFile, setRecFile] = useState<File | null>(null)
  const [recDuration, setRecDuration] = useState<number | null>(null)
  const [uploadPercent, setUploadPercent] = useState<number>(0)
  const [uploadLoaded, setUploadLoaded] = useState<number>(0)
  const [uploadTotal, setUploadTotal] = useState<number>(0)
  const [uploadStatusText, setUploadStatusText] = useState<string>('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)

  // Modal for uploading/replacing recording on an existing class
  const [attachModalClass, setAttachModalClass] = useState<MentorClassView | null>(null)
  const [attachFile, setAttachFile] = useState<File | null>(null)
  const [attachPercent, setAttachPercent] = useState<number>(0)
  const [isAttaching, setIsAttaching] = useState<boolean>(false)
  const [attachError, setAttachError] = useState<string | null>(null)

  // Video playback modal
  const [playingVideo, setPlayingVideo] = useState<{ title: string; url: string } | null>(null)

  const classes = useQuery({
    queryKey: ['mentor-live-classes'],
    queryFn: () =>
      api.get<{ upcoming: MentorClassView[]; past: MentorClassView[] }>('/live/mentor/classes'),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['mentor-live-classes'] })

  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>('/live/classes', draftToPayload(draft)),
    onSuccess: async () => {
      setViewMode('list')
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

  // Handle file selection in Upload Recorded Lecture view
  const handleRecFileSelect = async (file: File) => {
    setRecFile(file)
    setUploadError(null)
    const duration = await readVideoDuration(file)
    if (duration) {
      setRecDuration(duration)
      setRecDraft((prev) => ({
        ...prev,
        durationMinutes: Math.max(1, Math.round(duration / 60)),
        title: prev.title.trim() ? prev.title : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      }))
    } else {
      setRecDraft((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      }))
    }
  }

  // Submit dedicated recorded lecture upload
  const handleUploadRecordedLecture = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recFile) {
      setUploadError('Please select a video file to upload.')
      return
    }
    if (recDraft.title.trim().length < 3) {
      setUploadError('Please enter a descriptive lecture title (at least 3 characters).')
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)
      setUploadPercent(0)
      setUploadStatusText('Preparing secure upload to cloud storage...')

      const { mediaId, durationSeconds } = await uploadMediaFile(
        recFile,
        'lecture_recording',
        (pct, loaded, total) => {
          setUploadPercent(pct)
          setUploadLoaded(loaded)
          setUploadTotal(total)
          setUploadStatusText(`Uploading video: ${pct}% (${formatBytes(loaded)} / ${formatBytes(total)})`)
        },
      )

      setUploadStatusText('Video uploaded! Finalizing lecture in library...')

      await api.post('/live/recorded-lectures', {
        title: recDraft.title.trim(),
        description: recDraft.description.trim() || undefined,
        skill: recDraft.skill || undefined,
        language: recDraft.language,
        mediaId,
        durationMinutes: recDraft.durationMinutes || (durationSeconds ? Math.max(1, Math.round(durationSeconds / 60)) : 45),
      })

      // Reset and redirect to list
      setIsUploading(false)
      setRecFile(null)
      setRecDraft(emptyRecordedDraft())
      setViewMode('list')
      setActiveTab('recordings')
      await invalidate()
    } catch (err) {
      setIsUploading(false)
      setUploadError((err as Error).message || 'Failed to upload recorded lecture.')
    }
  }

  // Submit attach/replace recording modal on existing class
  const handleAttachRecording = async () => {
    if (!attachModalClass || !attachFile) return
    try {
      setIsAttaching(true)
      setAttachError(null)
      setAttachPercent(0)

      const { mediaId, durationSeconds } = await uploadMediaFile(
        attachFile,
        'lecture_recording',
        (pct) => setAttachPercent(pct),
      )

      await api.post(`/live/classes/${attachModalClass.id}/recording`, {
        mediaId,
        ...(durationSeconds ? { durationSeconds } : {}),
      })

      setIsAttaching(false)
      setAttachModalClass(null)
      setAttachFile(null)
      await invalidate()
    } catch (err) {
      setIsAttaching(false)
      setAttachError((err as Error).message || 'Failed to upload recording.')
    }
  }

  const upcoming = classes.data?.upcoming ?? []
  const past = classes.data?.past ?? []
  const recordings = past.filter((c) => c.hasRecording)

  const cardProps = (c: MentorClassView) => ({
    cls: c,
    expanded: expanded === c.id,
    onToggle: () => setExpanded((prev) => (prev === c.id ? null : c.id)),
    onAction: (verb: 'start' | 'end' | 'cancel' | 'unpublish') => action.mutate({ id: c.id, verb }),
    onOpenAttachModal: () => {
      setAttachModalClass(c)
      setAttachFile(null)
      setAttachPercent(0)
      setAttachError(null)
    },
    onWatchRecording: (title: string, url: string) => setPlayingVideo({ title, url }),
    busy: action.isPending || isAttaching,
    edit: {
      draft: editing?.id === c.id ? editing.draft : null,
      saving: update.isPending,
      onOpen: () => setEditing({ id: c.id, draft: draftFrom(c) }),
      onCancel: () => setEditing(null),
      onChange: (d: ClassDraft) => setEditing({ id: c.id, draft: d }),
      onSave: () => editing && update.mutate(editing),
    },
  })

  // ---------------------------------------------------------------------------
  // VIEW: Upload Dedicated Recorded Lecture
  // ---------------------------------------------------------------------------
  if (viewMode === 'upload_recorded') {
    return (
      <div className="master-container">
        <section className="master-hero">
          <div className="master-hero-copy">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--master-green)', fontWeight: 800, fontSize: '13px', letterSpacing: '1px', marginBottom: '8px' }}>
              <span>⬆ ON-DEMAND LEARNING</span>
            </div>
            <h1>Upload a recorded lecture</h1>
            <p>
              Upload pre-recorded workshops, tutorial videos, or past offline sessions straight to the student library. Students can watch anytime and practice on their own schedule.
            </p>
            <div className="master-hero-features">
              <div className="master-feature-item">
                <span className="master-feature-icon">☁️</span>
                <div>Cloudflare R2<br />High-speed playback</div>
              </div>
              <div className="master-feature-item">
                <span className="master-feature-icon">▶</span>
                <div>Instant Library<br />Access for students</div>
              </div>
              <div className="master-feature-item">
                <span className="master-feature-icon">📊</span>
                <div>Watch Time<br />Analytics tracked</div>
              </div>
            </div>
          </div>
          <div
            style={{
              width: '100%',
              minHeight: '220px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '80px',
              boxShadow: 'var(--master-shadow-soft)',
            }}
          >
            🎬
          </div>
        </section>

        <div className="master-2col">
          {/* Lecture Form */}
          <article className="master-card">
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>Lecture Details & Media</h2>
            <div style={{ color: 'var(--master-muted)', marginBottom: '22px', fontSize: '15px' }}>
              Add a title, skill, and your recorded video file below.
            </div>

            {uploadError && <Alert tone="warn">{uploadError}</Alert>}

            <form onSubmit={handleUploadRecordedLecture}>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                  Lecture Title *
                </label>
                <input
                  className="master-input"
                  value={recDraft.title}
                  onChange={(e) => setRecDraft({ ...recDraft, title: e.target.value })}
                  placeholder="e.g. Masterclass: Technical Interview Fundamentals & Confidence"
                  disabled={isUploading}
                  required
                />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                  Description / Key Takeaways
                </label>
                <textarea
                  className="master-textarea"
                  value={recDraft.description}
                  onChange={(e) => setRecDraft({ ...recDraft, description: e.target.value })}
                  placeholder="Summarize what learners will take away from this recorded session..."
                  rows={3}
                  disabled={isUploading}
                />
              </div>

              {/* Video File Dropzone */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                  Video File * (.mp4, .webm, .mov)
                </label>

                {!recFile ? (
                  <label
                    style={{
                      display: 'block',
                      border: '2px dashed #93c5fd',
                      background: '#f8fafc',
                      borderRadius: '16px',
                      padding: '32px 20px',
                      textAlign: 'center',
                      cursor: isUploading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const file = e.dataTransfer.files?.[0]
                      if (file) handleRecFileSelect(file)
                    }}
                  >
                    <div style={{ fontSize: '38px', marginBottom: '8px' }}>📁</div>
                    <div style={{ fontWeight: 800, fontSize: '16px', color: '#1e40af', marginBottom: '4px' }}>
                      Click to choose video or drag and drop
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      Supports MP4, WebM, MOV up to 1GB. Uploads straight to cloud storage.
                    </div>
                    <input
                      type="file"
                      accept="video/*"
                      hidden
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleRecFileSelect(file)
                      }}
                    />
                  </label>
                ) : (
                  <div
                    style={{
                      border: '1px solid #bfdbfe',
                      background: '#eff6ff',
                      borderRadius: '16px',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>🎬</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e3a8a' }}>{recFile.name}</div>
                          <div style={{ fontSize: '13px', color: '#3b82f6', display: 'flex', gap: '8px' }}>
                            <span>{formatBytes(recFile.size)}</span>
                            {recDuration && <span>· {formatDuration(recDuration)}</span>}
                          </div>
                        </div>
                      </div>
                      {!isUploading && (
                        <button
                          type="button"
                          className="master-chip"
                          style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                          onClick={() => {
                            setRecFile(null)
                            setRecDuration(null)
                          }}
                        >
                          Change
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div style={{ marginBottom: '22px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '14px', marginBottom: '8px', color: '#166534' }}>
                    <span>{uploadStatusText}</span>
                    <span>{uploadPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '10px', background: '#dcfce7', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${uploadPercent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #22c55e, #10b981)',
                        borderRadius: '999px',
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Skills and Language */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                  Skill Topic
                </label>
                <div className="master-chips">
                  {SKILLS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`master-chip ${recDraft.skill === s ? 'active' : ''}`}
                      onClick={() => setRecDraft({ ...recDraft, skill: recDraft.skill === s ? '' : s })}
                      disabled={isUploading}
                    >
                      {recDraft.skill === s ? `✓ ${SKILL_LABELS[s]}` : SKILL_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '14px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 750, color: '#4a596e', marginBottom: '8px' }}>
                    Language *
                  </label>
                  <select
                    className="master-select"
                    value={recDraft.language}
                    onChange={(e) => setRecDraft({ ...recDraft, language: e.target.value as Language })}
                    disabled={isUploading}
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
                    Duration (Minutes)
                  </label>
                  <input
                    className="master-input"
                    type="number"
                    min={1}
                    max={480}
                    value={recDraft.durationMinutes}
                    onChange={(e) => setRecDraft({ ...recDraft, durationMinutes: Number(e.target.value) })}
                    disabled={isUploading}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  className="master-btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '16px', fontSize: '16px' }}
                  disabled={isUploading || !recFile || recDraft.title.trim().length < 3}
                >
                  {isUploading ? 'Uploading to cloud…' : '⬆ Upload and publish to library'}
                </button>
                <button
                  type="button"
                  className="master-chip"
                  style={{ padding: '14px 22px' }}
                  onClick={() => {
                    setViewMode('list')
                    setRecFile(null)
                    setUploadError(null)
                  }}
                  disabled={isUploading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </article>

          {/* Sidebar */}
          <aside style={{ display: 'grid', gap: '20px' }}>
            <div className="master-card">
              <h3 style={{ fontSize: '20px', margin: '0 0 16px', fontWeight: 800 }}>💡 Best practices</h3>
              <div style={{ display: 'grid', gap: '12px', fontSize: '15px', color: '#4b5b71' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>High quality audio helps pronunciation learners</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Keep topics focused on actionable interview and communication skills</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Direct browser-to-R2 upload ensures zero bottleneck</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <b style={{ color: 'var(--master-green)' }}>✓</b>
                  <span>Students can resume right where they left off</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // VIEW: Schedule Live Lecture Form
  // ---------------------------------------------------------------------------
  if (viewMode === 'schedule') {
    return (
      <div className="master-container">
        <section className="master-hero">
          <div className="master-hero-copy">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--master-green)', fontWeight: 800, fontSize: '13px', letterSpacing: '1px', marginBottom: '8px' }}>
              <span>◉ LIVE LECTURE</span>
            </div>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '14px', marginBottom: '16px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '14px', marginBottom: '16px' }}>
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
                onClick={() => setViewMode('list')}
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
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // VIEW: Main Mentor Live & Recordings List
  // ---------------------------------------------------------------------------
  return (
    <div className="master-container">
      {/* Master Hero */}
      <section className="master-hero">
        <div className="master-hero-copy">
          <div style={{ color: 'var(--master-green)', fontWeight: 800, fontSize: '13px', letterSpacing: '1px', marginBottom: '8px' }}>
            🧑‍🏫 MENTOR STUDIO
          </div>
          <h1>Live & Recorded Lectures</h1>
          <p>
            Teach live classes to groups of students or upload recorded lectures directly to the student video library.
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

      {/* Action Buttons Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '16px', marginBottom: '28px' }}>
        <button
          type="button"
          className="master-btn-primary"
          style={{
            justifyContent: 'center',
            padding: '18px 24px',
            fontSize: '18px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.25)',
          }}
          onClick={() => setViewMode('upload_recorded')}
        >
          ⬆ Upload Recorded Lecture
        </button>

        <button
          type="button"
          className="master-btn-primary"
          style={{
            justifyContent: 'center',
            padding: '18px 24px',
            fontSize: '18px',
            background: 'linear-gradient(135deg, var(--master-green), var(--master-green-dark))',
            boxShadow: '0 8px 24px rgba(30, 80, 60, 0.25)',
          }}
          onClick={() => setViewMode('schedule')}
        >
          ＋ Schedule Live Lecture
        </button>
      </div>

      <ErrorNote error={classes.error ?? action.error ?? update.error} />

      {/* Tab Filter */}
      <nav className="master-tabs" style={{ marginBottom: '24px' }}>
        <button
          type="button"
          className={`master-tab ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          Upcoming & Live ({upcoming.length})
        </button>
        <button
          type="button"
          className={`master-tab ${activeTab === 'recordings' ? 'active' : ''}`}
          onClick={() => setActiveTab('recordings')}
        >
          Recorded Library ({recordings.length})
        </button>
        <button
          type="button"
          className={`master-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Sessions ({upcoming.length + past.length})
        </button>
      </nav>

      {/* Scheduled Section */}
      {(activeTab === 'scheduled' || activeTab === 'all') && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#56667a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Upcoming & Live Sessions
          </h2>

          {classes.isLoading ? (
            <Loading rows={2} />
          ) : upcoming.length === 0 ? (
            <div className="master-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: '#effaf5',
                  color: 'var(--master-green)',
                  fontSize: '30px',
                  margin: '0 auto 16px',
                }}
              >
                ◉
              </div>
              <h3 style={{ fontSize: '22px', margin: '0 0 8px', fontWeight: 800 }}>No upcoming live lectures</h3>
              <p style={{ fontSize: '15px', color: 'var(--master-muted)', maxWidth: '480px', margin: '0 auto 20px' }}>
                Schedule a live lecture with a video room or upload a recorded lecture anytime.
              </p>
              <button
                type="button"
                className="master-chip"
                style={{ padding: '10px 18px', fontWeight: 800 }}
                onClick={() => setViewMode('schedule')}
              >
                ＋ Schedule now
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {upcoming.map((c) => (
                <MentorClassCard key={c.id} {...cardProps(c)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recordings Section */}
      {(activeTab === 'recordings' || activeTab === 'all') && (
        <section style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#56667a', margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Recorded Lectures & Past Sessions
          </h2>

          {past.length === 0 ? (
            <div className="master-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '30px',
                  margin: '0 auto 16px',
                }}
              >
                📹
              </div>
              <h3 style={{ fontSize: '22px', margin: '0 0 8px', fontWeight: 800 }}>No recorded lectures yet</h3>
              <p style={{ fontSize: '15px', color: 'var(--master-muted)', maxWidth: '480px', margin: '0 auto 20px' }}>
                Upload pre-recorded sessions directly so students can watch and learn at their own pace.
              </p>
              <button
                type="button"
                className="master-chip"
                style={{ padding: '10px 18px', fontWeight: 800, color: '#2563eb', borderColor: '#bfdbfe' }}
                onClick={() => setViewMode('upload_recorded')}
              >
                ⬆ Upload a recorded lecture
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {(activeTab === 'recordings' ? recordings : past).map((c) => (
                <MentorClassCard key={c.id} {...cardProps(c)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Attach/Replace Recording Modal on Existing Class */}
      {attachModalClass && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
          }}
          onClick={() => !isAttaching && setAttachModalClass(null)}
        >
          <div
            className="master-card"
            style={{ width: '100%', maxWidth: '520px', margin: 0, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px' }}>
              {attachModalClass.hasRecording ? 'Replace Recording' : 'Upload Recording'}
            </h3>
            <div style={{ fontSize: '14px', color: 'var(--master-muted)', marginBottom: '16px' }}>
              For lecture: <strong>{attachModalClass.title}</strong>
            </div>

            {attachError && <Alert tone="warn">{attachError}</Alert>}

            {!attachFile ? (
              <label
                style={{
                  display: 'block',
                  border: '2px dashed #93c5fd',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  padding: '28px 16px',
                  textAlign: 'center',
                  cursor: isAttaching ? 'not-allowed' : 'pointer',
                  marginBottom: '20px',
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) setAttachFile(file)
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎥</div>
                <div style={{ fontWeight: 800, fontSize: '15px', color: '#1e40af', marginBottom: '4px' }}>
                  Select or drop video file
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  MP4, WebM, MOV. Uploads directly to cloud storage.
                </div>
                <input
                  type="file"
                  accept="video/*"
                  hidden
                  disabled={isAttaching}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setAttachFile(file)
                  }}
                />
              </label>
            ) : (
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e3a8a' }}>{attachFile.name}</div>
                  <div style={{ fontSize: '12px', color: '#3b82f6' }}>{formatBytes(attachFile.size)}</div>
                </div>
                {!isAttaching && (
                  <button
                    type="button"
                    className="master-chip"
                    style={{ color: '#ef4444' }}
                    onClick={() => setAttachFile(null)}
                  >
                    Change
                  </button>
                )}
              </div>
            )}

            {isAttaching && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, color: '#166534', marginBottom: '6px' }}>
                  <span>Uploading to cloud storage...</span>
                  <span>{attachPercent}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#dcfce7', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${attachPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #22c55e, #10b981)',
                      transition: 'width 0.2s ease',
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="master-chip"
                onClick={() => setAttachModalClass(null)}
                disabled={isAttaching}
              >
                Cancel
              </button>
              <button
                type="button"
                className="master-btn-primary"
                onClick={handleAttachRecording}
                disabled={isAttaching || !attachFile}
              >
                {isAttaching ? 'Uploading…' : 'Upload & Attach'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Playback Modal */}
      {playingVideo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1100,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
          }}
          onClick={() => setPlayingVideo(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '800px',
              background: '#0f172a',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', color: '#fff', borderBottom: '1px solid #1e293b' }}>
              <div style={{ fontWeight: 800, fontSize: '16px' }}>{playingVideo.title}</div>
              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '24px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <video
              src={playingVideo.url}
              controls
              autoPlay
              style={{ width: '100%', maxHeight: '70vh', background: '#000', display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function MentorClassCard({
  cls,
  expanded,
  onToggle,
  onAction,
  onOpenAttachModal,
  onWatchRecording,
  busy,
  edit,
}: {
  cls: MentorClassView
  expanded: boolean
  onToggle: () => void
  onAction: (verb: 'start' | 'end' | 'cancel' | 'unpublish') => void
  onOpenAttachModal: () => void
  onWatchRecording: (title: string, url: string) => void
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

      {cls.description && (
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px', lineHeight: 1.4 }}>
          {cls.description}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <Pill>{formatDateTime(cls.scheduledAt)}</Pill>
        {cls.status === 'scheduled' && <Pill tone="brand">{formatRelative(cls.scheduledAt)}</Pill>}
        <Pill>{cls.durationMinutes} min</Pill>
        <Pill tone={cls.seatsTaken > 0 ? 'ok' : 'default'}>
          {cls.seatsTaken} / {cls.capacity} registered
        </Pill>
        {cls.hasRecording && <Pill tone="brand">Recording in library</Pill>}
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

        {/* Watch recording button if published and playable */}
        {cls.hasRecording && cls.recordingPlaybackUrl && (
          <button
            type="button"
            className="master-btn-primary"
            style={{ padding: '6px 14px', fontSize: '14px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
            onClick={() => onWatchRecording(cls.title, cls.recordingPlaybackUrl!)}
          >
            ▶ Watch recording
          </button>
        )}

        {/* Upload or replace recording */}
        {cls.status !== 'cancelled' && (
          <button
            type="button"
            className="master-chip"
            style={{ fontWeight: 700 }}
            disabled={busy}
            onClick={onOpenAttachModal}
          >
            {cls.hasRecording ? 'Replace recording' : '⬆ Upload recording'}
          </button>
        )}

        {cls.hasRecording && (
          <button
            type="button"
            className="master-chip"
            style={{ color: '#ef4444' }}
            disabled={busy}
            onClick={() => onAction('unpublish')}
          >
            Unpublish
          </button>
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
