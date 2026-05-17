import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

type Category = { id: string; name: string; slug: string }
type Product = { id: string; title: string; slug: string; description?: string; brand?: string; specs?: string; priceCents: number; currency: string; categoryId?: string; imageUrl?: string }
type ProductImage = { id: string; url: string; position: number }

const ALL_BRANDS = [
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
  'ZOTAC',
  'Sapphire',
  'PowerColor',
  'TeamGroup',
  'Patriot',
  'Biostar',
  'ADATA',
  'Sabrent',
  'SK hynix',
  'be quiet!',
]

const BRAND_BY_CATEGORY: Record<string, string[]> = {
  cpu: ['AMD', 'Intel'],
  'graphics-cards': ['NVIDIA', 'AMD', 'ASUS', 'MSI', 'Gigabyte', 'ZOTAC', 'Sapphire', 'PowerColor'],
  ram: ['Corsair', 'G.Skill', 'Kingston', 'Crucial', 'TeamGroup', 'Patriot'],
  motherboard: ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Biostar'],
  'storage-ssd-hdd': ['Kingston', 'Samsung', 'Western Digital', 'Seagate', 'Crucial', 'ADATA', 'Sabrent', 'SK hynix', 'Intel'],
  storage: ['Kingston', 'Samsung', 'Western Digital', 'Seagate', 'Crucial', 'ADATA', 'Sabrent', 'SK hynix', 'Intel'],
  'power-supply': ['Seasonic', 'Corsair', 'EVGA', 'Cooler Master', 'Thermaltake', 'NZXT', 'be quiet!'],
  monitors: ['ASUS', 'MSI', 'Gigabyte', 'AOC', 'LG', 'Dell', 'BenQ', 'Samsung'],
}

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const nav = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [product, setProduct] = useState<Product>({ id: '', title: '', slug: '', priceCents: 0, currency: 'USD' })
  const [images, setImages] = useState<ProductImage[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const formElRef = useRef<HTMLFormElement>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(!isEdit) // new product: editing; existing: view first
  const [showDelete, setShowDelete] = useState(false)
  const [savedProduct, setSavedProduct] = useState<Product | null>(null) // snapshot of last saved state
  const [confirmLeave, setConfirmLeave] = useState<{ open: boolean; action: 'back' | 'cancel' }>({ open: false, action: 'back' })
  const [confirmSave, setConfirmSave] = useState(false)

  const emptyProduct: Product = { id: '', title: '', slug: '', priceCents: 0, currency: 'USD' }

  function hasUnsavedChanges() {
    if (!editing) return false
    const filesLen = fileRef.current?.files?.length ?? 0
    const fileDirty = filesLen > 0
    if (isEdit) {
      if (!savedProduct) return fileDirty
      const b = savedProduct
      const same =
        product.title === b.title &&
        product.slug === b.slug &&
        (product.description || '') === (b.description || '') &&
        (product.brand || '') === (b.brand || '') &&
        (product.specs || '') === (b.specs || '') &&
        product.priceCents === b.priceCents &&
        product.currency === b.currency &&
        (product.categoryId || '') === (b.categoryId || '')
      return !same || fileDirty
    } else {
      const b = emptyProduct
      const same =
        product.title === b.title &&
        product.slug === b.slug &&
        (product.description || '') === (b.description || '') &&
        (product.brand || '') === (b.brand || '') &&
        (product.specs || '') === (b.specs || '') &&
        product.priceCents === b.priceCents &&
        product.currency === b.currency &&
        (product.categoryId || '') === (b.categoryId || '')
      return !same || fileDirty
    }
  }

  useEffect(() => {
    fetch('/api/categories').then(r=>r.ok?r.json():[]).then(setCategories).catch(() => { /* no-op */ })
  }, [])

  useEffect(() => {
    if (!isEdit) return
    fetch(`/api/products/${id}`).then(r=>r.ok?r.json():null).then((p: Product | null) => { if (p) { setProduct(p); setSavedProduct(p) } })
    fetch(`/api/admin/products/${id}/images`, { credentials:'include' }).then(r=>r.ok?r.json():[]).then(setImages).catch(() => { /* no-op */ })
  }, [id, isEdit])

  const coverUrl = useMemo(() => images.sort((a,b)=>a.position-b.position)[0]?.url || product.imageUrl, [images, product.imageUrl])
  const selectedCategory = categories.find(c => c.id === product.categoryId)
  const brandOptions = (selectedCategory?.slug && BRAND_BY_CATEGORY[selectedCategory.slug])
    ? BRAND_BY_CATEGORY[selectedCategory.slug]
    : ALL_BRANDS
  const brandDisabled = !selectedCategory

  async function doDelete() {
    if (!isEdit) return
    setSaving(true); setError(null)
    try {
      const r = await fetch(`/api/admin/products/${id}`, { method:'DELETE', credentials:'include' })
      if (!r.ok) {
        let msg = 'Delete failed'
        try { const j = await r.json(); msg = j?.error || msg } catch { /* no-op */ }
        throw new Error(msg)
      }
      // After deletion, return to products list
      nav('/admin/products')
    } catch (err:any) {
      setError(err?.message || 'Failed')
    } finally {
      setSaving(false)
      setShowDelete(false)
    }
  }

  async function saveProduct() {
    if (!editing) return
    setSaving(true); setError(null)
    try {
      let pid = product.id
      const payload = { title: product.title, slug: product.slug, description: product.description, brand: product.brand, specs: product.specs, priceCents: product.priceCents, currency: product.currency, categoryId: product.categoryId }
      if (!isEdit) {
        const r = await fetch('/api/admin/products', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload) })
        if (!r.ok) {
          let msg = 'Create failed'
          try { const j = await r.json(); msg = j?.error || msg } catch { /* no-op */ }
          throw new Error(msg)
        }
        const created: Product = await r.json()
        pid = created.id
      } else {
        const r = await fetch(`/api/admin/products/${pid}`, { method:'PUT', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify(payload) })
        if (!r.ok) {
          let msg = 'Update failed'
          try { const j = await r.json(); msg = j?.error || msg } catch { /* no-op */ }
          throw new Error(msg)
        }
      }

      // upload any selected files
      const files = fileRef.current?.files
      const hadFiles = !!files && files.length > 0
      if (hadFiles && pid) {
        const fd = new FormData()
        Array.from(files).forEach(f => fd.append('files', f))
        const r = await fetch(`/api/admin/products/${pid}/images`, { method:'POST', body: fd, credentials:'include' })
        if (!r.ok) {
          let msg = 'Image upload failed'
          try { const j = await r.json(); msg = j?.error || msg } catch { /* no-op */ }
          throw new Error(msg)
        }
      }

      // Clear the file input after successful save
      if (fileRef.current) fileRef.current.value = ''

      // Stay on the product page after save
      if (!isEdit) {
        // Newly created product: ensure view mode, then navigate to its page
        setEditing(false)
        nav(`/admin/products/${pid}`)
      } else {
        // Switch back to view mode
        setEditing(false)
        // Optionally refresh product data and images if files were uploaded
        if (pid) {
          if (hadFiles) {
            fetch(`/api/admin/products/${pid}/images`, { credentials:'include' })
              .then(r=>r.ok?r.json():[])
              .then(setImages)
              .catch(() => { /* no-op */ })
          }
          // Refresh product to reflect any updated fields
          fetch(`/api/products/${pid}`)
            .then(r=>r.ok?r.json():null)
            .then((p: Product | null) => { if (p) { setProduct(p); setSavedProduct(p) } })
            .catch(() => { /* no-op */ })
        }
      }
    } catch (err:any) {
      setError(err?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setConfirmSave(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{isEdit? (editing ? 'Edit' : 'Product') : 'New'} Product</h1>
        <button
          type="button"
          onClick={() => {
            if (editing && hasUnsavedChanges()) {
              setConfirmLeave({ open: true, action: 'back' })
            } else {
              nav('/admin/products')
            }
          }}
          className="px-3 py-1.5  cursor-pointer border rounded-md text-sm transition-transform duration-150 hover:scale-[1.03] active:scale-95"
        >
          Back
        </button>
      </div>
  <form ref={formElRef} onSubmit={onSubmit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Title</label>
            {editing ? (
              <input value={product.title} onChange={e=>setProduct({...product,title:e.target.value})} className="w-full border rounded-md px-3 py-2" required />
            ) : (
              <div className="px-3 py-2 border rounded-md bg-gray-50">{product.title || <span className="text-gray-400">—</span>}</div>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600">Slug</label>
            {editing ? (
              <input value={product.slug} onChange={e=>setProduct({...product,slug:e.target.value})} className="w-full border rounded-md px-3 py-2" required />
            ) : (
              <div className="px-3 py-2 border rounded-md bg-gray-50">{product.slug || <span className="text-gray-400">—</span>}</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Price (₱)</label>
              {editing ? (
                <input type="number" min={0} value={Math.round(product.priceCents/100)} onChange={e=>setProduct({...product,priceCents: Number(e.target.value)*100})} className="w-full border rounded-md px-3 py-2" required />
              ) : (
                <div className="px-3 py-2 border rounded-md bg-gray-50">{new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', maximumFractionDigits:0 }).format((product.priceCents||0)/100)}</div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600">Category</label>
              {editing ? (
                <select value={product.categoryId ?? ''} onChange={e=>setProduct({...product,categoryId:e.target.value||undefined})} className="w-full border rounded-md px-3 py-2">
                  <option value="">—</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <div className="px-3 py-2 border rounded-md bg-gray-50">{categories.find(c=>c.id===product.categoryId)?.name || '—'}</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Brand</label>
              {editing ? (
                <select value={product.brand || ''} onChange={e=>setProduct({...product,brand:e.target.value || undefined})} className="w-full border rounded-md px-3 py-2" disabled={brandDisabled}>
                  <option value="">{brandDisabled ? 'Select a category first' : '—'}</option>
                  {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              ) : (
                <div className="px-3 py-2 border rounded-md bg-gray-50">{product.brand || <span className="text-gray-400">—</span>}</div>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600">Specs (short)</label>
              {editing ? (
                <input value={product.specs || ''} onChange={e=>setProduct({...product,specs:e.target.value})} className="w-full border rounded-md px-3 py-2" placeholder="Socket: AM5; Cores: 8; Threads: 16" />
              ) : (
                <div className="px-3 py-2 border rounded-md bg-gray-50">{product.specs || <span className="text-gray-400">—</span>}</div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600">Description</label>
            {editing ? (
              <textarea value={product.description||''} onChange={e=>setProduct({...product,description:e.target.value})} rows={5} className="w-full border rounded-md px-3 py-2" />
            ) : (
              <div className="px-3 py-2 border rounded-md bg-gray-50 min-h-20 whitespace-pre-wrap">{product.description || <span className="text-gray-400">No description</span>}</div>
            )}
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button type="submit" disabled={saving} className="px-4 py-2 rounded-md cursor-pointer bg-black text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95">{saving? 'Saving…' : (isEdit ? 'Save Product' : 'Create Product')}</button>
                {isEdit && <button type="button" onClick={()=>setShowDelete(true)} disabled={saving} className="px-3 py-2 rounded-md border text-red-600 transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer">Delete</button>}
                {isEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      if (hasUnsavedChanges()) {
                        setConfirmLeave({ open: true, action: 'cancel' })
                      } else {
                        if (savedProduct) setProduct(savedProduct); else setProduct(emptyProduct)
                        setEditing(false)
                        setError(null)
                        if (fileRef.current) fileRef.current.value = ''
                      }
                    }}
                    className="px-3 py-2 rounded-md border transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </>
            ) : (
              <>
                {isEdit && (
                  <button
                    type="button"
                    onMouseDown={(e)=>{ e.preventDefault(); e.stopPropagation(); setEditing(true) }}
                    className="px-3 py-2 cursor-pointer rounded-md border transition-transform duration-150 hover:scale-[1.03] active:scale-95"
                  >
                    Edit
                  </button>
                )}
                {isEdit && <button type="button" onClick={()=>setShowDelete(true)} disabled={saving} className="px-3 py-2 rounded-md border text-red-600 transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer">Delete</button>}
              </>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <div className="text-sm font-medium mb-2">Images</div>
            {coverUrl && <img src={coverUrl} alt="cover" className="w-full aspect-video object-cover rounded mb-2" />}
            {editing && <input type="file" multiple ref={fileRef} className="block w-full text-sm" accept="image/*" />}
            {images.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {images.sort((a,b)=>a.position-b.position).map(img => (
                  <img key={img.id} src={img.url} className="w-full aspect-square object-cover rounded" />
                ))}
              </div>
            )}
          </div>
        </div>
      </form>
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Delete product</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete <span className="font-medium">{product.title || 'this product'}</span>? This action cannot be undone.</p>
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 cursor-pointer rounded-md border" onClick={()=>setShowDelete(false)} disabled={saving}>Cancel</button>
              <button type="button" className="px-3 py-2 cursor-pointer rounded-md bg-red-600 text-white" onClick={doDelete} disabled={saving}>{saving? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
      {confirmSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Save changes?</h3>
            <p className="text-sm text-gray-600 mb-4">Do you want to save your changes to <span className="font-medium">{product.title || 'this product'}</span>?</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 cursor-pointer rounded-md border" onClick={()=>setConfirmSave(false)} disabled={saving}>Cancel</button>
              <button
                type="button"
                className="px-3 py-2 cursor-pointer rounded-md bg-black text-white"
                disabled={saving}
                onClick={async () => {
                  setConfirmSave(false)
                  await saveProduct()
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmLeave.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Discard changes?</h3>
            <p className="text-sm text-gray-600 mb-4">You have unsaved changes. If you continue, your edits will be lost.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 transition-transform duration-150 hover:scale-[1.03] active:scale-95 cursor-pointer rounded-md border" onClick={()=>setConfirmLeave({ open: false, action: confirmLeave.action })}>Stay</button>
              <button
                type="button"
                className="px-3 py-2 cursor-pointer rounded-md bg-black text-white transition-transform duration-150 hover:scale-[1.03] active:scale-95"
                onClick={() => {
                  const action = confirmLeave.action
                  setConfirmLeave({ open: false, action })
                  if (action === 'back') {
                    nav('/admin/products')
                  } else {
                    if (savedProduct) setProduct(savedProduct); else setProduct(emptyProduct)
                    setEditing(false)
                    setError(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }
                }}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
