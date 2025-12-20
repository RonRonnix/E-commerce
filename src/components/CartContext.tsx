import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'

type CartCtx = {
  count: number
  setCount: (n: number) => void
  bump: (delta: number) => void
  refresh: () => Promise<void>
}

const Ctx = createContext<CartCtx | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)

  async function refresh() {
    if (!user) { setCount(0); return }
    try {
      const r = await fetch('/api/cart', { credentials: 'include' })
      if (!r.ok) { setCount(0); return }
      const items: Array<{ quantity: number }> = await r.json()
      // Count distinct products, not total quantity
      setCount(items.length)
    } catch { setCount(0) }
  }

  useEffect(() => {
    // refresh when user changes
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const value = useMemo(() => ({
    count,
    setCount: (n: number) => setCount(n < 0 ? 0 : n),
    bump: (delta: number) => setCount(c => Math.max(0, c + delta)),
    refresh,
  }), [count])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
