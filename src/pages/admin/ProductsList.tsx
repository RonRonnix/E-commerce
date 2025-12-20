import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type Category = { id: string; name: string; slug: string }
type Product = { id: string; title: string; priceCents: number; imageUrl?: string; updatedAt: string; category?: Category }

export default function ProductsList() {
  const nav = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [category, setCategory] = useState<string>('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/categories').then(r => r.ok ? r.json() : []).then(setCategories).catch(()=>{})
  }, [])

  useEffect(() => {
    setLoading(true)
    const u = new URL('/api/products', window.location.origin)
    if (category) u.searchParams.set('category', category)
    if (query) u.searchParams.set('q', query)
    fetch(u.toString())
      .then(r => r.ok ? r.json() : [])
      .then((data: Product[]) => setProducts(data))
      .finally(() => setLoading(false))
  }, [category, query])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(p => (p.title || '').toLowerCase().startsWith(q))
  }, [products, query])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
        <select value={category} onChange={e=>setCategory(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products" className="border rounded-md px-3 py-2 text-sm" />
        </div>
        <Link to="/admin/products/new" className="px-3 py-2 rounded-md bg-black text-white text-sm">New Product</Link>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-600">
            <tr>
              {['Product','Category','Price','Updated'].map(h => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td className="px-4 py-6" colSpan={4}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td className="px-4 py-6" colSpan={4}>No products found</td></tr>
            ) : rows.map(p => (
              <tr key={p.id} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100 cursor-pointer" onClick={()=>nav(`/admin/products/${p.id}`)}>
                <td className="px-4 py-3 flex items-center gap-3"><img alt="" src={p.imageUrl || `https://picsum.photos/seed/${p.id}/80/80`} className="size-10 rounded object-cover"/> <span className="underline-offset-2 hover:underline">{p.title}</span></td>
                <td className="px-4 py-3">{p.category?.name ?? '—'}</td>
                <td className="px-4 py-3">{formatCurrency(p.priceCents)}</td>
                <td className="px-4 py-3">{new Date(p.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function formatCurrency(priceCents?: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((priceCents || 0)/100)
}
