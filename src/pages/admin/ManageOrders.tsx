import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { assetUrl, placeholderImg } from '../../lib/media'

// Simple status chip
function Status({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    shipped: 'bg-blue-100 text-blue-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-purple-100 text-purple-800',
  }
  const cls = map[status] || 'bg-gray-100 text-gray-800'
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{status}</span>
}

export default function ManageOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialTab = (searchParams.get('tab') as 'recent'|'pending'|'paid'|'cancelled' | null) || 'recent'
  const [tab, setTab] = useState<'recent'|'pending'|'paid'|'cancelled'>(initialTab)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [details, setDetails] = useState<any | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [refundConfirmOpen, setRefundConfirmOpen] = useState(false)
  const [refundReason, setRefundReason] = useState('')
  const [refunding, setRefunding] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', tab)
      return next
    }, { replace: true })
  }, [tab, setSearchParams])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const url = tab === 'recent' ? `/api/admin/orders?limit=100` : `/api/admin/orders?status=${tab}&limit=100`
    fetch(url, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load orders')))
      .then((data) => { if (!cancelled) { setOrders(data); setError(null) } })
      .catch((e:any) => { if (!cancelled) setError(e?.message || 'Failed to load orders') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab])

  const filtered = useMemo(() => orders, [orders])

  async function openDetails(id: string) {
    setDetailsOpen(true)
    setDetailsLoading(true)
    setRefundError(null)
    try {
      const r = await fetch(`/api/orders/${id}`, { credentials: 'include' })
      if (!r.ok) throw new Error('Failed to load order details')
      const data = await r.json()
      setDetails(data)
    } catch (e: any) {
      setDetails({ error: e?.message || 'Failed to load order details' })
    } finally {
      setDetailsLoading(false)
    }
  }

  const canRefund = Boolean(details?.payment?.status === 'paid' && details?.status !== 'refunded')

  async function submitRefund() {
    if (!details?.payment?.id) return
    setRefunding(true)
    setRefundError(null)
    try {
      const r = await fetch(`/api/admin/payments/${details.payment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reasonNote: refundReason.trim() || undefined }),
      })
      if (!r.ok) {
        const err = await r.json().catch(() => null)
        const raw = err?.error
        const code = raw?.errors?.[0]?.code
        const detail = raw?.errors?.[0]?.detail
        let msg = 'Refund failed'
        if (code === 'available_balance_insufficient') {
          msg = 'Refund unavailable: PayMongo balance is insufficient. Add funds or wait for settlement.'
        } else if (code === 'parameter_required' && detail?.includes('reason')) {
          msg = 'Refund reason is required by PayMongo.'
        } else if (code === 'parameter_invalid' && detail?.includes('reason')) {
          msg = 'Refund reason must be one of: duplicate, fraudulent, requested_by_customer.'
        } else if (code === 'parameter_above_maximum' && detail?.includes('amount')) {
          msg = 'Refund amount exceeds the available refundable amount.'
        } else if (typeof raw === 'string') {
          msg = raw
        } else if (raw?.message) {
          msg = String(raw.message)
        } else if (raw?.fieldErrors) {
          msg = Object.values(raw.fieldErrors).flat().join(', ')
        }
        throw new Error(msg)
      }
      setDetails((prev: any) => prev ? { ...prev, status: 'refunded', payment: { ...prev.payment, status: 'refunded' } } : prev)
      setOrders((prev) => prev.map((o) => o.id === details.id ? { ...o, status: 'refunded' } : o))
      setRefundConfirmOpen(false)
      setRefundReason('')
    } catch (e: any) {
      setRefundError(e?.message || 'Refund failed')
    } finally {
      setRefunding(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Manage Orders</h1>
        <div className="inline-flex rounded-md border bg-white overflow-hidden">
          {(([ 
            { key: 'recent', label: 'Recent' },
            { key: 'pending', label: 'Pending' },
            { key: 'paid', label: 'Paid' },
            { key: 'cancelled', label: 'Cancelled' },
          ] as const)) .map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-sm cursor-pointer ${tab === key ? 'bg-black text-white' : 'hover:bg-gray-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-gray-600 text-sm">No orders to show.</div>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr className="text-gray-600">
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o: any) => (
                <tr
                  key={o.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => openDetails(o.id)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openDetails(o.id)
                    }
                  }}
                >
                  <td className="px-4 py-2 align-top">
                    <div className="font-medium">#{o.id.slice(0,8)}</div>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <div>{o.user?.fullName || o.user?.username || o.user?.email || '—'}</div>
                    <div className="text-xs text-gray-500">{o.user?.email}</div>
                  </td>
                  <td className="px-4 py-2 align-top">
                    ₱{(o.totalCents/100).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <Status status={o.status} />
                  </td>
                  <td className="px-4 py-2 align-top">
                    {new Date(o.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 align-top text-right text-gray-400">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details drawer/modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="order-details-title">
          <div className="absolute inset-0 bg-black/30" onClick={() => { setDetailsOpen(false); setDetails(null) }} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl border-l animate-[slideIn_.2s_ease-out]">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div id="order-details-title" className="font-medium">Order Details</div>
              <button className="px-2 py-1 rounded-md border text-xs" onClick={() => { setDetailsOpen(false); setDetails(null) }}>Close</button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-52px)]">
              {detailsLoading ? (
                <div>Loading…</div>
              ) : details?.error ? (
                <div className="text-red-600 text-sm">{details.error}</div>
              ) : details ? (
                <>
                  <div className="text-sm text-gray-600">Order ID</div>
                  <div className="text-lg font-semibold break-all">#{String(details.id).slice(0,8)}</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Status</div>
                      <div className="mt-1"><Status status={details.status} /></div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Created</div>
                      <div className="mt-1">{new Date(details.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Customer</div>
                      <div className="mt-1">{details.fullName || details.user?.fullName || details.user?.username || details.user?.email || '—'}</div>
                      <div className="text-xs text-gray-500">{details.user?.email}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Ship to</div>
                      <div className="mt-1 text-sm whitespace-pre-line">{[details.addressLine1, details.addressLine2, details.city, details.region, details.postalCode, details.country].filter(Boolean).join('\n')}</div>
                      <div className="text-xs text-gray-500 mt-1">{details.phone}</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Items</div>
                    <div className="mt-2 space-y-2">
                      {(details.items || []).map((it: any) => {
                        const src = assetUrl(it.product?.imageUrl) || placeholderImg(it.productId || 'item', 48, 48)
                        return (
                          <div key={it.id} className="flex items-center gap-3">
                            <div className="size-12 rounded bg-gray-200 overflow-hidden">
                              <img src={src} alt={it.title || it.product?.title || 'Order item'} className="w-full h-full object-cover"/>
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm line-clamp-1">{it.title || it.product?.title || '—'}</div>
                              <div className="text-xs text-gray-500">Qty {it.quantity} · ₱{(it.priceCents/100).toFixed(2)}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Subtotal</div>
                      <div className="mt-1">₱{(details.subtotalCents/100).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Shipping</div>
                      <div className="mt-1">₱{(details.shippingCents/100).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Discount</div>
                      <div className="mt-1">₱{(details.discountCents/100).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 font-medium">Total</div>
                      <div className="mt-1 font-semibold">₱{(details.totalCents/100).toFixed(2)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-md border text-sm disabled:opacity-60"
                      disabled={!canRefund || refunding}
                      onClick={() => setRefundConfirmOpen(true)}
                    >
                      Issue refund
                    </button>
                    {refundError && <div className="text-sm text-red-600">{refundError}</div>}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {refundConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="refund-title" aria-describedby="refund-desc">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h3 id="refund-title" className="text-lg font-semibold mb-2">Confirm refund?</h3>
            <p id="refund-desc" className="text-sm text-gray-600 mb-3">This will issue a full refund and mark the order as refunded.</p>
            <label className="text-xs text-gray-600">Reason (optional)</label>
            <input
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              placeholder="Customer reported a defect"
              aria-label="Refund note"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
            />
            <div className="mt-2 text-xs text-gray-500">
              PayMongo refunds require an available balance. If funds are not available, the refund will fail.
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-md border text-sm"
                onClick={() => { setRefundConfirmOpen(false); setRefundReason('') }}
                disabled={refunding}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60"
                onClick={submitRefund}
                disabled={refunding}
              >
                {refunding ? 'Refunding…' : 'Confirm refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
