import { Navigate } from 'react-router'

interface ProtectedRouteProps {
  user: { name: string; email: string; picture: string } | null
  children: React.ReactNode
}

export default function ProtectedRoute({ user, children }: ProtectedRouteProps) {
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
