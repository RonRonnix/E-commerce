import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ConfirmDialog } from '../components/ConfirmDialog'

export default function OrderDetailsPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/orders/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled) setOrder(data) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [id])

  const price = (cents: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((cents || 0)/100)

  if (loading) return <div className="container-xl py-10">Loading…</div>
  if (!order) return <div className="container-xl py-10">Order not found</div>

  return (
    <section className="container-xl py-10 space-y-6">
      <h1 className="text-xl font-semibold">Order #{order.id.slice(-6)}</h1>
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm text-gray-600">Status: <span className="text-black font-medium">{order.status}</span></div>
        <div className="mt-2 grid sm:grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-600">Ship to:</span> {order.fullName}, {order.addressLine1}, {order.city}, {order.region}, {order.postalCode}</div>
          <div><span className="text-gray-600">Payment:</span> {order.paymentMethod.toUpperCase()}</div>
        </div>
        {(order.status !== 'cancelled' && order.status !== 'shipped') && (
          <div className="mt-4">
            <button disabled={cancelLoading} onClick={() => setConfirmOpen(true)} className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-50">Cancel order</button>
          </div>
        )}
      </div>
      <div className="rounded-xl border bg-white p-4">
        <h2 className="font-semibold mb-3">Items</h2>
        <div className="space-y-2 text-sm">
            {(order.items || []).map((i: any) => (
            <div key={i.id} className="flex items-center justify-between">
              <span>{i.title} x{i.quantity}</span>
              <span>{price(i.priceCents * i.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t pt-3 text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>{price(order.subtotalCents)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{price(order.shippingCents)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{price(order.discountCents)}</span></div>
          <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{price(order.totalCents)}</span></div>
        </div>
      </div>
      <Link to="/profile" className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95 inline-block">Back to Profile</Link>
      <ConfirmDialog
        open={confirmOpen}
        title="Cancel this order?"
        message={`This will cancel order #${String(order.id).slice(-6)}. You can’t undo this action.`}
        confirmText="Yes, cancel"
        cancelText="No"
        onConfirm={async () => {
          setCancelLoading(true)
          try {
            const r = await fetch(`/api/orders/${order.id}/cancel`, { method: 'POST', credentials: 'include' })
            if (r.ok) {
              // After cancelling, ensure we have full order details
              const updated = await fetch(`/api/orders/${order.id}`, { credentials: 'include' })
              const data = await updated.json()
              setOrder(data)
            }
          } finally {
            setCancelLoading(false)
            setConfirmOpen(false)
          }
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  )
}
