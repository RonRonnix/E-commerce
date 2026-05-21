import 'dotenv/config'
import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'

let app: any
let agent: any
let adminAgent: any
let userId = ''
let adminUserId = ''
let productId = ''
let categoryId = ''

async function getCsrfToken(a: request.SuperAgentTest) {
  const res = await a.get('/api/csrf')
  return res.body?.token as string
}

afterAll(async () => {
  if (userId) {
    await prisma.userRole.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
  }
  if (adminUserId) {
    await prisma.userRole.deleteMany({ where: { userId: adminUserId } })
    await prisma.user.deleteMany({ where: { id: adminUserId } })
  }
  if (productId) await prisma.product.deleteMany({ where: { id: productId } })
  if (categoryId) await prisma.category.deleteMany({ where: { id: categoryId } })
  await prisma.$disconnect()
})

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
  process.env.WEB_ORIGIN = process.env.WEB_ORIGIN || 'http://localhost'
  process.env.NODE_ENV = 'test'
  const mod = await import('../index')
  app = mod.app
  agent = request.agent(app)
  adminAgent = request.agent(app)

  const email = `user-${Date.now()}@example.com`
  const csrf = await getCsrfToken(agent)
  const register = await agent
    .post('/api/auth/register')
    .set('X-CSRF-Token', csrf)
    .send({ email, password: 'Passw0rd!', fullName: 'User' })
  userId = register.body?.id

  const adminEmail = `admin-${Date.now()}@example.com`
  const hash = await bcrypt.hash('AdminPass1!', 10)
  const admin = await prisma.user.create({ data: { email: adminEmail, passwordHash: hash, fullName: 'Admin' } })
  adminUserId = admin.id
  const adminRole = await prisma.role.upsert({ where: { name: 'admin' }, update: {}, create: { name: 'admin' } })
  await prisma.userRole.create({ data: { userId: adminUserId, roleId: adminRole.id } })

  const adminCsrf = await getCsrfToken(adminAgent)
  await adminAgent
    .post('/api/auth/login')
    .set('X-CSRF-Token', adminCsrf)
    .send({ email: adminEmail, password: 'AdminPass1!' })

  const category = await prisma.category.create({ data: { name: 'Test Category', slug: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` } })
  categoryId = category.id
  const product = await prisma.product.create({
    data: {
      title: 'Upload Product',
      slug: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      priceCents: BigInt(10000),
      currency: 'PHP',
      categoryId: category.id,
    },
  })
  productId = product.id
})

describe('upload validation', () => {
  it('rejects non-image avatar uploads', async () => {
    const csrf = await getCsrfToken(agent)
    const res = await agent
      .post('/api/users/me/avatar')
      .set('X-CSRF-Token', csrf)
      .attach('avatar', Buffer.from('not an image'), { filename: 'test.txt', contentType: 'text/plain' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects oversized avatar uploads', async () => {
    const csrf = await getCsrfToken(agent)
    const big = Buffer.alloc(2 * 1024 * 1024 + 100, 1)
    const res = await agent
      .post('/api/users/me/avatar')
      .set('X-CSRF-Token', csrf)
      .attach('avatar', big, { filename: 'big.png', contentType: 'image/png' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects non-image product uploads', async () => {
    const csrf = await getCsrfToken(adminAgent)
    const res = await adminAgent
      .post(`/api/admin/products/${productId}/images`)
      .set('X-CSRF-Token', csrf)
      .attach('files', Buffer.from('not an image'), { filename: 'file.txt', contentType: 'text/plain' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('rejects oversized product uploads', async () => {
    const csrf = await getCsrfToken(adminAgent)
    const big = Buffer.alloc(8 * 1024 * 1024 + 100, 1)
    const res = await adminAgent
      .post(`/api/admin/products/${productId}/images`)
      .set('X-CSRF-Token', csrf)
      .attach('files', big, { filename: 'big.webp', contentType: 'image/webp' })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})
