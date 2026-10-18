# SkillFlex

<p align="center">
  <strong>Learn. Practice. Get Human Feedback. Improve.</strong>
</p>

<p align="center">
  A multilingual, human-first soft-skills mentorship platform built for college students.
</p>

<p align="center">
  <a href="https://skillflex-avcoe.vercel.app">🚀 Live Demo</a>
  ·
  <a href="https://github.com/freefiremax/skillflex">💻 Repository</a>
  ·
  <a href="PROJECT_OVERVIEW.md">📋 Project Overview</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Fastify-5-000000?logo=fastify&logoColor=white" alt="Fastify">
  <img src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-3FCF8E?logo=postgresql&logoColor=white" alt="PostgreSQL">
</p>

---

## 🎯 The Problem

College students are often given soft-skills content, workshops, and generic assessments — but **learning content alone does not build communication skills**.

A student may watch a lesson on interviews or presentations, but still have no practical way to:

* practise the skill repeatedly
* receive individual feedback
* understand exactly what to improve
* work with a mentor who fits their language or learning style
* track improvement through actual practice

At the same time, automated AI scoring can turn complex human communication into a number without giving students meaningful human guidance.

---

# 💡 Our Solution — SkillFlex

**SkillFlex turns soft-skills learning into a continuous practice and mentorship loop.**

```text
Learn
  ↓
Practice
  ↓
Record
  ↓
Submit
  ↓
Human Mentor Review
  ↓
Structured Feedback
  ↓
Personalized Improvement Plan
  ↓
Practice Again
```

The core principle is simple:

> **Students are assessed by people, not by AI.**

AI can assist with product support and organize feedback-derived information, but it does **not** decide whether a student's communication performance is good or bad.

---

# 🚀 Why SkillFlex?

| Challenge                       | SkillFlex Approach                          |
| ------------------------------- | ------------------------------------------- |
| Passive video learning          | Converts lessons into practical assignments |
| No individual feedback          | Human mentors review submissions            |
| One mentor may not fit everyone | Students can switch mentors                 |
| Language barriers               | English, Hindi & Marathi support            |
| Generic improvement advice      | Feedback-derived weekly improvement plans   |
| Difficult to practise speaking  | Browser-based recording                     |
| Privacy concerns                | Student recordings remain private           |
| Colleges lack visibility        | Aggregate cohort-level reporting            |

---

# ✨ Key Features

## 👨‍🎓 Student Experience

### 📚 Multilingual Learning

Students can access learning content in:

* English
* Hindi
* Marathi

The platform is designed around the learner's language preference rather than treating language as an afterthought.

### 🎥 Practical Assignments

Instead of only watching lessons, students complete practical assignments.

For example:

```text
Lesson:
"How to introduce yourself"

        ↓

Assignment:
"Record your 60-second self-introduction"

        ↓

Human Mentor:
Reviews the submission

        ↓

Student:
Receives actionable feedback
```

### 🎬 Browser-Based Recording

Students can record assignments directly from the browser using their device camera and microphone.

No separate recording application is required.

### 👤 Human Mentor Assessment

Mentors review student submissions using structured rubrics.

Feedback can include:

* rubric scores
* strengths
* written feedback
* one recommended next step

### 🔄 Mentor Switching

Students are not permanently locked to one mentor.

They can discover mentors based on:

* language
* skill focus
* teaching preference

If the relationship is not working, the student can switch mentors while retaining their learning history.

### 🧠 Personalized Improvement Plans

Weekly improvement plans are derived from **actual mentor feedback**.

```text
Human Feedback
      ↓
Identify Improvement Areas
      ↓
Generate Practice Tasks
      ↓
Student Practices
```

The system does not invent an AI assessment of the student.

### 🎤 Pronunciation Practice

SkillFlex also provides lightweight pronunciation practice using browser speech capabilities.

This is intentionally separated from formal assessment.

It does not:

* generate student grades
* create mentor feedback
* influence mentor evaluations
* affect institutional reporting

### 🎥 Live Learning

Mentors can conduct one-to-many live lectures.

Students can:

* discover lectures
* register
* attend
* access recordings
* resume recorded sessions

---

# 🏫 For Colleges

SkillFlex follows a **B2B2C model**.

```text
              COLLEGE
                 │
          Provides access
                 │
                 ▼
             STUDENTS
                 │
                 ▼
        SkillFlex Platform
                 │
                 ▼
             MENTORS
```

Colleges can use SkillFlex to support structured soft-skills development while students remain the primary users of the learning experience.

### College capabilities

* Student management
* Cohort-level reporting
* Participation visibility
* Skill-development tracking
* Lecture management
* Aggregate progress insights

Student recordings and private practice data are not exposed as ordinary college dashboard content.

---

# 🧑‍🏫 Mentor Experience

Mentors receive a dedicated workflow for reviewing student work.

```text
Submission Queue
       ↓
Open Recording
       ↓
Evaluate Rubric
       ↓
Write Feedback
       ↓
Recommend Next Step
```

Mentors can manage their profile and coaching languages and participate in live learning sessions.

---

# 🏗️ System Architecture

SkillFlex is built as a TypeScript monorepo.

```text
┌──────────────────────────────┐
│       React 19 + Vite        │
│       Mobile-first PWA       │
└──────────────┬───────────────┘
               │
               │ REST API
               ▼
┌──────────────────────────────┐
│       Fastify API            │
│       Node.js + TypeScript   │
│       Zod + JWT              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Prisma ORM             │
│       PostgreSQL              │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       Private Media Storage  │
│       Signed Access          │
└──────────────────────────────┘
```

---

# 🛠️ Technology Stack

## Frontend

* **React 19**
* **Vite 6**
* **TypeScript**
* **React Router**
* **TanStack Query**
* **CSS**
* Progressive Web App architecture

## Backend

* **Node.js 20+**
* **Fastify 5**
* **TypeScript**
* **Zod**
* **JWT**
* **esbuild**

## Database

* **PostgreSQL**
* **Prisma 6**
* Supabase-compatible deployment

## Media

* Browser `MediaRecorder`
* Private media storage
* Signed upload/playback access

## Deployment

* Vercel

---

# 📁 Project Structure

```text
skillflex/
│
├── apps/
│   ├── api/
│   │   └── Fastify backend
│   │
│   └── web/
│       └── React 19 frontend
│
├── packages/
│   ├── db/
│   │   └── Prisma + database utilities
│   │
│   └── shared/
│       └── Shared types + validation
│
├── api/
│   └── Vercel API entry
│
├── docs/
│   ├── adr/
│   ├── data-model.md
│   └── dpdp-compliance.md
│
├── PROJECT_OVERVIEW.md
├── OVERALL_PROJECT_DETAILS.md
├── package.json
├── package-lock.json
└── vercel.json
```

---

# 🔐 Privacy by Design

Student recordings are treated as private learning data.

The intended production media flow is:

```text
Student Browser
      ↓
Signed Upload
      ↓
Private Storage
      ↓
Protected Media
      ↓
Authorized Playback
```

Access to submission recordings is controlled around the student and assigned mentor relationship.

SkillFlex also includes consent and data-export functionality.

---

# 🧩 Core Product Workflow

The main SkillFlex experience can be demonstrated in one continuous flow:

```text
STUDENT
   │
   ▼
Choose Lesson
   │
   ▼
Watch Learning Content
   │
   ▼
Open Assignment
   │
   ▼
Record Response
   │
   ▼
Submit
   │
   ▼
MENTOR
   │
   ▼
Review Recording
   │
   ▼
Give Structured Feedback
   │
   ▼
STUDENT
   │
   ▼
View Feedback
   │
   ▼
Follow Improvement Plan
   │
   ▼
Practise Again
```

This is the core vertical slice of the platform.

---

# 🧪 Demo Flow

For a hackathon demonstration, the recommended journey is:

### 1. Student

Open a lesson and understand the task.

### 2. Assignment

Record a practical response directly in the browser.

### 3. Submission

Submit the recording for review.

### 4. Mentor

Open the submission from the mentor review queue.

### 5. Human Evaluation

Provide rubric-based feedback, strengths, and a next step.

### 6. Student

Return to the student dashboard and view the feedback.

### 7. Improvement

View the resulting improvement plan.

### 8. Mentor Switching

Explore the mentor directory and switch mentor if required.

This demonstrates the **complete learning-feedback-improvement loop** instead of showing isolated screens.

---

# ⚡ Getting Started

## Requirements

Install:

* Node.js 20+
* npm 10+
* PostgreSQL / Supabase
* Git

## Clone

```bash
git clone https://github.com/freefiremax/skillflex.git
cd skillflex
```

## Install dependencies

```bash
npm install
```

## Configure environment

Create your environment file using:

```bash
cp .env.example .env
```

Configure the required database, authentication, media, and application variables.

## Database

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## Start development

```bash
npm run dev
```

The development environment runs:

```text
Frontend → http://localhost:5173
API      → http://localhost:4000
```

---

# 📦 Useful Commands

```bash
npm run dev
```

Start frontend and backend together.

```bash
npm run build
```

Typecheck and build the project.

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

Seed development/demo data.

```bash
npm run db:studio
```

Open Prisma Studio.

```bash
npm run db:reset
```

Reset and reseed the database.

---

# 🌐 Live Demo

**SkillFlex is available as a deployed web prototype:**

👉 https://skillflex-avcoe.vercel.app

For the hackathon presentation, use the live deployment together with the repository to demonstrate both the **working product** and its **technical implementation**.

---

# 📚 Documentation

| Document                                              | Purpose                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| [Project Overview](PROJECT_OVERVIEW.md)               | Product, architecture and implementation overview |
| [Overall Project Details](OVERALL_PROJECT_DETAILS.md) | Detailed technical and product documentation      |
| [Data Model](docs/data-model.md)                      | Database structure and relationships              |
| [DPDP Notes](docs/dpdp-compliance.md)                 | Consent, privacy and retention design             |
| [ADR](docs/adr/)                                      | Architecture decisions                            |

---

# 🏆 Hackathon Highlights

### Problem

Students need more than passive soft-skills content.

### Innovation

SkillFlex combines:

**learning + practical recording + human mentorship + mentor switching + feedback-derived improvement.**

### Technical Implementation

A full-stack TypeScript monorepo with:

* React 19
* Vite
* Fastify
* Prisma
* PostgreSQL
* JWT authentication
* Zod validation
* private media handling
* role-based experiences
* multilingual learning
* live lectures
* PWA architecture

### Human-Centered Design

The platform deliberately keeps **human mentors at the center of assessment**.

### Scalability Direction

The architecture separates:

* frontend
* API
* shared domain logic
* database
* media infrastructure

This allows individual components to evolve independently as the platform grows.

---

# 👥 Team

**SkillFlex — Team**

| Member                 | Role                                 |
| ---------------------- | ------------------------------------ |
| **Mohan Kakani**       | Developer / Product & Technical Lead |
| **Vaishnavi Arote**    | UI/UX & Presentation                 |
| **Ishpreetkaur Batra** | Speaker / Communication              |
| **Kshitij Kalasane**   | Co-Developer                         |

---

# 🔮 Future Scope

Potential next-stage development includes:

* 1:1 mentor sessions
* integrated video conferencing
* payments and invoicing
* notifications
* curriculum authoring
* expanded pronunciation analysis
* automated testing
* additional media providers
* institutional integrations

---

# 📌 Project Status

SkillFlex currently demonstrates a working end-to-end product direction covering:

* ✅ Student experience
* ✅ Mentor experience
* ✅ College experience
* ✅ Multilingual learning
* ✅ Assignment recording
* ✅ Human mentor feedback
* ✅ Improvement plans
* ✅ Mentor switching
* ✅ Live lectures
* ✅ Private media flow
* ✅ Practice modules
* ✅ Support assistant
* ✅ Consent and data-export surfaces

---

<p align="center">
  <strong>SkillFlex</strong>
</p>

<p align="center">
  Human mentorship for real-world skills.
</p>

<p align="center">
  <strong>Learn → Practice → Get Human Feedback → Improve</strong>
</p>
