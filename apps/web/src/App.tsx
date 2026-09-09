import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Loading } from './components/ui'
import { AppShell } from './components/AppShell'
import { PetCompanion } from './components/PetCompanion'
import AuthPage from './features/auth/AuthPage'
import LearnPage from './features/learn/LearnPage'
import LessonPage from './features/learn/LessonPage'
import RecordPage from './features/submit/RecordPage'
import FeedbackListPage from './features/feedback/FeedbackListPage'
import PlanPage from './features/plans/PlanPage'
import PracticePage from './features/practice/PracticePage'
import ProgressPage from './features/progress/ProgressPage'
import LeaderboardPage from './features/progress/LeaderboardPage'
import BattlePage from './features/battles/BattlePage'
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
        <PetCompanion />
      </>
    )
  }

  return (
    <AppShell>
      <Routes>
        {me.role === 'student' && (
          <>
            <Route path="/" element={<LearnPage />} />
            <Route path="/lessons/:id" element={<LessonPage />} />
            <Route path="/assignments/:id/record" element={<RecordPage />} />
            <Route path="/feedback" element={<FeedbackListPage />} />
            <Route path="/plan" element={<PlanPage />} />
            {/* No bottom-nav tab: AppShell's bar is capped at five and full.
                Reached from the pet menu and the card on LearnPage. */}
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            {/* The one "extra feature" that is deliberately a main thing: the
                college effort board. Also in the pet, plus a card on Learn. */}
            <Route path="/battles" element={<BattlePage />} />
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
