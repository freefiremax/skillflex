import type { FastifyReply, FastifyRequest } from 'fastify'
import type { Role } from '@skillswitch/shared'

/** Shape of our JWT payload. */
export interface AuthUser {
  sub: string // user id
  email: string
  role: Role
  studentId?: string // StudentProfile.id when role === 'student'
  mentorId?: string // MentorProfile.id when role === 'mentor'
}

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthUser
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: AuthUser
    user: AuthUser
  }
}

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}

export const badRequest = (m: string, code?: string) => new HttpError(400, m, code)
export const unauthorized = (m = 'Not signed in') => new HttpError(401, m)
export const forbidden = (m = 'Not allowed') => new HttpError(403, m)
export const notFound = (m = 'Not found') => new HttpError(404, m)
export const conflict = (m: string, code?: string) => new HttpError(409, m, code)

/** preHandler: requires a valid token, populates request.auth. */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify()
    request.auth = request.user
  } catch {
    throw unauthorized()
  }
}

/** preHandler factory: requires auth AND one of the given roles. */
export function requireRole(...roles: Role[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    await requireAuth(request, reply)
    if (!request.auth || !roles.includes(request.auth.role)) {
      throw forbidden(`Requires role: ${roles.join(' or ')}`)
    }
  }
}

/** Narrowing helpers so route handlers stay free of non-null assertions. */
export function currentUser(request: FastifyRequest): AuthUser {
  if (!request.auth) throw unauthorized()
  return request.auth
}

export function currentStudentId(request: FastifyRequest): string {
  const user = currentUser(request)
  if (!user.studentId) throw forbidden('This account has no student profile')
  return user.studentId
}

export function currentMentorId(request: FastifyRequest): string {
  const user = currentUser(request)
  if (!user.mentorId) throw forbidden('This account has no mentor profile')
  return user.mentorId
}
