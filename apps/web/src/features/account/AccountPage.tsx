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
import { Alert, ErrorNote, Loading, Pill, formatDate } from '../../components/ui'

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
  const stale = scopes.some((s) => s.granted && s.needsRefresh)

  if (confirming) {
    const scope = confirming
    const isDestructive = scope === DESTRUCTIVE_SCOPE
    return (
      <div className="master-container" style={{ maxWidth: '720px', margin: '0 auto' }}>
        <button
          type="button"
          className="master-chip"
          style={{ marginBottom: '16px' }}
          onClick={() => setConfirming(null)}
        >
          ← {t('common.back')}
        </button>

        <h1 style={{ fontSize: '32px', fontWeight: 850 }}>{t('account.withdraw_title')}</h1>
        <p style={{ color: 'var(--master-muted)', fontSize: '16px', marginBottom: '20px' }}>
          {CONSENT_SCOPE_LABELS[scope]}
        </p>

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

        <div style={{ display: 'grid', gap: '10px', marginTop: '20px' }}>
          <button
            type="button"
            className="master-btn-primary"
            style={{ background: '#c22a3a', justifyContent: 'center' }}
            disabled={decide.isPending}
            onClick={() => decide.mutate({ scope, granted: false })}
          >
            {decide.isPending ? t('common.saving') : t('account.confirm_withdraw')}
          </button>
          <button
            type="button"
            className="master-chip"
            style={{ textAlign: 'center', padding: '14px' }}
            onClick={() => setConfirming(null)}
          >
            {t('account.keep_as_is')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="master-container" style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div className="master-header">
        <h1 style={{ fontSize: '42px', letterSpacing: '-2px', margin: '0 0 8px' }}>
          {t('account.title')}
        </h1>
        <p className="master-lead" style={{ fontSize: '17px' }}>
          What we hold, why we hold it, and how to take it back.
        </p>
      </div>

      {notice && <Alert tone="ok">{notice}</Alert>}

      {/* Identity Card */}
      <section className="master-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '20px',
              background: 'linear-gradient(145deg, #d5f4e4, #9edabd)',
              display: 'grid',
              placeItems: 'center',
              fontSize: '28px',
              fontWeight: 850,
              color: 'var(--master-green-dark)',
              flexShrink: 0,
            }}
          >
            {me?.name ? me.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '20px', margin: '0 0 3px', fontWeight: 800 }}>{me?.name}</h2>
            <p style={{ margin: 0, color: 'var(--master-muted)', fontSize: '14px' }}>{me?.email}</p>
          </div>
          <div
            style={{
              marginLeft: 'auto',
              background: '#fff',
              border: '1px solid #e3d9f5',
              color: '#65409a',
              borderRadius: '20px',
              padding: '8px 14px',
              fontWeight: 800,
              fontSize: '13px',
            }}
          >
            {me ? ROLE_LABELS[me.role] : 'Student'}
          </div>
        </div>
        {me?.org && (
          <div
            style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid #edf4f0',
              color: 'var(--master-muted)',
              fontSize: '14px',
            }}
          >
            {me.org.name}
            {me.student?.cohort ? ` · ${me.student.cohort}` : ''}
          </div>
        )}
      </section>

      {/* Language Preference */}
      <div className="master-section-title" style={{ fontSize: '16px', margin: '24px 0 10px' }}>
        {t('account.pref_lang')}
      </div>
      <section className="master-card" style={{ padding: '18px', marginBottom: '16px' }}>
        <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--master-muted)' }}>
          {t('account.pref_lang_desc')}
        </p>
        <div className="master-chips" style={{ margin: 0 }}>
          {SUPPORTED_LANGUAGES.map((l) => {
            const active = language === l
            return (
              <button
                key={l}
                type="button"
                className={`master-chip ${active ? 'active' : ''}`}
                onClick={() => setLanguage(l)}
              >
                {active ? `✓ ${LANGUAGE_LABELS[l]}` : LANGUAGE_LABELS[l]}
              </button>
            )
          })}
        </div>
      </section>

      {/* Consent Section */}
      <div className="master-section-title" style={{ fontSize: '16px', margin: '24px 0 10px' }}>
        Consent
      </div>

      {stale && <Alert tone="warn">{t('account.consent_updated')}</Alert>}
      <ErrorNote error={consent.error} />

      {consent.isLoading ? (
        <Loading rows={3} />
      ) : (
        <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
          {CONSENT_SCOPES.map((scope) => {
            const s = scopes.find((x) => x.scope === scope)
            const granted = s?.granted ?? false
            const needsRefresh = Boolean(s?.granted && s.needsRefresh)
            const decidedAt = s ? (s.revokedAt ?? s.grantedAt) : null

            return (
              <article key={scope} className="master-card" style={{ padding: '18px', margin: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <h3 style={{ fontSize: '15px', lineHeight: 1.45, margin: 0, fontWeight: 750 }}>
                    {CONSENT_SCOPE_LABELS[scope]}
                  </h3>
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      background: granted ? '#dff7eb' : '#fff',
                      border: `1px solid ${granted ? '#bcebd3' : '#e5e7e8'}`,
                      borderRadius: '16px',
                      padding: '6px 12px',
                      color: granted ? 'var(--master-green-dark)' : '#59616c',
                      fontSize: '12px',
                      fontWeight: 800,
                    }}
                  >
                    {needsRefresh ? 'Needs update' : granted ? 'Granted' : 'Not granted'}
                  </span>
                </div>

                <div style={{ fontSize: '13px', color: 'var(--master-muted)', margin: '8px 0 12px' }}>
                  {decidedAt
                    ? `Decision recorded ${formatDate(decidedAt)} · policy ${s?.policyVersion}`
                    : 'No decision recorded yet'}
                </div>

                {granted && !needsRefresh ? (
                  <button
                    type="button"
                    className="master-chip"
                    style={{ width: '100%', textAlign: 'center' }}
                    onClick={() => setConfirming(scope)}
                  >
                    Revoke
                  </button>
                ) : (
                  <button
                    type="button"
                    className="master-btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                    disabled={decide.isPending}
                    onClick={() => decide.mutate({ scope, granted: true })}
                  >
                    {needsRefresh ? 'Reconfirm' : 'Grant'}
                  </button>
                )}
              </article>
            )
          })}
        </div>
      )}

      {/* Your Data Section */}
      <div className="master-section-title" style={{ fontSize: '16px', margin: '24px 0 10px' }}>
        Your data
      </div>
      <section className="master-card" style={{ padding: '18px', marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: 'var(--master-muted)', lineHeight: 1.5, margin: '0 0 14px' }}>
          Download everything we hold about you — profile, submissions, your mentors' written feedback, your plans, and the full consent log — as one JSON file.
        </p>
        <ErrorNote error={exportData.error} />
        <button
          type="button"
          className="master-chip"
          style={{ width: '100%', textAlign: 'center', padding: '12px' }}
          disabled={exportData.isPending}
          onClick={() => exportData.mutate()}
        >
          {exportData.isPending ? 'Preparing export...' : 'Download my data'}
        </button>
      </section>

      <button
        type="button"
        className="master-chip"
        style={{ width: '100%', textAlign: 'center', padding: '14px', fontWeight: 800, marginBottom: '20px' }}
        onClick={signOut}
      >
        {t('common.sign_out')}
      </button>

      <div style={{ textAlign: 'center', color: '#7b8088', fontSize: '12px', marginBottom: '32px' }}>
        SkillFlex · policy {CURRENT_POLICY_VERSION} · DPDP Act 2023
      </div>
    </div>
  )
}
