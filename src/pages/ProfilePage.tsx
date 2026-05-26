import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../components/AuthContext'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToaster } from '../components/Toaster'

export default function ProfilePage() {
  const { user, loading, login, register, logout, updateProfile, updateAvatar, updatePassword } = useAuth()
  const { show } = useToaster()
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
  const [showSettings, setShowSettings] = useState(false)
  const [settingsSection, setSettingsSection] = useState<'account' | 'addresses' | 'payments' | 'notifications' | 'privacy' | 'security' | null>(null)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showAuthPassword, setShowAuthPassword] = useState(false)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
  const confirmSaveRef = useRef<HTMLDivElement | null>(null)
  const confirmCancelRef = useRef<HTMLDivElement | null>(null)
  // Orders state
  const [orders, setOrders] = useState<Array<any>>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  // Saved addresses
  const [addresses, setAddresses] = useState<Array<any>>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [addressForm, setAddressForm] = useState({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'PH' })
  const [addressBaseline, setAddressBaseline] = useState({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'PH' })
  const [savingAddress, setSavingAddress] = useState(false)
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null)
  const [addressSaveConfirmOpen, setAddressSaveConfirmOpen] = useState(false)
  const [addressDeleteConfirmOpen, setAddressDeleteConfirmOpen] = useState(false)
  const [addressDiscardOpen, setAddressDiscardOpen] = useState(false)
  const [pendingAddressAction, setPendingAddressAction] = useState<any | null>(null)
  const [pendingDelete, setPendingDelete] = useState<any | null>(null)

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

  useEffect(() => {
    if (!confirmSaveOpen) return
    const root = confirmSaveRef.current
    if (!root) return
    const focusable = root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    first?.focus()
  }, [confirmSaveOpen])

  useEffect(() => {
    if (!confirmCancelOpen) return
    const root = confirmCancelRef.current
    if (!root) return
    const focusable = root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    first?.focus()
  }, [confirmCancelOpen])

  useEffect(() => {
    if (!user) { setAddresses([]); return }
    let cancelled = false
    setAddressesLoading(true)
    fetch('/api/addresses', { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then((data) => { if (!cancelled) setAddresses(data) })
      .finally(() => { if (!cancelled) setAddressesLoading(false) })
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

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!currentPassword || !newPassword) {
      setPasswordError('Please fill in all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    try {
      setPasswordSaving(true)
      setPasswordError(null)
      await updatePassword({ currentPassword, newPassword })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setShowPasswordForm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password'
      setPasswordError(msg)
      setPasswordSuccess(false)
    } finally {
      setPasswordSaving(false)
    }
  }

  const addressKeys = ['fullName', 'phone', 'addressLine1', 'addressLine2', 'city', 'region', 'postalCode', 'country'] as const
  const isAddressDirty = showAddressForm && addressKeys.some((k) => (addressForm[k] ?? '') !== (addressBaseline[k] ?? ''))
  const canSaveAddress = Boolean(
    addressForm.fullName && addressForm.phone && addressForm.addressLine1 && addressForm.city && addressForm.region && addressForm.postalCode
  )

  function beginNewAddress() {
    const blank = { fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', region: '', postalCode: '', country: 'PH' }
    setEditingAddressId(null)
    setAddressForm(blank)
    setAddressBaseline(blank)
    setShowAddressForm(true)
  }

  function beginEditAddress(item: any) {
    const next = {
      fullName: item.fullName,
      phone: item.phone,
      addressLine1: item.addressLine1,
      addressLine2: item.addressLine2 || '',
      city: item.city,
      region: item.region,
      postalCode: item.postalCode,
      country: item.country || 'PH',
    }
    setEditingAddressId(item.id)
    setAddressForm(next)
    setAddressBaseline(next)
    setShowAddressForm(true)
  }

  function runAddressAction(action: any) {
    if (!action) return
    if (action.type === 'new') beginNewAddress()
    if (action.type === 'edit') beginEditAddress(action.item)
    if (action.type === 'cancel') {
      setEditingAddressId(null)
      setShowAddressForm(false)
    }
  }

  function requestAddressAction(action: any) {
    if (!isAddressDirty) {
      runAddressAction(action)
      return
    }
    setPendingAddressAction(action)
    setAddressDiscardOpen(true)
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
      body: JSON.stringify(addressForm),
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
    setEditingAddressId(null)
    setShowAddressForm(false)
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

  async function deleteAddressNow(item: any) {
    if (deletingAddressId) return
    setDeletingAddressId(item.id)
    const r = await fetch(`/api/addresses/${item.id}`, { method: 'DELETE', credentials: 'include' })
    if (!r.ok) {
      show('Delete failed')
      setDeletingAddressId(null)
      return
    }
    setAddresses((prev) => prev.filter((a) => a.id !== item.id))
    if (editingAddressId === item.id) {
      setEditingAddressId(null)
      setShowAddressForm(false)
    }
    setDeletingAddressId(null)
  }

  if (user) {
    return (
      <div className="container-xl py-10 max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Your Profile</h1>
            <p className="text-sm text-gray-600 mt-1">Only your public username and profile image are shown here.</p>
          </div>
          {!editing && (
            <button
              type="button"
              onClick={() => setShowSettings(s => !s)}
              className="p-2 rounded-md border hover:bg-gray-50 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95"
              aria-label="Account settings"
              title="Account settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"/>
                <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.54V21a2 2 0 11-4 0v-.08a1.7 1.7 0 00-1-1.54 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.54-1H3a2 2 0 110-4h.08a1.7 1.7 0 001.54-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h0A1.7 1.7 0 009 3.08V3a2 2 0 114 0v.08a1.7 1.7 0 001 1.54h0a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v0A1.7 1.7 0 0021 11.92H21a2 2 0 110 4h-.08a1.7 1.7 0 00-1.54 1z"/>
              </svg>
            </button>
          )}
        </div>

        {showSettings && (
          <div className="mt-6 rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Account Settings</h2>
                <p className="text-sm text-gray-600">Manage your account preferences and saved details.</p>
              </div>
              <button type="button" className="text-sm text-gray-600 hover:underline cursor-pointer" onClick={() => setShowSettings(false)}>Close</button>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setSettingsSection('account')} aria-pressed={settingsSection === 'account'} className={`rounded-lg border p-3 text-left hover:bg-gray-50 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 ${settingsSection === 'account' ? 'border-black' : ''}`}>
                <div className="font-medium">Account Details</div>
                <div className="text-xs text-gray-600">Profile info, email, password</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('addresses')} aria-pressed={settingsSection === 'addresses'} className={`rounded-lg border p-3 text-left hover:bg-gray-50 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95${settingsSection === 'addresses' ? 'border-black' : ''}`}>
                <div className="font-medium">Saved Addresses</div>
                <div className="text-xs text-gray-600">Shipping and billing addresses</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('payments')} aria-pressed={settingsSection === 'payments'} className={`rounded-lg border p-3 text-left hover:bg-gray-50 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95${settingsSection === 'payments' ? 'border-black' : ''}`}>
                <div className="font-medium">Bank Accounts / Cards</div>
                <div className="text-xs text-gray-600">Payment methods and billing</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('notifications')} aria-pressed={settingsSection === 'notifications'} className={`rounded-lg border p-3 text-left hover:bg-gray-50 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95${settingsSection === 'notifications' ? 'border-black' : ''}`}>
                <div className="font-medium">Notification Settings</div>
                <div className="text-xs text-gray-600">Order and marketing alerts</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('privacy')} aria-pressed={settingsSection === 'privacy'} className={`rounded-lg border p-3 text-left hover:bg-gray-50 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95${settingsSection === 'privacy' ? 'border-black' : ''}`}>
                <div className="font-medium">Privacy Settings</div>
                <div className="text-xs text-gray-600">Profile visibility and data</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('security')} aria-pressed={settingsSection === 'security'} className={`rounded-lg border p-3 text-left hover:bg-gray-50 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95${settingsSection === 'security' ? 'border-black' : ''}`}>
                <div className="font-medium">Security</div>
                <div className="text-xs text-gray-600">Two-factor and login activity</div>
              </button>
            </div>
            {settingsSection === 'account' && (
              <div className="mt-5 rounded-lg border p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-3">Account Details</h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-gray-600">Email</div>
                    <div className="font-medium break-all">{user.email}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Full Name</div>
                    <div className="font-medium">{user.fullName || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Username</div>
                    <div className="font-medium">{user.username || '—'}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Email Status</div>
                    <div className="font-medium">{user.isVerified ? 'Verified' : 'Not verified'}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-gray-600">Password</div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">••••••••</span>
                      <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => { setShowPasswordForm(v => !v); setPasswordSuccess(false); setPasswordError(null) }}>
                        {showPasswordForm ? 'Hide' : 'Change password'}
                      </button>
                    </div>
                    {showPasswordForm && (
                      <form onSubmit={onChangePassword} className="mt-3 grid gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Current password</label>
                          <div className="flex items-center gap-2">
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={e => setCurrentPassword(e.target.value)}
                              className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <button type="button" className="p-2 border rounded-md" onClick={() => setShowCurrentPassword(v => !v)} aria-label="Toggle password visibility">
                              <Eye open={showCurrentPassword} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">New password</label>
                          <div className="flex items-center gap-2">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <button type="button" className="p-2 border rounded-md" onClick={() => setShowNewPassword(v => !v)} aria-label="Toggle new password visibility">
                              <Eye open={showNewPassword} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Confirm new password</label>
                          <div className="flex items-center gap-2">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              className="w-full border rounded-md px-3 py-2 text-sm"
                            />
                            <button type="button" className="p-2 border rounded-md" onClick={() => setShowConfirmPassword(v => !v)} aria-label="Toggle confirm password visibility">
                              <Eye open={showConfirmPassword} />
                            </button>
                          </div>
                        </div>
                        {passwordError && <div className="text-sm text-red-600">{passwordError}</div>}
                        {passwordSuccess && <div className="text-sm text-green-600">Password updated.</div>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={passwordSaving} className="px-3 py-2 rounded-md bg-black text-white text-sm disabled:opacity-60">
                            {passwordSaving ? 'Saving…' : 'Save password'}
                          </button>
                          <button type="button" className="px-3 py-2 rounded-md border text-sm" onClick={() => { setShowPasswordForm(false); setPasswordError(null) }}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            )}
            {settingsSection === 'addresses' && (
              <div className="mt-5 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Saved Addresses</h3>
                  <button type="button" className="text-sm underline cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" onClick={() => requestAddressAction({ type: 'new' })}>Add address</button>
                </div>
                {addressesLoading ? (
                  <div className="mt-3 text-sm text-gray-600">Loading addresses…</div>
                ) : addresses.length === 0 ? (
                  <div className="mt-3 text-sm text-gray-600">No saved addresses yet.</div>
                ) : (
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    {addresses.map((a) => (
                      <div key={a.id} className="text-left border rounded-md p-3">
                        <div className="font-medium text-sm">{a.label || a.fullName}</div>
                        <div className="text-xs text-gray-500">{a.phone}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">
                          {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.region}, {a.postalCode}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <button type="button" className="underline cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" onClick={() => requestAddressAction({ type: 'edit', item: a })}>Edit</button>
                          <button type="button" className="underline text-red-600 disabled:opacity-60 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" disabled={deletingAddressId === a.id} onClick={() => { setPendingDelete(a); setAddressDeleteConfirmOpen(true) }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showAddressForm && (
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <input className="border rounded-md px-3 py-2" placeholder="Full name" aria-label="Full name" value={addressForm.fullName} onChange={e=>setAddressForm({...addressForm, fullName: e.target.value})} />
                    <input className="border rounded-md px-3 py-2" placeholder="Phone" aria-label="Phone" value={addressForm.phone} onChange={e=>setAddressForm({...addressForm, phone: e.target.value})} />
                    <input className="border rounded-md px-3 py-2 sm:col-span-2" placeholder="Address line 1" aria-label="Address line 1" value={addressForm.addressLine1} onChange={e=>setAddressForm({...addressForm, addressLine1: e.target.value})} />
                    <input className="border rounded-md px-3 py-2 sm:col-span-2" placeholder="Address line 2 (optional)" aria-label="Address line 2" value={addressForm.addressLine2} onChange={e=>setAddressForm({...addressForm, addressLine2: e.target.value})} />
                    <input className="border rounded-md px-3 py-2" placeholder="City" aria-label="City" value={addressForm.city} onChange={e=>setAddressForm({...addressForm, city: e.target.value})} />
                    <input className="border rounded-md px-3 py-2" placeholder="Region/Province" aria-label="Region" value={addressForm.region} onChange={e=>setAddressForm({...addressForm, region: e.target.value})} />
                    <input className="border rounded-md px-3 py-2" placeholder="Postal code" aria-label="Postal code" value={addressForm.postalCode} onChange={e=>setAddressForm({...addressForm, postalCode: e.target.value})} />
                    <input className="border rounded-md px-3 py-2" placeholder="Country" aria-label="Country" value={addressForm.country} onChange={e=>setAddressForm({...addressForm, country: e.target.value})} />
                    <div className="sm:col-span-2 flex items-center gap-3">
                      <button
                        type="button"
                        className="px-3 py-2 rounded-md bg-black text-white text-xs disabled:opacity-60 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100"
                        disabled={!canSaveAddress || savingAddress}
                        onClick={() => setAddressSaveConfirmOpen(true)}
                      >
                        {editingAddressId ? 'Save changes' : 'Save address'}
                      </button>
                      <button type="button" className="text-xs underline cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" onClick={() => requestAddressAction({ type: 'cancel' })}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {settingsSection && settingsSection !== 'account' && settingsSection !== 'addresses' && (
              <div className="mt-5 rounded-lg border p-4 text-sm text-gray-600">
                This section is coming soon.
              </div>
            )}
          </div>
        )}

        {confirmSaveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-save-title" aria-describedby="confirm-save-desc">
            <div ref={confirmSaveRef} className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
              <h3 id="confirm-save-title" className="text-lg font-semibold mb-2">Save changes?</h3>
              <p id="confirm-save-desc" className="text-sm text-gray-600 mb-4">Do you want to save your profile updates?</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2 rounded-md border disabled:opacity-60 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" onClick={() => setConfirmSaveOpen(false)} disabled={saving}>Cancel</button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md bg-black text-white disabled:opacity-60 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100"
                  disabled={saving}
                  onClick={async () => {
                    setConfirmSaveOpen(false)
                    await onSaveProfile({ preventDefault: () => {} } as React.FormEvent)
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmCancelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-cancel-title" aria-describedby="confirm-cancel-desc">
            <div ref={confirmCancelRef} className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
              <h3 id="confirm-cancel-title" className="text-lg font-semibold mb-2">Discard changes?</h3>
              <p id="confirm-cancel-desc" className="text-sm text-gray-600 mb-4">Your unsaved edits will be lost.</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="px-3 py-2 rounded-md border disabled:opacity-60 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100" onClick={() => setConfirmCancelOpen(false)}>Keep editing</button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-md bg-black text-white disabled:opacity-60 cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95 disabled:hover:scale-100 disabled:active:scale-100"
                  onClick={() => {
                    setConfirmCancelOpen(false)
                    resetEdits()
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={addressDiscardOpen}
          title="Discard changes?"
          message="You have unsaved address changes. Discard them and continue?"
          confirmText="Discard"
          cancelText="Keep editing"
          onConfirm={() => { setAddressDiscardOpen(false); runAddressAction(pendingAddressAction); setPendingAddressAction(null) }}
          onCancel={() => { setAddressDiscardOpen(false); setPendingAddressAction(null) }}
        />
        <ConfirmDialog
          open={addressSaveConfirmOpen}
          title={editingAddressId ? 'Save changes?' : 'Save address?'}
          message={editingAddressId ? 'Save your updated address details?' : 'Save this address to your list?'}
          confirmText="Save"
          cancelText="Keep editing"
          onConfirm={() => { setAddressSaveConfirmOpen(false); saveAddressNow() }}
          onCancel={() => setAddressSaveConfirmOpen(false)}
        />
        <ConfirmDialog
          open={addressDeleteConfirmOpen}
          title="Delete address?"
          message="This will remove the address from your list."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={() => { setAddressDeleteConfirmOpen(false); if (pendingDelete) deleteAddressNow(pendingDelete); setPendingDelete(null) }}
          onCancel={() => { setAddressDeleteConfirmOpen(false); setPendingDelete(null) }}
        />

        {!editing ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6 items-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-28 w-28 rounded-full overflow-hidden bg-gray-100 border">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
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
          <form onSubmit={(e) => { e.preventDefault(); setConfirmSaveOpen(true) }} className="mt-6 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6 items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="h-28 w-28 rounded-full overflow-hidden bg-gray-100 border">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="User avatar" className="h-full w-full object-cover" />
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
                <button type="button" className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => setConfirmCancelOpen(true)}>Cancel</button>
                {!editing && (
                  <button type="button" className="ml-auto px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => logout()}>Log out</button>
                )}
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
                          <img src={(it.product?.imageUrl) ?? `https://picsum.photos/seed/${it.productId}/160/160`} alt={it.title || 'Product image'} className="w-full h-full object-cover" />
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

  function resetEdits() {
    setUsername(user?.username || '')
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setEditing(false)
  }

  return (
    <div className="container-xl py-10 max-w-lg">
      <div className="flex gap-4 mb-6">
        <button
          className={`px-3 py-1.5 rounded-md border cursor-pointer ${mode==='login'?'bg-black text-white':''}`}
          onClick={() => setMode('login')}
          aria-pressed={mode === 'login'}
        >
          Login
        </button>
        <button
          className={`px-3 py-1.5 rounded-md border cursor-pointer ${mode==='register'?'bg-black text-white':''}`}
          onClick={() => setMode('register')}
          aria-pressed={mode === 'register'}
        >
          Register
        </button>
      </div>
      <form onSubmit={onAuthSubmit} className="space-y-4">
        {mode === 'register' && (
          <input
            value={fullName}
            onChange={e=>setFullName(e.target.value)}
            placeholder="Full name"
            aria-label="Full name"
            className="w-full border rounded-md px-3 py-2"
            required
          />
        )}
        <input
          value={email}
          onChange={e=>setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          aria-label="Email"
          className="w-full border rounded-md px-3 py-2"
          required
        />
        <div className="flex items-center gap-2">
          <input
            value={password}
            onChange={e=>setPassword(e.target.value)}
            type={showAuthPassword ? 'text' : 'password'}
            placeholder="Password"
            aria-label="Password"
            className="w-full border rounded-md px-3 py-2"
            required
          />
          <button type="button" className="p-2 border rounded-md" onClick={() => setShowAuthPassword(v => !v)} aria-label="Toggle password visibility">
            <Eye open={showAuthPassword} />
          </button>
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="px-4 py-2 rounded-md bg-black text-white" type="submit">{mode==='login'?'Login':'Create account'}</button>
      </form>
    </div>
  )
}

function Eye({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M2 12s3.5-7 10-7c2.8 0 5.1 1.1 6.9 2.5" />
      <path d="M22 12s-3.5 7-10 7c-2.8 0-5.1-1.1-6.9-2.5" />
      <path d="M3 3l18 18" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
