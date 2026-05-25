import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

export default function PaymentPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [payment, setPayment] = useState<any | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [handledPaid, setHandledPaid] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/payments/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setPayment)
  }, [id])

  useEffect(() => {
    if (!payment || handledPaid) return
    if (payment.status === 'paid') {
      setHandledPaid(true)
      nav('/payment-success')
    }
  }, [payment, handledPaid, nav])

  async function pay() {
    if (!id) return
    setLoading(true)
    setError(null)
    const r = await fetch(`/api/payments/${id}/paymongo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    })
    const data = await r.json().catch(() => null)
    setLoading(false)
    if (!r.ok) {
      setError('Payment failed. Please try again.')
      return
    }
    if (data?.redirectUrl) {
      window.location.href = data.redirectUrl
      return
    }
    if (data?.status === 'succeeded') {
      nav('/payment-success')
      return
    }
    nav('/orders')
  }

  return (
    <section className="container-xl py-10">
      <h1 className="text-xl font-semibold mb-4">Complete Payment</h1>
      <p className="text-sm text-gray-600">You will be redirected to PayMongo to complete payment securely.</p>
      {payment && (
        <div className="mt-3 text-sm text-gray-600">Amount: PHP {Number(payment.amountCents || 0) / 100}</div>
      )}
      <div className="mt-6 space-y-4 max-w-xl">
        <input className="border rounded-md px-3 py-2 w-full" placeholder="Billing email" value={email} onChange={e => setEmail(e.target.value)} />

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex gap-3">
          <button disabled={loading} onClick={pay} className="px-4 py-2 rounded-md bg-black text-white cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-50">Continue to PayMongo</button>
          <Link to="/" className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95">Cancel</Link>
        </div>
      </div>
    </section>
  )
}
