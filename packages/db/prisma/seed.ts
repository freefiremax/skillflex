/**
 * Seed a demo tenant end to end so the stack is explorable the moment it boots:
 * one college, a cohort, three mentors (different languages + skills), a few
 * students already auto-assigned, a two-track curriculum with assignments, and
 * a couple of submissions with real mentor feedback + a derived weekly plan.
 *
 * Every login below uses the password: password123
 */
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const PASSWORD = 'password123'

async function main() {
  console.log('Seeding SkillSwitch demo data...')
  const passwordHash = await bcrypt.hash(PASSWORD, 10)

  // --- Clean slate (dev only) --------------------------------------------
  await prisma.$transaction([
    prisma.weeklyPlan.deleteMany(),
    prisma.feedback.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.mentorSwitchEvent.deleteMany(),
    prisma.mentorAssignment.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.lessonAsset.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.module.deleteMany(),
    prisma.track.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.consentRecord.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.mentorProfile.deleteMany(),
    prisma.orgMembership.deleteMany(),
    prisma.cohort.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.organization.deleteMany(),
    prisma.user.deleteMany(),
  ])

  // --- College + cohort + subscription -----------------------------------
  const org = await prisma.organization.create({
    data: { name: 'Amrutvahini College of Engineering', slug: 'avcoe', state: 'Maharashtra', city: 'Sangamner' },
  })
  const cohort = await prisma.cohort.create({
    data: { orgId: org.id, name: 'TE Computer 2026', year: 2026 },
  })
  await prisma.subscription.create({
    data: { orgId: org.id, seats: 120, status: 'active', pricePerSeat: 50000 },
  })

  // --- Platform + college admin ------------------------------------------
  await prisma.user.create({
    data: { name: 'Platform Admin', email: 'admin@skillswitch.in', passwordHash, role: 'platform_admin' },
  })
  const collegeAdmin = await prisma.user.create({
    data: { name: 'Prof. Deshmukh', email: 'tpo@avcoe.in', passwordHash, role: 'college_admin' },
  })
  await prisma.orgMembership.create({
    data: { orgId: org.id, userId: collegeAdmin.id, role: 'college_admin' },
  })

  // --- Mentors (cross-institutional pool, NO org membership) -------------
  const mentorData = [
    {
      name: 'Anjali Rao',
      email: 'anjali@mentor.skillswitch.in',
      headline: 'Interview coach, ex-TCS',
      bio: 'Ten years taking freshers from campus to first offer. I go slow on fundamentals.',
      languages: ['en', 'hi'],
      skills: ['interview_answering', 'self_introduction', 'body_language'],
    },
    {
      name: 'Sagar Patil',
      email: 'sagar@mentor.skillswitch.in',
      headline: 'GD & presentation specialist (Marathi/Hindi)',
      bio: 'Marathi-first mentor. I fix the fear of speaking before we touch technique.',
      languages: ['mr', 'hi', 'en'],
      skills: ['group_discussion', 'presentation', 'teamwork'],
    },
    {
      name: 'Neha Verma',
      email: 'neha@mentor.skillswitch.in',
      headline: 'Written & email communication',
      bio: 'Corporate comms trainer. Emails, conflict conversations, the awkward stuff.',
      languages: ['en', 'hi'],
      skills: ['email_writing', 'conflict_handling', 'self_introduction'],
    },
  ]

  const mentors = []
  for (const m of mentorData) {
    const user = await prisma.user.create({
      data: { name: m.name, email: m.email, passwordHash, role: 'mentor' },
    })
    const profile = await prisma.mentorProfile.create({
      data: {
        userId: user.id,
        headline: m.headline,
        bio: m.bio,
        languages: m.languages,
        skills: m.skills,
        maxActiveStudents: 25,
      },
    })
    mentors.push(profile)
  }

  // --- Students (auto-assigned to a mentor by language overlap) ----------
  const studentData = [
    { name: 'Rahul Jadhav', email: 'rahul@student.avcoe.in', languages: ['mr', 'hi'] },
    { name: 'Priya Kulkarni', email: 'priya@student.avcoe.in', languages: ['en', 'hi'] },
    { name: 'Aditya Shinde', email: 'aditya@student.avcoe.in', languages: ['hi', 'en'] },
  ]

  const students = []
  for (const s of studentData) {
    const user = await prisma.user.create({
      data: { name: s.name, email: s.email, passwordHash, role: 'student' },
    })
    await prisma.orgMembership.create({
      data: { orgId: org.id, userId: user.id, role: 'student' },
    })
    const profile = await prisma.studentProfile.create({
      data: { userId: user.id, cohortId: cohort.id, preferredLanguages: s.languages, branch: 'Computer' },
    })
    await prisma.consentRecord.create({
      data: { userId: user.id, policyVersion: '2026-08-v1', scope: 'video_recording', granted: true },
    })

    // Language-overlap assignment (mirrors assignInitialMentor's logic).
    const best = [...mentors]
      .map((m) => {
        const mentorLangs = m.languages as unknown as string[]
        const overlap = (s.languages as string[]).filter((l) => mentorLangs.includes(l)).length
        return { m, overlap }
      })
      .sort((a, b) => b.overlap - a.overlap)[0]!.m

    await prisma.mentorAssignment.create({ data: { studentId: profile.id, mentorId: best.id } })
    await prisma.mentorSwitchEvent.create({
      data: { studentId: profile.id, toMentorId: best.id, reasonCode: 'initial_assignment' },
    })
    students.push({ profile, mentorId: best.id })
  }

  // --- Curriculum --------------------------------------------------------
  const rubricSelfIntro = [
    { key: 'clarity', label: 'Clarity', max: 5 },
    { key: 'structure', label: 'Structure', max: 5 },
    { key: 'confidence', label: 'Confidence', max: 5 },
  ]
  const rubricGD = [
    { key: 'contribution', label: 'Contribution', max: 5 },
    { key: 'listening', label: 'Active Listening', max: 5 },
    { key: 'clarity', label: 'Clarity', max: 5 },
  ]

  const track = await prisma.track.create({
    data: {
      slug: 'placement-readiness',
      title: 'Placement Readiness',
      description: 'The campus-to-offer soft-skills track.',
      order: 0,
      isPublished: true,
    },
  })

  const moduleIntro = await prisma.module.create({
    data: { trackId: track.id, title: 'Introducing Yourself', order: 0, summary: 'Tell me about yourself, done right.' },
  })
  const lessonIntro = await prisma.lesson.create({
    data: { moduleId: moduleIntro.id, title: 'The 60-second self-introduction', order: 0, durationSeconds: 300 },
  })
  // Multilingual: one asset row per language (no real media in dev).
  for (const language of ['en', 'hi', 'mr']) {
    await prisma.lessonAsset.create({ data: { lessonId: lessonIntro.id, language } })
  }
  const assignmentIntro = await prisma.assignment.create({
    data: {
      lessonId: lessonIntro.id,
      title: 'Record your self-introduction',
      brief: 'Record a 60-second introduction as if the interviewer just said "tell me about yourself".',
      rubric: rubricSelfIntro,
      maxDurationSeconds: 90,
    },
  })

  const moduleGD = await prisma.module.create({
    data: { trackId: track.id, title: 'Group Discussions', order: 1, summary: 'Being heard without talking over people.' },
  })
  const lessonGD = await prisma.lesson.create({
    data: { moduleId: moduleGD.id, title: 'Entering a GD confidently', order: 0, durationSeconds: 360 },
  })
  for (const language of ['en', 'hi', 'mr']) {
    await prisma.lessonAsset.create({ data: { lessonId: lessonGD.id, language } })
  }
  await prisma.assignment.create({
    data: {
      lessonId: lessonGD.id,
      title: 'Make your GD opening',
      brief: 'Record a 45-second opening statement for a GD on "Is remote work here to stay?"',
      rubric: rubricGD,
      maxDurationSeconds: 60,
    },
  })

  // --- A reviewed submission + feedback + weekly plan (Rahul) -------------
  const rahul = students[0]!
  const media = await prisma.mediaAsset.create({
    data: {
      provider: 'local',
      kind: 'submission_video',
      status: 'ready',
      ownerUserId: (await prisma.studentProfile.findUniqueOrThrow({ where: { id: rahul.profile.id } })).userId,
      playbackUrl: '/media/submissions/demo-selfintro.webm',
      retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  })
  const submission = await prisma.submission.create({
    data: {
      assignmentId: assignmentIntro.id,
      studentId: rahul.profile.id,
      mediaId: media.id,
      status: 'reviewed',
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      note: 'Pehli baar record kiya, thoda nervous tha.',
    },
  })
  const feedback = await prisma.feedback.create({
    data: {
      submissionId: submission.id,
      mentorId: rahul.mentorId,
      rubricScores: { clarity: 4, structure: 2, confidence: 3 },
      freeform:
        'Good energy and your Marathi came through naturally. The problem is order — you jumped from hobbies to academics to projects and back. Pick one line each: who you are, what you build, what you want next.',
      strengths: 'Warm, genuine tone. You looked at the camera.',
      nextStep: 'Rerecord using a fixed 3-part structure: 1 line intro, 1 line strength, 1 line goal.',
    },
  })
  await prisma.weeklyPlan.create({
    data: {
      studentId: rahul.profile.id,
      weekOf: startOfWeek(new Date()),
      sourceFeedbackIds: [feedback.id],
      model: 'rule-based-v1',
      items: [
        {
          title: 'Rerecord using a fixed 3-part structure: 1 line intro, 1 line strength, 1 line goal.',
          why: 'Anjali Rao set this as your next step on "Record your self-introduction"',
          sourceFeedbackId: feedback.id,
          done: false,
        },
        {
          title: 'Practise structure — record one 60-second take this week',
          why: 'Anjali Rao scored you 2/5 on Structure in "Record your self-introduction"',
          sourceFeedbackId: feedback.id,
          done: false,
        },
      ],
    },
  })

  console.log(`
Seed complete.

  College:        Amrutvahini College of Engineering  (slug: avcoe)
  Password (all): ${PASSWORD}

  Platform admin  admin@skillswitch.in
  College admin   tpo@avcoe.in
  Mentors         anjali@mentor.skillswitch.in / sagar@... / neha@...
  Students        rahul@student.avcoe.in  (has feedback + a weekly plan)
                  priya@student.avcoe.in / aditya@student.avcoe.in
`)
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = copy.getDay()
  copy.setDate(copy.getDate() - ((day + 6) % 7))
  copy.setHours(0, 0, 0, 0)
  return copy
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
