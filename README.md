# SkillFlex

<p align="center">
  <strong>Human mentorship. Real practice. Measurable growth.</strong>
</p>

<p align="center">
  A multilingual soft-skills mentorship platform for Indian engineering students — built around one simple idea:
  <strong>students are assessed by people, not by AI.</strong>
</p>

<p align="center">
  <a href="https://skillflex-avcoe.vercel.app">Live Demo</a>
  ·
  <a href="https://github.com/freefiremax/skillflex/issues">Issues</a>
  ·
  <a href="PROJECT_OVERVIEW.md">Project Overview</a>
  ·
  <a href="docs/data-model.md">Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=111" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white" alt="Fastify">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-Supabase-3FCF8E?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Vercel-ready-000000?logo=vercel&logoColor=white" alt="Vercel">
</p>

---

## 🚀 What is SkillFlex?

**SkillFlex** is a B2B2C soft-skills mentorship platform designed for college students.

It combines:

* multilingual learning
* practical weekly assignments
* browser-based video recording
* human mentor assessment
* personalized improvement plans
* mentor switching
* live lectures
* pronunciation practice
* college-level progress reporting

The core learning loop is:

```text
Learn
  ↓
Practice
  ↓
Record
  ↓
Submit
  ↓
Human Feedback
  ↓
Personalized Plan
  ↓
Improve
  ↓
Switch Mentor when needed
```

> **AI can organize feedback. It does not judge the student.**

---

## ✨ What makes SkillFlex different?

| Feature                   | SkillFlex                                                |
| ------------------------- | -------------------------------------------------------- |
| 👤 Human assessment       | Mentors review student submissions and provide feedback  |
| 🌐 Multilingual           | English, Hindi and Marathi learning support              |
| 🎥 Video practice         | Students record assignments directly in the browser      |
| 🔁 Mentor switching       | Students can switch mentors without losing their history |
| 🧠 Personalized plans     | Improvement plans are derived from human mentor feedback |
| 🎤 Pronunciation practice | Browser-based syllable-level practice without scoring    |
| 🏫 College-first model    | Colleges subscribe for student seats                     |
| 🔒 Privacy-focused        | Student recordings remain private                        |

---

## 🎬 Product Demo

### Full Demo Video

> **Replace the link below with your final demo video URL.**

<p align="center">

<a href="VIDEO_LINK_HERE">

<img src="https://raw.githubusercontent.com/freefiremax/skillflex/main/apps/web/public/assets/master/lessons/hero-student.png" width="850" alt="Watch SkillFlex Demo">

</a>

</p>

<p align="center">
  <strong>▶ Watch the SkillFlex Demo</strong>
</p>

---

## 🖥️ Product Preview

### Student Experience

<p align="center">
  <img src="https://raw.githubusercontent.com/freefiremax/skillflex/main/apps/web/public/assets/master/lessons/hero-student.png" width="92%" alt="SkillFlex student experience">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/freefiremax/skillflex/main/apps/web/public/assets/master/feedback/feedback-hero.png" width="45%" alt="SkillFlex mentor feedback">
  <img src="https://raw.githubusercontent.com/freefiremax/skillflex/main/apps/web/public/assets/master/plan/plan-hero.png" width="45%" alt="SkillFlex personalized plan">
</p>

### Mentor Experience

<p align="center">
  <img src="https://raw.githubusercontent.com/freefiremax/skillflex/main/apps/web/public/assets/master/mentor-queue/queue-hero.png" width="45%" alt="SkillFlex mentor queue">
  <img src="https://raw.githubusercontent.com/freefiremax/skillflex/main/apps/web/public/assets/master/mentor-profile/mentor-profile.png" width="45%" alt="SkillFlex mentor profile">
</p>

### Live Learning

<p align="center">
  <img src="https://raw.githubusercontent.com/freefiremax/skillflex/main/apps/web/public/assets/master/live/live-hero.png" width="92%" alt="SkillFlex live learning">
</p>

---

# 🎯 Core Features

## For Students

* 📚 Multilingual lessons
* 📝 Weekly task-based assignments
* 🎥 Browser camera recording
* 🔐 Private video submissions
* 👤 Human mentor review
* 💬 Detailed mentor feedback
* 🧠 Personalized weekly plans
* 🔄 Mentor discovery and switching
* 🎥 Live lectures
* ▶️ On-demand lecture recordings
* 🎤 Pronunciation practice
* 🤖 AI-powered product support

## For Mentors

* 📥 Review queue
* 🎥 Student submission playback
* 📊 Rubric-based assessment
* 💬 Written feedback
* 👤 Mentor profiles
* 📅 Scheduling
* 🔴 Live lecture management
* 🧾 Student history

## For Colleges

* 🏫 College administration
* 📊 Cohort-level reporting
* 📈 Progress visibility
* 👥 Student management
* 🔒 Privacy-aware analytics
* 🎯 Institutional skill-development tracking

---

# 🧠 Human-First Assessment

SkillFlex is intentionally designed so that **AI is not the evaluator**.

A student's improvement plan is generated from actual mentor feedback.

```text
Student Submission
        ↓
Human Mentor Review
        ↓
Structured Feedback
        ↓
Weekly Improvement Plan
```

There is no AI-generated student score in this flow.

The pronunciation feature is also isolated from assessment:

* no score
* no accuracy percentage
* no mentor feedback creation
* no influence on weekly plans

This keeps practice assistance separate from human assessment.

---

# 🏗️ Architecture

SkillFlex is built as a TypeScript monorepo.

```text
                 ┌──────────────────────┐
                 │    React + Vite      │
                 │    Mobile-first PWA  │
                 └──────────┬───────────┘
                            │
                            │ API
                            ▼
                 ┌──────────────────────┐
                 │   Fastify API        │
                 │   Node.js + TS       │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Prisma ORM           │
                 │ PostgreSQL           │
                 │ Supabase             │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Private Media Storage│
                 │ Supabase Storage     │
                 └──────────────────────┘
```

---

# 📁 Project Structure

```text
skillflex/
│
├── api/
│   └── server.mjs
│
├── apps/
│   ├── api/
│   │   └── Fastify backend
│   │
│   └── web/
│       └── React PWA
│
├── packages/
│   ├── db/
│   │   └── Prisma + database utilities
│   │
│   └── shared/
│       └── Shared types + validation contracts
│
├── docs/
│   ├── adr/
│   ├── data-model.md
│   └── dpdp-compliance.md
│
├── PROJECT_OVERVIEW.md
├── OVERALL_PROJECT_DETAILS.md
├── package.json
└── vercel.json
```

---

# 🛠️ Tech Stack

### Frontend

* React 18
* Vite 6
* TypeScript
* TanStack Query
* React Router
* CSS
* Progressive Web App architecture

### Backend

* Node.js 20+
* Fastify 5
* TypeScript
* Zod
* JWT
* esbuild

### Database

* Prisma 6
* PostgreSQL
* Supabase

### Storage

* Supabase Storage
* Browser MediaRecorder
* Signed upload / playback flow

### Deployment

* Vercel

---

# ⚡ Getting Started

## Requirements

Make sure you have:

* Node.js 20+
* PostgreSQL / Supabase
* Git

## 1. Clone the repository

```bash
git clone https://github.com/freefiremax/skillflex.git
cd skillflex
```

## 2. Configure environment variables

Create your `.env` using the provided example:

```bash
cp .env.example .env
```

Add your PostgreSQL connection string and required environment variables.

## 3. Run setup

```bash
npm run setup
```

This will:

* install dependencies
* create the environment file
* generate Prisma Client
* push the database schema
* seed demo data

## 4. Start the development server

```bash
npm run dev
```

Open:

```text
Web  → http://localhost:5173
API  → http://localhost:4000
Health → http://localhost:4000/api/health
```

---

# 🔑 Demo Accounts

All seeded accounts use:

```text
password123
```

| Role           | Email                    | Purpose                     |
| -------------- | ------------------------ | --------------------------- |
| Student        | `rahul@student.avcoe.in` | Feedback + improvement plan |
| Student        | `priya@student.avcoe.in` | Assignment recording flow   |
| Mentor         | `anjali@skillflex.in`    | Mentor review queue         |
| College Admin  | `tpo@avcoe.in`           | College dashboard           |
| Platform Admin | `admin@skillflex.in`     | Platform provisioning       |

### Recommended Demo Flow

```text
Priya
 ↓
Record Assignment
 ↓
Submit Video
 ↓
Anjali — Mentor
 ↓
Review Submission
 ↓
Write Feedback
 ↓
Priya
 ↓
View Feedback
 ↓
View Improvement Plan
 ↓
Switch Mentor
```

---

# 📦 Useful Commands

```bash
npm run dev
```

Run frontend and backend together.

```bash
npm run build
```

Run typecheck and production builds.

```bash
npm run typecheck
```

Typecheck all workspaces.

```bash
npm run db:generate
```

Generate Prisma Client.

```bash
npm run db:push
```

Apply the Prisma schema.

```bash
npm run db:seed
```

Seed demo data.

```bash
npm run db:studio
```

Open Prisma Studio.

```bash
npm run db:reset
```

Reset and reseed the local database.

```bash
npm run vercel-build
```

Build for Vercel deployment.

---

# 🔐 Privacy & Data Design

SkillFlex treats student recordings as private data.

### Student video

In production, video does not need to travel through the main API server.

```text
Browser
   ↓
Signed Upload Ticket
   ↓
Supabase Storage
   ↓
Private Video
   ↓
Signed Playback
```

### College reporting

College dashboards are designed around **aggregate information** rather than exposing student recordings.

### Consent

Video consent is versioned and withdrawal triggers retention handling.

More details:

📄 [DPDP Compliance Notes](docs/dpdp-compliance.md)

---

# 🎤 Pronunciation Practice

SkillFlex includes a lightweight browser pronunciation drill.

The feature:

* uses the browser speech engine
* checks likely word/syllable issues
* provides practice guidance
* does not assign scores
* does not create mentor feedback
* does not influence improvement plans

The current implementation is intentionally syllable-level rather than phoneme-level.

---

# 🔄 Mentor Switching

Mentorship is not meant to become a permanent lock-in.

When a student changes mentors:

```text
Current Mentor
      ↓
Assignment Closed
      ↓
Switch Reason Recorded
      ↓
New Mentor Assigned
      ↓
Learning History Preserved
```

The previous mentorship relationship is retained rather than overwritten.

---

# 🎥 Video Architecture

Student assignments use the browser's native:

```text
MediaRecorder
getUserMedia
```

Production uploads use private storage and signed access.

This keeps large video payloads away from the main server request path and makes the system more practical for mobile users.

---

# ☁️ Deployment

SkillFlex is configured for deployment on **Vercel**.

The production setup can combine:

```text
React SPA
+
Fastify API
+
Prisma
+
Supabase PostgreSQL
+
Supabase Storage
```

Important production variables include:

```env
MEDIA_PROVIDER=supabase
NODE_ENV=production
JWT_SECRET=your-secret
SUPABASE_SERVICE_ROLE_KEY=server-only
```

Never expose the Supabase service-role key to the browser.

---

# 🗺️ Current Status

## P1 Vertical Slice

```text
Watch
  ↓
Record
  ↓
Human Feedback
  ↓
Derived Plan
  ↓
Switch Mentor
```

Current implementation includes:

✅ Student experience
✅ Mentor experience
✅ College dashboard
✅ Multilingual support
✅ Assignment recording
✅ Human feedback
✅ Personalized plans
✅ Mentor switching
✅ Live lectures
✅ Private media flow
✅ Pronunciation practice
✅ AI support surface
✅ Consent & retention surface

---

# 🚧 Planned Improvements

* 1:1 mentoring sessions
* Integrated video conferencing
* Payments & invoicing
* Email / push notifications
* Automated testing
* Curriculum authoring dashboard
* More advanced pronunciation analysis
* Human support ticketing
* Additional media/CDN providers

---

# 📚 Documentation

| Document                                              | Description                      |
| ----------------------------------------------------- | -------------------------------- |
| [Project Overview](PROJECT_OVERVIEW.md)               | Product and technical overview   |
| [Overall Project Details](OVERALL_PROJECT_DETAILS.md) | Detailed project context         |
| [Data Model](docs/data-model.md)                      | Database and product constraints |
| [DPDP Notes](docs/dpdp-compliance.md)                 | Consent and retention design     |
| [ADR 0001](docs/adr/0001-sqlite-dev-postgres-prod.md) | Database architecture decision   |

---

# 🤝 Contributing

Contributions, issues and product feedback are welcome.

Before submitting a pull request:

```bash
npm run typecheck
npm run build
```

For major product or architectural changes, opening an issue first is recommended.

---

# 🌐 Live Project

<p align="center">

### 🚀 SkillFlex

**Human mentorship for real-world skills.**

<a href="https://skillflex-avcoe.vercel.app">
  <strong>Visit SkillFlex →</strong>
</a>

</p>

---

<p align="center">
  Built to make soft-skills development more human, accessible and practical for students.
</p>

<p align="center">
  <strong>Learn. Practice. Get human feedback. Improve.</strong>
</p>
