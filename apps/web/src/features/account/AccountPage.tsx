import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CONSENT_SCOPES,
  CONSENT_SCOPE_LABELS,
  CURRENT_POLICY_VERSION,
  ROLE_LABELS,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type ConsentScope,
  type Language,
} from '@skillflex/shared'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useTranslation } from '../../lib/i18n'
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
  const { language, setLanguage, t } = useTranslation()
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
          ← {t('common.back')}
        </button>

        <h1>{t('account.withdraw_title')}</h1>
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
          {decide.isPending ? t('common.saving') : t('account.confirm_withdraw')}
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => setConfirming(null)}>
          {t('account.keep_as_is')}
        </button>
      </div>
    )
  }

  return (
    <div className="stack">
      <div>
        <h1>{t('account.title')}</h1>
        <p className="small">{t('account.subtitle')}</p>
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

      <div className="section-title">{t('account.pref_lang')}</div>
      <Card>
        <p className="small" style={{ marginBottom: '0.75rem' }}>
          {t('account.pref_lang_desc')}
        </p>
        <div className="row wrap" style={{ gap: '0.4rem' }}>
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = language === l
            return (
              <button
                key={l}
                type="button"
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setLanguage(l)}
              >
                {active ? `✓ ${LANGUAGE_LABELS[l]}` : LANGUAGE_LABELS[l]}
              </button>
            )
          })}
        </div>
      </Card>

      <div className="section-title">{t('account.consent')}</div>

      {stale && (
        <Alert tone="warn">
          {t('account.consent_updated')}
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
                    <Pill tone="warn">{t('account.reconfirm')}</Pill>
                  ) : granted ? (
                    <Pill tone="ok">{t('account.granted')}</Pill>
                  ) : (
                    <Pill>{t('account.not_granted')}</Pill>
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
                    {t('account.withdraw')}
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost btn-sm btn-block"
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ scope, granted: true })}
                  >
                    {needsRefresh ? t('account.reconfirm') : t('account.grant')}
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <div className="section-title">{t('account.your_data')}</div>
      <Card>
        <p className="small" style={{ marginBottom: '0.75rem' }}>
          {t('account.your_data_desc')}
        </p>
        <ErrorNote error={exportData.error} />
        <button
          className="btn btn-ghost btn-block btn-sm"
          disabled={exportData.isPending}
          onClick={() => exportData.mutate()}
        >
          {exportData.isPending ? t('account.preparing') : t('account.download_data')}
        </button>
      </Card>

      <button className="btn btn-ghost btn-block" onClick={signOut}>
        {t('common.sign_out')}
      </button>

      <div className="tiny faint center">
        SkillFlex · policy {CURRENT_POLICY_VERSION} · DPDP Act 2023
      </div>
    </div>
  )
}
