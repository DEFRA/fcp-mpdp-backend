import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import Boom from '@hapi/boom'

vi.mock('../../../../src/data/database.js', () => ({
  createModels: vi.fn(),
  healthCheck: vi.fn()
}))

vi.mock('@hapi/jwt', () => ({
  default: {
    plugin: {
      name: 'jwt',
      register: (server) => {
        server.auth.scheme('jwt', (_server, _options) => ({
          authenticate: (request, h) => {
            const auth = request.headers.authorization
            if (!auth?.startsWith('Bearer ')) {
              throw Boom.unauthorized(null, 'Bearer')
            }
            return h.authenticated({
              credentials: { sub: 'arn:aws:iam::123456789012:role/fcp-mpdp-frontend' }
            })
          }
        }))
      }
    }
  }
}))

vi.mock('../../../../src/data/search.js')
vi.mock('../../../../src/data/payments.js')

process.env.SERVICE_AUTH_ENABLED = 'true'
process.env.CDP_JWT_JWKS_URI = 'https://test-jwks.example.com'
process.env.CDP_JWT_ISSUER = 'https://test-issuer.example.com'

const { getPaymentData, getSearchSuggestions } = await import('../../../../src/data/search.js')
const { getAllPaymentsCsvStream, getPaymentsCsv } = await import('../../../../src/data/payments.js')
const { createServer } = await import('../../../../src/server.js')

getPaymentData.mockResolvedValue('payment data')
getSearchSuggestions.mockResolvedValue({ rows: [{ payee_name: 'Test Farm' }] })
getAllPaymentsCsvStream.mockReturnValue(null)
getPaymentsCsv.mockResolvedValue('')

let server

describe('service-auth - auth enabled', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    getPaymentData.mockResolvedValue('payment data')
    getSearchSuggestions.mockResolvedValue({ rows: [{ payee_name: 'Test Farm' }] })
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('GET /health should return 200 without an auth token', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    })
    expect(response.statusCode).toBe(200)
  })

  test('POST /v1/payments should return 401 without an auth token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString: 'test',
        limit: 10,
        offset: 0,
        sortBy: 'score'
      }
    })
    expect(response.statusCode).toBe(401)
  })

  test('POST /v1/payments should return 200 with a valid bearer token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString: 'test',
        limit: 10,
        offset: 0,
        sortBy: 'score'
      },
      headers: { authorization: 'Bearer valid-test-token' }
    })
    expect(response.statusCode).toBe(200)
  })

  test('GET /v1/payments/search should return 401 without an auth token', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/payments/search?searchString=test'
    })
    expect(response.statusCode).toBe(401)
  })

  test('GET /v1/payments/search should return 200 with a valid bearer token', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/v1/payments/search?searchString=test',
      headers: { authorization: 'Bearer valid-test-token' }
    })
    expect(response.statusCode).toBe(200)
  })
})
