import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ProductCard from '../components/ProductCard'

type ApiProduct = { id: string; title: string; priceCents: number; imageUrl?: string }
type Category = { id: string; name: string; slug: string }

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function CatalogPage() {
  const q = useQuery()
  const selectedSlug = q.get('category') || ''
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [sort, setSort] = useState<'latest' | 'price-asc' | 'price-desc'>('latest')

  useEffect(() => {
    fetch('/api/categories').then(r=>r.ok?r.json():[]).then(setCategories).catch(()=>{})
  }, [])

  useEffect(() => {
    setLoading(true)
    const url = selectedSlug ? `/api/products?category=${encodeURIComponent(selectedSlug)}` : '/api/products'
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Bad response')))
      .then((data: ApiProduct[]) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [selectedSlug])

  const prettyCount = products.length
  const sortedProducts = useMemo(() => {
    const arr = products.slice()
    if (sort === 'price-asc') arr.sort((a,b) => (a.priceCents||0) - (b.priceCents||0))
    if (sort === 'price-desc') arr.sort((a,b) => (b.priceCents||0) - (a.priceCents||0))
    // 'latest' leaves API order as-is
    return arr
  }, [products, sort])

  return (
    <div className="container-xl py-8">
      {/* Breadcrumbs */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:underline">Home</Link>
        <span className="mx-2">›</span>
        <span>Catalog</span>
        {selectedSlug && (<>
          <span className="mx-2">›</span>
          <span className="capitalize">{selectedSlug.replace(/-/g, ' ')}</span>
        </>)}
      </div>

      <div className="grid sm:grid-cols-12 gap-6">
        {/* Sidebar filters */}
        <aside className="sm:col-span-4 md:col-span-3">
          {/* Category section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-medium">Category</div>
              <button type="button" className="text-gray-500 text-sm">▾</button>
            </div>
            <div>
              <input
                type="text"
                placeholder="Search"
                className="w-full border rounded-md px-3 py-2 text-sm"
                aria-label="Search categories"
              />
            </div>
            <div className="space-y-1.5 text-sm">
              {categories.map(c => {
                const active = selectedSlug === c.slug
                return (
                  <Link
                    key={c.id}
                    to={`/catalog?category=${encodeURIComponent(c.slug)}`}
                    className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 ${active? 'text-black font-medium':'text-gray-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded border ${active? 'bg-black border-black':'bg-white border-gray-300'}`} />
                    <span>{c.name}</span>
                  </Link>
                )
              })}
              {selectedSlug && (
                <Link to="/catalog" className="inline-block mt-2 text-xs text-gray-500 hover:underline">Clear filter</Link>
              )}
            </div>
          </div>
          <hr className="my-6 border-gray-200" />
        </aside>

        {/* Main */}
  <section className="sm:col-span-8 md:col-span-9">
          <div className="flex items-center justify-between mb-4 text-sm">
            <div>Selected Products: <span className="font-medium">{prettyCount}</span></div>
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-gray-600">Sort</label>
              <select
                id="sort"
                className="border rounded-md px-2 py-1"
                value={sort}
                onChange={(e)=>setSort(e.target.value as any)}
              >
                <option value="latest">Latest products</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div>Loading…</div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {sortedProducts.map(p => (
                <ProductCard key={p.id} product={{ id: p.id, title: p.title, price: Math.round((p.priceCents||0)/100), image: p.imageUrl ?? `https://picsum.photos/seed/${p.id}/600/600` }} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
