import type { FastifyInstance } from 'fastify'
import { prisma } from '@skillflex/db'
import { grantConsentSchema, CURRENT_POLICY_VERSION } from '@skillflex/shared'
import { currentUser, requireAuth } from '../../lib/auth.js'

/**
 * DPDP Act 2023 surface.
 *
 * Two things the Act actually requires that are painful to retrofit: consent is
 * versioned (so you can prove WHAT someone agreed to), and withdrawal is a real
 * operation with a real consequence. Revoking video consent here schedules the
 * student's recordings for deletion instead of quietly doing nothing.
 */
export async function consentRoutes(app: FastifyInstance) {
  /** Current consent state, one row per scope (latest wins). */
  app.get('/', { preHandler: requireAuth }, async (request) => {
    const user = currentUser(request)
    const records = await prisma.consentRecord.findMany({
      where: { userId: user.sub },
      orderBy: { grantedAt: 'desc' },
    })

    const latest = new Map<string, (typeof records)[number]>()
    for (const r of records) if (!latest.has(r.scope)) latest.set(r.scope, r)

    return {
      policyVersion: CURRENT_POLICY_VERSION,
      consents: [...latest.values()].map((r) => ({
        scope: r.scope,
        granted: r.granted && !r.revokedAt,
        policyVersion: r.policyVersion,
        grantedAt: r.grantedAt,
        revokedAt: r.revokedAt,
        /** Set for under-18 students in the school segment. */
        guardian: r.guardianName ? { name: r.guardianName, email: r.guardianEmail } : null,
        /** True when consent was given against an older policy version. */
        needsRefresh: r.policyVersion !== CURRENT_POLICY_VERSION,
      })),
    }
  })

  /**
   * Grant or withdraw. Always an INSERT, never an update — the consent trail is
   * append-only, because "we changed the row" is not an audit trail.
   */
  app.post('/', { preHandler: requireAuth }, async (request, reply) => {
    const user = currentUser(request)
    const body = grantConsentSchema.parse(request.body)

    // One clock read for the whole row. grantedAt is this record's stamp (and the
    // ordering key for latest-wins above), so letting the DB default fill it while
    // revokedAt came from JS produced rows that read "revoked 3ms before granted".
    const decidedAt = new Date()

    const record = await prisma.consentRecord.create({
      data: {
        userId: user.sub,
        policyVersion: CURRENT_POLICY_VERSION,
        scope: body.scope,
        granted: body.granted,
        grantedAt: decidedAt,
        revokedAt: body.granted ? null : decidedAt,
        guardianName: body.guardianName ?? null,
        guardianEmail: body.guardianEmail ?? null,
      },
    })

    // Withdrawing video consent must actually do something. Bring every one of
    // this user's recordings forward to a 7-day deletion window; the retention
    // job then hard-deletes them.
    let scheduledForDeletion = 0
    if (body.scope === 'video_recording' && !body.granted) {
      const result = await prisma.mediaAsset.updateMany({
        where: { ownerUserId: user.sub, deletedAt: null },
        data: { retentionUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      })
      scheduledForDeletion = result.count
    }

    return reply.code(201).send({
      ok: true,
      scope: record.scope,
      granted: record.granted,
      scheduledForDeletion,
    })
  })

  /**
   * Data export (DPDP right to access). Deliberately excludes video bytes —
   * it returns playback references, not a 400 MB JSON payload.
   */
  app.get('/export', { preHandler: requireAuth }, async (request) => {
    const user = currentUser(request)
    const me = await prisma.user.findUnique({
      where: { id: user.sub },
      include: {
        consents: true,
        studentProfile: {
          include: {
            submissions: { include: { feedback: true, assignment: true } },
            weeklyPlans: true,
            switchEvents: true,
          },
        },
        mediaAssets: true,
      },
    })

    return {
      exportedAt: new Date().toISOString(),
      account: me ? { id: me.id, name: me.name, email: me.email, role: me.role } : null,
      consents: me?.consents ?? [],
      submissions:
        me?.studentProfile?.submissions.map((s) => ({
          assignment: s.assignment.title,
          submittedAt: s.submittedAt,
          status: s.status,
          feedback: s.feedback?.freeform ?? null,
        })) ?? [],
      weeklyPlans: me?.studentProfile?.weeklyPlans ?? [],
      mentorSwitches: me?.studentProfile?.switchEvents ?? [],
      recordings:
        me?.mediaAssets.map((m) => ({
          id: m.id,
          kind: m.kind,
          createdAt: m.createdAt,
          retentionUntil: m.retentionUntil,
          deleted: Boolean(m.deletedAt),
        })) ?? [],
    }
  })
}
