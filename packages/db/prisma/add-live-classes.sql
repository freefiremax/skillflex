-- Migration: Add live_classes and live_class_registrations tables
-- Run this in Supabase SQL Editor if prisma db push has not been run.

CREATE TABLE IF NOT EXISTS public.live_classes (
  id TEXT PRIMARY KEY,
  "mentorId" TEXT NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  "orgId" TEXT REFERENCES public.organizations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  skill TEXT,
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 45,
  capacity INTEGER NOT NULL DEFAULT 100,
  "joinUrl" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "recordingMediaId" TEXT REFERENCES public.media_assets(id) ON DELETE SET NULL,
  "recordingPublishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "live_classes_status_scheduledAt_idx" ON public.live_classes(status, "scheduledAt");
CREATE INDEX IF NOT EXISTS "live_classes_mentorId_scheduledAt_idx" ON public.live_classes("mentorId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "live_classes_recordingPublishedAt_idx" ON public.live_classes("recordingPublishedAt");

CREATE TABLE IF NOT EXISTS public.live_class_registrations (
  id TEXT PRIMARY KEY,
  "classId" TEXT NOT NULL REFERENCES public.live_classes(id) ON DELETE CASCADE,
  "studentId" TEXT NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attendedAt" TIMESTAMP(3),
  "watchedSeconds" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "live_class_registrations_classId_studentId_key" ON public.live_class_registrations("classId", "studentId");
CREATE INDEX IF NOT EXISTS "live_class_registrations_studentId_idx" ON public.live_class_registrations("studentId");

CREATE TABLE IF NOT EXISTS public.mentor_availability (
  id TEXT PRIMARY KEY,
  "mentorId" TEXT NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "isBooked" BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS "mentor_availability_mentorId_startsAt_idx" ON public.mentor_availability("mentorId", "startsAt");

CREATE TABLE IF NOT EXISTS public.live_sessions (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  "mentorId" TEXT NOT NULL REFERENCES public.mentor_profiles(id) ON DELETE CASCADE,
  "availabilityId" TEXT UNIQUE REFERENCES public.mentor_availability(id) ON DELETE SET NULL,
  "roomId" TEXT,
  status TEXT NOT NULL DEFAULT 'booked',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "live_sessions_studentId_idx" ON public.live_sessions("studentId");
CREATE INDEX IF NOT EXISTS "live_sessions_mentorId_idx" ON public.live_sessions("mentorId");
