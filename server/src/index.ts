import 'dotenv/config'
import express, { Request, Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { prisma } from './db'
import { authMiddleware } from './auth'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { requireAuth, requireRole } from './auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'

const app = express()
const WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost:5173'
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY
const PAYMONGO_WEBHOOK_SECRET = process.env.PAYMONGO_WEBHOOK_SECRET
const PAYMONGO_SKIP_WEBHOOK_SIGNATURE = process.env.PAYMONGO_SKIP_WEBHOOK_SIGNATURE === 'true'
const allowedOrigins = WEB_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error('CORS blocked'))
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}))
app.use(cookieParser())
app.set('json replacer', (_key: string, value: unknown) => (typeof value === 'bigint' ? Number(value) : value))
app.use((req: Request, res: Response, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  next()
})
app.post('/api/paymongo/webhook', express.raw({ type: 'application/json' }), asyncHandler(async (req: Request, res: Response) => {
  if (!PAYMONGO_WEBHOOK_SECRET) return res.status(500).json({ error: 'Missing webhook secret' })
  const signature = String(req.headers['paymongo-signature'] || '')
  const parts = signature.split(',').map(p => p.trim())
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2)
  const v1 = parts.find(p => p.startsWith('v1='))?.slice(3) || parts.find(p => p.startsWith('s='))?.slice(2)
  if ((!timestamp || !v1) && !PAYMONGO_SKIP_WEBHOOK_SIGNATURE) return res.status(400).json({ error: 'Invalid signature' })

  const rawBody = (req as any).body as Buffer
  const rawText = rawBody.toString('utf8')
  const payload = `${timestamp}.${rawText}`
  const expected = crypto.createHmac('sha256', PAYMONGO_WEBHOOK_SECRET).update(payload).digest('hex')
  const altExpected = crypto.createHmac('sha256', PAYMONGO_WEBHOOK_SECRET).update(rawText).digest('hex')
  if ((expected !== v1 && altExpected !== v1) && !PAYMONGO_SKIP_WEBHOOK_SIGNATURE) return res.status(400).json({ error: 'Invalid signature' })

  const event = JSON.parse(rawText)
  const type = event?.data?.attributes?.type || event?.data?.type || ''
  let intentId =
    event?.data?.attributes?.payment_intent_id ||
    event?.data?.attributes?.payment_intent?.id ||
    event?.data?.attributes?.data?.attributes?.payment_intent_id
  const paymentIdFromEvent = event?.data?.id
  const metadata =
    event?.data?.attributes?.metadata ||
    event?.data?.attributes?.data?.attributes?.metadata
  const paymentId = metadata?.paymentId

  if (!intentId && type === 'payment.paid' && paymentIdFromEvent && PAYMONGO_SECRET_KEY) {
    const auth = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64')
    const payRes = await fetch(`https://api.paymongo.com/v1/payments/${paymentIdFromEvent}`, {
      headers: { Authorization: `Basic ${auth}` },
    })
    const payJson: any = await payRes.json().catch(() => null)
    intentId = payJson?.data?.attributes?.payment_intent_id || intentId
  }

  if (type === 'payment.paid' || type === 'payment_intent.succeeded' || type === 'checkout_session.payment.paid') {
    const payment = paymentId
      ? await (prisma as any).payment.findUnique({ where: { id: String(paymentId) } })
      : intentId
        ? await (prisma as any).payment.findFirst({ where: { reference: String(intentId) } })
        : null
    if (payment) {
      await (prisma as any).payment.update({ where: { id: payment.id }, data: { status: 'paid' } })
      await (prisma as any).order.update({ where: { id: payment.orderId }, data: { status: 'paid' } })
    }
  }

  res.json({ ok: true })
}))
app.use(express.json())
app.use((req: Request, res: Response, next) => {
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
  if (!unsafe) return next()
  const origin = req.headers.origin
  if (origin && origin !== WEB_ORIGIN) return res.status(403).json({ error: 'Forbidden' })
  next()
})
const CSRF_COOKIE = 'csrfToken'
app.use((req: Request, res: Response, next) => {
  let token = (req as any).cookies?.[CSRF_COOKIE]
  if (!token) {
    token = crypto.randomBytes(32).toString('hex')
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
  }
  ;(req as any).csrfToken = token
  next()
})
app.use((req: Request, res: Response, next) => {
  const unsafe = !['GET', 'HEAD', 'OPTIONS'].includes(req.method)
  if (!unsafe) return next()
  const token = (req as any).cookies?.[CSRF_COOKIE]
  const header = String(req.headers['x-csrf-token'] || '')
  if (!token || !header || token !== header) return res.status(403).json({ error: 'CSRF blocked' })
  next()
})
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})
const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api', apiLimiter)
app.use('/api/auth', authLimiter, authMiddleware())

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
const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)
  if (!ok) return cb(new Error('Only JPG, PNG, or WEBP images are allowed'))
  cb(null, true)
}
const uploadAvatar = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 }, fileFilter: imageFilter })
const uploadProduct = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 }, fileFilter: imageFilter })

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

app.get('/api/csrf', (req: Request, res: Response) => {
  res.json({ token: (req as any).csrfToken })
})

app.get('/api/products', async (_req: Request, res: Response) => {
  const { category, q, brand, specs, minPrice, maxPrice } = _req.query as { category?: string; q?: string; brand?: string; specs?: string; minPrice?: string; maxPrice?: string }
  const and: any[] = []
  if (category) {
    const raw = String(category)
    const tokens = raw.split(',').map(s => s.trim()).filter(Boolean)
    if (tokens.length > 0) {
      const cats = await (prisma as any).category.findMany({ where: { OR: [
        { slug: { in: tokens } },
        { id: { in: tokens } },
      ] } })
      const ids = cats.map((c: any) => c.id)
      if (ids.length > 0) and.push({ categoryId: { in: ids } })
    }
  }
  if (q) {
    const needle = String(q)
    and.push({ OR: [
      { title: { contains: needle, mode: 'insensitive' } },
      { description: { contains: needle, mode: 'insensitive' } },
      { specs: { contains: needle, mode: 'insensitive' } },
      { brand: { contains: needle, mode: 'insensitive' } },
    ] })
  }
  if (brand) and.push({ brand: { contains: String(brand), mode: 'insensitive' } })
  if (specs) and.push({ specs: { contains: String(specs), mode: 'insensitive' } })

  const min = Number(minPrice)
  const max = Number(maxPrice)
  if (!Number.isNaN(min) || !Number.isNaN(max)) {
    const priceWhere: any = {}
    if (!Number.isNaN(min)) priceWhere.gte = BigInt(Math.max(0, Math.round(min * 100)))
    if (!Number.isNaN(max)) priceWhere.lte = BigInt(Math.max(0, Math.round(max * 100)))
    and.push({ priceCents: priceWhere })
  }

  const where = and.length ? { AND: and } : undefined
  const products = await prisma.product.findMany({ where, orderBy: { createdAt: 'desc' } })
  res.json(products)
})

app.get('/api/products/:id', async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id } })
  if (!product) return res.status(404).json({ error: 'Not found' })
  res.json(product)
})

app.get('/api/products/:id/reviews', async (req: Request, res: Response) => {
  const productId = req.params.id
  const includeHidden = String((req.query as any).includeHidden || '').toLowerCase() === '1'
  const items = await prisma.review.findMany({
    where: includeHidden ? { productId } : { productId, isHidden: false },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
  })
  const avg = await prisma.review.aggregate({
    where: includeHidden ? { productId } : { productId, isHidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  })
  res.json({
    averageRating: Number(avg._avg.rating || 0),
    total: avg._count._all || 0,
    items,
  })
})

app.get('/api/admin/products/:id/reviews', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.id
  const items = await prisma.review.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
  })
  const avg = await prisma.review.aggregate({ where: { productId, isHidden: false }, _avg: { rating: true }, _count: { _all: true } })
  res.json({
    averageRating: Number(avg._avg.rating || 0),
    total: avg._count._all || 0,
    items,
  })
}))

async function hasVerifiedPurchase(userId: string, productId: string) {
  const successfulStatuses = ['paid', 'shipped', 'delivered']
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: { in: successfulStatuses } as any },
    },
    select: { id: true },
  })
  return !!item
}

app.get('/api/products/:id/review-eligibility', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.id
  const uid = (req as any).user.id as string
  const roles = await prisma.userRole.findMany({ where: { userId: uid }, include: { role: true } })
  const isAdmin = roles.some((r: any) => r.role.name === 'admin' || r.role.name === 'owner')
  if (isAdmin) return res.json({ canReview: true })
  const verified = await hasVerifiedPurchase(uid, productId)
  res.json({ canReview: verified })
}))

app.post('/api/products/:id/reviews', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const productId = req.params.id
  const uid = (req as any).user.id as string
  const schema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(5).max(1000),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const existing = await prisma.review.findUnique({ where: { productId_userId: { productId, userId: uid } } })
  if (existing) return res.status(409).json({ error: 'You already reviewed this product' })

  const verified = await hasVerifiedPurchase(uid, productId)
  if (!verified) return res.status(403).json({ error: 'Only verified buyers can leave reviews' })

  const created = await prisma.review.create({
    data: { productId, userId: uid, rating: parsed.data.rating, comment: parsed.data.comment },
    include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
  })
  res.status(201).json(created)
}))

app.patch('/api/reviews/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.id
  const uid = (req as any).user.id as string
  const schema = z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(5).max(1000),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const review = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!review || review.userId !== uid) return res.status(404).json({ error: 'Review not found' })

  const verified = await hasVerifiedPurchase(uid, review.productId)
  if (!verified) return res.status(403).json({ error: 'Only verified buyers can update reviews' })

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { rating: parsed.data.rating, comment: parsed.data.comment },
    include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
  })
  res.json(updated)
}))

app.delete('/api/reviews/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.id
  const uid = (req as any).user.id as string
  const review = await prisma.review.findUnique({ where: { id: reviewId } })
  if (!review) return res.status(404).json({ error: 'Review not found' })

  const roles = await prisma.userRole.findMany({ where: { userId: uid }, include: { role: true } })
  const isAdmin = roles.some((r: any) => r.role.name === 'admin' || r.role.name === 'owner')
  if (!isAdmin && review.userId !== uid) return res.status(403).json({ error: 'Forbidden' })
  if (!isAdmin) {
    const verified = await hasVerifiedPurchase(uid, review.productId)
    if (!verified) return res.status(403).json({ error: 'Only verified buyers can delete reviews' })
  }

  await prisma.review.delete({ where: { id: reviewId } })
  res.json({ ok: true })
}))

app.patch('/api/admin/reviews/:id/hide', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const reviewId = req.params.id
  const schema = z.object({ isHidden: z.boolean() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { isHidden: parsed.data.isHidden },
    include: { user: { select: { id: true, fullName: true, username: true, avatarUrl: true } } },
  })
  res.json(updated)
}))

app.get('/api/categories', async (_req: Request, res: Response) => {
  const cats = await (prisma as any).category.findMany({ orderBy: { name: 'asc' } })
  res.json(cats)
})

app.get('/api/brands', async (_req: Request, res: Response) => {
  const rows = await prisma.product.findMany({
    where: { brand: { not: null } },
    select: { brand: true },
    distinct: ['brand'],
    orderBy: { brand: 'asc' },
  })
  const brands = rows.map((r: any) => r.brand).filter(Boolean)
  res.json(brands)
})

// Address book (per-user)
app.get('/api/addresses', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const items = await (prisma as any).address.findMany({
    where: { userId: uid },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  })
  res.json(items)
}))

app.post('/api/addresses', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const schema = z.object({
    label: z.string().trim().max(60).optional(),
    fullName: z.string().min(2),
    phone: z.string().min(5),
    addressLine1: z.string().min(3),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    region: z.string().min(2),
    postalCode: z.string().min(3),
    country: z.string().min(2).default('PH'),
    isDefault: z.boolean().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const data = parsed.data

  if (data.isDefault) {
    await (prisma as any).address.updateMany({ where: { userId: uid }, data: { isDefault: false } })
  }

  const created = await (prisma as any).address.create({ data: { ...data, userId: uid } })
  res.status(201).json(created)
}))

app.patch('/api/addresses/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const schema = z.object({
    label: z.string().trim().max(60).optional(),
    fullName: z.string().min(2).optional(),
    phone: z.string().min(5).optional(),
    addressLine1: z.string().min(3).optional(),
    addressLine2: z.string().optional(),
    city: z.string().min(2).optional(),
    region: z.string().min(2).optional(),
    postalCode: z.string().min(3).optional(),
    country: z.string().min(2).optional(),
    isDefault: z.boolean().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const existing = await (prisma as any).address.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== uid) return res.status(404).json({ error: 'Address not found' })

  if (parsed.data.isDefault) {
    await (prisma as any).address.updateMany({ where: { userId: uid }, data: { isDefault: false } })
  }

  const updated = await (prisma as any).address.update({ where: { id: req.params.id }, data: parsed.data })
  res.json(updated)
}))

app.delete('/api/addresses/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const existing = await (prisma as any).address.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== uid) return res.status(404).json({ error: 'Address not found' })
  await (prisma as any).address.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}))

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
  const subtotal = items.reduce((sum: bigint, i: any) => sum + (BigInt(i.product.priceCents) * BigInt(i.quantity)), 0n)
  const baseShipping = 15000n // PHP 150.00
  const shipping = (typeof voucherCode === 'string' && voucherCode.trim().toUpperCase() === 'FREESHIP') ? 0n : baseShipping
  const discount = 0n // can be extended later
  const total = subtotal + shipping - discount
  res.json({ items, subtotalCents: subtotal, shippingCents: shipping, discountCents: discount, totalCents: total })
}))

// Checkout: compute summary for single item (Buy Now)
app.post('/api/checkout/quick/summary', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
    voucherCode: z.string().trim().optional(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { productId, quantity, voucherCode } = parsed.data

  const product = await (prisma as any).product.findUnique({ where: { id: productId } })
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const subtotal = BigInt(product.priceCents) * BigInt(quantity)
  const baseShipping = 15000n // PHP 150.00
  const shipping = (typeof voucherCode === 'string' && voucherCode.trim().toUpperCase() === 'FREESHIP') ? 0n : baseShipping
  const discount = 0n
  const total = subtotal + shipping - discount
  const items = [{ product, quantity }]
  res.json({ items, subtotalCents: subtotal, shippingCents: shipping, discountCents: discount, totalCents: total })
}))

// Place order: creates order and items from cart and clears cart
app.post('/api/checkout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const schema = z.object({
    voucherCode: z.string().trim().optional(),
    paymentMethod: z.enum(['online']),
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
  const subtotal = cartItems.reduce((sum: bigint, i: any) => sum + (BigInt(i.product.priceCents) * BigInt(i.quantity)), 0n)
  const baseShipping = 15000n
  const shipping = (voucherCode && voucherCode.trim().toUpperCase() === 'FREESHIP') ? 0n : baseShipping
  const discount = 0n
  const total = subtotal + shipping - discount

  const order = await prisma.$transaction(async (tx) => {
    const created = await (tx as any).order.create({ data: {
      userId: uid,
      status: 'pending',
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
        priceCents: BigInt(ci.product.priceCents),
        quantity: ci.quantity,
      } })
    }
    // clear cart
    await (tx as any).cartItem.deleteMany({ where: { userId: uid } })
    // payment placeholder for online
    await (tx as any).payment.create({ data: {
      orderId: created.id,
      method: 'online',
      status: 'pending',
      provider: 'paymongo',
      amountCents: total,
    } })
    return created
  })

  const result: any = { orderId: (order as any).id }
  const payment = await (prisma as any).payment.findUnique({ where: { orderId: (order as any).id } })
  result.paymentId = payment?.id
  res.status(201).json(result)
}))

// Place order: single item (Buy Now)
app.post('/api/checkout/quick', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const schema = z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(99),
    voucherCode: z.string().trim().optional(),
    paymentMethod: z.enum(['online']),
    address: z.object({
      fullName: z.string().min(2),
      phone: z.string().min(5),
      addressLine1: z.string().min(3),
      addressLine2: z.string().optional(),
      city: z.string().min(2),
      region: z.string().min(2),
      postalCode: z.string().min(3),
      country: z.string().default('PH'),
    }),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { productId, quantity, voucherCode, paymentMethod, address } = parsed.data

  const product = await (prisma as any).product.findUnique({ where: { id: productId } })
  if (!product) return res.status(404).json({ error: 'Product not found' })

  const subtotal = BigInt(product.priceCents) * BigInt(quantity)
  const baseShipping = 15000n
  const shipping = (voucherCode && voucherCode.trim().toUpperCase() === 'FREESHIP') ? 0n : baseShipping
  const discount = 0n
  const total = subtotal + shipping - discount

  const order = await prisma.$transaction(async (tx) => {
    const created = await (tx as any).order.create({ data: {
      userId: uid,
      status: 'pending',
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

    await (tx as any).orderItem.create({ data: {
      orderId: created.id,
      productId: product.id,
      title: product.title,
      priceCents: BigInt(product.priceCents),
      quantity,
    } })

    await (tx as any).payment.create({ data: {
      orderId: created.id,
      method: 'online',
      status: 'pending',
      provider: 'paymongo',
      amountCents: total,
    } })
    return created
  })

  const result: any = { orderId: (order as any).id }
  const payment = await (prisma as any).payment.findUnique({ where: { orderId: (order as any).id } })
  result.paymentId = payment?.id
  res.status(201).json(result)
}))

app.get('/api/payments/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const uid = (req as any).user.id as string
  const payment = await (prisma as any).payment.findUnique({ where: { id: req.params.id }, include: { order: true } })
  if (!payment || payment.order?.userId !== uid) return res.status(404).json({ error: 'Not found' })
  res.json(payment)
}))

app.post('/api/payments/:id/paymongo', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  if (!PAYMONGO_SECRET_KEY) return res.status(500).json({ error: 'PayMongo secret missing' })
  const uid = (req as any).user.id as string
  const schema = z.object({
    email: z.string().email(),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const payment = await (prisma as any).payment.findUnique({
    where: { id: req.params.id },
    include: { order: { include: { items: true } } },
  })
  if (!payment || payment.order?.userId !== uid) return res.status(404).json({ error: 'Not found' })

  if (payment.status === 'paid') return res.json({ status: 'paid' })

  const auth = Buffer.from(`${PAYMONGO_SECRET_KEY}:`).toString('base64')
  const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }

  const lineItems = (payment.order?.items || []).map((item: any) => ({
    name: item.title,
    amount: Number(item.priceCents),
    currency: 'PHP',
    quantity: Number(item.quantity),
  }))

  const sessionRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        attributes: {
          line_items: lineItems,
          payment_method_types: ['card', 'gcash', 'paymaya'],
          success_url: `${WEB_ORIGIN}/payment-success`,
          cancel_url: `${WEB_ORIGIN}/payment/${payment.id}`,
          description: `Order ${payment.orderId}`,
          billing: {
            name: payment.order?.fullName || 'Customer',
            email: parsed.data.email,
          },
          metadata: { orderId: payment.orderId, paymentId: payment.id },
        },
      },
    }),
  })
  const sessionJson: any = await sessionRes.json()
  if (!sessionRes.ok) return res.status(400).json({ error: sessionJson })

  const intentId = sessionJson.data?.attributes?.payment_intent?.id
  if (intentId) {
    await (prisma as any).payment.update({ where: { id: payment.id }, data: { reference: intentId, provider: 'paymongo' } })
  }

  const redirectUrl = sessionJson.data?.attributes?.checkout_url
  res.json({ redirectUrl })
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
    const unitPrice = typeof it.priceCents === 'number'
      ? it.priceCents
      : Number(it.priceCents ?? it.product?.priceCents ?? 0)
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
    buckets[b].totalCents += Number(o.totalCents || 0)
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
    isVerified: (user as any).isVerified,
    username: (user as any).username || undefined,
    avatarUrl: (user as any).avatarUrl || undefined,
    roles: roles.map((r: any) => r.role.name),
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
app.post('/api/users/me/avatar', requireAuth, uploadAvatar.single('avatar'), asyncHandler(async (req: Request, res: Response) => {
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) return res.status(400).json({ error: 'No file uploaded' })
  const uid = (req as any).user.id as string
  const fileName = (file as any).filename || path.basename(file.path)
  const url = `/uploads/${fileName}`
  await prisma.user.update({ where: { id: uid }, data: { avatarUrl: url } as any })
  const dto = await getUserDto(uid)
  res.json(dto)
}))

// Profile: change password
app.post('/api/users/me/password', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const schema = z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { currentPassword, newPassword } = parsed.data
  const uid = (req as any).user.id as string

  const user = await prisma.user.findUnique({ where: { id: uid } })
  if (!user) return res.status(404).json({ error: 'User not found' })

  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return res.status(400).json({ error: 'Current password is incorrect' })

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: uid }, data: { passwordHash: hash } })
  res.json({ ok: true })
}))

// Admin Products CRUD
app.post('/api/admin/products', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const body = req.body || {}
  const title = String(body.title ?? '')
  const slug = String(body.slug ?? '')
  const priceCents = Number(body.priceCents ?? 0)
  const currency = String(body.currency ?? 'PHP')
  const description = body.description ? String(body.description) : undefined
  const brand = body.brand ? String(body.brand) : undefined
  const specs = body.specs ? String(body.specs) : undefined
  const categoryId = body.categoryId ? String(body.categoryId) : undefined
  if (!title || !slug || !priceCents) return res.status(400).json({ error: 'Missing required fields' })
  try {
  const product = await (prisma as any).product.create({ data: { title, slug, description, brand, specs, priceCents: BigInt(priceCents), currency, ...(categoryId ? { category: { connect: { id: categoryId } } } : {}) } })
    return res.status(201).json(product)
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'Slug already exists' })
    throw e
  }
}))

app.put('/api/admin/products/:id', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  const { title, slug, description, brand, specs, priceCents, currency, categoryId, imageUrl } = req.body || {}
  const data: any = { title, slug, description, brand, specs, priceCents: priceCents ? BigInt(priceCents) : undefined, currency, imageUrl }
  if (typeof categoryId === 'string' && categoryId) data.category = { connect: { id: categoryId } }
  const product = await (prisma as any).product.update({ where: { id: req.params.id }, data })
  res.json(product)
}))

app.delete('/api/admin/products/:id', requireAuth, requireRole('admin','owner'), asyncHandler(async (req: Request, res: Response) => {
  await prisma.product.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
}))

app.post('/api/admin/products/:id/images', requireAuth, requireRole('admin','owner'), uploadProduct.array('files', 8), asyncHandler(async (req: Request, res: Response) => {
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
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`)
  })
}

export { app }
