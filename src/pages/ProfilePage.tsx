import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../components/AuthContext'

export default function ProfilePage() {
  const { user, loading, login, register, logout, updateProfile, updateAvatar, updatePassword } = useAuth()
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

  if (user) {
    return (
      <div className="container-xl py-10 max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Your Profile</h1>
            <p className="text-sm text-gray-600 mt-1">Only your public username and profile image are shown here.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings(s => !s)}
            disabled={editing}
            className="p-2 rounded-md border hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Account settings"
            title="Account settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"/>
              <path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.54V21a2 2 0 11-4 0v-.08a1.7 1.7 0 00-1-1.54 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.7 1.7 0 00.34-1.87 1.7 1.7 0 00-1.54-1H3a2 2 0 110-4h.08a1.7 1.7 0 001.54-1 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06a1.7 1.7 0 001.87.34h0A1.7 1.7 0 009 3.08V3a2 2 0 114 0v.08a1.7 1.7 0 001 1.54h0a1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06a1.7 1.7 0 00-.34 1.87v0A1.7 1.7 0 0021 11.92H21a2 2 0 110 4h-.08a1.7 1.7 0 00-1.54 1z"/>
            </svg>
          </button>
        </div>

        {showSettings && (
          <div className="mt-6 rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Account Settings</h2>
                <p className="text-sm text-gray-600">Manage your account preferences and saved details.</p>
              </div>
              <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => setShowSettings(false)}>Close</button>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setSettingsSection('account')} className={`rounded-lg border p-3 text-left hover:bg-gray-50 ${settingsSection === 'account' ? 'border-black' : ''}`}>
                <div className="font-medium">Account Details</div>
                <div className="text-xs text-gray-600">Profile info, email, password</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('addresses')} className={`rounded-lg border p-3 text-left hover:bg-gray-50 ${settingsSection === 'addresses' ? 'border-black' : ''}`}>
                <div className="font-medium">Saved Addresses</div>
                <div className="text-xs text-gray-600">Shipping and billing addresses</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('payments')} className={`rounded-lg border p-3 text-left hover:bg-gray-50 ${settingsSection === 'payments' ? 'border-black' : ''}`}>
                <div className="font-medium">Bank Accounts / Cards</div>
                <div className="text-xs text-gray-600">Payment methods and billing</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('notifications')} className={`rounded-lg border p-3 text-left hover:bg-gray-50 ${settingsSection === 'notifications' ? 'border-black' : ''}`}>
                <div className="font-medium">Notification Settings</div>
                <div className="text-xs text-gray-600">Order and marketing alerts</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('privacy')} className={`rounded-lg border p-3 text-left hover:bg-gray-50 ${settingsSection === 'privacy' ? 'border-black' : ''}`}>
                <div className="font-medium">Privacy Settings</div>
                <div className="text-xs text-gray-600">Profile visibility and data</div>
              </button>
              <button type="button" onClick={() => setSettingsSection('security')} className={`rounded-lg border p-3 text-left hover:bg-gray-50 ${settingsSection === 'security' ? 'border-black' : ''}`}>
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
                <div className="mt-4 flex gap-2">
                  <button type="button" className="px-3 py-2 rounded-md border text-sm" onClick={() => setEditing(true)}>Edit profile</button>
                </div>
              </div>
            )}
            {settingsSection && settingsSection !== 'account' && (
              <div className="mt-5 rounded-lg border p-4 text-sm text-gray-600">
                This section is coming soon.
              </div>
            )}
          </div>
        )}

        {confirmSaveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Save changes?</h3>
              <p className="text-sm text-gray-600 mb-4">Do you want to save your profile updates?</p>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
              <h3 className="text-lg font-semibold mb-2">Discard changes?</h3>
              <p className="text-sm text-gray-600 mb-4">Your unsaved edits will be lost.</p>
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
          <form onSubmit={(e) => { e.preventDefault(); setConfirmSaveOpen(true) }} className="mt-6 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-6 items-start">
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
                <button type="button" className="px-4 py-2 rounded-md border cursor-pointer transition-transform duration-150 hover:scale-[1.03] active:scale-95" onClick={() => setConfirmCancelOpen(true)}>Cancel</button>
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

  function resetEdits() {
    setUsername(user?.username || '')
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setEditing(false)
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
        <div className="flex items-center gap-2">
          <input value={password} onChange={e=>setPassword(e.target.value)} type={showAuthPassword ? 'text' : 'password'} placeholder="Password" className="w-full border rounded-md px-3 py-2" required />
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
