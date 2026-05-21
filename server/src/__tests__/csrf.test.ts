import request from 'supertest'
import { describe, it, expect, beforeAll } from 'vitest'

let app: any

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret'
  process.env.WEB_ORIGIN = 'http://localhost'
  process.env.NODE_ENV = 'test'
  const mod = await import('../index')
  app = mod.app
})

describe('csrf', () => {
  it('blocks unsafe requests without token', async () => {
    const res = await request(app).post('/api/unknown')
    expect(res.status).toBe(403)
  })

  it('allows unsafe requests with token', async () => {
    const agent = request.agent(app)
    const bootstrap = await agent.get('/api/csrf')
    expect(bootstrap.status).toBe(200)
    const token = bootstrap.body?.token
    const res = await agent
      .post('/api/unknown')
      .set('X-CSRF-Token', token)
    expect(res.status).toBe(404)
  })
})
