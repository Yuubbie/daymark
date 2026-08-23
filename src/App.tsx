import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AuthProvider, useAuth } from './lib/auth'
import { Spinner } from './components/ui'
import type { Role } from './lib/types'

import Login from './routes/Login'
import Signup from './routes/Signup'
import Onboarding from './routes/Onboarding'
import AdminHome from './routes/AdminHome'
import TeacherHome from './routes/TeacherHome'
import ParentHome from './routes/ParentHome'
import Preview from './routes/Preview'

/** Sends a signed-in user to the right home, or to onboarding if unattached. */
function Landing() {
  const { session, profile, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
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
  const { session, profile, loading } = useAuth()

  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (!profile) return <Spinner />
  if (!profile.school_id) return <Navigate to="/welcome" replace />
  if (!roles.includes(profile.role)) return <Navigate to="/" replace />

  return <>{children}</>
}

function RequireSession({ children }: { children: ReactNode }) {
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
          <Route path="/preview" element={<Preview />} />

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
            path="/teacher"
            element={
              <Protected roles={['teacher']}>
                <TeacherHome />
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
