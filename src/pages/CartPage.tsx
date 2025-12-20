import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { useCart } from '../components/CartContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToaster } from '../components/Toaster'

type CartItem = {
  id: string
  productId: string
  quantity: number
  product: { id: string; title: string; priceCents: number; imageUrl?: string }
}

export default function CartPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<CartItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { refresh: refreshCartCount } = useCart()
  const { show } = useToaster()
  const [confirm, setConfirm] = useState<{ open: boolean; productId?: string; title?: string }>(() => ({ open: false }))

  useEffect(() => {
    if (!loading && !user) {
      navigate('/profile')
    }
  }, [loading, user, navigate])

  useEffect(() => {
    let cancelled = false
    if (!user) return
    fetch('/api/cart', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load cart')))
      .then((data: CartItem[]) => { if (!cancelled) { setItems(data); setError(null) } })
      .catch((e: any) => { if (!cancelled) setError(e?.message || 'Failed to load cart') })
    return () => { cancelled = true }
  }, [user])

  async function updateQty(productId: string, quantity: number) {
    if (quantity < 1) return
    const r = await fetch(`/api/cart/${productId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ quantity }) })
    if (!r.ok) return
    const updated = await r.json()
    setItems(prev => (prev ?? []).map(ci => ci.productId === productId ? { ...ci, quantity: updated.quantity } : ci))
    refreshCartCount()
  }

  async function removeItem(productId: string) {
    const r = await fetch(`/api/cart/${productId}`, { method: 'DELETE', credentials: 'include' })
    if (!r.ok) return
    setItems(prev => (prev ?? []).filter(ci => ci.productId !== productId))
    refreshCartCount()
    show('Removed from cart')
  }

  const subtotal = useMemo(() => {
    if (!items) return 0
    return items.reduce((sum, ci) => sum + (ci.product.priceCents * ci.quantity), 0)
  }, [items])

  if (loading || !user || items === null) {
    return <div className="container-xl py-10">Loading…</div>
  }

  const formatPHP = (cents: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(cents/100)

  return (
    <section className="container-xl py-10">
      <h1 className="text-2xl font-semibold mb-6">Your Cart</h1>
      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
      {items.length === 0 ? (
        <div className="text-gray-600">Your cart is empty. <Link to="/catalog" className="underline">Browse products</Link>.</div>
      ) : (
        <div className="grid md:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-4">
            {items.map((ci) => (
              <div key={ci.id} className="flex items-center gap-4 p-3 border rounded-lg bg-white">
                <div className="h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                  <img src={ci.product.imageUrl ?? `https://picsum.photos/seed/${ci.product.id}/300/300`} alt={ci.product.title} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{ci.product.title}</div>
                  <div className="text-sm text-gray-600">{formatPHP(ci.product.priceCents)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-2 py-1 border rounded cursor-pointer transition-transform duration-150 hover:scale-[1.06] active:scale-95" onClick={() => updateQty(ci.productId, ci.quantity - 1)}>-</button>
                  <input className="w-12 text-center border rounded py-1" value={ci.quantity} onChange={e => updateQty(ci.productId, Math.max(1, Number(e.target.value) || 1))} />
                  <button className="px-2 py-1 border rounded cursor-pointer transition-transform duration-150 hover:scale-[1.06] active:scale-95" onClick={() => updateQty(ci.productId, ci.quantity + 1)}>+</button>
                </div>
                <button
                  className="px-3 py-1.5 border rounded-md cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95"
                  onClick={() => setConfirm({ open: true, productId: ci.productId, title: `Remove ${ci.product.title}?` })}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="p-4 border rounded-lg bg-white h-fit">
            <div className="flex justify-between mb-2"><div>Subtotal</div><div className="font-medium">{formatPHP(subtotal)}</div></div>
            <button onClick={() => navigate('/checkout')} className="mt-4 w-full py-2 rounded-md bg-black text-white cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95">Checkout</button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title || 'Remove item?'}
        message="This will remove the product from your cart."
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={() => {
          if (confirm.productId) removeItem(confirm.productId)
          setConfirm({ open: false })
        }}
        onCancel={() => setConfirm({ open: false })}
      />
    </section>
  )
}
