import type { FastifyInstance } from 'fastify'
import { prisma, readObjectList } from '@skillswitch/db'
import { currentStudentId, requireRole } from '../../lib/auth.js'
import { buildWeeklyPlan, type PlanItem } from './service.js'

/**
 * Weekly improvement plan.
 *
 * The plan is DERIVED ONLY: it restructures feedback a human mentor already
 * wrote into a checklist. It never assesses the student and never invents
 * guidance — every item traces back to a real Feedback row via
 * sourceFeedbackIds. A plan with no source feedback is a generic to-do list,
 * which is exactly the commodity feature the concept warns against.
 */
export async function planRoutes(app: FastifyInstance) {
  /** The student's latest plan, generating one on demand if feedback is new. */
  app.get('/current', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const plan = await buildWeeklyPlan(studentId)
    if (!plan) {
      return {
        plan: null,
        message: 'No mentor feedback yet — your plan appears once a mentor reviews your work.',
      }
    }

    return {
      plan: {
        id: plan.id,
        weekOf: plan.weekOf,
        items: readObjectList<PlanItem>(plan.items),
        sourceFeedbackIds: readObjectList<string>(plan.sourceFeedbackIds),
        model: plan.model,
        derivedFromHumanFeedback: true,
      },
    }
  })

  /** Plan history. */
  app.get('/history', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const plans = await prisma.weeklyPlan.findMany({
      where: { studentId },
      orderBy: { weekOf: 'desc' },
    })

    return {
      plans: plans.map((p) => ({
        id: p.id,
        weekOf: p.weekOf,
        items: readObjectList<PlanItem>(p.items),
        sourceCount: readObjectList<string>(p.sourceFeedbackIds).length,
      })),
    }
  })

  /** Tick an item done. Purely the student's own progress tracking. */
  app.patch('/:id/items/:index', { preHandler: requireRole('student') }, async (request) => {
    const studentId = currentStudentId(request)
    const { id, index } = request.params as { id: string; index: string }
    const { done } = (request.body ?? {}) as { done?: boolean }

    const plan = await prisma.weeklyPlan.findFirst({ where: { id, studentId } })
    if (!plan) return { ok: false }

    const items = readObjectList<PlanItem>(plan.items)
    const i = Number(index)
    if (items[i]) items[i].done = Boolean(done)

    await prisma.weeklyPlan.update({ where: { id }, data: { items } })
    return { ok: true, items }
  })
}
