import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

export default function PaymentPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)

  async function markPaid() {
    if (!id) return
    setLoading(true)
    const r = await fetch(`/api/payments/${id}/mark-paid`, { method: 'POST', credentials: 'include' })
    setLoading(false)
    if (r.ok) {
      // Ideally fetch orderId by payment, but to simplify, navigate back with message
      nav('/')
    }
  }

  return (
    <section className="container-xl py-10">
      <h1 className="text-xl font-semibold mb-4">Complete Payment</h1>
      <p className="text-sm text-gray-600">This is a demo payment screen for local bank/online payments. Click mark paid to simulate success.</p>
      <div className="mt-6 flex gap-3">
        <button disabled={loading} onClick={markPaid} className="px-4 py-2 rounded-md bg-black text-white cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-50">Mark as Paid</button>
        <Link to="/" className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95">Cancel</Link>
      </div>
    </section>
  )
}
