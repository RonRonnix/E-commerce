import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

export default function PaymentPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [loading, setLoading] = useState(false)
  const [payment, setPayment] = useState<any | null>(null)
  const [method, setMethod] = useState<'card' | 'gcash' | 'paymaya'>('card')
  const [email, setEmail] = useState('')
  const [card, setCard] = useState({ name: '', number: '', expMonth: '', expYear: '', cvc: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/payments/${id}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(setPayment)
  }, [id])

  async function pay() {
    if (!id) return
    setLoading(true)
    setError(null)
    const payload: any = { method, email }
    if (method === 'card') {
      payload.card = {
        name: card.name,
        number: card.number,
        expMonth: Number(card.expMonth),
        expYear: Number(card.expYear),
        cvc: card.cvc,
      }
    }
    const r = await fetch(`/api/payments/${id}/paymongo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
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
      nav('/orders')
      return
    }
    nav('/orders')
  }

  return (
    <section className="container-xl py-10">
      <h1 className="text-xl font-semibold mb-4">Complete Payment</h1>
      <p className="text-sm text-gray-600">Pay with card, GCash, or Maya via PayMongo.</p>
      {payment && (
        <div className="mt-3 text-sm text-gray-600">Amount: PHP {Number(payment.amountCents || 0) / 100}</div>
      )}
      <div className="mt-6 space-y-4 max-w-xl">
        <input className="border rounded-md px-3 py-2 w-full" placeholder="Billing email" value={email} onChange={e => setEmail(e.target.value)} />
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={method === 'card'} onChange={() => setMethod('card')} /> Card</label>
          <label className="flex items-center gap-2"><input type="radio" checked={method === 'gcash'} onChange={() => setMethod('gcash')} /> GCash</label>
          <label className="flex items-center gap-2"><input type="radio" checked={method === 'paymaya'} onChange={() => setMethod('paymaya')} /> Maya</label>
        </div>

        {method === 'card' && (
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="border rounded-md px-3 py-2 sm:col-span-2" placeholder="Cardholder name" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} />
            <input className="border rounded-md px-3 py-2 sm:col-span-2" placeholder="Card number" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} />
            <input className="border rounded-md px-3 py-2" placeholder="Exp month (MM)" value={card.expMonth} onChange={e => setCard({ ...card, expMonth: e.target.value })} />
            <input className="border rounded-md px-3 py-2" placeholder="Exp year (YYYY)" value={card.expYear} onChange={e => setCard({ ...card, expYear: e.target.value })} />
            <input className="border rounded-md px-3 py-2" placeholder="CVC" value={card.cvc} onChange={e => setCard({ ...card, cvc: e.target.value })} />
          </div>
        )}

        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="flex gap-3">
          <button disabled={loading} onClick={pay} className="px-4 py-2 rounded-md bg-black text-white cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95 disabled:opacity-50">Pay Now</button>
          <Link to="/" className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95">Cancel</Link>
        </div>
      </div>
    </section>
  )
}
