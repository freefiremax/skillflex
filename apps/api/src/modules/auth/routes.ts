import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { prisma, readList } from '@skillswitch/db'
import {
  registerSchema,
  loginSchema,
  CURRENT_POLICY_VERSION,
  type Language,
} from '@skillswitch/shared'
import { badRequest, conflict, currentUser, notFound, requireAuth, unauthorized } from '../../lib/auth.js'
import type { AuthUser } from '../../lib/auth.js'
import { assignInitialMentor } from '../mentorship/service.js'

export async function authRoutes(app: FastifyInstance) {
  /**
   * Registration. Students join a college by slug; mentors join the shared
   * cross-institutional pool and belong to no org.
   */
  app.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body)

    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) throw conflict('That email is already registered', 'EMAIL_TAKEN')

    // Students must consent to video recording — the core loop cannot run
    // without it, so refusing here is clearer than failing at upload time.
    if (body.role === 'student' && !body.consentVideoRecording) {
      throw badRequest(
        'Video recording consent is required to use the assignment loop',
        'CONSENT_REQUIRED',
      )
    }

    let orgId: string | null = null
    if (body.role === 'student' || body.role === 'college_admin') {
      if (!body.orgSlug) throw badRequest('orgSlug is required for this role', 'ORG_REQUIRED')
      const org = await prisma.organization.findUnique({ where: { slug: body.orgSlug } })
      if (!org) throw notFound(`No college found with code "${body.orgSlug}"`)
      orgId = org.id
    }

    const passwordHash = await bcrypt.hash(body.password, 10)

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: body.name, email: body.email, passwordHash, role: body.role },
      })

      if (orgId) {
        await tx.orgMembership.create({
          data: {
            orgId,
            userId: created.id,
            role: body.role === 'college_admin' ? 'college_admin' : 'student',
          },
        })
      }

      if (body.role === 'student') {
        await tx.studentProfile.create({
          data: {
            userId: created.id,
            preferredLanguages: body.preferredLanguages,
          },
        })
        await tx.consentRecord.create({
          data: {
            userId: created.id,
            policyVersion: CURRENT_POLICY_VERSION,
            scope: 'video_recording',
            granted: true,
            guardianName: body.guardianName ?? null,
            guardianEmail: body.guardianEmail ?? null,
          },
        })
      }

      if (body.role === 'mentor') {
        await tx.mentorProfile.create({
          // skills starts empty — the mentor fills it from their profile page.
          data: { userId: created.id, languages: body.preferredLanguages, skills: [] },
        })
      }

      return created
    })

    // Give students a mentor immediately — an empty dashboard on day one is
    // how you lose them before the loop ever starts.
    if (body.role === 'student') {
      await assignInitialMentor(user.id).catch((err) => {
        app.log.warn({ err, userId: user.id }, 'initial mentor assignment failed')
      })
    }

    const token = await signFor(app, user.id)
    return reply.code(201).send(token)
  })

  app.post('/login', async (request) => {
    const body = loginSchema.parse(request.body)
    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user || !user.isActive) throw unauthorized('Invalid email or password')

    const ok = await bcrypt.compare(body.password, user.passwordHash)
    if (!ok) throw unauthorized('Invalid email or password')

    return signFor(app, user.id)
  })

  app.get('/me', { preHandler: requireAuth }, async (request) => {
    const auth = currentUser(request)
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      include: {
        studentProfile: { include: { cohort: { include: { org: true } } } },
        mentorProfile: true,
        memberships: { include: { org: true } },
      },
    })
    if (!user) throw notFound('User no longer exists')

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      org: user.memberships[0]?.org
        ? { id: user.memberships[0].org.id, name: user.memberships[0].org.name }
        : null,
      student: user.studentProfile
        ? {
            id: user.studentProfile.id,
            preferredLanguages: readList(user.studentProfile.preferredLanguages) as Language[],
            cohort: user.studentProfile.cohort?.name ?? null,
          }
        : null,
      mentor: user.mentorProfile
        ? {
            id: user.mentorProfile.id,
            headline: user.mentorProfile.headline,
            // bio and isAcceptingStudents are returned because the mentor profile
            // form PATCHes them back. Omitting them meant the form posted an empty
            // bio and a hardcoded "accepting" flag on every save — wiping the bio
            // students read, and silently re-opening a mentor who had closed intake.
            bio: user.mentorProfile.bio,
            languages: readList(user.mentorProfile.languages) as Language[],
            skills: readList(user.mentorProfile.skills),
            maxActiveStudents: user.mentorProfile.maxActiveStudents,
            isAcceptingStudents: user.mentorProfile.isAcceptingStudents,
          }
        : null,
    }
  })
}

/** Builds the JWT payload, embedding profile ids so hot paths skip a lookup. */
async function signFor(app: FastifyInstance, userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { studentProfile: true, mentorProfile: true },
  })

  const payload: AuthUser = {
    sub: user.id,
    email: user.email,
    role: user.role as AuthUser['role'],
    ...(user.studentProfile ? { studentId: user.studentProfile.id } : {}),
    ...(user.mentorProfile ? { mentorId: user.mentorProfile.id } : {}),
  }

  return {
    token: app.jwt.sign(payload),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}
