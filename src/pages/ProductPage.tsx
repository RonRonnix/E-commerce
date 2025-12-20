import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useToaster } from '../components/Toaster'
import { useCart } from '../components/CartContext'
import { useWishlist } from '../components/WishlistContext'

type Product = {
  id: string
  title: string
  description?: string
  priceCents: number
  currency: string
  imageUrl?: string
}

export default function ProductPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qty, setQty] = useState<number>(1)
  const { show } = useToaster()
  const { refresh } = useCart()
  const { refresh: refreshWishlist } = useWishlist()
  const [wishLoading, setWishLoading] = useState(false)
  const [isWished, setIsWished] = useState<boolean | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/products/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Not found')))
      .then((p: Product) => { if (!cancelled) { setProduct(p); setError(null) } })
      .catch((e: any) => { if (!cancelled) setError(e?.message || 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  // load wishlist status for this product
  useEffect(() => {
    let mounted = true
    if (!id || !user) { setIsWished(null); return }
    fetch('/api/wishlist', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((items: Array<{ productId: string; product: any }>) => {
        if (mounted) setIsWished(items.some(i => i.productId === id))
      }).catch(() => { if (mounted) setIsWished(false) })
    return () => { mounted = false }
  }, [id, user?.id])

  if (loading) return <div className="container-xl py-10">Loading…</div>
  if (error || !product) return <div className="container-xl py-10 text-red-600">{error || 'Product not found'}</div>

  const price = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((product.priceCents || 0) / 100)

  async function addToCart() {
    if (!user) {
      navigate('/profile')
      return
    }
    if (!product) return
    const r = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ productId: product.id, quantity: qty }),
    })
    if (r.ok) {
      // refresh cart count from server to avoid double-counting
      refresh()
      // toast
      show('Added to your cart — view cart', { clickable: true, onClick: () => navigate('/cart') })
      // fly-to-cart animation (clone image and move toward navbar cart icon area)
      try {
        const img = imgRef.current
        if (img) {
          const rect = img.getBoundingClientRect()
          const clone = img.cloneNode(true) as HTMLImageElement
          clone.style.position = 'fixed'
          clone.style.left = rect.left + 'px'
          clone.style.top = rect.top + 'px'
          clone.style.width = rect.width + 'px'
          clone.style.height = rect.height + 'px'
          clone.style.borderRadius = '12px'
          clone.style.zIndex = '99'
          clone.style.transition = 'transform 500ms ease, opacity 500ms ease, left 500ms ease, top 500ms ease, width 500ms ease, height 500ms ease'
          document.body.appendChild(clone)
          // target near top-right where cart button lives
          const targetX = window.innerWidth - 40
          const targetY = 24
          requestAnimationFrame(() => {
            clone.style.left = targetX + 'px'
            clone.style.top = targetY + 'px'
            clone.style.width = '28px'
            clone.style.height = '28px'
            clone.style.opacity = '0.3'
            clone.style.transform = 'scale(0.6)'
          })
          setTimeout(() => { clone.remove() }, 520)
        }
      } catch { /* no-op */ }
    }
  }

  async function toggleWishlist() {
    if (!user || !product) { navigate('/profile'); return }
    if (wishLoading) return
    setWishLoading(true)
    try {
      if (isWished) {
        const r = await fetch(`/api/wishlist/${product.id}`, { method: 'DELETE', credentials: 'include' })
        if (r.ok) { setIsWished(false); refreshWishlist(); show('Removed from wishlist') }
      } else {
        const r = await fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ productId: product.id }) })
        if (r.ok) { setIsWished(true); refreshWishlist(); show('Added to wishlist') }
      }
    } finally { setWishLoading(false) }
  }

  return (
    <section className="container-xl py-10 grid md:grid-cols-2 gap-8">
      <div>
        <div className="aspect-square bg-white rounded-xl border overflow-hidden">
          <img ref={imgRef} src={product.imageUrl ?? `https://picsum.photos/seed/${product.id}/900/900`} alt={product.title} className="w-full h-full object-cover" />
        </div>
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <div className="mt-2 text-xl">{price}</div>
        <p className="mt-4 text-gray-600 whitespace-pre-wrap">{product.description || 'No description provided.'}</p>
        <div className="mt-6 flex gap-3">
          <div className="flex items-center gap-2">
            <button className="px-2 py-1 border rounded cursor-pointer transition-transform duration-150 hover:scale-[1.06] active:scale-95" onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
            <input className="w-12 text-center border rounded py-1" value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value) || 1))} />
            <button className="px-2 py-1 border rounded cursor-pointer transition-transform duration-150 hover:scale-[1.06] active:scale-95" onClick={() => setQty(q => q + 1)}>+</button>
          </div>
          <button className="px-4 py-2 rounded-md bg-black text-white cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={addToCart}>Add to Cart</button>
          <button className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95">Buy Now</button>
          <button aria-label="wishlist" title="Add to wishlist" onClick={toggleWishlist} className={`px-3 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 ${isWished ? 'bg-rose-50 border-rose-200 text-rose-600' : ''}`}>
            {isWished ? '♥ In Wishlist' : '♡ Wishlist'}
          </button>
        </div>
      </div>
    </section>
  )
}
