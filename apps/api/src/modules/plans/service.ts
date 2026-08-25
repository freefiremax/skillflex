import { prisma, readObjectList, readRecord } from '@skillswitch/db'
import type { RubricCriterion } from '@skillswitch/shared'

/**
 * A type alias, not an interface, on purpose: TypeScript only infers an implicit
 * index signature for aliases, and without one PlanItem[] is not assignable to
 * Prisma's InputJsonValue when writing the Json `items` column.
 */
export type PlanItem = {
  title: string
  /** Provenance shown in the UI: which mentor said this, and when. */
  why: string
  sourceFeedbackId: string
  done: boolean
}

/** Monday 00:00 of the week containing `d` — plans are keyed by week. */
function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  const diff = (day + 6) % 7 // Monday = 0
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/**
 * Build (or return) this week's plan for a student.
 *
 * This is the "AI" step, and in v1 it is deliberately a deterministic
 * restructurer rather than an LLM call: it takes the mentor's nextStep and
 * lowest rubric scores and turns them into an ordered checklist. No model is
 * invoked, so there is nothing that can hallucinate an assessment.
 *
 * Swapping in an LLM later means replacing composeItems() alone — the contract
 * (input: real Feedback rows, output: items each carrying a sourceFeedbackId)
 * stays the same, and that contract is what keeps AI in a derived-only role.
 */
export async function buildWeeklyPlan(studentId: string) {
  const weekOf = startOfWeek(new Date())

  const recentFeedback = await prisma.feedback.findMany({
    where: { submission: { studentId } },
    include: { submission: { include: { assignment: true } }, mentor: { include: { user: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // No human feedback means no plan. This is a hard rule, not a fallback.
  if (recentFeedback.length === 0) return null

  const sourceIds = recentFeedback.map((f) => f.id)
  const existing = await prisma.weeklyPlan.findFirst({
    where: { studentId, weekOf },
    orderBy: { version: 'desc' },
  })

  // Regenerate only if new feedback landed since the plan was built.
  if (existing) {
    const known = new Set(readObjectList<string>(existing.sourceFeedbackIds))
    const isStale = sourceIds.some((id) => !known.has(id))
    if (!isStale) return existing

    return prisma.weeklyPlan.create({
      data: {
        studentId,
        weekOf,
        version: existing.version + 1,
        sourceFeedbackIds: sourceIds,
        items: composeItems(recentFeedback),
        model: 'rule-based-v1',
      },
    })
  }

  return prisma.weeklyPlan.create({
    data: {
      studentId,
      weekOf,
      sourceFeedbackIds: sourceIds,
      items: composeItems(recentFeedback),
      model: 'rule-based-v1',
    },
  })
}

interface FeedbackWithContext {
  id: string
  createdAt: Date
  freeform: string
  nextStep: string | null
  strengths: string | null
  rubricScores: unknown
  mentor: { user: { name: string } }
  submission: { assignment: { title: string; rubric: unknown } }
}

/**
 * Turn mentor feedback into an ordered checklist.
 * Priority: explicit nextStep first (the mentor said it outright), then the
 * weakest rubric criteria (the mentor said it in numbers).
 */
function composeItems(feedback: FeedbackWithContext[]): PlanItem[] {
  const items: PlanItem[] = []

  for (const f of feedback) {
    const mentorName = f.mentor.user.name
    const assignment = f.submission.assignment.title

    if (f.nextStep && f.nextStep.trim().length > 0) {
      items.push({
        title: f.nextStep.trim(),
        why: `${mentorName} set this as your next step on "${assignment}"`,
        sourceFeedbackId: f.id,
        done: false,
      })
    }

    const rubric = readObjectList<RubricCriterion>(f.submission.assignment.rubric)
    const scores = readRecord(f.rubricScores)

    const weakest = rubric
      .map((c) => {
        const raw = scores[c.key]
        const score = typeof raw === 'number' ? raw : null
        return score === null ? null : { criterion: c, ratio: score / c.max, score }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .filter((x) => x.ratio < 0.7)
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 2)

    for (const w of weakest) {
      items.push({
        title: `Practise ${w.criterion.label.toLowerCase()} — record one 60-second take this week`,
        why: `${mentorName} scored you ${w.score}/${w.criterion.max} on ${w.criterion.label} in "${assignment}"`,
        sourceFeedbackId: f.id,
        done: false,
      })
    }
  }

  // Cap it. A 14-item plan is a plan nobody does.
  return dedupe(items).slice(0, 5)
}

function dedupe(items: PlanItem[]): PlanItem[] {
  const seen = new Set<string>()
  return items.filter((i) => {
    const key = i.title.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
