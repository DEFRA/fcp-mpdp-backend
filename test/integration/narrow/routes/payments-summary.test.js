import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

vi.mock('../../../../src/data/database.js', () => {
  return {
    createModels: vi.fn(),
    healthCheck: vi.fn()
  }
})

vi.mock('../../../../src/data/summary.js')

const { getPaymentSummary, getPaymentSummaryCsv } = await import('../../../../src/data/summary.js')
const { createServer } = await import('../../../../src/server.js')

getPaymentSummary.mockResolvedValue('payments summary')
getPaymentSummaryCsv.mockResolvedValue('payments,summary,csv')

let server

describe('payments-summary routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('GET /v1/payments/summary should return 200', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/summary'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  test('GET /v1/payments/summary should return payments summary', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/summary'
    }
    const response = await server.inject(options)
    expect(response.payload).toBe('payments summary')
  })

  test('GET /v1/payments/summary/file should return 200', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/summary/file'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  test('GET /v1/payments/summary/file should return payments summary csv', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/summary/file'
    }
    const response = await server.inject(options)
    expect(response.payload).toBe('payments,summary,csv')
  })

  test('GET /v1/payments/summary/file should return csv file', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/summary/file'
    }
    const response = await server.inject(options)
    expect(response.headers['content-type']).toBe('text/csv; charset=utf-8')
  })

  test('GET /v1/payments/summary/file should return csv file attachment', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/summary/file'
    }
    const response = await server.inject(options)
    expect(response.headers['content-disposition']).toBe('attachment;filename=ffc-payments-by-year.csv')
  })
})
