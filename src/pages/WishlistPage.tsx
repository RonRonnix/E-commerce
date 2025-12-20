import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { useWishlist } from '../components/WishlistContext'
import { useToaster } from '../components/Toaster'

export default function WishlistPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const { refresh } = useWishlist()
  const { show } = useToaster()
  const [items, setItems] = useState<Array<{ product: any }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/wishlist', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled) setItems(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function remove(productId: string) {
    const r = await fetch(`/api/wishlist/${productId}`, { method: 'DELETE', credentials: 'include' })
    if (r.ok) { setItems(arr => arr.filter(i => i.product.id !== productId)); refresh() }
  }

  async function addToCart(productId: string) {
    if (!user) { nav('/profile'); return }
    const r = await fetch('/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ productId, quantity: 1 }) })
    if (r.ok) { show('Added to cart'); }
  }

  if (loading) return <div className="container-xl py-10">Loading…</div>

  return (
    <section className="container-xl py-10">
      <h1 className="text-xl font-semibold mb-4">Wishlist <span className="text-gray-500">({items.length})</span></h1>
      {items.length === 0 ? (
        <div className="text-gray-600">No items yet. Explore the <Link to="/catalog" className="underline">catalog</Link>.</div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {items.map(({ product }) => (
            <div key={product.id} className="rounded-xl border bg-white shadow-card overflow-hidden transition-transform duration-150 hover:scale-[1.02] active:scale-95">
              <Link to={`/products/${product.id}`} className="block">
                <div className="aspect-square bg-gray-100">
                  <img src={product.imageUrl ?? `https://picsum.photos/seed/${product.id}/600/600`} alt={product.title} className="w-full h-full object-cover" />
                </div>
              </Link>
              <div className="p-4">
                <Link to={`/products/${product.id}`} className="block">
                  <h3 className="font-medium leading-snug hover:underline underline-offset-2">{product.title}</h3>
                </Link>
                <div className="mt-3 flex items-center justify-between">
                  <button className="px-3 py-1.5 text-sm rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => addToCart(product.id)}>Add to Cart</button>
                  <button className="px-3 py-1.5 text-sm rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => remove(product.id)}>Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
