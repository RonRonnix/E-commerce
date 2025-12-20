import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../components/AuthContext'

export default function ProfilePage() {
  const { user, loading, login, register, logout, updateProfile, updateAvatar } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Editable profile state
  const [username, setUsername] = useState(user?.username || '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [editing, setEditing] = useState(false)
  // Orders state
  const [orders, setOrders] = useState<Array<any>>([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  useEffect(() => {
    setUsername(user?.username || '')
    setEditing(false)
  }, [user])

  useEffect(() => {
    if (!user) { setOrders([]); return }
    let cancelled = false
    setOrdersLoading(true)
    fetch('/api/orders', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled) setOrders(data) })
      .finally(() => { if (!cancelled) setOrdersLoading(false) })
    return () => { cancelled = true }
  }, [user?.id])

  if (loading) return <div className="container-xl py-10">Loading…</div>

  async function onAuthSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await register(fullName, email, password)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed'
      setError(msg)
    }
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    try {
      setSaving(true)
      // Update username if changed
      if (username !== (user.username || '')) {
        await updateProfile({ username: username.trim() || undefined })
      }
      // Upload avatar if a new one is chosen
      const file = fileInputRef.current?.files?.[0]
      if (file) {
        await updateAvatar(file)
        setAvatarPreview(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
      // Exit edit mode on success
      setEditing(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) { setAvatarPreview(null); return }
    const url = URL.createObjectURL(f)
    setAvatarPreview(url)
  }

  if (user) {
    return (
      <div className="container-xl py-10 max-w-5xl">
        <h1 className="text-2xl font-semibold">Your Profile</h1>
        <p className="text-sm text-gray-600 mt-1">Only your public username and profile image are shown here.</p>

        {!editing ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6 items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-28 w-28 rounded-full overflow-hidden bg-gray-100 border">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">No image</div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-gray-700">Username</div>
                <div className="text-lg font-medium">{user.username || '—'}</div>
              </div>
              <div className="flex gap-3 ml-auto">
                <button className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => setEditing(true)}>Edit</button>
                <button className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => logout()}>Log out</button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={onSaveProfile} className="mt-6 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6 items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="h-28 w-28 rounded-full overflow-hidden bg-gray-100 border">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar preview" className="h-full w-full object-cover" />
                ) : user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-400">No image</div>
                )}
              </div>
              <div>
                <label className="px-3 py-1.5 border rounded-md cursor-pointer inline-block transition-transform duration-150 hover:scale-[1.03] active:scale-95">
                  Change image
                  <input ref={fileInputRef} onChange={onAvatarChange} type="file" accept="image/*" className="hidden" />
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Username</label>
                <input
                  value={username}
                  onChange={e=>setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full border rounded-md px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">This is your public handle. Keep it unique and memorable.</p>
              </div>

              {error && <div className="text-red-600 text-sm">{error}</div>}

              <div className="flex gap-3">
                <button disabled={saving} className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-60 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" type="submit">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                <button type="button" className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => {
                  // reset local edits and exit edit mode
                  setUsername(user.username || '')
                  setAvatarPreview(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                  setEditing(false)
                }}>Cancel</button>
                <button type="button" className="ml-auto px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => logout()}>Log out</button>
              </div>
            </div>
          </form>
        )}

        {/* Orders */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Your Orders <span className="text-gray-500 text-base">({orders.length})</span></h2>
          </div>
          {ordersLoading ? (
            <div className="text-sm text-gray-600">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="text-gray-600 text-sm">You haven’t placed any orders yet.</div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border bg-white p-4">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div className="text-sm text-gray-600">Order <span className="text-black font-medium">#{String(o.id).slice(-6)}</span></div>
                    <div className="text-sm">Status: <span className="font-medium">{o.status}</span></div>
                    <div className="text-sm">Total: <span className="font-medium">{new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((o.totalCents||0)/100)}</span></div>
                    <a href={`/orders/${o.id}`} className="ml-auto px-3 py-1.5 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95">View details</a>
                  </div>
                  <div className="mt-3 flex gap-3 overflow-x-auto no-scrollbar py-1">
                    {o.items.map((it: any) => (
                      <a key={it.id} href={`/products/${it.productId}`} className="flex-shrink-0 w-20">
                        <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-100">
                          <img src={(it.product?.imageUrl) ?? `https://picsum.photos/seed/${it.productId}/160/160`} alt={it.title} className="w-full h-full object-cover" />
                        </div>
                        <div className="text-[11px] mt-1 line-clamp-2">x{it.quantity} {it.title}</div>
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container-xl py-10 max-w-lg">
      <div className="flex gap-4 mb-6">
        <button className={`px-3 py-1.5 rounded-md border cursor-pointer ${mode==='login'?'bg-black text-white':''}`} onClick={() => setMode('login')}>Login</button>
        <button className={`px-3 py-1.5 rounded-md border cursor-pointer ${mode==='register'?'bg-black text-white':''}`} onClick={() => setMode('register')}>Register</button>
      </div>
      <form onSubmit={onAuthSubmit} className="space-y-4">
        {mode === 'register' && (
          <input value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Full name" className="w-full border rounded-md px-3 py-2" required />
        )}
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email" className="w-full border rounded-md px-3 py-2" required />
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password" className="w-full border rounded-md px-3 py-2" required />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="px-4 py-2 rounded-md bg-black text-white" type="submit">{mode==='login'?'Login':'Create account'}</button>
      </form>
    </div>
  )
}
