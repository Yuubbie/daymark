import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { Button, Spinner } from './components/ui'
import { Wordmark } from './components/Logo'
import type { Role } from './lib/types'

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
import Preview from './routes/Preview'
import Diagnostics from './routes/Diagnostics'

/** Shown when we have a session but cannot resolve a profile. Never spin forever. */
function Blocked({ problem }: { problem: string }) {
  const { signOut } = useAuth()
  return (
    <div className="min-h-dvh bg-paper flex items-center justify-center px-6">
      <div className="w-full max-w-[440px]">
        <Wordmark size="md" className="text-ink mb-7" />
        <span className="eyebrow">Setup incomplete</span>
        <h1 className="text-[26px] mt-1.5">This account cannot load.</h1>
        <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">{problem}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/diagnostics">
            <Button>Run diagnostics</Button>
          </Link>
          <Button variant="secondary" onClick={() => void signOut()}>
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
  if (!session) return <Navigate to="/login" replace />
  if (problem) return <Blocked problem={problem} />
  if (!profile) return <Spinner />
  if (!profile.school_id) return <Navigate to="/welcome" replace />

  const home: Record<Role, string> = {
    admin: '/admin',
    teacher: '/teacher',
    parent: '/parent',
  }
  return <Navigate to={home[profile.role]} replace />
}

function Protected({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { session, profile, loading, problem } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (problem) return <Blocked problem={problem} />
  if (!profile) return <Spinner />
  if (!profile.school_id) return <Navigate to="/welcome" replace />
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />

  return <>{children}</>
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="/diagnostics" element={<Diagnostics />} />

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
              <Protected roles={['admin']}>
                <AdminHome />
              </Protected>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <Protected roles={['admin']}>
                <Classes />
              </Protected>
            }
          />
          <Route
            path="/admin/classes/:id"
            element={
              <Protected roles={['admin']}>
                <ClassDetail />
              </Protected>
            }
          />
          <Route
            path="/admin/flagged"
            element={
              <Protected roles={['admin']}>
                <Flagged />
              </Protected>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <Protected roles={['admin']}>
                <Teachers />
              </Protected>
            }
          />
          <Route
            path="/teacher"
            element={
              <Protected roles={['teacher', 'admin']}>
                <Register />
              </Protected>
            }
          />
          <Route
            path="/teacher/lesson"
            element={
              <Protected roles={['teacher', 'admin']}>
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
              <Protected roles={['teacher', 'admin']}>
                <TeacherAssessmentsRoute />
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
              <Protected roles={['admin']}>
                <AdminNotices />
              </Protected>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

