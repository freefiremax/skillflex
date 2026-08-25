import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { useRecorder } from '../../lib/useRecorder'
import { Alert, Card, ErrorNote, Loading, Pill, formatDuration } from '../../components/ui'

interface AssignmentDetail {
  id: string
  title: string
  brief: string
  maxDurationSeconds: number
  rubric: Array<{ key: string; label: string; max: number }>
  lesson: { id: string; title: string }
  mySubmission: {
    id: string
    status: string
    submittedAt: string | null
    playbackUrl: string | null
    hasFeedback: boolean
  } | null
}

export default function RecordPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['assignment', id],
    queryFn: () => api.get<AssignmentDetail>(`/curriculum/assignments/${id}`),
    enabled: Boolean(id),
  })

  const maxSeconds = data?.maxDurationSeconds ?? 120
  const rec = useRecorder(maxSeconds)

  /**
   * Submit is three steps on purpose: reserve a MediaAsset, push the bytes,
   * then attach it to a Submission. That's the same shape as the production
   * direct-to-CDN path — only step 2's destination changes.
   */
  const submit = useMutation({
    mutationFn: async () => {
      if (!rec.blob || !id) throw new Error('Nothing recorded yet')

      const ticket = await api.post<{ mediaId: string; uploadUrl: string }>('/media', {
        kind: 'submission_video',
        durationSeconds: rec.seconds,
      })

      const ext = rec.blob.type.includes('mp4') ? 'mp4' : 'webm'
      await api.upload(`/media/${ticket.mediaId}/upload`, rec.blob, `take.${ext}`)

      return api.post<{ id: string }>('/submissions', {
        assignmentId: id,
        mediaId: ticket.mediaId,
        ...(note.trim() ? { note: note.trim() } : {}),
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-week'] })
      await queryClient.invalidateQueries({ queryKey: ['assignment', id] })
      navigate('/')
    },
  })

  if (isLoading) return <Loading rows={3} />
  if (error) return <ErrorNote error={error} />
  if (!data) return null

  const alreadyReviewed = data.mySubmission?.hasFeedback

  return (
    <div className="stack">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div>
        <div className="tiny faint">{data.lesson.title}</div>
        <h1>{data.title}</h1>
        <p className="small">{data.brief}</p>
      </div>

      {alreadyReviewed && (
        <Alert tone="info">
          You already have feedback on this task. Recording again replaces your submission.
        </Alert>
      )}

      {/* --- Camera / preview ------------------------------------------- */}

      {rec.state === 'idle' && (
        <Card>
          <div className="stack">
            <div className="tiny faint">BEFORE YOU START</div>
            <div className="small dim">
              Find a quiet spot. Hold the phone at eye level. You get{' '}
              <span className="strong">{formatDuration(maxSeconds)}</span> — it stops on its own.
              Only your mentor watches this.
            </div>
            <button className="btn btn-primary btn-block" onClick={() => void rec.arm()}>
              Turn on camera
            </button>
          </div>
        </Card>
      )}

      {rec.state === 'denied' && (
        <>
          <Alert tone="error">{rec.error}</Alert>
          <button className="btn btn-ghost btn-block" onClick={() => void rec.arm()}>
            Try again
          </button>
        </>
      )}

      {(rec.state === 'ready' || rec.state === 'recording') && (
        <>
          <video ref={rec.previewRef} className="video-frame" playsInline muted autoPlay />

          <div className="row-between">
            <div className="row">
              {rec.state === 'recording' && <span className="rec-dot" />}
              <span className="mono strong">{formatDuration(rec.seconds)}</span>
              <span className="tiny faint">/ {formatDuration(maxSeconds)}</span>
            </div>
            {rec.state === 'recording' && <Pill tone="danger">Recording</Pill>}
          </div>

          {rec.state === 'ready' ? (
            <button className="btn btn-record btn-block" onClick={rec.start}>
              Start recording
            </button>
          ) : (
            <button className="btn btn-ghost btn-block" onClick={rec.stop}>
              Stop
            </button>
          )}
        </>
      )}

      {rec.state === 'stopped' && rec.blobUrl && (
        <>
          <video className="video-frame" src={rec.blobUrl} controls playsInline />

          <Card>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="note">Anything you want your mentor to know? (optional)</label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. I got stuck on the ending…"
                style={{ minHeight: 80 }}
              />
            </div>
          </Card>

          <ErrorNote error={submit.error} />

          <div className="row" style={{ gap: '0.6rem' }}>
            <button className="btn btn-ghost grow" onClick={rec.reset} disabled={submit.isPending}>
              Record again
            </button>
            <button
              className="btn btn-primary grow"
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
            >
              {submit.isPending ? 'Sending…' : 'Send to mentor'}
            </button>
          </div>

          {submit.isPending && (
            <div className="tiny faint center">
              Uploading your video — keep this screen open.
            </div>
          )}
        </>
      )}

      <div className="section-title">How you'll be scored</div>
      <Card className="card-tight">
        <div className="row wrap" style={{ gap: '0.35rem' }}>
          {data.rubric.map((c) => (
            <Pill key={c.key}>
              {c.label} /{c.max}
            </Pill>
          ))}
        </div>
        <div className="tiny faint" style={{ marginTop: '0.6rem' }}>
          A real mentor watches this and writes back. No AI scores your video.
        </div>
      </Card>
    </div>
  )
}
