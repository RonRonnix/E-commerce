import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { prisma } from './db'
import { authMiddleware } from './auth'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { requireAuth, requireRole } from './auth'
import { z } from 'zod'

const app = express()
const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:5173'
app.use(cors({ origin: WEB_ORIGIN, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth', authMiddleware())

// Static serving for uploaded files (dev only)
// Use a stable path inside the server folder regardless of CWD
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const uploadDir = path.resolve(__dirname, '../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
app.use('/uploads', express.static(uploadDir))
// Backward-compat: also serve previously uploaded files that landed under projectRoot/uploads
const projectRoot = path.resolve(__dirname, '../..')
const legacyUploadDir = path.resolve(projectRoot, 'uploads')
if (fs.existsSync(legacyUploadDir)) {
  app.use('/uploads', express.static(legacyUploadDir))
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname) || ''
    cb(null, `${unique}${ext}`)
  },
})
const upload = multer({ storage })

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.get('/api/products', async (_req: Request, res: Response) => {
  const { category, q } = _req.query as { category?: string; q?: string }
  const where: any = {}
  if (category) {
    // support slug or id
    const cat = await (prisma as any).category.findFirst({ where: { OR: [{ slug: String(category) }, { id: String(category) }] } })
    if (cat) where.categoryId = cat.id
  }
  if (q) where.title = { contains: String(q), mode: 'insensitive' }
  const products = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } })
  res.json(products)
})

app.get('/api/products/:id', async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)
})

app.get('/api/categories', async (_req: Request, res: Response) => {
  const cats = await (prisma as any).category.findMany({ orderBy: { name: 'asc' } })
  res.json(cats)
})

// Cart endpoints (per-user)
app.get('/api/cart', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const items = await (prisma as any).cartItem.findMany({ where: { userId: uid }, include: { product: true } })
  res.json(items)
}))

app.post('/api/cart', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const schema = z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(999).default(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { productId, quantity } = parsed.data
  // Upsert by (userId, productId)
  const existing = await (prisma as any).cartItem.findUnique({ where: { userId_productId: { userId: uid, productId } } })
  const item = existing
    ? await (prisma as any).cartItem.update({ where: { userId_productId: { userId: uid, productId } }, data: { quantity: existing.quantity + quantity } })
    : await (prisma as any).cartItem.create({ data: { userId: uid, productId, quantity } })
  res.status(201).json(item)
}))

app.patch('/api/cart/:productId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const { productId } = req.params
  const schema = z.object({ quantity: z.number().int().min(1).max(999) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { quantity } = parsed.data
  const item = await (prisma as any).cartItem.update({ where: { userId_productId: { userId: uid, productId } }, data: { quantity } })
  res.json(item)
}))

app.delete('/api/cart/:productId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const { productId } = req.params
  await (prisma as any).cartItem.delete({ where: { userId_productId: { userId: uid, productId } } })
  res.json({ ok: true })
}))

// Wishlist endpoints (per-user)
app.get('/api/wishlist', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const items = await (prisma as any).wishlistItem.findMany({ where: { userId: uid }, include: { product: true } })
  res.json(items)
}))

app.post('/api/wishlist', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const schema = z.object({ productId: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { productId } = parsed.data
  // Upsert by (userId, productId)
  const existing = await (prisma as any).wishlistItem.findUnique({ where: { userId_productId: { userId: uid, productId } } })
  const item = existing
    ? existing
    : await (prisma as any).wishlistItem.create({ data: { userId: uid, productId } })
  res.status(201).json(item)
}))

app.delete('/api/wishlist/:productId', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const { productId } = req.params
  await (prisma as any).wishlistItem.delete({ where: { userId_productId: { userId: uid, productId } } })
  res.json({ ok: true })
}))

// Checkout: compute summary with optional voucher
app.post('/api/checkout/summary', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const { voucherCode } = req.body || {}
  const items = await (prisma as any).cartItem.findMany({ where: { userId: uid }, include: { product: true } })
  if (!items || items.length === 0) return res.status(400).json({ error: 'Cart is empty' })
  const subtotal = items.reduce((sum: number, i: any) => sum + (i.product.priceCents * i.quantity), 0)
  const baseShipping = 15000 // PHP 150.00
  const shipping = (typeof voucherCode === 'string' && voucherCode.trim().toUpperCase() === 'FREESHIP') ? 0 : baseShipping
  const discount = 0 // can be extended later
  const total = subtotal + shipping - discount
  res.json({ items, subtotalCents: subtotal, shippingCents: shipping, discountCents: discount, totalCents: total })
}))

// Place order: creates order and items from cart and clears cart
app.post('/api/checkout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const schema = z.object({
    voucherCode: z.string().trim().optional(),
    paymentMethod: z.enum(['cod','online']),
    address: z.object({
      fullName: z.string().min(2),
      phone: z.string().min(5),
      addressLine1: z.string().min(3),
      addressLine2: z.string().optional(),
      city: z.string().min(2),
      region: z.string().min(2),
      postalCode: z.string().min(3),
      country: z.string().default('PH')
    })
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { voucherCode, paymentMethod, address } = parsed.data

  const cartItems = await (prisma as any).cartItem.findMany({ where: { userId: uid }, include: { product: true } })
  if (!cartItems || cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' })
  const subtotal = cartItems.reduce((sum: number, i: any) => sum + (i.product.priceCents * i.quantity), 0)
  const baseShipping = 15000
  const shipping = (voucherCode && voucherCode.trim().toUpperCase() === 'FREESHIP') ? 0 : baseShipping
  const discount = 0
  const total = subtotal + shipping - discount

  const order = await prisma.$transaction(async (tx) => {
    const created = await (tx as any).order.create({ data: {
      userId: uid,
      status: paymentMethod === 'cod' ? 'pending' : 'pending',
      paymentMethod,
      voucherCode: voucherCode || null,
      subtotalCents: subtotal,
      shippingCents: shipping,
      discountCents: discount,
      totalCents: total,
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || null,
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country || 'PH',
    } })
    // items snapshot
    for (const ci of cartItems) {
      await (tx as any).orderItem.create({ data: {
        orderId: created.id,
        productId: ci.productId,
        title: ci.product.title,
        priceCents: ci.product.priceCents,
        quantity: ci.quantity,
      } })
    }
    // clear cart
    await (tx as any).cartItem.deleteMany({ where: { userId: uid } })
    // payment placeholder for online
    if (paymentMethod === 'online') {
      await (tx as any).payment.create({ data: {
        orderId: created.id,
        method: 'online',
        status: 'pending',
        amountCents: total,
      } })
    }
    return created
  })

  const result: any = { orderId: (order as any).id }
  if (paymentMethod === 'online') {
    const payment = await (prisma as any).payment.findUnique({ where: { orderId: (order as any).id } })
    result.paymentId = payment?.id
  }
  res.status(201).json(result)
}))

// Mark payment as paid (simulation of local bank/online payment)
app.post('/api/payments/:id/mark-paid', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const payment = await (prisma as any).payment.update({ where: { id: req.params.id }, data: { status: 'paid' } })
  // cascade: set order status to paid
  await (prisma as any).order.update({ where: { id: payment.orderId }, data: { status: 'paid' } })
  res.json({ ok: true })
}))

// Get order details
app.get('/api/orders/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const order = await (prisma as any).order.findUnique({ where: { id: req.params.id }, include: { items: true, payment: true } })
  if (!order) return res.status(404).json({ error: 'Not found' })
  res.json(order)
}))

// List current user's orders
app.get('/api/orders', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const orders = await (prisma as any).order.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: true } }, payment: true },
  })
  res.json(orders)
}))

// Cancel an order (allowed if owned by user and not shipped/cancelled)
app.post('/api/orders/:id/cancel', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const order = await (prisma as any).order.findUnique({ where: { id: req.params.id } })
  if (!order || order.userId !== uid) return res.status(404).json({ error: 'Not found' })
  if (order.status === 'shipped' || order.status === 'cancelled') return res.status(400).json({ error: 'Order cannot be cancelled' })
  await (prisma as any).order.update({ where: { id: req.params.id }, data: { status: 'cancelled' } })
  const detailed = await (prisma as any).order.findUnique({ where: { id: req.params.id }, include: { items: true, payment: true } })
  res.json(detailed)
}))

// Admin: order stats (counts by status)
app.get('/api/admin/orders/stats', requireAuth, requireRole('admin','owner'), asyncHandler(async (_req: Request, res: Response) => {
  const total = await prisma.order.count()
  const byStatus = await (prisma as any).order.groupBy({ by: ['status'], _count: { _all: true } })
  const map: Record<string, number> = {}
  byStatus.forEach((row: any) => { map[row.status] = row._count._all })
  res.json({ total, byStatus: map })
}))

// Admin: recent orders list
app.get('/api/admin/orders', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as any
  const limit = Math.min(100, Math.max(1, Number(q.limit ?? 10)))
  const userId = q.userId ? String(q.userId) : undefined
  const statusRaw = q.status ? String(q.status).toLowerCase() : undefined
  const allowedStatuses = new Set(['pending','paid','shipped','delivered','cancelled'])
  const status = statusRaw && allowedStatuses.has(statusRaw) ? statusRaw : undefined
  const where: any = {}
  if (userId) where.userId = userId
  if (status) where.status = status
  const orders = await (prisma as any).order.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    where: Object.keys(where).length ? where : undefined,
    include: {
      user: true,
      items: {
        orderBy: { id: 'asc' },
        include: { product: true }
      }
    }
  })
  res.json(orders)
}))

// Admin: users list with order counts
app.get('/api/admin/users', requireAuth, requireRole('admin','owner'), asyncHandler(async (_req: Request, res: Response) => {
  const users = await (prisma as any).user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      fullName: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
      _count: { select: { orders: true } },
    }
  })
  const data = users.map((u: any) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    username: u.username,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
    ordersCount: u._count?.orders ?? 0,
  }))
  res.json(data)
}))

// Admin: get orders by specific user
app.get('/api/admin/users/:id/orders', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const orders = await (prisma as any).order.findMany({
    where: { userId: req.params.id },
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: true } }, payment: true, user: true }
  })
  res.json(orders)
}))

// Admin: best sellers (top products by quantity sold)
app.get('/api/admin/analytics/best-sellers', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(20, Math.max(1, Number((req.query as any).limit ?? 3)))
  // Consider orders that are paid/shipped/delivered as successful sales
  const successfulStatuses = ['paid','shipped','delivered']
  // Fetch order items with related order status and product info
  const items = await (prisma as any).orderItem.findMany({
    where: { order: { status: { in: successfulStatuses } } },
    select: {
      productId: true,
      title: true,
      priceCents: true,
      quantity: true,
      product: { select: { id: true, title: true, imageUrl: true, priceCents: true } }
    }
  })

  const agg = new Map<string, { productId: string; title: string; imageUrl: string | null; totalQty: number; revenueCents: number }>()
  for (const it of items) {
    const key = String(it.productId)
    const existing = agg.get(key) || { productId: key, title: it.product?.title || it.title, imageUrl: it.product?.imageUrl || null, totalQty: 0, revenueCents: 0 }
    const unitPrice = typeof it.priceCents === 'number' ? it.priceCents : (it.product?.priceCents ?? 0)
    existing.totalQty += (it.quantity || 0)
    existing.revenueCents += (it.quantity || 0) * unitPrice
    if (!existing.title && (it.product?.title || it.title)) existing.title = it.product?.title || it.title
    if (!existing.imageUrl && it.product?.imageUrl) existing.imageUrl = it.product.imageUrl
    agg.set(key, existing)
  }
  const list = Array.from(agg.values()).sort((a, b) => b.totalQty - a.totalQty).slice(0, limit)
  res.json(list)
}))

// Admin: sales analytics (bar chart data)
// Returns buckets of totalsCents for successful orders (paid/shipped/delivered)
// Query: granularity=weekly|monthly|yearly, count=N (defaults: 7, 12, 5)
app.get('/api/admin/analytics/sales', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as any
  const granularity = (String(q.granularity || 'monthly').toLowerCase()) as 'weekly'|'monthly'|'yearly'
  const defaultCount = granularity === 'weekly' ? 7 : granularity === 'monthly' ? 12 : 5
  const count = Math.min(60, Math.max(1, Number(q.count ?? defaultCount)))

  const now = new Date()
  let start = new Date(now)
  if (granularity === 'weekly') {
    start = new Date(now.getTime() - (count * 7 * 24 * 3600 * 1000))
  } else if (granularity === 'monthly') {
    const d = new Date(now)
    d.setMonth(d.getMonth() - count)
    start = d
  } else {
    const d = new Date(now)
    d.setFullYear(d.getFullYear() - count)
    start = d
  }

  const successfulStatuses = ['paid','shipped','delivered']
  const orders = await prisma.order.findMany({
    where: { status: { in: successfulStatuses } as any, createdAt: { gte: start } },
    select: { id: true, createdAt: true, totalCents: true }
  })

  // Initialize buckets oldest -> newest
  const buckets = Array.from({ length: count }, (_, i) => ({ label: String(i + 1), totalCents: 0 }))

  const addWeekly = (d: Date) => Math.max(0, Math.min(count - 1, count - 1 - Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 3600 * 1000))))
  const addMonthly = (d: Date) => {
    const nowIndex = now.getFullYear() * 12 + now.getMonth()
    const idx = d.getFullYear() * 12 + d.getMonth()
    const diff = nowIndex - idx
    return Math.max(0, Math.min(count - 1, count - 1 - diff))
  }
  const addYearly = (d: Date) => {
    const diff = now.getFullYear() - d.getFullYear()
    return Math.max(0, Math.min(count - 1, count - 1 - diff))
  }

  for (const o of orders) {
    const d = new Date(o.createdAt)
    let b = 0
    if (granularity === 'weekly') b = addWeekly(d)
    else if (granularity === 'monthly') b = addMonthly(d)
    else b = addYearly(d)
    if (!Number.isFinite(b) || b < 0 || b >= count) continue
    buckets[b].totalCents += (o.totalCents || 0)
  }

  // For yearly, labels as actual years for clarity
  if (granularity === 'yearly') {
    const startYear = now.getFullYear() - (count - 1)
    for (let i = 0; i < count; i++) buckets[i].label = String(startYear + i)
  }

  res.json({ granularity, buckets })
}))

// Helpers
async function getUserDto(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return null
  const roles = await prisma.userRole.findMany({ where: { userId }, include: { role: true } })
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName || undefined,
    username: (user as any).username || undefined,
    avatarUrl: (user as any).avatarUrl || undefined,
    roles: roles.map(r => r.role.name),
  }
}

// Profile: update username
app.patch('/api/users/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({ username: z.string().trim().min(3).max(32).regex(/^[a-z0-9_.-]+$/i).optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { username } = parsed.data
  const uid = (req as any).user.id as string
  if (username) {
    const existing = await prisma.user.findFirst({ where: { username, NOT: { id: uid } } as any })
    if (existing) return res.status(409).json({ error: 'Username already taken' })
  }
  await prisma.user.update({ where: { id: uid }, data: { ...(username !== undefined ? { username } : {}) } as any })
  const dto = await getUserDto(uid)
  res.json(dto)
}))

// Profile: upload avatar
app.post('/api/users/me/avatar', requireAuth, upload.single('avatar'), asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) return res.status(400).json({ error: 'No file uploaded' })
  const uid = (req as any).user.id as string
  const fileName = (file as any).filename || path.basename(file.path)
  const url = `/uploads/${fileName}`
  await prisma.user.update({ where: { id: uid }, data: { avatarUrl: url } as any })
  const dto = await getUserDto(uid)
  res.json(dto)
}))

// Admin Products CRUD
app.post('/api/admin/products', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const body = req.body || {}
  const title = String(body.title ?? '')
  const slug = String(body.slug ?? '')
  const priceCents = Number(body.priceCents ?? 0)
  const currency = String(body.currency ?? 'PHP')
  const description = body.description ? String(body.description) : undefined
  const categoryId = body.categoryId ? String(body.categoryId) : undefined
  if (!title || !slug || !priceCents) return res.status(400).json({ error: 'Missing required fields' })
  try {
  const product = await prisma.product.create({ data: { title, slug, description, priceCents, currency, ...(categoryId ? { category: { connect: { id: categoryId } } } : {}) } })
    return res.status(201).json(product)
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' })
    throw e
  }
}))

app.put('/api/admin/products/:id', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const { title, slug, description, priceCents, currency, categoryId, imageUrl } = req.body || {}
  const data: any = { title, slug, description, priceCents: priceCents ? Number(priceCents) : undefined, currency, imageUrl }
  if (typeof categoryId === 'string' && categoryId) data.category = { connect: { id: categoryId } }
  const product = await prisma.product.update({ where: { id: req.params.id }, data })
  res.json(product)
}))

app.delete('/api/admin/products/:id', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  await prisma.product.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}))

app.post('/api/admin/products/:id/images', requireAuth, requireRole('admin','owner'), upload.array('files', 8), asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.id
  const files = (req as any).files as Express.Multer.File[]
  if (!files || files.length === 0) return res.status(400).json({ error: 'No files uploaded' })
  // save paths relative to /uploads for serving
  const created = await Promise.all(files.map((f, idx) => (prisma as any).productImage.create({ data: { productId, url: `/uploads/${(f as any).filename || path.basename(f.path)}`, position: idx } })))
  // set cover if not present
  const p = await prisma.product.findUnique({ where: { id: productId } })
  if (p && !p.imageUrl && created.length > 0) {
    await prisma.product.update({ where: { id: productId }, data: { imageUrl: created[0].url } })
  }
  res.status(201).json(created)
}))

app.get('/api/admin/products/:id/images', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const images = await (prisma as any).productImage.findMany({ where: { productId: req.params.id }, orderBy: { position: 'asc' } })
  res.json(images)
}))

app.delete('/api/admin/products/:id/images/:imageId', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  await (prisma as any).productImage.delete({ where: { id: req.params.imageId } })
  res.json({ ok: true })
}))

// Error wrapper to return JSON consistently
function asyncHandler(fn: (req: Request, res: Response) => Promise<any>) {
  return (req: Request, res: Response) => fn(req, res).catch(err => {
    console.error(err)
    res.status(500).json({ error: 'Server error', detail: err?.message })
  })
}

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})
