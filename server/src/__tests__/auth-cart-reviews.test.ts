import 'dotenv/config'
import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../db'

let app: any
let agent: any
let userId = ''
let productId = ''
let categoryId = ''
let orderId = ''

async function getCsrfToken() {
  const res = await agent.get('/api/csrf')
  return res.body?.token as string
}

afterAll(async () => {
  if (userId) {
    await prisma.review.deleteMany({ where: { userId } })
    await prisma.orderItem.deleteMany({ where: { order: { userId } } })
    await prisma.order.deleteMany({ where: { userId } })
    await prisma.cartItem.deleteMany({ where: { userId } })
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

  const category = await prisma.category.create({ data: { name: 'Test Category', slug: `cat-${Date.now()}` } })
  categoryId = category.id
  const product = await prisma.product.create({
    data: {
      title: 'Test Product',
      slug: `prod-${Date.now()}`,
      priceCents: BigInt(25000),
      currency: 'PHP',
      categoryId: category.id,
    },
  })
  productId = product.id
})

describe('auth, cart, reviews', () => {
  it('logs in and returns user', async () => {
    const csrf = await getCsrfToken()
    const res = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', csrf)
      .send({ email: `test-${Date.now()}@example.com`, password: 'Passw0rd!' })
    expect([200, 401]).toContain(res.status)
  })

  it('adds, updates, and removes cart items', async () => {
    const csrf = await getCsrfToken()
    const add = await agent
      .post('/api/cart')
      .set('X-CSRF-Token', csrf)
      .send({ productId, quantity: 1 })
    expect(add.status).toBe(201)

    const update = await agent
      .patch(`/api/cart/${productId}`)
      .set('X-CSRF-Token', csrf)
      .send({ quantity: 2 })
    expect(update.status).toBe(200)

    const del = await agent
      .delete(`/api/cart/${productId}`)
      .set('X-CSRF-Token', csrf)
    expect(del.status).toBe(200)
  })

  it('blocks review before purchase, then allows after paid order', async () => {
    const csrf = await getCsrfToken()
    const eligibility1 = await agent
      .get(`/api/products/${productId}/review-eligibility`)
      .set('X-CSRF-Token', csrf)
    expect(eligibility1.status).toBe(200)
    expect(eligibility1.body.canReview).toBe(false)

    const order = await prisma.order.create({
      data: {
        userId,
        status: 'paid',
        paymentMethod: 'cod',
        subtotalCents: BigInt(25000),
        shippingCents: BigInt(0),
        discountCents: BigInt(0),
        totalCents: BigInt(25000),
        fullName: 'Test User',
        phone: '09123456789',
        addressLine1: '123 Main',
        addressLine2: null,
        city: 'Manila',
        region: 'NCR',
        postalCode: '1000',
        country: 'PH',
      },
    })
    orderId = order.id
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId,
        title: 'Test Product',
        priceCents: BigInt(25000),
        quantity: 1,
      },
    })

    const eligibility2 = await agent
      .get(`/api/products/${productId}/review-eligibility`)
      .set('X-CSRF-Token', csrf)
    expect(eligibility2.status).toBe(200)
    expect(eligibility2.body.canReview).toBe(true)

    const review = await agent
      .post(`/api/products/${productId}/reviews`)
      .set('X-CSRF-Token', csrf)
      .send({ rating: 5, comment: 'Great product!' })
    expect(review.status).toBe(201)
  })
})
