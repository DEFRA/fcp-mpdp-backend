import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

vi.mock('../../../../src/data/database.js', () => {
  const mockSequelize = {
    authenticate: vi.fn().mockResolvedValue()
  }
  return {
    register: vi.fn(() => mockSequelize)
  }
})

const { createServer } = await import('../../../../src/server.js')

let server

describe('health routes', () => {
  beforeEach(async () => {
    vi.resetAllMocks()
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('GET /health should return 200', async () => {
    const options = {
      method: 'GET',
      url: '/health'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  test('GET /health should return "ok" response', async () => {
    const options = {
      method: 'GET',
      url: '/health'
    }
    const response = await server.inject(options)
    expect(JSON.parse(response.payload).message).toBe('success')
  })
})
