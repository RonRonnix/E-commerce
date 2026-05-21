import 'dotenv/config'
import request from 'supertest'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'

let app: any
let agent: request.SuperAgentTest
let adminAgent: request.SuperAgentTest
let adminUserId = ''
let userId = ''

async function getCsrfToken(a: request.SuperAgentTest) {
  const res = await a.get('/api/csrf')
  return res.body?.token as string
}

afterAll(async () => {
  if (adminUserId) {
    await prisma.userRole.deleteMany({ where: { userId: adminUserId } })
    await prisma.user.deleteMany({ where: { id: adminUserId } })
  }
  if (userId) {
    await prisma.userRole.deleteMany({ where: { userId } })
    await prisma.user.deleteMany({ where: { id: userId } })
  }
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

  const csrf = await getCsrfToken(agent)
  const email = `user-${Date.now()}@example.com`
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
  const adminLogin = await adminAgent
    .post('/api/auth/login')
    .set('X-CSRF-Token', adminCsrf)
    .send({ email: adminEmail, password: 'AdminPass1!' })
  expect(adminLogin.status).toBe(200)
})

describe('admin permissions', () => {
  it('blocks non-admin access', async () => {
    const res = await agent.get('/api/admin/orders/stats')
    expect(res.status).toBe(403)
  })

  it('allows admin access', async () => {
    const res = await adminAgent.get('/api/admin/orders/stats')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('total')
  })
})
