import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

vi.mock('../../../../src/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'search.cacheTtl') return 0 // Disable caching for integration tests
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
      if (key === 'log') return { isEnabled: false, level: 'info', format: 'ecs', redact: [] }
      if (key === 'environment') return 'test'
      if (key === 'serviceName') return 'fcp-mpdp-backend'
      if (key === 'serviceVersion') return '1.0.0'
      if (key === 'port') return 3000
      if (key === 'host') return 'localhost'
      if (key === 'isDev') return false
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

getSearchSuggestions.mockResolvedValue({ rows: ['search result 1', 'search result 2'] })

let server

describe('payments-search routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('GET /v1/payments/search should return 200 if results', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/search?searchString=smith'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  test('GET /v1/payments/search should return search results if results', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/search?searchString=smith'
    }
    const response = await server.inject(options)
    expect(response.payload).toBe(JSON.stringify({ rows: ['search result 1', 'search result 2'] }))
  })

  test('GET /v1/payments/search should return 404 if no results', async () => {
    getSearchSuggestions.mockResolvedValue({ rows: [] })
    const options = {
      method: 'GET',
      url: '/v1/payments/search?searchString=smith'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(404)
  })

  test('GET /v1/payments/search should return empty array if no results', async () => {
    getSearchSuggestions.mockResolvedValue({ rows: [] })
    const options = {
      method: 'GET',
      url: '/v1/payments/search?searchString=smith'
    }
    const response = await server.inject(options)
    expect(response.payload).toBe(JSON.stringify({ rows: [] }))
  })

  test('GET /v1/payments/search should return 400 if no search string', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/search'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('GET /v1/payments/search should return error message if no search string', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/search'
    }
    const response = await server.inject(options)
    expect(response.payload).toBe('ValidationError: "searchString" is required')
  })

  test('GET /v1/payments/search should return 400 if search string is empty', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/search?searchString='
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('GET /v1/payments/search should return 400 if search string exceeds 32 characters', async () => {
    const options = {
      method: 'GET',
      url: `/v1/payments/search?searchString=${'a'.repeat(33)}`
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })
})
