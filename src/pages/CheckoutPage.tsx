import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../components/AuthContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToaster } from '../components/Toaster'
import { useCart } from '../components/CartContext'

export default function CheckoutPage() {
  const { user } = useAuth()
  const nav = useNavigate()
  const { show } = useToaster()
  const { refresh: refreshCart } = useCart()
  const [items, setItems] = useState<Array<{ product: any, quantity: number }>>([])
  const [addresses, setAddresses] = useState<any[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [savingAddress, setSavingAddress] = useState(false)
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null)
  const [voucherCode, setVoucherCode] = useState('')
  const [summary, setSummary] = useState<{ subtotalCents: number; shippingCents: number; discountCents: number; totalCents: number } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cod'|'online'>('cod')
  const [address, setAddress] = useState({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'PH' })
  const [addressBaseline, setAddressBaseline] = useState({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'PH' })
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<any | null>(null)
  const [pendingDelete, setPendingDelete] = useState<any | null>(null)
  const [lastNoChangeToastAt, setLastNoChangeToastAt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetch('/api/cart', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
      fetch('/api/addresses', { credentials: 'include' }).then(r => r.ok ? r.json() : []),
    ])
      .then(([cartData, addressData]) => {
        if (cancelled) return
        setItems(cartData)
        setAddresses(addressData)
        const defaultAddress = addressData.find((a: any) => a.isDefault) || addressData[0]
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
          const next = {
            fullName: defaultAddress.fullName,
            phone: defaultAddress.phone,
            addressLine1: defaultAddress.addressLine1,
            addressLine2: defaultAddress.addressLine2 || '',
            city: defaultAddress.city,
            region: defaultAddress.region,
            postalCode: defaultAddress.postalCode,
            country: defaultAddress.country || 'PH',
          }
          setAddress(next)
          setAddressBaseline(next)
          setShowNewAddress(false)
        } else {
          const blank = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'PH' }
          setAddress(blank)
          setAddressBaseline(blank)
          setShowNewAddress(true)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    // recompute summary whenever voucher changes
    fetch('/api/checkout/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ voucherCode }) })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed'))) 
      .then(setSummary).catch(() => setSummary(null))
  }, [voucherCode])

  const price = (cents: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((cents || 0)/100)
  const addressReady = Boolean(
    selectedAddressId ||
    (address.fullName && address.phone && address.addressLine1 && address.city && address.region && address.postalCode)
  )
  const canSaveAddress = Boolean(
    address.fullName && address.phone && address.addressLine1 && address.city && address.region && address.postalCode
  )
  const addressKeys = ['fullName', 'phone', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'country'] as const
  const isDirty = showNewAddress && addressKeys.some((k) => (address[k] ?? '') !== (addressBaseline[k] ?? ''))

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  function pickAddress(item: any) {
    setSelectedAddressId(item.id)
    setEditingAddressId(null)
    setAddress({
      fullName: item.fullName,
      phone: item.phone,
      addressLine1: item.addressLine1,
      addressLine2: item.addressLine2 || '',
      city: item.city,
      region: item.region,
      postalCode: item.postalCode,
      country: item.country || 'PH',
    })
    setAddressBaseline({
      fullName: item.fullName,
      phone: item.phone,
      addressLine1: item.addressLine1,
      addressLine2: item.addressLine2 || '',
      city: item.city,
      region: item.region,
      postalCode: item.postalCode,
      country: item.country || 'PH',
    })
    setShowNewAddress(false)
  }

  function startNewAddress() {
    setSelectedAddressId(null)
    setEditingAddressId(null)
    const blank = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'PH' }
    setAddress(blank)
    setAddressBaseline(blank)
    setShowNewAddress(true)
  }

  function startEditAddress(item: any) {
    setSelectedAddressId(item.id)
    setEditingAddressId(item.id)
    setAddress({
      fullName: item.fullName,
      phone: item.phone,
      addressLine1: item.addressLine1,
      addressLine2: item.addressLine2 || '',
      city: item.city,
      region: item.region,
      postalCode: item.postalCode,
      country: item.country || 'PH',
    })
    setAddressBaseline({
      fullName: item.fullName,
      phone: item.phone,
      addressLine1: item.addressLine1,
      addressLine2: item.addressLine2 || '',
      city: item.city,
      region: item.region,
      postalCode: item.postalCode,
      country: item.country || 'PH',
    })
    setShowNewAddress(true)
  }

  function runPending(action: any) {
    if (!action) return
    if (action.type === 'pick') pickAddress(action.item)
    if (action.type === 'new') startNewAddress()
    if (action.type === 'edit') startEditAddress(action.item)
    if (action.type === 'cancel') {
      if (editingAddressId) {
        const existing = addresses.find((a) => a.id === editingAddressId)
        if (existing) pickAddress(existing)
      }
      setEditingAddressId(null)
      setShowNewAddress(false)
    }
  }

  function requestAction(action: any) {
    if (!isDirty) {
      runPending(action)
      return
    }
    setPendingAction(action)
    setDiscardOpen(true)
  }

  function requestSave() {
    if (!canSaveAddress || savingAddress) return
    if (!isDirty) {
      const now = Date.now()
      if (now - lastNoChangeToastAt > 1500) {
        show('No changes to save')
        setLastNoChangeToastAt(now)
      }
      return
    }
    setSaveConfirmOpen(true)
  }

  function requestDelete(item: any) {
    setPendingDelete(item)
    setDeleteConfirmOpen(true)
  }

  async function saveAddressNow() {
    if (!canSaveAddress || savingAddress) return
    setSavingAddress(true)
    const isEdit = Boolean(editingAddressId)
    const url = isEdit ? `/api/addresses/${editingAddressId}` : '/api/addresses'
    const method = isEdit ? 'PATCH' : 'POST'
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(address),
    })
    if (!r.ok) {
      show('Address save failed')
      setSavingAddress(false)
      return
    }
    const saved = await r.json()
    setAddresses((prev) => {
      if (isEdit) return prev.map((a) => a.id === saved.id ? saved : a)
      return [saved, ...prev]
    })
    setSelectedAddressId(saved.id)
    setEditingAddressId(null)
    setShowNewAddress(false)
    setAddressBaseline({
      fullName: saved.fullName,
      phone: saved.phone,
      addressLine1: saved.addressLine1,
      addressLine2: saved.addressLine2 || '',
      city: saved.city,
      region: saved.region,
      postalCode: saved.postalCode,
      country: saved.country || 'PH',
    })
    setSavingAddress(false)
  }

  async function deleteAddress(item: any) {
    if (deletingAddressId) return
    setDeletingAddressId(item.id)
    const r = await fetch(`/api/addresses/${item.id}`, { method: 'DELETE', credentials: 'include' })
    if (!r.ok) {
      show('Delete failed')
      setDeletingAddressId(null)
      return
    }
    setAddresses((prev) => prev.filter((a) => a.id !== item.id))
    if (selectedAddressId === item.id) {
      setSelectedAddressId(null)
      const blank = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'PH' }
      setAddress(blank)
      setAddressBaseline(blank)
      setShowNewAddress(true)
    }
    if (editingAddressId === item.id) {
      setEditingAddressId(null)
    }
    setDeletingAddressId(null)
  }

  async function placeOrder() {
    if (!user) { nav('/profile'); return }
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ voucherCode: voucherCode || undefined, paymentMethod, address }) })
    if (!r.ok) { show('Checkout failed'); return }
    const data = await r.json()
    await refreshCart()
    if (paymentMethod === 'online' && data.paymentId) {
      nav(`/payment/${data.paymentId}`)
    } else {
      nav(`/orders/${data.orderId}`)
    }
  }

  function attemptCheckout() {
    // minimal address checks before showing confirm
    if (!addressReady) {
      show('Please fill in all required address fields')
      return
    }
    if (!summary) {
      show('Order summary not ready yet')
      return
    }
    setConfirmOpen(true)
  }

  if (loading) return <div className="container-xl py-10">Loading…</div>

  return (
    <>
    <section className="container-xl py-10 grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Shipping Address</h2>
            <button
              className="text-sm underline cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100"
              onClick={() => requestAction({ type: 'new' })}
            >
              Add new address
            </button>
          </div>

          {addresses.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {addresses.map((a: any) => (
                <div
                  key={a.id}
                  className={`text-left border rounded-md p-3 transition cursor-pointer ${selectedAddressId === a.id ? 'border-black bg-gray-50' : 'hover:border-gray-400'}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => requestAction({ type: 'pick', item: a })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') requestAction({ type: 'pick', item: a }) }}
                >
                  <div className="font-medium text-sm">{a.label || a.fullName}</div>
                  <div className="text-xs text-gray-500">{a.phone}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">
                    {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.region}, {a.postalCode}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <button type="button" className="underline cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" onClick={(e) => { e.stopPropagation(); requestAction({ type: 'edit', item: a }) }}>Edit</button>
                    <button type="button" className="underline cursor-pointer text-red-600 disabled:opacity-60 transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" disabled={deletingAddressId === a.id} onClick={(e) => { e.stopPropagation(); requestDelete(a) }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {showNewAddress && (
            <div className="grid sm:grid-cols-2 gap-3">
              <input className="border rounded-md px-3 py-2" placeholder="Full name" value={address.fullName} onChange={e=>setAddress({...address, fullName: e.target.value})} />
              <input className="border rounded-md px-3 py-2" placeholder="Phone" value={address.phone} onChange={e=>setAddress({...address, phone: e.target.value})} />
              <input className="border rounded-md px-3 py-2 sm:col-span-2" placeholder="Address line 1" value={address.addressLine1} onChange={e=>setAddress({...address, addressLine1: e.target.value})} />
              <input className="border rounded-md px-3 py-2 sm:col-span-2" placeholder="Address line 2 (optional)" value={address.addressLine2} onChange={e=>setAddress({...address, addressLine2: e.target.value})} />
              <input className="border rounded-md px-3 py-2" placeholder="City" value={address.city} onChange={e=>setAddress({...address, city: e.target.value})} />
              <input className="border rounded-md px-3 py-2" placeholder="Region/Province" value={address.region} onChange={e=>setAddress({...address, region: e.target.value})} />
              <input className="border rounded-md px-3 py-2" placeholder="Postal code" value={address.postalCode} onChange={e=>setAddress({...address, postalCode: e.target.value})} />
              <input className="border rounded-md px-3 py-2" placeholder="Country" value={address.country} onChange={e=>setAddress({...address, country: e.target.value})} />
              <div className="sm:col-span-2 flex items-center gap-3">
                <button
                  className="px-3 py-2 rounded-md bg-black text-white text-xs disabled:opacity-60 transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100 cursor-pointer" 
                  disabled={!canSaveAddress || savingAddress}
                  onClick={requestSave}
                >
                  {editingAddressId ? 'Save changes' : 'Save address'}
                </button>
                <button className="text-xs underline transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100 cursor-pointer" onClick={() => requestAction({ type: 'cancel' })}>Cancel</button>
              </div>
            </div>
          )}

          {!showNewAddress && !selectedAddressId && (
            <div className="text-sm text-gray-500">Select an address or add a new one to continue.</div>
          )}
        </div>

        <div className={`rounded-xl border bg-white p-4 ${addressReady ? '' : 'opacity-60'}`}>
          <h2 className="font-semibold mb-3">Payment</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={paymentMethod==='cod'} onChange={()=>setPaymentMethod('cod')} disabled={!addressReady} /> Cash on Delivery</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" checked={paymentMethod==='online'} onChange={()=>setPaymentMethod('online')} disabled={!addressReady} /> Online Payment</label>
          </div>
          {!addressReady && (
            <div className="text-xs text-gray-500 mt-2">Choose a shipping address first.</div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm max-h-60 overflow-auto pr-1">
            {items.map((i: any) => (
              <div key={i.product.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={i.product.imageUrl ?? `https://picsum.photos/seed/${i.product.id}/80/80`} alt="" className="h-10 w-10 rounded object-cover" />
                  <span className="line-clamp-1">{i.product.title}</span>
                </div>
                <div>x{i.quantity}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span>Voucher</span>
            <input className="border rounded-md px-2 py-1 text-sm w-40" placeholder="Code" value={voucherCode} onChange={e=>setVoucherCode(e.target.value)} />
          </div>
          <div className="mt-3 border-t pt-3 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>{summary ? price(summary.subtotalCents) : '—'}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{summary ? price(summary.shippingCents) : '—'}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>-{summary ? price(summary.discountCents) : '—'}</span></div>
            <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{summary ? price(summary.totalCents) : '—'}</span></div>
          </div>
          <button className="mt-4 w-full px-4 py-2 rounded-md bg-black text-white cursor-pointer transition-transform duration-150 hover:scale-[1.02] active:scale-95" onClick={attemptCheckout}>Place Order</button>
          <div className="mt-2 text-xs text-gray-500">Tip: Use FREESHIP for free delivery.</div>
        </div>
      </div>
  </section>
    <ConfirmDialog
      open={confirmOpen}
      title={paymentMethod === 'online' ? 'Confirm and pay order?' : 'Confirm order?'}
      message={summary ? `
Name: ${address.fullName}\n
Phone: ${address.phone}\n
Address: ${address.addressLine1}${address.addressLine2 ? ', ' + address.addressLine2 : ''}, ${address.city}, ${address.region}, ${address.postalCode}\n
Payment: ${paymentMethod.toUpperCase()}\n
Voucher: ${voucherCode || '—'}\n
Total: PHP ${(summary.totalCents/100).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
` : undefined}
      confirmText={paymentMethod === 'online' ? 'Confirm & Pay' : 'Confirm'}
      cancelText="Review"
      onConfirm={() => { setConfirmOpen(false); placeOrder() }}
      onCancel={() => setConfirmOpen(false)}
    />
    <ConfirmDialog
      open={discardOpen}
      title="Discard changes?"
      message="You have unsaved address changes. Discard them and continue?"
      confirmText="Discard"
      cancelText="Keep editing"
      onConfirm={() => { setDiscardOpen(false); runPending(pendingAction); setPendingAction(null) }}
      onCancel={() => { setDiscardOpen(false); setPendingAction(null) }}
    />
    <ConfirmDialog
      open={saveConfirmOpen}
      title={editingAddressId ? 'Save changes?' : 'Save address?'}
      message={editingAddressId ? 'Save your updated address details?' : 'Save this address to your list?'}
      confirmText="Save"
      cancelText="Keep editing"
      onConfirm={() => { setSaveConfirmOpen(false); saveAddressNow() }}
      onCancel={() => setSaveConfirmOpen(false)}
    />
    <ConfirmDialog
      open={deleteConfirmOpen}
      title="Delete address?"
      message="This will remove the address from your list."
      confirmText="Delete"
      cancelText="Cancel"
      onConfirm={() => { setDeleteConfirmOpen(false); if (pendingDelete) deleteAddress(pendingDelete); setPendingDelete(null) }}
      onCancel={() => { setDeleteConfirmOpen(false); setPendingDelete(null) }}
    />
    </>
  )
}
