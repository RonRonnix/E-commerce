import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

export type WishlistCtx = {
  count: number
  refresh: () => Promise<void>
}

const Ctx = createContext<WishlistCtx | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  async function refresh() {
    if (!user) { setCount(0); return }
    try {
      const r = await fetch('/api/wishlist', { credentials: 'include' })
      if (!r.ok) { setCount(0); return }
      const items: Array<any> = await r.json()
      setCount(items.length)
    } catch { setCount(0) }
  }

  useEffect(() => { refresh() }, [user?.id])

  const value = useMemo(() => ({ count, refresh }), [count])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWishlist() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
