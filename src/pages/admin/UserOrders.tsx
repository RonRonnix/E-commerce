import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { assetUrl } from '../../lib/media'

export default function UserOrders() {
  const { id } = useParams()
  const [orders, setOrders] = useState<Array<any>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userLabel, setUserLabel] = useState<string>('Customer')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/admin/users/${id}/orders`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load orders')))
      .then((data) => { if (!cancelled) { setOrders(data); setError(null); const u = data[0]?.user; if (u) setUserLabel(u.fullName || u.username || u.email) } })
      .catch((e:any) => { if (!cancelled) setError(e?.message || 'Failed to load orders') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const price = (cents: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((cents||0)/100)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{userLabel} — Orders</h1>
        <Link to="/admin/orders" className="text-sm underline">Back to customers</Link>
      </div>
      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : orders.length === 0 ? (
        <div className="text-gray-600 text-sm">No orders yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                {['Order ID','Date','Status','Total','Items'].map(h => (
                  <th key={h} className="px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-3">#{String(o.id).slice(-6)}</td>
                  <td className="px-4 py-3">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{o.status}</td>
                  <td className="px-4 py-3">{price(o.totalCents)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(o.items||[]).slice(0,4).map((it:any) => {
                        const src = assetUrl(it.product?.imageUrl) ?? `https://picsum.photos/seed/${it.productId}/60/60`
                        return (
                          <div key={it.id} className="h-8 w-8 rounded bg-gray-200 overflow-hidden">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                          </div>
                        )
                      })}
                      {o.items?.length > 4 && <span className="text-xs text-gray-600">+{o.items.length-4} more</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
