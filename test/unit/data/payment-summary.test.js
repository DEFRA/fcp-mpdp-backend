import { describe, test, expect, beforeEach, vi } from 'vitest'

vi.mock('../../../src/data/database.js', () => ({
  models: {
    SchemePayments: {
      findAll: vi.fn(),
      findByPk: vi.fn(),
      create: vi.fn(),
      destroy: vi.fn()
    }
  }
}))

const { models } = await import('../../../src/data/database.js')

const {
  getAllPaymentSummaries,
  getPaymentSummaryById,
  createPaymentSummary,
  updatePaymentSummary,
  deletePaymentSummary
} = await import('../../../src/data/payment-summary.js')

describe('Payment Summary Data Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllPaymentSummaries', () => {
    test('should return all payment summaries ordered by financial_year DESC and scheme ASC', async () => {
      const mockSummaries = [
        { id: 1, financial_year: '2023', scheme: 'SFI', total_amount: 10000 },
        { id: 2, financial_year: '2023', scheme: 'CS', total_amount: 20000 },
        { id: 3, financial_year: '2022', scheme: 'BPS', total_amount: 15000 }
      ]

      models.SchemePayments.findAll.mockResolvedValue(mockSummaries)

      const result = await getAllPaymentSummaries()

      expect(models.SchemePayments.findAll).toHaveBeenCalledWith({
        order: [['financial_year', 'DESC'], ['scheme', 'ASC']]
      })
      expect(result).toEqual(mockSummaries)
    })

    test('should return empty array when no summaries exist', async () => {
      models.SchemePayments.findAll.mockResolvedValue([])

      const result = await getAllPaymentSummaries()

      expect(result).toEqual([])
    })
  })

  describe('getPaymentSummaryById', () => {
    test('should return payment summary for valid ID', async () => {
      const mockSummary = {
        id: 1,
        financial_year: '2023',
        scheme: 'SFI',
        total_amount: 10000
      }

      models.SchemePayments.findByPk.mockResolvedValue(mockSummary)

      const result = await getPaymentSummaryById(1)

      expect(models.SchemePayments.findByPk).toHaveBeenCalledWith(1)
      expect(result).toEqual(mockSummary)
    })

    test('should return null for non-existent ID', async () => {
      models.SchemePayments.findByPk.mockResolvedValue(null)

      const result = await getPaymentSummaryById(999)

      expect(result).toBeNull()
    })
  })

  describe('createPaymentSummary', () => {
    test('should create payment summary with valid data', async () => {
      const newSummary = {
        financial_year: '2024',
        scheme: 'SFI',
        total_amount: 25000
      }

      const mockCreated = { id: 1, ...newSummary }
      models.SchemePayments.create.mockResolvedValue(mockCreated)

      const result = await createPaymentSummary(newSummary)

      expect(models.SchemePayments.create).toHaveBeenCalledWith(newSummary)
      expect(result).toEqual(mockCreated)
    })
  })

  describe('updatePaymentSummary', () => {
    test('should update existing payment summary', async () => {
      const existingSummary = {
        id: 1,
        financial_year: '2023',
        scheme: 'SFI',
        total_amount: 10000,
        update: vi.fn()
      }

      const updateData = {
        total_amount: 12000
      }

      existingSummary.update.mockResolvedValue({
        ...existingSummary,
        ...updateData
      })

      models.SchemePayments.findByPk.mockResolvedValue(existingSummary)

      const result = await updatePaymentSummary(1, updateData)

      expect(models.SchemePayments.findByPk).toHaveBeenCalledWith(1)
      expect(existingSummary.update).toHaveBeenCalledWith(updateData)
      expect(result.total_amount).toBe(12000)
    })

    test('should return null when updating non-existent summary', async () => {
      models.SchemePayments.findByPk.mockResolvedValue(null)

      const result = await updatePaymentSummary(999, { total_amount: 5000 })

      expect(result).toBeNull()
    })
  })

  describe('deletePaymentSummary', () => {
    test('should delete existing payment summary', async () => {
      const mockSummary = {
        id: 1,
        financial_year: '2023',
        scheme: 'SFI',
        total_amount: 10000,
        destroy: vi.fn()
      }

      models.SchemePayments.findByPk.mockResolvedValue(mockSummary)

      const result = await deletePaymentSummary(1)

      expect(models.SchemePayments.findByPk).toHaveBeenCalledWith(1)
      expect(mockSummary.destroy).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ deleted: true })
    })

    test('should return null when deleting non-existent summary', async () => {
      models.SchemePayments.findByPk.mockResolvedValue(null)

      const result = await deletePaymentSummary(999)

      expect(result).toBeNull()
    })
  })
})
