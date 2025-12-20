import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireRole({ roles, children }: { roles: Array<'admin' | 'owner'>, children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="container-xl py-10">Loading…</div>
  const hasRole = !!user && user.roles.some(r => roles.includes(r as any))
  if (!hasRole) return <Navigate to="/profile" replace />
  return <>{children}</>
}
