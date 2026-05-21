import { Router, Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_NAME = 'token'

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required')
}
const JWT_SECRET_VALUE = JWT_SECRET

type JWTPayload = { uid: string }

export function authMiddleware() {
  const router = Router()
  router.use(cookieParser())

  router.get('/me', requireAuth, async (req: AuthedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { roles: { include: { role: true } } },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      username: (user as any).username || undefined,
      avatarUrl: (user as any).avatarUrl || undefined,
      roles: (user as any).roles.map((r: any) => r.role.name),
    })
  })

  router.post('/register', async (req: Request, res: Response) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(6), fullName: z.string().min(1) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { email, password, fullName } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already registered' })

    const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { email, passwordHash: hash, fullName } })
    const customerRole = await prisma.role.upsert({ where: { name: 'customer' }, update: {}, create: { name: 'customer' } })
    await prisma.userRole.create({ data: { userId: user.id, roleId: customerRole.id } })

    setAuthCookie(res, { uid: user.id })
    res.status(201).json({ id: user.id, email: user.email, fullName: user.fullName, username: (user as any).username || undefined, avatarUrl: (user as any).avatarUrl || undefined, roles: ['customer'] })
  })

  router.post('/login', async (req: Request, res: Response) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
    const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    setAuthCookie(res, { uid: user.id })
    const roles = await prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } })
    res.json({ id: user.id, email: user.email, fullName: user.fullName, username: (user as any).username || undefined, avatarUrl: (user as any).avatarUrl || undefined, roles: roles.map((r: any) => r.role.name) })
  })

  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie(TOKEN_NAME, cookieOpts())
    res.json({ ok: true })
  })

  return router
}

export type AuthedRequest = Request & { user?: { id: string } }

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.[TOKEN_NAME]
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const decoded = jwt.verify(token, JWT_SECRET_VALUE) as jwt.JwtPayload
    const uid = decoded?.uid
    if (!uid || typeof uid !== 'string') return res.status(401).json({ error: 'Unauthorized' })
    req.user = { id: uid }
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export function requireRole(...roles: Array<'admin' | 'owner'>) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    const userRoles = await prisma.userRole.findMany({ where: { userId: req.user.id }, include: { role: true } })
    const ok = userRoles.some((ur: any) => roles.includes(ur.role.name as any))
    if (!ok) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}

function setAuthCookie(res: Response, payload: JWTPayload) {
  const token = jwt.sign(payload, JWT_SECRET_VALUE, { expiresIn: '7d' })
  res.cookie(TOKEN_NAME, token, cookieOpts())
}

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}
