import { describe, test, beforeEach, vi, expect } from 'vitest'

vi.mock('../../../src/data/database.js', () => ({
  models: {
    PaymentDetail: {}
  }
}))

vi.mock('../../../src/data/search.js', () => ({
  invalidateSearchCache: vi.fn()
}))

const { models } = await import('../../../src/data/database.js')
const { invalidateSearchCache } = await import('../../../src/data/search.js')

const {
  createPayment,
  updatePayment,
  deletePayment,
  deletePaymentsByYear,
  deletePaymentsByPublishedDate,
  bulkSetPublishedDate,
  bulkUploadPayments
} = await import('../../../src/data/payments-admin.js')

describe('payments-admin cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPayment', () => {
    test('should invalidate search cache after creating payment', async () => {
      const mockPayment = { id: 1, payee_name: 'New Payee', amount: 1000 }
      models.PaymentDetail.create = vi.fn().mockResolvedValue(mockPayment)

      const result = await createPayment({ payee_name: 'New Payee', amount: 1000 })

      expect(models.PaymentDetail.create).toHaveBeenCalled()
      expect(invalidateSearchCache).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockPayment)
    })

    test('should not invalidate cache if creation fails', async () => {
      models.PaymentDetail.create = vi.fn().mockRejectedValue(new Error('Creation failed'))

      await expect(createPayment({ payee_name: 'Bad Data' })).rejects.toThrow('Creation failed')
      expect(invalidateSearchCache).not.toHaveBeenCalled()
    })
  })

  describe('updatePayment', () => {
    test('should invalidate search cache after updating payment', async () => {
      const mockPayment = {
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockReturnValue({ id: 1, payee_name: 'Updated Payee' })
      }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPayment)

      const result = await updatePayment(1, { payee_name: 'Updated Payee' })

      expect(mockPayment.update).toHaveBeenCalled()
      expect(invalidateSearchCache).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ id: 1, payee_name: 'Updated Payee' })
    })

    test('should not invalidate cache if payment not found', async () => {
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(null)

      const result = await updatePayment(999, { payee_name: 'Non-existent' })

      expect(result).toBeNull()
      expect(invalidateSearchCache).not.toHaveBeenCalled()
    })

    test('should not invalidate cache if update fails', async () => {
      const mockPayment = {
        update: vi.fn().mockRejectedValue(new Error('Update failed'))
      }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPayment)

      await expect(updatePayment(1, { payee_name: 'Bad Update' })).rejects.toThrow('Update failed')
      expect(invalidateSearchCache).not.toHaveBeenCalled()
    })
  })

  describe('deletePayment', () => {
    test('should invalidate search cache after deleting payment', async () => {
      const mockPayment = {
        destroy: vi.fn().mockResolvedValue(undefined)
      }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPayment)

      const result = await deletePayment(1)

      expect(mockPayment.destroy).toHaveBeenCalled()
      expect(invalidateSearchCache).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ deleted: true })
    })

    test('should not invalidate cache if payment not found', async () => {
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(null)

      const result = await deletePayment(999)

      expect(result).toBeNull()
      expect(invalidateSearchCache).not.toHaveBeenCalled()
    })

    test('should not invalidate cache if deletion fails', async () => {
      const mockPayment = {
        destroy: vi.fn().mockRejectedValue(new Error('Deletion failed'))
      }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPayment)

      await expect(deletePayment(1)).rejects.toThrow('Deletion failed')
      expect(invalidateSearchCache).not.toHaveBeenCalled()
    })
  })

  describe('deletePaymentsByYear', () => {
    test('should invalidate search cache after bulk delete by year', async () => {
      models.PaymentDetail.count = vi.fn().mockResolvedValue(10)
      models.PaymentDetail.destroy = vi.fn().mockResolvedValue(10)
      models.SchemePayments = {
        count: vi.fn().mockResolvedValue(3),
        destroy: vi.fn().mockResolvedValue(3)
      }

      const result = await deletePaymentsByYear('20/21')

      expect(models.PaymentDetail.destroy).toHaveBeenCalled()
      expect(models.SchemePayments.destroy).toHaveBeenCalled()
      expect(invalidateSearchCache).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        deleted: true,
        paymentCount: 10,
        schemeCount: 3
      })
    })
  })

  describe('deletePaymentsByPublishedDate', () => {
    test('should invalidate search cache after bulk delete by published date', async () => {
      const mockOp = { lte: 'mock-op' }
      models.PaymentDetail.count = vi.fn().mockResolvedValue(5)
      models.PaymentDetail.destroy = vi.fn().mockResolvedValue(5)
      models.PaymentDetail.sequelize = {
        Sequelize: {
          Op: mockOp
        }
      }

      const result = await deletePaymentsByPublishedDate(new Date('2024-01-01'))

      expect(models.PaymentDetail.destroy).toHaveBeenCalled()
      expect(invalidateSearchCache).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        deleted: true,
        paymentCount: 5
      })
    })
  })

  describe('bulkSetPublishedDate', () => {
    test('should invalidate search cache after bulk update', async () => {
      models.PaymentDetail.count = vi.fn().mockResolvedValue(15)
      models.PaymentDetail.update = vi.fn().mockResolvedValue([15])

      const result = await bulkSetPublishedDate('20/21', new Date('2024-01-01'))

      expect(models.PaymentDetail.update).toHaveBeenCalled()
      expect(invalidateSearchCache).toHaveBeenCalledTimes(1)
      expect(result).toEqual({
        updated: true,
        paymentCount: 15
      })
    })
  })

  describe('bulkUploadPayments', () => {
    test('should invalidate search cache after successful bulk upload', async () => {
      const { Readable } = await import('stream')

      models.PaymentDetail.bulkCreate = vi.fn().mockResolvedValue([])

      const csvData = 'payee_name,part_postcode,town,county_council,financial_year,parliamentary_constituency,scheme,scheme_detail,amount,payment_date,activity_level\nTest Payee,AB12,Bristol,Bristol,20/21,Bristol West,BPS,Scheme Detail,1000,2021-01-01,Activity\n'
      const csvStream = Readable.from([csvData])

      const result = await bulkUploadPayments(csvStream)

      expect(models.PaymentDetail.bulkCreate).toHaveBeenCalled()
      expect(invalidateSearchCache).toHaveBeenCalledTimes(1)
      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
    })

    test('should not invalidate cache if no payments to import', async () => {
      const { Readable } = await import('stream')

      models.PaymentDetail.bulkCreate = vi.fn()

      const csvData = 'payee_name,part_postcode,town,county_council,financial_year,parliamentary_constituency,scheme,scheme_detail,amount,payment_date,activity_level\n'
      const csvStream = Readable.from([csvData])

      const result = await bulkUploadPayments(csvStream)

      expect(models.PaymentDetail.bulkCreate).not.toHaveBeenCalled()
      expect(invalidateSearchCache).not.toHaveBeenCalled()
      expect(result.imported).toBe(0)
    })

    test('should not invalidate cache if bulk create fails', async () => {
      const { Readable } = await import('stream')

      models.PaymentDetail.bulkCreate = vi.fn().mockRejectedValue(new Error('Bulk create failed'))

      const csvData = 'payee_name,part_postcode,town,county_council,financial_year,parliamentary_constituency,scheme,scheme_detail,amount,payment_date,activity_level\nTest Payee,AB12,Bristol,Bristol,20/21,Bristol West,BPS,Scheme Detail,1000,2021-01-01,Activity\n'
      const csvStream = Readable.from([csvData])

      await expect(bulkUploadPayments(csvStream)).rejects.toThrow('Bulk create failed')
      expect(invalidateSearchCache).not.toHaveBeenCalled()
    })
  })

  describe('Multiple operations', () => {
    test('should invalidate cache separately for each operation', async () => {
      // Setup mock for create
      models.PaymentDetail.create = vi.fn().mockResolvedValue({ id: 1 })
      await createPayment({ payee_name: 'Test 1' })
      expect(invalidateSearchCache).toHaveBeenCalledTimes(1)

      // Setup mock for update
      const mockPayment = {
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockReturnValue({ id: 1 })
      }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPayment)
      await updatePayment(1, { payee_name: 'Test 2' })
      expect(invalidateSearchCache).toHaveBeenCalledTimes(2)

      // Setup mock for delete
      const mockPaymentForDelete = {
        destroy: vi.fn().mockResolvedValue(undefined)
      }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPaymentForDelete)
      await deletePayment(1)
      expect(invalidateSearchCache).toHaveBeenCalledTimes(3)
    })
  })
})
