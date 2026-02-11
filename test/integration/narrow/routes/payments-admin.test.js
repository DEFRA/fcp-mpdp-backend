import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import { Readable } from 'stream'

vi.mock('../../../../src/data/database.js', () => {
  return {
    createModels: vi.fn(),
    healthCheck: vi.fn()
  }
})

vi.mock('../../../../src/data/payments-admin.js')

const {
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getAllPaymentsForAdmin,
  searchPaymentsForAdmin,
  deletePaymentsByYear,
  getFinancialYears,
  bulkUploadPayments,
  bulkSetPublishedDate
} = await import('../../../../src/data/payments-admin.js')

const { createServer } = await import('../../../../src/server.js')

let server

describe('payments admin routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('GET /v1/payments/admin/payments', () => {
    test('should return 200 with paginated payments', async () => {
      getAllPaymentsForAdmin.mockResolvedValue({
        count: 100,
        rows: [
          { id: 1, payee_name: 'Test Payee 1', amount: 1000 },
          { id: 2, payee_name: 'Test Payee 2', amount: 2000 }
        ],
        page: 1,
        totalPages: 5
      })

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/payments?page=1&limit=20'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(getAllPaymentsForAdmin).toHaveBeenCalledWith(1, 20)
      expect(JSON.parse(response.payload)).toMatchObject({
        count: 100,
        totalPages: 5
      })
    })

    test('should handle search parameter', async () => {
      searchPaymentsForAdmin.mockResolvedValue({
        count: 10,
        rows: [{ id: 1, payee_name: 'John Smith' }],
        page: 1,
        totalPages: 1
      })

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/payments?searchString=John'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(searchPaymentsForAdmin).toHaveBeenCalledWith('John', 1, 20)
    })

    test('should use default page and limit if not provided', async () => {
      getAllPaymentsForAdmin.mockResolvedValue({
        count: 0,
        rows: [],
        page: 1,
        totalPages: 0
      })

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/payments'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(getAllPaymentsForAdmin).toHaveBeenCalledWith(1, 20)
    })
  })

  describe('GET /v1/payments/admin/payments/{id}', () => {
    test('should return 200 with payment data', async () => {
      const mockPayment = {
        id: 1,
        payee_name: 'Test Payee',
        part_postcode: 'SW1A',
        amount: 1000
      }
      getPaymentById.mockResolvedValue(mockPayment)

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/payments/1'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(getPaymentById).toHaveBeenCalledWith(1)
      expect(JSON.parse(response.payload)).toEqual(mockPayment)
    })

    test('should return 404 if payment not found', async () => {
      getPaymentById.mockResolvedValue(null)

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/payments/999'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(404)
    })

    test('should return 400 for invalid id', async () => {
      const options = {
        method: 'GET',
        url: '/v1/payments/admin/payments/invalid'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /v1/payments/admin/payments', () => {
    test('should return 201 with created payment', async () => {
      const paymentData = {
        payee_name: 'Test Payee',
        part_postcode: 'SW1A',
        town: 'London',
        amount: 1000,
        financial_year: '23/24'
      }
      const createdPayment = { id: 1, ...paymentData }
      createPayment.mockResolvedValue(createdPayment)

      const options = {
        method: 'POST',
        url: '/v1/payments/admin/payments',
        payload: paymentData
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(201)
      expect(createPayment).toHaveBeenCalledWith(paymentData)
      expect(JSON.parse(response.payload)).toEqual(createdPayment)
    })

    test('should return 400 for missing required fields', async () => {
      const options = {
        method: 'POST',
        url: '/v1/payments/admin/payments',
        payload: {
          payee_name: 'Test'
          // Missing required fields
        }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(400)
    })

    test('should return 400 for invalid amount', async () => {
      const options = {
        method: 'POST',
        url: '/v1/payments/admin/payments',
        payload: {
          payee_name: 'Test Payee',
          part_postcode: 'SW1A',
          amount: 'invalid',
          financial_year: '23/24'
        }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(400)
    })
  })

  describe('PUT /v1/payments/admin/payments/{id}', () => {
    test('should return 200 with updated payment', async () => {
      const paymentData = {
        payee_name: 'Updated Payee',
        part_postcode: 'SW1A',
        amount: 2000,
        financial_year: '23/24'
      }
      const updatedPayment = { id: 1, ...paymentData }
      updatePayment.mockResolvedValue(updatedPayment)

      const options = {
        method: 'PUT',
        url: '/v1/payments/admin/payments/1',
        payload: paymentData
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(updatePayment).toHaveBeenCalledWith(1, paymentData)
      expect(JSON.parse(response.payload)).toEqual(updatedPayment)
    })

    test('should return 404 if payment not found', async () => {
      updatePayment.mockResolvedValue(null)

      const options = {
        method: 'PUT',
        url: '/v1/payments/admin/payments/999',
        payload: {
          payee_name: 'Test',
          part_postcode: 'SW1A',
          amount: 1000,
          financial_year: '23/24'
        }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(404)
    })
  })

  describe('DELETE /v1/payments/admin/payments/{id}', () => {
    test('should return 200 on successful deletion', async () => {
      deletePayment.mockResolvedValue({ deleted: true })

      const options = {
        method: 'DELETE',
        url: '/v1/payments/admin/payments/1'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(deletePayment).toHaveBeenCalledWith(1)
      expect(JSON.parse(response.payload)).toEqual({ deleted: true })
    })

    test('should return 404 if payment not found', async () => {
      deletePayment.mockResolvedValue(null)

      const options = {
        method: 'DELETE',
        url: '/v1/payments/admin/payments/999'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(404)
    })
  })

  describe('GET /v1/payments/admin/financial-years', () => {
    test('should return 200 with list of financial years', async () => {
      const mockYears = ['23/24', '22/23', '21/22']
      getFinancialYears.mockResolvedValue(mockYears)

      const options = {
        method: 'GET',
        url: '/v1/payments/admin/financial-years'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(getFinancialYears).toHaveBeenCalled()
      expect(JSON.parse(response.payload)).toEqual(mockYears)
    })
  })

  describe('DELETE /v1/payments/admin/payments/year/{financialYear}', () => {
    test('should return 200 with deletion counts', async () => {
      const mockResult = {
        deleted: true,
        paymentCount: 50,
        schemeCount: 5
      }
      deletePaymentsByYear.mockResolvedValue(mockResult)

      const options = {
        method: 'DELETE',
        url: '/v1/payments/admin/payments/year/23%2F24'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(deletePaymentsByYear).toHaveBeenCalledWith('23/24')
      expect(JSON.parse(response.payload)).toEqual(mockResult)
    })

    test('should handle URL-encoded financial year', async () => {
      deletePaymentsByYear.mockResolvedValue({
        deleted: true,
        paymentCount: 10,
        schemeCount: 2
      })

      const options = {
        method: 'DELETE',
        url: '/v1/payments/admin/payments/year/22%2F23'
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(deletePaymentsByYear).toHaveBeenCalledWith('22/23')
    })
  })

  describe('POST /v1/payments/admin/payments/bulk-upload', () => {
    test('should return 201 with import results', async () => {
      const mockResult = {
        success: true,
        imported: 10,
        errors: []
      }
      bulkUploadPayments.mockResolvedValue(mockResult)

      const csvData = 'payee_name,part_postcode,amount,financial_year\nTest,SW1A,1000,23/24'
      const stream = Readable.from([csvData])

      const options = {
        method: 'POST',
        url: '/v1/payments/admin/payments/bulk-upload',
        payload: stream,
        headers: {
          'content-type': 'text/csv'
        }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(201)
      expect(bulkUploadPayments).toHaveBeenCalled()
      expect(JSON.parse(response.payload)).toEqual(mockResult)
    })

    test('should return 400 on upload error', async () => {
      bulkUploadPayments.mockRejectedValue(new Error('Invalid CSV format'))

      const csvData = 'invalid,csv,data'
      const stream = Readable.from([csvData])

      const options = {
        method: 'POST',
        url: '/v1/payments/admin/payments/bulk-upload',
        payload: stream,
        headers: {
          'content-type': 'text/csv'
        }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(400)
      expect(JSON.parse(response.payload)).toMatchObject({
        success: false,
        error: 'Invalid CSV format'
      })
    })
  })

  describe('PUT /v1/payments/admin/payments/year/{financialYear}/published-date', () => {
    test('should return 200 with update results', async () => {
      const mockResult = {
        updated: true,
        paymentCount: 100
      }
      bulkSetPublishedDate.mockResolvedValue(mockResult)

      const options = {
        method: 'PUT',
        url: '/v1/payments/admin/payments/year/23%2F24/published-date',
        payload: {
          published_date: '2024-01-15'
        }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(bulkSetPublishedDate).toHaveBeenCalledWith('23/24', new Date('2024-01-15'))
      expect(JSON.parse(response.payload)).toEqual(mockResult)
    })

    test('should handle URL-encoded financial year', async () => {
      bulkSetPublishedDate.mockResolvedValue({
        updated: true,
        paymentCount: 50
      })

      const options = {
        method: 'PUT',
        url: '/v1/payments/admin/payments/year/22%2F23/published-date',
        payload: {
          published_date: '2023-12-01'
        }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(200)
      expect(bulkSetPublishedDate).toHaveBeenCalledWith('22/23', new Date('2023-12-01'))
    })

    test('should return 400 for invalid date', async () => {
      const options = {
        method: 'PUT',
        url: '/v1/payments/admin/payments/year/23%2F24/published-date',
        payload: {
          published_date: 'invalid-date'
        }
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(400)
    })

    test('should return 400 for missing published_date', async () => {
      const options = {
        method: 'PUT',
        url: '/v1/payments/admin/payments/year/23%2F24/published-date',
        payload: {}
      }

      const response = await server.inject(options)
      expect(response.statusCode).toBe(400)
    })
  })
})
