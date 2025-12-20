import { useEffect, useMemo, useState } from 'react'
import { assetUrl, placeholderImg } from '../../lib/media'

type OrderStats = { total: number; byStatus: Record<string, number> }

export default function Dashboard() {
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recent, setRecent] = useState<Array<any>>([])
  const [recentError, setRecentError] = useState<string | null>(null)
  const [best, setBest] = useState<Array<any>>([])
  const [bestError, setBestError] = useState<string | null>(null)
  const [granularity, setGranularity] = useState<'weekly'|'monthly'|'yearly'>('monthly')
  const [sales, setSales] = useState<{ labels: string[]; totalsCents: number[] } | null>(null)
  const [salesError, setSalesError] = useState<string | null>(null)
  const [salesLoading, setSalesLoading] = useState<boolean>(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/admin/orders/stats', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load stats')))
      .then((data: OrderStats) => { if (!cancelled) { setStats(data); setError(null) } })
      .catch((e: any) => { if (!cancelled) setError(e?.message || 'Failed to load stats') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/orders?limit=10', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load recent orders')))
      .then((data: any[]) => { if (!cancelled) { setRecent(data); setRecentError(null) } })
      .catch((e: any) => { if (!cancelled) setRecentError(e?.message || 'Failed to load recent orders') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/analytics/best-sellers?limit=3', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load best sellers')))
      .then((data: any[]) => { if (!cancelled) { setBest(data || []); setBestError(null) } })
      .catch((e: any) => { if (!cancelled) setBestError(e?.message || 'Failed to load best sellers') })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setSalesError(null)
    setSalesLoading(true)
    fetch(`/api/admin/analytics/sales?granularity=${granularity}`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load sales data')))
      .then((data: any) => {
        if (cancelled) return
        const labels: string[] = (data?.buckets || []).map((b: any) => String(b.label))
        const totalsCents: number[] = (data?.buckets || []).map((b: any) => Number(b.totalCents || 0))
        setSales({ labels, totalsCents })
      })
      .catch((e: any) => { if (!cancelled) setSalesError(e?.message || 'Failed to load sales data') })
      .finally(() => { if (!cancelled) setSalesLoading(false) })
    return () => { cancelled = true }
  }, [granularity])

  function currency(n: number) {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n / 100)
  }

  function BarChart({ labels, totals }: { labels: string[]; totals: number[] }) {
    const w = 1000, h = 360
    const padL = 56, padR = 12, padT = 16, padB = 36
    const innerW = w - padL - padR
    const innerH = h - padT - padB
    const max = Math.max(1, ...totals)
    const ticks = 6
    const yTicks = Array.from({ length: ticks + 1 }, (_, i) => Math.round((max * i) / ticks))
    const barCount = totals.length
    const gap = 8
    const barW = Math.max(6, (innerW - gap * (barCount - 1)) / Math.max(1, barCount))
    const y = (v: number) => padT + innerH - (innerH * v) / max
    return (
  <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
        {/* Y axis labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={y(t)} x2={w - padR} y2={y(t)} stroke="#eef2f7" />
            <text x={padL - 6} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize="10" fill="#64748b">
              {currency(t)}
            </text>
          </g>
        ))}
        {/* Bars */}
        {totals.map((v, i) => {
          const x = padL + i * (barW + gap)
          return (
            <g key={i}>
              <rect x={x} y={y(v)} width={barW} height={Math.max(0, padT + innerH - y(v))} rx={3} fill="#111827" />
            </g>
          )
        })}
        {/* X axis labels */}
        {labels.map((lab, i) => {
          const x = padL + i * (barW + gap) + barW / 2
          return (
            <text key={i} x={x} y={h - 6} textAnchor="middle" fontSize="10" fill="#64748b">{lab}</text>
          )
        })}
      </svg>
    )
  }

  const kpis = useMemo(() => {
    const total = stats?.total ?? 0
    const cancelled = stats?.byStatus?.['cancelled'] ?? 0
    const completed = (stats?.byStatus?.['paid'] ?? 0) + (stats?.byStatus?.['shipped'] ?? 0) + (stats?.byStatus?.['delivered'] ?? 0)
    const active = Math.max(0, total - cancelled - completed)
    return [
      { label: 'Total Orders', value: total },
      { label: 'Active Orders', value: active },
      { label: 'Completed Orders', value: completed },
      { label: 'Cancelled Orders', value: cancelled },
    ]
  }, [stats])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(({label, value}) => (
          <div key={label} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{loading ? '—' : value}</div>
            {error ? (
              <div className="mt-1 text-[11px] text-red-600">{error}</div>
            ) : (
              <div className="mt-1 text-xs text-gray-500">&nbsp;</div>
            )}
          </div>
        ))}
      </div>

      {/* Chart + best sellers */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Sale Graph</div>
            <div className="flex gap-2 text-xs">
              {(['weekly','monthly','yearly'] as const).map(x => (
                <button
                  key={x}
                  onClick={() => setGranularity(x)}
                  className={`px-2 py-1 rounded-md border capitalize ${granularity===x?'bg-black text-white':''}`}
                >
                  {x}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-md">
            <div className="relative h-96 lg:h-[28rem]">
              {salesError ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600">{salesError}</div>
              ) : sales ? (
                <BarChart labels={sales.labels} totals={sales.totalsCents} />
              ) : (
                <div className="h-full bg-gradient-to-b from-gray-50 to-gray-100 animate-pulse rounded-md" />
              )}
              {salesLoading && (
                <div className="absolute inset-0 rounded-md bg-white/40 pointer-events-none" />
              )}
            </div>
          </div>
    </div>
    <div className="rounded-lg border bg-white p-4 lg:w-[20rem] lg:flex-shrink-0">
          <div className="font-medium">Best Sellers</div>
          <div className="mt-3 space-y-3">
            {bestError ? (
              <div className="text-sm text-red-600">{bestError}</div>
            ) : best.length === 0 ? (
              <div className="text-sm text-gray-600">No sales yet.</div>
            ) : (
              best.slice(0, 3).map((b: any, idx: number) => {
                const amountPhp = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((b.revenueCents || 0)/100)
                const isTop = idx === 0
                const imgSrc = assetUrl(b.imageUrl) || placeholderImg(b.productId || 'best', 40, 40)
                return (
                  <div key={b.productId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-md bg-gray-200 overflow-hidden ${isTop ? 'ring-2 ring-amber-400' : ''}`}> 
                        <img src={imgSrc} alt="" className="w-full h-full object-cover"/>
                      </div>
                      <div>
                        <div className="text-sm" title={b.title}>{b.title || 'Untitled'}</div>
                        <div className="text-xs text-gray-500">{amountPhp} • {b.totalQty} {b.totalQty === 1 ? 'sale' : 'sales'}</div>
                      </div>
                    </div>
                    <a href={`/products/${b.productId}`} className="px-2 py-1 rounded-md border text-xs hover:bg-gray-50">View</a>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-lg border bg-white">
        <div className="px-4 py-3 font-medium border-b">Recent Orders</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                {['Product','Order ID','Date','Customer Name','Status','Amount'].map(h => (
                  <th key={h} className="px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {recentError ? (
                <tr><td className="px-4 py-3 text-red-600" colSpan={6}>{recentError}</td></tr>
              ) : recent.length === 0 ? (
                <tr><td className="px-4 py-3 text-gray-600" colSpan={6}>No recent orders</td></tr>
              ) : (
                recent.map((o) => {
                  const first = (o.items || [])[0]
                  const img = assetUrl(first?.product?.imageUrl) || placeholderImg(first?.productId || 'recent', 32, 32)
                  const title = first?.title || first?.product?.title || '—'
                  const amountPhp = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format((o.totalCents||0)/100)
                  const date = new Date(o.createdAt).toLocaleDateString()
                  const status = String(o.status || '').toLowerCase()
                  const statusClass = status === 'cancelled' ? 'bg-rose-100 text-rose-700' : (status === 'paid' || status === 'shipped' || status === 'delivered') ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  return (
                    <tr key={o.id} className="odd:bg-white even:bg-gray-50">
                      <td className="px-4 py-3 flex items-center gap-3">
                        <span className="size-8 rounded bg-gray-200 inline-block overflow-hidden">
                          <img src={img} alt="" className="w-full h-full object-cover"/>
                        </span>
                        <span className="line-clamp-1" title={title}>{title}</span>
                      </td>
                      <td className="px-4 py-3">#{String(o.id).slice(-6)}</td>
                      <td className="px-4 py-3">{date}</td>
                      <td className="px-4 py-3">{o.user?.fullName || o.user?.username || o.user?.email || '—'}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs ${statusClass}`}>{o.status}</span></td>
                      <td className="px-4 py-3">{amountPhp}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
