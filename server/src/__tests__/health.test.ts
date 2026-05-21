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

describe('health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
