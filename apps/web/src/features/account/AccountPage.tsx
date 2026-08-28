import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CONSENT_SCOPES,
  CONSENT_SCOPE_LABELS,
  CURRENT_POLICY_VERSION,
  ROLE_LABELS,
  type ConsentScope,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { Alert, Card, ErrorNote, Loading, Pill, formatDate } from '../../components/ui'

interface ConsentState {
  policyVersion: string
  consents: Array<{
    scope: ConsentScope
    granted: boolean
    policyVersion: string
    grantedAt: string
    revokedAt: string | null
    guardian: { name: string; email: string | null } | null
    needsRefresh: boolean
  }>
}

/** Withdrawing this scope schedules the student's recordings for deletion. */
const DESTRUCTIVE_SCOPE: ConsentScope = 'video_recording'

export default function AccountPage() {
  const { me, signOut } = useAuth()
  const queryClient = useQueryClient()

  const [confirming, setConfirming] = useState<ConsentScope | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const consent = useQuery({
    queryKey: ['consent'],
    queryFn: () => api.get<ConsentState>('/consent'),
  })

  const decide = useMutation({
    mutationFn: (input: { scope: ConsentScope; granted: boolean }) =>
      api.post<{ scheduledForDeletion?: number }>('/consent', input),
    onSuccess: async (result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['consent'] })
      setConfirming(null)
      if (result.scheduledForDeletion) {
        setNotice(
          `${result.scheduledForDeletion} recording(s) scheduled for deletion within 7 days.`,
        )
      } else {
        setNotice(input.granted ? 'Consent recorded.' : 'Consent withdrawn.')
      }
    },
  })

  const exportData = useMutation({
    mutationFn: () => api.get<unknown>('/consent/export'),
    onSuccess: (data) => {
      // Client-side download — the export endpoint returns JSON, and we
      // deliberately don't stream video bytes into a data URL.
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'skillflex-my-data.json'
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  const scopes = consent.data?.consents ?? []
  // A stale policy version only matters for scopes the user actually granted —
  // nagging someone to "re-confirm" something they declined is nonsense.
  const stale = scopes.some((s) => s.granted && s.needsRefresh)

  if (confirming) {
    const scope = confirming
    const isDestructive = scope === DESTRUCTIVE_SCOPE
    return (
      <div className="stack">
        <button
          className="btn btn-ghost btn-sm"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setConfirming(null)}
        >
          ← Back
        </button>

        <h1>Withdraw consent?</h1>
        <p className="small">{CONSENT_SCOPE_LABELS[scope]}</p>

        {isDestructive ? (
          <Alert tone="error">
            This is not a soft toggle. Every video you've submitted gets scheduled for deletion
            within 7 days, and you won't be able to record new assignments. Your written feedback
            stays — the videos don't.
          </Alert>
        ) : (
          <Alert tone="warn">
            We record the withdrawal with a timestamp. You can grant it again any time.
          </Alert>
        )}

        <ErrorNote error={decide.error} />

        <button
          className="btn btn-danger btn-block"
          disabled={decide.isPending}
          onClick={() => decide.mutate({ scope, granted: false })}
        >
          {decide.isPending ? 'Recording…' : 'Yes, withdraw it'}
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => setConfirming(null)}>
          Keep it as is
        </button>
      </div>
    )
  }

  return (
    <div className="stack">
      <div>
        <h1>Your account</h1>
        <p className="small">What we hold, why we hold it, and how to take it back.</p>
      </div>

      {notice && <Alert tone="ok">{notice}</Alert>}

      <Card>
        <div className="row-between">
          <div>
            <div className="strong">{me?.name}</div>
            <div className="tiny faint">{me?.email}</div>
          </div>
          <Pill tone="brand">{me ? ROLE_LABELS[me.role] : ''}</Pill>
        </div>
        {me?.org && (
          <div className="tiny faint" style={{ marginTop: '0.5rem' }}>
            {me.org.name}
            {me.student?.cohort ? ` · ${me.student.cohort}` : ''}
          </div>
        )}
      </Card>

      <div className="section-title">Consent</div>

      {stale && (
        <Alert tone="warn">
          Our policy has been updated to {CURRENT_POLICY_VERSION}. Re-confirm the items marked below.
        </Alert>
      )}

      <ErrorNote error={consent.error} />

      {consent.isLoading ? (
        <Loading rows={3} />
      ) : (
        <div className="stack-sm">
          {CONSENT_SCOPES.map((scope) => {
            const s = scopes.find((x) => x.scope === scope)
            const granted = s?.granted ?? false
            const needsRefresh = Boolean(s?.granted && s.needsRefresh)
            const decidedAt = s ? (s.revokedAt ?? s.grantedAt) : null
            return (
              <Card key={scope} className="card-tight">
                <div className="row-between" style={{ marginBottom: '0.4rem' }}>
                  <span className="small strong">{CONSENT_SCOPE_LABELS[scope]}</span>
                  {needsRefresh ? (
                    <Pill tone="warn">Re-confirm</Pill>
                  ) : granted ? (
                    <Pill tone="ok">Granted</Pill>
                  ) : (
                    <Pill>Not granted</Pill>
                  )}
                </div>
                <div className="tiny faint" style={{ marginBottom: '0.5rem' }}>
                  {decidedAt
                    ? `Decided ${formatDate(decidedAt)} · policy ${s?.policyVersion}`
                    : 'No decision recorded yet'}
                </div>
                {granted && !needsRefresh ? (
                  <button
                    className="btn btn-ghost btn-sm btn-block"
                    onClick={() => setConfirming(scope)}
                  >
                    Withdraw
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm btn-block"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ scope, granted: true })}
                  >
                    {needsRefresh ? 'Re-confirm' : 'Grant'}
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <div className="section-title">Your data</div>
      <Card>
        <p className="small" style={{ marginBottom: '0.75rem' }}>
          Download everything we hold about you — profile, submissions, your mentors' written
          feedback, your plans, and the full consent log — as one JSON file.
        </p>
        <ErrorNote error={exportData.error} />
        <button
          className="btn btn-ghost btn-block btn-sm"
          disabled={exportData.isPending}
          onClick={() => exportData.mutate()}
        >
          {exportData.isPending ? 'Preparing…' : 'Download my data'}
        </button>
      </Card>

      <button className="btn btn-ghost btn-block" onClick={signOut}>
        Sign out
      </button>

      <div className="tiny faint center">
        SkillFlex · policy {CURRENT_POLICY_VERSION} · DPDP Act 2023
      </div>
    </div>
  )
}
