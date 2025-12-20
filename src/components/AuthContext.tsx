/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

type User = {
  id: string
  email: string
  fullName?: string
  username?: string
  avatarUrl?: string
  roles: string[]
}
type AuthCtx = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (fullName: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (payload: { username?: string }) => Promise<User>
  updateAvatar: (file: File) => Promise<User>
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  async function refresh() {
    try {
      const r = await fetch('/api/auth/me', { credentials: 'include' })
      if (!r.ok) { setUser(null); return }
      setUser(await r.json())
    } catch {
      setUser(null)
    }
  }

  async function login(email: string, password: string) {
    const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ email, password }) })
    if (!r.ok) throw new Error('Login failed')
    setUser(await r.json())
  }

  async function register(fullName: string, email: string, password: string) {
    const r = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ fullName, email, password }) })
    if (!r.ok) throw new Error('Register failed')
    setUser(await r.json())
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  async function updateProfile(payload: { username?: string }) {
    const r = await fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    if (!r.ok) throw new Error('Failed to update profile')
    const u: User = await r.json()
    setUser(u)
    return u
  }

  async function updateAvatar(file: File) {
    const fd = new FormData()
    fd.append('avatar', file)
    const r = await fetch('/api/users/me/avatar', {
      method: 'POST',
      credentials: 'include',
      body: fd,
    })
    if (!r.ok) throw new Error('Failed to update avatar')
    const u: User = await r.json()
    setUser(u)
    return u
  }

  return <Ctx.Provider value={{ user, loading, login, register, logout, updateProfile, updateAvatar, refresh }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
