import { useEffect, useState } from 'react'
import { assetUrl } from '../../lib/media'
import { Link } from 'react-router-dom'

export default function Orders() {
  const [users, setUsers] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load users')))
      .then((data) => { if (!cancelled) { setUsers(data); setError(null) } })
      .catch((e:any) => { if (!cancelled) setError(e?.message || 'Failed to load users') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const normalized = (s: any) => (typeof s === 'string' ? s.trim().toLowerCase() : '')
  const q = normalized(query)
  const filtered = q
    ? users.filter((u) => {
        const name = normalized(u.fullName)
        const username = normalized(u.username)
        const email = normalized(u.email)
        // Prefix-only match on any field
        return (
          (name && name.startsWith(q)) ||
          (username && username.startsWith(q)) ||
          (email && email.startsWith(q))
        )
      })
    : users

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold mr-auto">Order List by Customer</h1>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers"
            className="w-64 max-w-full border rounded-md py-1.5 pl-3 pr-8 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-sm"
              aria-label="Clear search"
              title="Clear"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : users.length === 0 ? (
        <div className="text-gray-600 text-sm">No customers found.</div>
      ) : (
        <>
        {filtered.length === 0 ? (
          <div className="text-gray-600 text-sm">No matching customers.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(u => (
            <Link key={u.id} to={`/admin/orders/${u.id}`} className="rounded-lg border bg-white p-4 flex items-center gap-3 hover:bg-gray-50 transition-transform duration-150 hover:scale-[1.01] active:scale-95">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                {u.avatarUrl ? <img src={assetUrl(u.avatarUrl)} alt="" className="w-full h-full object-cover"/> : null}
              </div>
              <div className="min-w-0">
                <div className="font-medium truncate">{u.fullName || u.username || u.email}</div>
                <div className="text-xs text-gray-600">{u.ordersCount} {u.ordersCount === 1 ? 'order' : 'orders'}</div>
              </div>
              <div className="ml-auto text-xs text-gray-500">View orders ›</div>
            </Link>
          ))}
          </div>
        )}
        </>
      )}
    </div>
  )
}
