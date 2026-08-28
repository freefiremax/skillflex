# DPDP Act 2023 — what is implemented, and what isn't

SkillFlex collects **video of identifiable students**, most of them 18–22, some
younger. Under India's Digital Personal Data Protection Act 2023 that is personal
data on the sensitive end of the scale, and the college is not the only party with
obligations — we are the Data Fiduciary for the platform.

This document is deliberately split into what the code does today and what it
does not. The second list is the useful one.

## Roles

| Act term | Who |
| --- | --- |
| Data Principal | The student (or their guardian, if under 18) |
| Data Fiduciary | SkillFlex |
| Data Processor | The video provider (Bunny/Cloudflare), the hosting provider |
| Consent Manager | Not used |

The college is **not** a joint fiduciary in this design. It buys seats and
receives aggregate reports; it does not get access to student video. That
boundary is what makes the institutional sale defensible rather than a privacy
liability the college inherits.

## Implemented

### Versioned consent — `CURRENT_POLICY_VERSION`

Every `ConsentRecord` stores the policy version it was given against
(`2026-08-v1`). When the version bumps, existing consents surface as
`needsRefresh: true` and the account screen asks for re-confirmation. Being able
to prove *what* someone agreed to, not just *that* they agreed, is the part
retrofitting is painful.

Scopes are separate and independently revocable:

| Scope | What it covers |
| --- | --- |
| `video_recording` | Recording and storing practice video for human review |
| `data_processing` | Storing scores/feedback, sharing aggregate progress with the college |
| `marketing` | Product emails |

They are separate because bundling "let us store your video" with "let us email
you" is exactly the kind of blanket consent the Act is aimed at.

### Append-only consent trail

Grant, re-confirm and withdraw all INSERT a new row. Nothing is updated in place;
the latest row per scope is the current state. `revokedAt` is stamped on
withdrawal. `apps/api/src/modules/consent/routes.ts`.

### Withdrawal that actually does something

Withdrawing `video_recording` sets `retentionUntil = now + 7 days` on every
`MediaAsset` the user owns and returns the count to the UI, which states plainly
how many recordings are scheduled for deletion. The retention job then hard-deletes
the bytes.

A consent toggle that flips a boolean and changes nothing downstream is worse than
no toggle, because it converts an honest gap into a false claim.

### Retention set at creation, purged on schedule

`retentionUntil` is written when the `MediaAsset` row is created
(`SUBMISSION_RETENTION_DAYS = 365`), never inferred later.
`apps/api/src/jobs/retention.ts` runs at boot + hourly, and for each expired
asset: unlinks the file (ENOENT counts as success — the goal state is "bytes
gone"), then marks the row `deletedAt` / `status: 'deleted'` with
`localPath` and `playbackUrl` nulled. The row itself survives as proof the
deletion happened.

### Guardian consent for minors

Signup has a self-declared "I am under 18" checkbox which reveals a required
guardian name + email, stored on the consent record. Section 9 also bars tracking
and targeted advertising to children — there is none in the product, which is easy
to honour when there are no ads.

Note the shape of this: age is **self-declared and client-side only**. There is no
date-of-birth field on `registerSchema`, so the API cannot enforce that a minor
supplied guardian details — it only records them when the client sends them.

### Data access (export)

`GET /api/consent/export` returns the account, the full consent log, submissions
with their mentor feedback, weekly plans, mentor-switch history, and *references*
to recordings — never video bytes. The account screen downloads it as JSON.

### Purpose limitation in the college report

`GET /api/orgs/report` returns cohort-level aggregates only: skill averages with
sample sizes, submission/review counts, switch reasons rolled up. No names, no
per-student scores, no video, and the response carries a `note` field saying so
which the dashboard renders verbatim. A TPO who asks "can I watch the videos?"
gets the answer from the screen, not from a support ticket.

### Tenant boundary

`adminOrgId()` resolves a college admin's org from their own membership and
refuses if they administer none. Admin queries are always scoped by that org id —
never by a client-supplied one.

## Not implemented — known gaps

Stated plainly because a compliance claim that overstates itself is a liability.

1. **Erasure is scheduled, not immediate.** Withdrawal gives a 7-day window
   rather than deleting on the spot, and account deletion (as opposed to consent
   withdrawal) has no endpoint. Section 12(3) expects erasure on request.
2. **No grievance-redressal mechanism.** Section 13 requires a named contact and
   a response process. There is no endpoint, no SLA, no DPO named.
3. **Guardian consent is unverified, and age is self-declared.** The client asks
   "are you under 18?" and the server has no age field to check it against. Real
   verifiable parental consent needs a DOB on the register contract plus an
   out-of-band confirmation to the guardian's email — we send nothing to it.
4. **The webhook is unauthenticated.** `POST /api/media/webhook` accepts any
   caller. The handler says so in a comment; production must verify a provider
   signature header before this is exposed.
5. **No breach-notification path.** Section 8(6) requires notifying the Board and
   affected principals. Nothing exists.
6. **No encryption at rest for local dev storage.** `./storage` is plain files on
   disk. Acceptable for dev, not for anything real; a production provider gives
   encrypted storage and signed playback URLs.
7. **Playback URLs are not signed.** With the local provider, `/media/...` is
   served statically. Anyone with the path can fetch the file. Signed, expiring
   URLs are a `MediaProvider` implementation detail — and the reason that
   interface exists.
8. **No audit log of mentor access.** We do not record which mentor viewed which
   video when. For a product whose whole premise is "a human watches your video",
   that log is worth having on its own merits.
9. **Data residency is unenforced.** Indian student video should sit on Indian
   infrastructure. That is a provider-configuration decision nobody has made yet.
10. **Consent copy is not legal text.** `CONSENT_SCOPE_LABELS` is written to be
    understood by a 19-year-old on a phone. It has not been near a lawyer.

## Before a real pilot

In order of exposure: (4) webhook signature and (7) signed playback URLs, because
they are unauthorised-access paths to student video. Then (1) erasure and (2)
grievance redressal, which are the two the Act names most concretely. Then (9)
residency, which is a decision rather than an implementation.
