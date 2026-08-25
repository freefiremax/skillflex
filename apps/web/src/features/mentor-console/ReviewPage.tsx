import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { Alert, Card, ErrorNote, Loading } from '../../components/ui'

interface SubmissionDetail {
  id: string
  status: string
  note: string | null
  submittedAt: string | null
  student: string
  assignment: {
    id: string
    title: string
    brief: string
    rubric: Array<{ key: string; label: string; max: number }>
  }
  lesson: string
  playbackUrl: string | null
  feedback: { id: string; freeform: string; strengths: string | null; nextStep: string | null } | null
}

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [scores, setScores] = useState<Record<string, number>>({})
  const [freeform, setFreeform] = useState('')
  const [strengths, setStrengths] = useState('')
  const [nextStep, setNextStep] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => api.get<SubmissionDetail>(`/submissions/${id}`),
    enabled: Boolean(id),
  })

  const save = useMutation({
    mutationFn: () =>
      api.post('/feedback', {
        submissionId: id,
        rubricScores: scores,
        freeform: freeform.trim(),
        ...(strengths.trim() ? { strengths: strengths.trim() } : {}),
        ...(nextStep.trim() ? { nextStep: nextStep.trim() } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mentor-queue'] })
      navigate('/')
    },
  })

  if (isLoading) return <Loading rows={4} />
  if (error) return <ErrorNote error={error} />
  if (!data) return null

  const rubric = data.assignment.rubric
  const allScored = rubric.every((c) => typeof scores[c.key] === 'number')
  const canSubmit = allScored && freeform.trim().length >= 20

  return (
    <div className="stack">
      <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(-1)}>
        ← Queue
      </button>

      <div>
        <div className="tiny faint">{data.lesson}</div>
        <h1>{data.student}</h1>
        <p className="small">{data.assignment.title}</p>
      </div>

      {data.playbackUrl ? (
        <video className="video-frame" src={data.playbackUrl} controls playsInline />
      ) : (
        <Alert tone="error">The recording is missing or still processing.</Alert>
      )}

      {data.note && (
        <Card className="card-tight">
          <div className="tiny faint" style={{ marginBottom: '0.2rem' }}>STUDENT'S NOTE</div>
          <div className="small dim">{data.note}</div>
        </Card>
      )}

      <Card className="card-tight">
        <div className="tiny faint" style={{ marginBottom: '0.2rem' }}>THE BRIEF</div>
        <div className="small dim">{data.assignment.brief}</div>
      </Card>

      {data.feedback ? (
        <Alert tone="ok">You already reviewed this one.</Alert>
      ) : (
        <>
          <div className="section-title">Scores</div>
          <Card>
            <div className="stack">
              {rubric.map((c) => (
                <div key={c.key}>
                  <div className="row-between" style={{ marginBottom: '0.35rem' }}>
                    <span className="small strong">{c.label}</span>
                    <span className="tiny faint mono">
                      {scores[c.key] ?? '–'} / {c.max}
                    </span>
                  </div>
                  <div className="row" style={{ gap: '0.3rem' }}>
                    {Array.from({ length: c.max }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        className={`btn btn-sm ${scores[c.key] === n ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1, padding: '0.4rem 0' }}
                        onClick={() => setScores((s) => ({ ...s, [c.key]: n }))}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="section-title">Your feedback</div>
          <Card>
            {/* This is the trust-critical field. The placeholder pushes for
                specifics because "good job, keep practising" is what makes a
                mentorship product feel like a chatbot. */}
            <div className="field">
              <label htmlFor="freeform">What did you actually see? (required)</label>
              <textarea
                id="freeform"
                value={freeform}
                onChange={(e) => setFreeform(e.target.value)}
                placeholder="Be specific about what happened in the video — at 0:20 you looked away, your opening had no structure, etc."
              />
              <div className="hint">
                {freeform.trim().length < 20
                  ? `${20 - freeform.trim().length} more characters needed`
                  : `${freeform.trim().length} characters`}
              </div>
            </div>

            <div className="field">
              <label htmlFor="strengths">What worked (optional)</label>
              <textarea id="strengths" value={strengths} onChange={(e) => setStrengths(e.target.value)} style={{ minHeight: 70 }} />
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="nextStep">One next step (optional)</label>
              <textarea
                id="nextStep"
                value={nextStep}
                onChange={(e) => setNextStep(e.target.value)}
                placeholder="This becomes the first item on their weekly plan."
                style={{ minHeight: 70 }}
              />
              <div className="hint">
                Whatever you write here goes straight onto their plan, word for word.
              </div>
            </div>
          </Card>

          <ErrorNote error={save.error} />

          <button
            className="btn btn-primary btn-block"
            disabled={!canSubmit || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? 'Sending…' : 'Send feedback'}
          </button>
          {!allScored && <div className="tiny faint center">Score every criterion first.</div>}
        </>
      )}
    </div>
  )
}
