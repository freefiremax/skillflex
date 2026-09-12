import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Loading } from './components/ui'
import { AppShell } from './components/AppShell'
import { MascotGuide } from './components/MascotGuide'
import AuthPage from './features/auth/AuthPage'
import HomePage from './features/home/HomePage'
import LessonsPage from './features/learn/LessonsPage'
import AssignmentsPage from './features/learn/AssignmentsPage'
import LessonPage from './features/learn/LessonPage'
import RecordPage from './features/submit/RecordPage'
import FeedbackListPage from './features/feedback/FeedbackListPage'
import PlanPage from './features/plans/PlanPage'
import PracticePage from './features/practice/PracticePage'
import ProgressPage from './features/progress/ProgressPage'
import LeaderboardPage from './features/progress/LeaderboardPage'
import PetPage from './features/pet/PetPage'
import FunTimePage from './features/funtime/FunTimePage'
import SpellGamePage from './features/funtime/SpellGamePage'
import SentenceGamePage from './features/funtime/SentenceGamePage'
import SpeakGamePage from './features/funtime/SpeakGamePage'
import QuizGamePage from './features/funtime/QuizGamePage'
import AiSupportPage from './features/support/AiSupportPage'
import LanguagePage from './features/languages/LanguagePage'
import MentorPage from './features/mentorship/MentorPage'
import BrowseMentorsPage from './features/mentorship/BrowseMentorsPage'
import LivePage from './features/live/LivePage'
import LiveClassPage from './features/live/LiveClassPage'
import MentorQueuePage from './features/mentor-console/MentorQueuePage'
import MentorLivePage from './features/mentor-console/MentorLivePage'
import ReviewPage from './features/mentor-console/ReviewPage'
import MentorProfilePage from './features/mentor-console/MentorProfilePage'
import AdminPage from './features/admin/AdminPage'
import AccountPage from './features/account/AccountPage'

export default function App() {
  const { me, loading } = useAuth()

  if (loading) {
    return (
      <div className="shell" style={{ paddingTop: '4rem' }}>
        <Loading rows={4} />
      </div>
    )
  }

  if (!me) {
    return (
      <>
        <Routes>
          <Route path="/*" element={<AuthPage />} />
        </Routes>
        {/* The buddy greets you before you have an account to attach it to. */}
        <MascotGuide />
      </>
    )
  }

  return (
    <AppShell>
      <Routes>
        {me.role === 'student' && (
          <>
            <Route path="/" element={<HomePage />} />
            {/* Home is nothing but doors; these two are the lists it used to
                inline. Lessons has a bottom-nav tab of its own — it is the
                "Learn" the bar used to point at `/` for. */}
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            <Route path="/assignments/:id/record" element={<RecordPage />} />
            <Route path="/feedback" element={<FeedbackListPage />} />
            <Route path="/plan" element={<PlanPage />} />
            {/* No bottom-nav tab: AppShell's bar is capped at five and full.
                Reached from Home and from the buddy screen. */}
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />

            {/* The buddy, and the two things behind it. Each game is its own
                route rather than a mode on one page, so a round can be linked
                to and survives a reload. */}
            <Route path="/pet" element={<PetPage />} />
            <Route path="/fun-time" element={<FunTimePage />} />
            <Route path="/fun-time/spell" element={<SpellGamePage />} />
            <Route path="/fun-time/sentence" element={<SentenceGamePage />} />
            <Route path="/fun-time/speak" element={<SpeakGamePage />} />
            <Route path="/fun-time/quiz" element={<QuizGamePage />} />
            <Route path="/ai-support" element={<AiSupportPage />} />

            {/* Fun Time absorbed Battles. Kept as a redirect because the old
                path is in the wild — bookmarks, and anything already shared. */}
            <Route path="/battles" element={<Navigate to="/fun-time" replace />} />

            <Route path="/languages" element={<LanguagePage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/live/:id" element={<LiveClassPage />} />
            <Route path="/mentor" element={<MentorPage />} />
            <Route path="/mentor/browse" element={<BrowseMentorsPage />} />
          </>
        )}

        {me.role === 'mentor' && (
          <>
            <Route path="/" element={<MentorQueuePage />} />
            <Route path="/review/:id" element={<ReviewPage />} />
            <Route path="/live" element={<MentorLivePage />} />
            <Route path="/profile" element={<MentorProfilePage />} />
          </>
        )}

        {(me.role === 'college_admin' || me.role === 'platform_admin') && (
          <Route path="/" element={<AdminPage />} />
        )}

        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
