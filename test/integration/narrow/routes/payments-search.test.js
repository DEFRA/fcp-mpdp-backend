import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

vi.mock('../../../../src/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'search.cacheTtl') { return 0 } // Disable caching for integration tests
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

vi.mock('../../../../src/data/database.js', () => {
  return {
    createModels: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true)
  }
})

vi.mock('../../../../src/data/search.js')

const { getSearchSuggestions } = await import('../../../../src/data/search.js')
const { createServer } = await import('../../../../src/server.js')

let server

describe('payments-search routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    getSearchSuggestions.mockResolvedValue({ rows: ['search result 1', 'search result 2'] })
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('GET /v1/payments/search should return 200 and results', async () => {
    const response = await server.inject({ method: 'GET', url: '/v1/payments/search?searchString=smith' })
    expect(response.statusCode).toBe(200)
    expect(response.payload).toBe(JSON.stringify({ rows: ['search result 1', 'search result 2'] }))
  })

  test('GET /v1/payments/search should return 200 and empty array if no results', async () => {
    getSearchSuggestions.mockResolvedValue({ rows: [] })
    const response = await server.inject({ method: 'GET', url: '/v1/payments/search?searchString=smith' })
    expect(response.statusCode).toBe(200)
    expect(response.payload).toBe(JSON.stringify({ rows: [] }))
  })

  test('GET /v1/payments/search should return 400 and error message if no search string', async () => {
    const response = await server.inject({ method: 'GET', url: '/v1/payments/search' })
    expect(response.statusCode).toBe(400)
    expect(response.payload).toBe('ValidationError: "searchString" is required')
  })

  test('GET /v1/payments/search should return 400 if search string is empty', async () => {
    const response = await server.inject({ method: 'GET', url: '/v1/payments/search?searchString=' })
    expect(response.statusCode).toBe(400)
  })

  test('GET /v1/payments/search should return 400 if search string exceeds 32 characters', async () => {
    const response = await server.inject({ method: 'GET', url: `/v1/payments/search?searchString=${'a'.repeat(33)}` })
    expect(response.statusCode).toBe(400)
  })
})
