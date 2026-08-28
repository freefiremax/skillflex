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
import MentorPage from './features/mentorship/MentorPage'
import BrowseMentorsPage from './features/mentorship/BrowseMentorsPage'
import MentorQueuePage from './features/mentor-console/MentorQueuePage'
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
            <Route path="/mentor" element={<MentorPage />} />
            <Route path="/mentor/browse" element={<BrowseMentorsPage />} />
          </>
        )}

        {me.role === 'mentor' && (
          <>
            <Route path="/" element={<MentorQueuePage />} />
            <Route path="/review/:id" element={<ReviewPage />} />
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
