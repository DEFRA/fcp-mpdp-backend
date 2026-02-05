import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('../../../../src/data/database.js', () => {
  return {
    createModels: vi.fn(),
    healthCheck: vi.fn()
  }
})

vi.mock('../../../../src/data/payments-summary-admin.js')

const {
  getAllPaymentSummaries,
  getPaymentSummaryById,
  createPaymentSummary,
  updatePaymentSummary,
  deletePaymentSummary
} = await import('../../../../src/data/payments-summary-admin.js')

const { createServer } = await import('../../../../src/server.js')

describe('Payment Summary Admin Routes', () => {
  let server

  beforeEach(async () => {
    server = await createServer()
    await server.initialize()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('GET /v1/payments/admin/summary', () => {
    test('should return all payment summaries', async () => {
      const mockSummaries = [
        { id: 1, financial_year: '2023', scheme: 'SFI', total_amount: 10000 },
        { id: 2, financial_year: '2022', scheme: 'BPS', total_amount: 15000 }
      ]

      getAllPaymentSummaries.mockResolvedValue(mockSummaries)

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/summary'
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload)).toEqual(mockSummaries)
      expect(getAllPaymentSummaries).toHaveBeenCalledTimes(1)
    })

    test('should return empty array when no summaries exist', async () => {
      getAllPaymentSummaries.mockResolvedValue([])

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/summary'
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload)).toEqual([])
    })
  })

  describe('GET /v1/payments/admin/summary/{id}', () => {
    test('should return payment summary for valid ID', async () => {
      const mockSummary = {
        id: 1,
        financial_year: '2023',
        scheme: 'SFI',
        total_amount: 10000
      }

      getPaymentSummaryById.mockResolvedValue(mockSummary)

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/summary/1'
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload)).toEqual(mockSummary)
      expect(getPaymentSummaryById).toHaveBeenCalledWith(1)
    })

    test('should return 404 for non-existent ID', async () => {
      getPaymentSummaryById.mockResolvedValue(null)

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/summary/999'
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(404)
      expect(JSON.parse(response.payload)).toEqual({ error: 'Payment summary not found' })
    })

    test('should return 400 for invalid ID', async () => {
      const options = {
        method: 'GET',
        url: '/v1/payments/admin/summary/invalid'
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /v1/payments/admin/summary', () => {
    test('should create payment summary with valid data', async () => {
      const newSummary = {
        financial_year: '2024',
        scheme: 'SFI',
        total_amount: 25000
      }

      const createdSummary = { id: 1, ...newSummary }
      createPaymentSummary.mockResolvedValue(createdSummary)

      const options = {
        method: 'POST',
        url: '/v1/payments/admin/summary',
        payload: newSummary
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(201)
      expect(JSON.parse(response.payload)).toEqual(createdSummary)
      expect(createPaymentSummary).toHaveBeenCalledWith(newSummary)
    })

    test('should return 400 for missing required fields', async () => {
      const options = {
        method: 'POST',
        url: '/v1/payments/admin/summary',
        payload: {
          financial_year: '2024'
        }
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(400)
    })

    test('should return 400 for invalid financial_year length', async () => {
      const options = {
        method: 'POST',
        url: '/v1/payments/admin/summary',
        payload: {
          financial_year: '202324252',
          scheme: 'SFI',
          total_amount: 25000
        }
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(400)
    })
  })

  describe('PUT /v1/payments/admin/summary/{id}', () => {
    test('should update payment summary with valid data', async () => {
      const updateData = {
        total_amount: 12000
      }

      const updatedSummary = {
        id: 1,
        financial_year: '2023',
        scheme: 'SFI',
        total_amount: 12000
      }

      updatePaymentSummary.mockResolvedValue(updatedSummary)

      const options = {
        method: 'PUT',
        url: '/v1/payments/admin/summary/1',
        payload: updateData
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(200)
      expect(JSON.parse(response.payload)).toEqual(updatedSummary)
      expect(updatePaymentSummary).toHaveBeenCalledWith(1, updateData)
    })

    test('should return 404 for non-existent ID', async () => {
      updatePaymentSummary.mockResolvedValue(null)

      const options = {
        method: 'PUT',
        url: '/v1/payments/admin/summary/999',
        payload: { total_amount: 5000 }
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(404)
      expect(JSON.parse(response.payload)).toEqual({ error: 'Payment summary not found' })
    })
  })

  describe('DELETE /v1/payments/admin/summary/{id}', () => {
    test('should delete payment summary for valid ID', async () => {
      deletePaymentSummary.mockResolvedValue({ deleted: true })

      const options = {
        method: 'DELETE',
        url: '/v1/payments/admin/summary/1'
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(200)
      expect(deletePaymentSummary).toHaveBeenCalledWith(1)
    })

    test('should return 404 for non-existent ID', async () => {
      deletePaymentSummary.mockResolvedValue(null)

      const options = {
        method: 'DELETE',
        url: '/v1/payments/admin/summary/999'
      }

      const response = await server.inject(options)

      expect(response.statusCode).toBe(404)
      expect(JSON.parse(response.payload)).toEqual({ error: 'Payment summary not found' })
    })
  })
})
