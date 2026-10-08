import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { Button, Spinner } from './components/ui'
import { Wordmark } from './components/Logo'
import { ROLE_HOME, type Role } from './lib/types'

import Login from './routes/Login'
import Signup from './routes/Signup'
import Onboarding from './routes/Onboarding'
import AdminHome from './routes/admin/AdminHome'
import Classes from './routes/admin/Classes'
import ClassDetail from './routes/admin/ClassDetail'
import Teachers from './routes/admin/Teachers'
import Flagged from './routes/admin/Flagged'
import Register from './routes/teacher/Register'
import TeacherAssessmentsRoute from './routes/teacher/Assessments'
import Lesson from './routes/teacher/Lesson'
import ParentHome from './routes/parent/Home'
import Homework from './routes/parent/Homework'
import Notices from './routes/parent/Notices'
import ParentSettings from './routes/parent/Settings'
import ParentAssessmentsRoute from './routes/parent/Assessments'
import AdminNotices from './routes/admin/Notices'
import AdminFees from './routes/admin/Fees'
import ParentFeesRoute from './routes/parent/Fees'
import Preview from './routes/Preview'
import Diagnostics from './routes/Diagnostics'
import SubscriptionGate from './components/SubscriptionGate'
import Marketing from './routes/Marketing'
import DemoApp from './routes/demo/DemoApp'
import QuestionBank from './routes/cbt/QuestionBank'
import Exams from './routes/cbt/Exams'
import Marking from './routes/cbt/Marking'
import SitExam from './routes/cbt/SitExam'
import StudentHome from './routes/student/StudentHome'
import StudentSit from './routes/student/StudentSit'
import Timetable from './routes/admin/Timetable'
import TeacherTimetable from './routes/teacher/Timetable'
import TeacherNotices from './routes/teacher/Notices'
import Account from './routes/Account'
import AuthCallback from './routes/AuthCallback'
import { WhatsAppCare } from './components/BrandCredit'

/** Shown when we have a session but cannot resolve a profile. Never spin forever. */
function Blocked({ problem }: { problem: string }) {
  const { signOut } = useAuth()
  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-[440px]">
        <Wordmark size="md" className="text-ink mb-7" />
        <span className="eyebrow">Setup incomplete</span>
        <h1 className="text-[26px] mt-1.5">This account cannot load</h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">{problem}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/diagnostics">
            <Button>Run diagnostics</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              void signOut().then(() => {
                window.location.assign("/login");
              });
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  )
}

function Landing() {
  const { session, profile, loading, problem } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Marketing />
  if (problem) return <Blocked problem={problem} />
  if (!profile) return <Spinner />
  if (!profile.school_id) return <Navigate to="/welcome" replace />

  return <Navigate to={ROLE_HOME[profile.role]} replace />
}

function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, profile, loading, problem } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (problem) return <Blocked problem={problem} />
  if (!profile) return <Spinner />
  if (!profile.school_id) return <Navigate to="/welcome" replace />
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />

  return (
    <SubscriptionGate
      schoolId={profile.school_id}
      role={profile.role}
      schoolEmail={session.user.email ?? ''}
    >
      {children}
    </SubscriptionGate>
  )
}

/** Onboarding only. Anyone who already has a school gets sent to their home. */
function RequireSession({ children }: { children: ReactNode }) {
  const { session, profile, loading, problem } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (problem) return <Blocked problem={problem} />
  if (profile?.school_id) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Signed in, including blocked accounts that still need diagnostics. */
function SignedIn({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/demo" element={<DemoApp />} />
          <Route path="/sit/:token" element={<SitExam />} />
          <Route
            path="/preview"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <Preview />
              </Protected>
            }
          />
          <Route
            path="/diagnostics"
            element={
              <SignedIn>
                <Diagnostics />
              </SignedIn>
            }
          />

          <Route
            path="/welcome"
            element={
              <RequireSession>
                <Onboarding />
              </RequireSession>
            }
          />

          <Route
            path="/admin"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <AdminHome />
              </Protected>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <Classes />
              </Protected>
            }
          />
          <Route
            path="/admin/classes/:id"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <ClassDetail />
              </Protected>
            }
          />
          <Route
            path="/admin/flagged"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <Flagged />
              </Protected>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <Teachers />
              </Protected>
            }
          />
          <Route
            path="/teacher"
            element={
              <Protected roles={['teacher', 'admin', 'proprietor']}>
                <Register />
              </Protected>
            }
          />
          <Route
            path="/teacher/lesson"
            element={
              <Protected roles={['teacher', 'admin', 'proprietor']}>
                <Lesson />
              </Protected>
            }
          />
          <Route
            path="/parent"
            element={
              <Protected roles={['parent']}>
                <ParentHome />
              </Protected>
            }
          />
          <Route
            path="/parent/homework"
            element={
              <Protected roles={['parent']}>
                <Homework />
              </Protected>
            }
          />
          <Route
            path="/parent/notices"
            element={
              <Protected roles={['parent']}>
                <Notices />
              </Protected>
            }
          />
          <Route
            path="/parent/fees"
            element={
              <Protected roles={['parent']}>
                <ParentFeesRoute />
              </Protected>
            }
          />
          <Route
            path="/parent/settings"
            element={
              <Protected roles={['parent']}>
                <ParentSettings />
              </Protected>
            }
          />
          <Route
            path="/teacher/assessments"
            element={
              <Protected roles={['teacher', 'admin', 'proprietor']}>
                <TeacherAssessmentsRoute />
              </Protected>
            }
          />
          <Route
            path="/cbt/bank"
            element={
              <Protected roles={['teacher', 'admin', 'proprietor']}>
                <QuestionBank />
              </Protected>
            }
          />
          <Route
            path="/cbt/exams"
            element={
              <Protected roles={['teacher', 'admin', 'proprietor']}>
                <Exams />
              </Protected>
            }
          />
          <Route
            path="/cbt/marking"
            element={
              <Protected roles={['teacher', 'admin', 'proprietor']}>
                <Marking />
              </Protected>
            }
          />
          <Route
            path="/student"
            element={
              <Protected roles={['student']}>
                <StudentHome />
              </Protected>
            }
          />
          <Route
            path="/student/sit/:examId"
            element={
              <Protected roles={['student']}>
                <StudentSit />
              </Protected>
            }
          />
          <Route
            path="/parent/assessments"
            element={
              <Protected roles={['parent']}>
                <ParentAssessmentsRoute />
              </Protected>
            }
          />
          <Route
            path="/admin/notices"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <AdminNotices />
              </Protected>
            }
          />
          <Route
            path="/admin/fees"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <AdminFees />
              </Protected>
            }
          />
          <Route
            path="/admin/timetable"
            element={
              <Protected roles={['admin', 'proprietor']}>
                <Timetable />
              </Protected>
            }
          />
          <Route
            path="/teacher/timetable"
            element={
              <Protected roles={['teacher']}>
                <TeacherTimetable />
              </Protected>
            }
          />
          <Route
            path="/teacher/notices"
            element={
              <Protected roles={['teacher']}>
                <TeacherNotices />
              </Protected>
            }
          />
          <Route
            path="/account"
            element={
              <Protected roles={['proprietor', 'admin', 'teacher', 'parent', 'student']}>
                <Account />
              </Protected>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <WhatsAppCare />
      </AuthProvider>
    </BrowserRouter>
  )
}