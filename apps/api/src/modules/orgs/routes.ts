import type { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma, readList, readObjectList, readRecord } from '@skillswitch/db'
import { createOrgSchema, createCohortSchema, SKILL_LABELS, type Language } from '@skillswitch/shared'
import {
  conflict,
  currentUser,
  forbidden,
  notFound,
  requireRole,
} from '../../lib/auth.js'

/**
 * College admin + platform admin surface.
 *
 * The accreditation dashboard is the thing a college actually pays for: it
 * turns a term of mentor feedback into NAAC/NBA-shaped aggregate evidence that
 * "soft-skills training happened and improved outcomes" — without a single
 * student video leaving the tenant.
 */
export async function orgRoutes(app: FastifyInstance) {
  /** Platform admin provisions a college. */
  app.post('/', { preHandler: requireRole('platform_admin') }, async (request, reply) => {
    const body = createOrgSchema.parse(request.body)
    const existing = await prisma.organization.findUnique({ where: { slug: body.slug } })
    if (existing) throw conflict('That college code is taken', 'SLUG_TAKEN')

    const org = await prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: { name: body.name, slug: body.slug, state: body.state ?? null, city: body.city ?? null },
      })
      await tx.subscription.create({
        data: { orgId: created.id, seats: body.seats, status: 'trial' },
      })
      return created
    })

    return reply.code(201).send({ id: org.id, slug: org.slug })
  })

  /** A college admin creates a cohort inside their own org. */
  app.post('/cohorts', { preHandler: requireRole('college_admin') }, async (request, reply) => {
    const orgId = await adminOrgId(request)
    const body = createCohortSchema.parse(request.body)

    const cohort = await prisma.cohort.create({
      data: { orgId, name: body.name, year: body.year },
    })
    return reply.code(201).send({ id: cohort.id })
  })

  /** Roster: students in the admin's college, with engagement at a glance. */
  app.get('/students', { preHandler: requireRole('college_admin') }, async (request) => {
    const orgId = await adminOrgId(request)

    const memberships = await prisma.orgMembership.findMany({
      where: { orgId, role: 'student' },
      include: {
        user: {
          include: {
            studentProfile: {
              include: {
                cohort: true,
                submissions: { include: { feedback: true } },
                mentorAssignments: {
                  where: { endedAt: null },
                  include: { mentor: { include: { user: true } } },
                },
              },
            },
          },
        },
      },
    })

    return {
      students: memberships
        .filter((m) => m.user.studentProfile)
        .map((m) => {
          const sp = m.user.studentProfile!
          const reviewed = sp.submissions.filter((s) => s.feedback).length
          const current = sp.mentorAssignments[0]
          return {
            studentId: sp.id,
            name: m.user.name,
            email: m.user.email,
            cohort: sp.cohort?.name ?? null,
            languages: readList(sp.preferredLanguages) as Language[],
            submissions: sp.submissions.length,
            reviewed,
            currentMentor: current?.mentor.user.name ?? null,
          }
        }),
    }
  })

  /**
   * The accreditation report. Aggregate-only — average rubric scores per skill
   * across the cohort, submission/review counts, mentor-switch reasons rolled
   * up. No names, no video, nothing that identifies a student's performance.
   */
  app.get('/report', { preHandler: requireRole('college_admin') }, async (request) => {
    const orgId = await adminOrgId(request)

    const studentIds = (
      await prisma.orgMembership.findMany({
        where: { orgId, role: 'student' },
        include: { user: { include: { studentProfile: true } } },
      })
    )
      .map((m) => m.user.studentProfile?.id)
      .filter((id): id is string => Boolean(id))

    const feedback = await prisma.feedback.findMany({
      where: { submission: { studentId: { in: studentIds } } },
      include: { submission: { include: { assignment: true } } },
    })

    // Roll rubric scores up by criterion key, carrying a human label.
    const byKey = new Map<string, { label: string; sum: number; count: number }>()
    for (const f of feedback) {
      const scores = readRecord(f.rubricScores)
      const rubric = readObjectList<{ key: string; label: string }>(
        f.submission.assignment.rubric,
      )
      for (const [key, value] of Object.entries(scores)) {
        if (typeof value !== 'number') continue
        const label = rubric.find((c) => c.key === key)?.label ?? SKILL_LABELS[key as keyof typeof SKILL_LABELS] ?? key
        const bucket = byKey.get(key) ?? { label, sum: 0, count: 0 }
        bucket.sum += value
        bucket.count += 1
        byKey.set(key, bucket)
      }
    }

    const switchEvents = await prisma.mentorSwitchEvent.groupBy({
      by: ['reasonCode'],
      where: { studentId: { in: studentIds }, fromMentorId: { not: null } },
      _count: { reasonCode: true },
    })

    const totalSubmissions = await prisma.submission.count({
      where: { studentId: { in: studentIds } },
    })

    return {
      cohortSize: studentIds.length,
      totalSubmissions,
      totalReviewed: feedback.length,
      reviewRate: totalSubmissions === 0 ? 0 : Number((feedback.length / totalSubmissions).toFixed(2)),
      skillAverages: [...byKey.entries()].map(([key, b]) => ({
        key,
        label: b.label,
        average: Number((b.sum / b.count).toFixed(2)),
        sampleSize: b.count,
      })),
      switchReasons: switchEvents.map((s) => ({
        reasonCode: s.reasonCode,
        count: s._count.reasonCode,
      })),
      note: 'Aggregate metrics only. No student video or identifiable performance data is included in this report.',
    }
  })

  /** Subscription/seat status for the admin's college. */
  app.get('/subscription', { preHandler: requireRole('college_admin') }, async (request) => {
    const orgId = await adminOrgId(request)
    const [org, subscription, used] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId } }),
      prisma.subscription.findFirst({ where: { orgId }, orderBy: { startsAt: 'desc' } }),
      prisma.orgMembership.count({ where: { orgId, role: 'student' } }),
    ])
    if (!org) throw notFound('Organization not found')

    return {
      org: { id: org.id, name: org.name, slug: org.slug },
      seats: subscription?.seats ?? 0,
      seatsUsed: used,
      status: subscription?.status ?? 'none',
    }
  })
}

/**
 * Resolve the college_admin's org, refusing if they somehow admin none.
 * A college admin acts only within their own tenant — this is the boundary.
 */
async function adminOrgId(request: FastifyRequest): Promise<string> {
  const user = currentUser(request)
  const membership = await prisma.orgMembership.findFirst({
    where: { userId: user.sub, role: 'college_admin' },
  })
  if (!membership) throw forbidden('You do not administer any college')
  return membership.orgId
}
