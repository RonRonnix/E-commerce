import 'dotenv/config'
import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../db'

let app: any
let agent: request.SuperAgentTest
let userId = ''
let productId = ''
let categoryId = ''
let orderId = ''
let paymentId = ''

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

  const email = `buyer-${Date.now()}@example.com`
  const csrf = await getCsrfToken()
  const register = await agent
    .post('/api/auth/register')
    .set('X-CSRF-Token', csrf)
    .send({ email, password: 'Passw0rd!', fullName: 'Buyer' })
  userId = register.body?.id

  const category = await prisma.category.create({ data: { name: 'Test Category', slug: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` } })
  categoryId = category.id
  const product = await prisma.product.create({
    data: {
      title: 'Snapshot Product',
      slug: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      priceCents: BigInt(50000),
      currency: 'PHP',
      categoryId: category.id,
    },
  })
  productId = product.id

  await prisma.cartItem.create({ data: { userId, productId, quantity: 1 } })
})

describe('checkout + payment + snapshot', () => {
  it('creates payment for online checkout', async () => {
    const csrf = await getCsrfToken()
    const res = await agent
      .post('/api/checkout')
      .set('X-CSRF-Token', csrf)
      .send({
        voucherCode: '',
        paymentMethod: 'online',
        address: {
          fullName: 'Buyer',
          phone: '09123456789',
          addressLine1: '123 Main',
          addressLine2: '',
          city: 'Manila',
          region: 'NCR',
          postalCode: '1000',
          country: 'PH',
        },
      })
    expect(res.status).toBe(201)
    orderId = res.body.orderId
    paymentId = res.body.paymentId
    expect(paymentId).toBeTruthy()

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
    expect(payment?.status).toBe('pending')
  })

  it('keeps order item price snapshot after product price changes', async () => {
    await prisma.product.update({ where: { id: productId }, data: { priceCents: BigInt(90000) } })
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
    expect(order?.items?.[0]?.priceCents).toBe(BigInt(50000))
  })
})
