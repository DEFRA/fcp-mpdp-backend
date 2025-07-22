import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

vi.mock('../../../../src/data/database.js', () => {
  const mockSequelize = {
    authenticate: vi.fn().mockResolvedValue()
  }
  return {
    register: vi.fn(() => mockSequelize)
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
})
