import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ProductCard from '../components/ProductCard'

type ApiProduct = { id: string; title: string; priceCents: number; imageUrl?: string }
type Category = { id: string; name: string; slug: string }

function useQuery() {
  const { search } = useLocation()
  return useMemo(() => new URLSearchParams(search), [search])
}

export default function CatalogPage() {
  const nav = useNavigate()
  const q = useQuery()
  const selectedSlugs = useMemo(() => {
    const raw = q.get('category') || ''
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  }, [q])
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const allBrands = [
    'AMD',
    'NVIDIA',
    'Intel',
    'ASUS',
    'MSI',
    'Gigabyte',
    'ASRock',
    'Corsair',
    'G.Skill',
    'Kingston',
    'Crucial',
    'Samsung',
    'Western Digital',
    'Seagate',
    'Cooler Master',
    'NZXT',
    'EVGA',
    'Seasonic',
    'Thermaltake',
    'Noctua',
    'AOC',
    'LG',
    'Dell',
    'BenQ',
  ]
  const brandByCategory: Record<string, string[]> = {
    cpu: ['AMD', 'Intel'],
    'graphics-cards': ['NVIDIA', 'AMD', 'ASUS', 'MSI', 'Gigabyte', 'ZOTAC', 'Sapphire', 'PowerColor'],
    ram: ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'TeamGroup', 'Patriot'],
    motherboard: ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Biostar'],
    'storage-ssd-hdd': ['Kingston', 'Samsung', 'Western Digital', 'Seagate', 'Crucial', 'ADATA', 'Sabrent', 'SK hynix', 'Intel'],
    storage: ['Kingston', 'Samsung', 'Western Digital', 'Seagate', 'Crucial', 'ADATA', 'Sabrent', 'SK hynix', 'Intel'],
    'power-supply': ['Seasonic', 'Corsair', 'EVGA', 'Cooler Master', 'Thermaltake', 'NZXT', 'be quiet!'],
    monitors: ['ASUS', 'MSI', 'Gigabyte', 'AOC', 'LG', 'Dell', 'BenQ', 'Samsung'],
  }
  const selectedBrandGroups = useMemo(() => {
    const groups = selectedSlugs
      .map(slug => ({ slug, brands: brandByCategory[slug] || [] }))
      .filter(g => g.brands.length > 0)
    return groups
  }, [selectedSlugs])
  const brandDisabled = selectedSlugs.length === 0
  const [sort, setSort] = useState<'latest' | 'price-asc' | 'price-desc'>('latest')
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [specs, setSpecs] = useState('')

  useEffect(() => {
    const allowed = selectedBrandGroups.flatMap(g => g.brands)
    if (brand && !allowed.includes(brand)) setBrand('')
  }, [brand, selectedBrandGroups])

  useEffect(() => {
    fetch('/api/categories').then(r=>r.ok?r.json():[]).then(setCategories).catch(()=>{})
  }, [])


  useEffect(() => {
    setLoading(true)
    const url = new URL('/api/products', window.location.origin)
    if (selectedSlugs.length > 0) url.searchParams.set('category', selectedSlugs.join(','))
    if (query.trim()) url.searchParams.set('q', query.trim())
    if (brand) url.searchParams.set('brand', brand)
    if (specs.trim()) url.searchParams.set('specs', specs.trim())
    if (minPrice) url.searchParams.set('minPrice', minPrice)
    if (maxPrice) url.searchParams.set('maxPrice', maxPrice)
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Bad response')))
      .then((data: ApiProduct[]) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [selectedSlugs, query, brand, minPrice, maxPrice, specs])

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
        {selectedSlugs.length > 0 && (<>
          <span className="mx-2">›</span>
          <span className="capitalize">{selectedSlugs.join(', ').replace(/-/g, ' ')}</span>
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
                placeholder="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
                aria-label="Search products"
              />
            </div>
            <div className="space-y-1.5 text-sm">
              {categories.map(c => {
                const active = selectedSlugs.includes(c.slug)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? selectedSlugs.filter(s => s !== c.slug)
                        : [...selectedSlugs, c.slug]
                      const params = new URLSearchParams(q)
                      if (next.length > 0) params.set('category', next.join(','))
                      else params.delete('category')
                      nav({ search: params.toString() })
                    }}
                    className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 ${active? 'text-black font-medium':'text-gray-700'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded border ${active? 'bg-black border-black':'bg-white border-gray-300'}`} />
                    <span>{c.name}</span>
                  </button>
                )
              })}
              {selectedSlugs.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams(q)
                    params.delete('category')
                    nav({ search: params.toString() })
                  }}
                  className="inline-block mt-2 text-xs text-gray-500 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
          <hr className="my-6 border-gray-200" />
          <div className="space-y-3">
            <div className="font-medium">Price Range</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <hr className="my-6 border-gray-200" />
          <div className="space-y-3">
            <div className="font-medium">Brand</div>
            <select value={brand} onChange={(e) => setBrand(e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" disabled={brandDisabled}>
              <option value="">{brandDisabled ? 'Select a category first' : 'All brands'}</option>
              {brandDisabled ? (
                allBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))
              ) : (
                selectedBrandGroups.map(group => (
                  <optgroup key={group.slug} label={(categories.find(c => c.slug === group.slug)?.name) || group.slug}>
                    {group.brands.map(b => (
                      <option key={`${group.slug}-${b}`} value={b}>{b}</option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>
          <hr className="my-6 border-gray-200" />
          <div className="space-y-3">
            <div className="font-medium">Specs</div>
            <input
              type="text"
              placeholder="e.g. AM5, 12GB, 6000MT/s"
              value={specs}
              onChange={(e) => setSpecs(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          {(query || brand || minPrice || maxPrice || specs) && (
            <button
              type="button"
              onClick={() => { setQuery(''); setBrand(''); setMinPrice(''); setMaxPrice(''); setSpecs('') }}
              className="mt-6 text-sm text-gray-600 hover:underline"
            >
              Clear search filters
            </button>
          )}
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
