import { useMemo, useState } from 'react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const isValid = useMemo(() => {
    const emailOk = /.+@.+\..+/.test(email)
    return name.trim().length > 0 && emailOk && message.trim().length > 4
  }, [name, email, message])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    const to = 'support@cybercomponents.com'
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject || 'Support Request')}&body=${encodeURIComponent(
      `From: ${name} <${email}>
\n${message}`
    )}`
    window.location.href = mailto
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Contact Us</h1>
        <p className="text-gray-700">We'd love to hear from you. Reach us on social, email our team, or use the quick form below.</p>
      </header>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ContactCard
          title="Email Support"
          subtitle="support@cybercomponents.com"
          href="mailto:support@cybercomponents.com"
          icon={<Icon name="mail" />}
        />
        <ContactCard
          title="Sales Inquiries"
          subtitle="sales@cybercomponents.com"
          href="mailto:sales@cybercomponents.com"
          icon={<Icon name="mail" />}
        />
        <ContactCard
          title="Twitter / X"
          subtitle="@cybercomponents"
          href="https://twitter.com/cybercomponents"
          icon={<Icon name="twitter" />}
        />
        <ContactCard
          title="Facebook"
          subtitle="facebook.com/cybercomponents"
          href="https://facebook.com/cybercomponents"
          icon={<Icon name="facebook" />}
        />
        <ContactCard
          title="Phone"
          subtitle="(555) 012-3456"
          href="tel:+15550123456"
          icon={<Icon name="phone" />}
        />
        <ContactCard
          title="Address"
          subtitle="123 Tech Way, Silicon City"
          href="https://maps.google.com/?q=123%20Tech%20Way%20Silicon%20City"
          icon={<Icon name="pin" />}
        />
      </section>

      <section className="grid md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <h2 className="text-xl font-medium">Send us a message</h2>
          <p className="text-gray-700">Use this quick form and we'll get back to you. For order issues, include your order number for faster assistance.</p>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} required className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input value={subject} onChange={e=>setSubject(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" placeholder="Question about an order" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea value={message} onChange={e=>setMessage(e.target.value)} required rows={5} className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200" placeholder="How can we help?" />
            </div>
            <button disabled={!isValid} className="px-4 py-2 rounded-md bg-black text-white text-sm font-medium disabled:opacity-50">Send</button>
          </form>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-medium">Response times</h2>
          <ul className="list-disc ml-5 text-gray-700 space-y-1 text-sm">
            <li>Email support: under 24 hours</li>
            <li>Twitter/X: typically within a few hours</li>
            <li>Sales quotes: 1–2 business days</li>
          </ul>

          <div className="rounded-md border p-4 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Tips</h3>
            <p className="text-gray-700 text-sm">For RMA or warranty questions, please include the product name, serial number (if available), and your order number.</p>
          </div>
        </div>
      </section>
    </div>
  )
}

function ContactCard({ title, subtitle, href, icon }: { title: string, subtitle: string, href: string, icon: React.ReactNode }) {
  return (
    <a href={href} className="group rounded-lg border p-4 hover:shadow-sm transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-gray-700 group-hover:text-black">{icon}</div>
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-sm text-gray-600 truncate">{subtitle}</div>
        </div>
      </div>
    </a>
  )
}

function Icon({ name }: { name: 'mail' | 'twitter' | 'facebook' | 'phone' | 'pin' }) {
  if (name === 'mail') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"/><path d="M22 6l-10 7L2 6"/></svg>
    )
  }
  if (name === 'twitter') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.633 7.997c.013.18.013.36.013.54 0 5.5-4.187 11.84-11.84 11.84-2.354 0-4.547-.69-6.388-1.874.33.038.647.051.992.051a8.39 8.39 0 005.2-1.79 4.197 4.197 0 01-3.918-2.91c.254.038.508.064.775.064.368 0 .736-.051 1.078-.14a4.19 4.19 0 01-3.36-4.115v-.051c.559.318 1.204.508 1.89.534a4.182 4.182 0 01-1.868-3.483c0-.772.203-1.472.559-2.087a11.9 11.9 0 008.64 4.388 4.728 4.728 0 01-.102-.962 4.19 4.19 0 017.25-2.865 8.28 8.28 0 002.659-1.012 4.21 4.21 0 01-1.84 2.31 8.39 8.39 0 002.414-.647 8.98 8.98 0 01-2.097 2.17z"/></svg>
    )
  }
  if (name === 'facebook') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.07C22 6.48 17.52 2 11.93 2 6.35 2 1.87 6.48 1.87 12.07c0 4.97 3.62 9.09 8.36 9.93v-7.03H7.9v-2.9h2.33V9.83c0-2.3 1.37-3.57 3.46-3.57.99 0 2.04.18 2.04.18v2.25h-1.15c-1.14 0-1.5.71-1.5 1.44v1.73h2.56l-.41 2.9h-2.15V22c4.74-.84 8.36-4.96 8.36-9.93z"/></svg>
    )
  }
  if (name === 'phone') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.12.9.33 1.78.62 2.63a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.45-1.18a2 2 0 012.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0122 16.92z"/></svg>
    )
  }
  // pin
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 22s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z"/><circle cx="12" cy="11" r="3"/></svg>
  )
}
