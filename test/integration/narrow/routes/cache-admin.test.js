import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

vi.mock('../../../../src/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'search.cacheTtl') { return 0 }
      if (key === 'postgres') {
        return {
          host: 'localhost',
          port: 5432,
          database: 'test',
          user: 'test',
          passwordForLocalDev: 'test',
          hostRead: 'localhost',
          portRead: 5432,
          getTokenFromRds: false,
          dialect: 'postgres',
          poolMax: 5,
          poolMin: 0,
          poolIdle: 10000
        }
      }
      if (key === 'log') { return { isEnabled: false, level: 'info', format: 'ecs', redact: [] } }
      if (key === 'environment') { return 'test' }
      if (key === 'serviceName') { return 'fcp-mpdp-backend' }
      if (key === 'serviceVersion') { return '1.0.0' }
      if (key === 'port') { return 3000 }
      if (key === 'host') { return 'localhost' }
      if (key === 'isDev') { return false }
      return null
    }),
    validate: vi.fn()
  }
}))

vi.mock('../../../../src/data/database.js', () => ({
  createModels: vi.fn(),
  healthCheck: vi.fn().mockResolvedValue(true)
}))

vi.mock('../../../../src/data/search.js')

const { invalidateSearchCache, warmSearchCache } = await import('../../../../src/data/search.js')
const { createServer } = await import('../../../../src/server.js')

warmSearchCache.mockResolvedValue(undefined)

let server

describe('cache-admin routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    warmSearchCache.mockResolvedValue(undefined)
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('POST /v1/payments/admin/cache/invalidate should return 200', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments/admin/cache/invalidate'
    })

    expect(response.statusCode).toBe(200)
  })

  test('POST /v1/payments/admin/cache/invalidate should return success message', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments/admin/cache/invalidate'
    })

    expect(JSON.parse(response.payload)).toEqual({ message: 'Search cache invalidated' })
  })

  test('POST /v1/payments/admin/cache/invalidate should call invalidateSearchCache', async () => {
    await server.inject({
      method: 'POST',
      url: '/v1/payments/admin/cache/invalidate'
    })

    expect(invalidateSearchCache).toHaveBeenCalledTimes(1)
  })

  test('POST /v1/payments/admin/cache/invalidate should trigger warmSearchCache', async () => {
    await server.inject({
      method: 'POST',
      url: '/v1/payments/admin/cache/invalidate'
    })

    // warmSearchCache is called fire-and-forget, allow microtasks to settle
    await new Promise(resolve => setImmediate(resolve))
    expect(warmSearchCache).toHaveBeenCalledTimes(1)
  })
})
