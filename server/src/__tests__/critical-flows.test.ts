import 'dotenv/config'
import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../db'

let app: any
let agent: any
let userId = ''
let productId = ''
let categoryId = ''

async function getCsrfToken() {
  const res = await agent.get('/api/csrf')
  return res.body?.token as string
}

afterAll(async () => {
  if (userId) {
    await prisma.payment.deleteMany({ where: { order: { userId } } })
    await prisma.orderItem.deleteMany({ where: { order: { userId } } })
    await prisma.order.deleteMany({ where: { userId } })
    await prisma.cartItem.deleteMany({ where: { userId } })
    await prisma.address.deleteMany({ where: { userId } })
    await prisma.review.deleteMany({ where: { userId } })
    await prisma.userRole.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
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

  const email = `test-${Date.now()}@example.com`
  const csrf = await getCsrfToken()
  const register = await agent
    .post('/api/auth/register')
    .set('X-CSRF-Token', csrf)
    .send({ email, password: 'Passw0rd!', fullName: 'Test User' })
  expect(register.status).toBe(201)
  userId = register.body?.id

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const slug = `cat-${suffix}`
  const productSlug = `prod-${suffix}`
  const category = await prisma.category.create({ data: { name: 'Test Category', slug } })
  categoryId = category.id
  const product = await (prisma as any).product.create({
    data: {
      title: 'Test Product',
      slug: productSlug,
      priceCents: BigInt(19900),
      currency: 'PHP',
      categoryId: category.id,
    },
  })
  productId = product.id

  await prisma.cartItem.create({ data: { userId, productId, quantity: 2 } })
})

describe('critical flows', () => {
  it('creates and updates an address', async () => {
    const csrf = await getCsrfToken()
    const created = await agent
      .post('/api/addresses')
      .set('X-CSRF-Token', csrf)
      .send({
        fullName: 'Test User',
        phone: '09123456789',
        addressLine1: '123 Main St',
        addressLine2: '',
        city: 'Manila',
        region: 'NCR',
        postalCode: '1000',
        country: 'PH',
      })
    expect(created.status).toBe(201)

    const updated = await agent
      .patch(`/api/addresses/${created.body.id}`)
      .set('X-CSRF-Token', csrf)
      .send({ city: 'Quezon City' })
    expect(updated.status).toBe(200)
    expect(updated.body.city).toBe('Quezon City')
  })

  it('builds checkout summary and places order', async () => {
    const csrf = await getCsrfToken()
    const summary = await agent
      .post('/api/checkout/summary')
      .set('X-CSRF-Token', csrf)
      .send({ voucherCode: '' })
    expect(summary.status).toBe(200)
    expect(summary.body.totalCents).toBeGreaterThan(0)

    const order = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrf)
      .send({
        voucherCode: '',
        paymentMethod: 'cod',
        address: {
          fullName: 'Test User',
          phone: '09123456789',
          addressLine1: '123 Main St',
          addressLine2: '',
          city: 'Manila',
          region: 'NCR',
          postalCode: '1000',
          country: 'PH',
        },
      })
    expect(order.status).toBe(201)
    expect(order.body.orderId).toBeTruthy()
  })
})
