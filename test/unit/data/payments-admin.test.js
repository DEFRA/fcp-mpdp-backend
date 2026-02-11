import { expect, test, describe, beforeEach, vi } from 'vitest'
import { Readable } from 'stream'

vi.mock('../../../src/data/database.js', () => ({
  models: {
    PaymentDetail: {},
    SchemePayments: {}
  }
}))

const { models } = await import('../../../src/data/database.js')

const {
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getAllPaymentsForAdmin,
  searchPaymentsForAdmin,
  deletePaymentsByYear,
  getFinancialYears,
  bulkUploadPayments
} = await import('../../../src/data/payments-admin.js')

describe('admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPaymentById', () => {
    test('should return payment by id', async () => {
      const mockPayment = { id: 1, payee_name: 'Test Payee', amount: 1000 }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPayment)

      const result = await getPaymentById(1)

      expect(models.PaymentDetail.findByPk).toHaveBeenCalledWith(1, { raw: true })
      expect(result).toEqual(mockPayment)
    })
  })

  describe('createPayment', () => {
    test('should create a new payment', async () => {
      const paymentData = { payee_name: 'Test Payee', amount: 1000 }
      const mockPayment = { id: 1, ...paymentData }
      models.PaymentDetail.create = vi.fn().mockResolvedValue(mockPayment)

      const result = await createPayment(paymentData)

      expect(models.PaymentDetail.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...paymentData,
          published_date: expect.any(Date)
        })
      )
      expect(result).toEqual(mockPayment)
    })

    test('should set published_date to current date', async () => {
      const paymentData = { payee_name: 'Test Payee', amount: 1000 }
      const mockPayment = { id: 1, ...paymentData }
      models.PaymentDetail.create = vi.fn().mockResolvedValue(mockPayment)

      const beforeCreate = new Date()
      await createPayment(paymentData)
      const afterCreate = new Date()

      const createCall = models.PaymentDetail.create.mock.calls[0][0]
      expect(createCall.published_date).toBeInstanceOf(Date)
      expect(createCall.published_date.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(createCall.published_date.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
    })
  })

  describe('updatePayment', () => {
    test('should update an existing payment', async () => {
      const paymentData = { payee_name: 'Updated Payee', amount: 2000 }
      const mockPayment = {
        id: 1,
        payee_name: 'Test Payee',
        amount: 1000,
        update: vi.fn().mockResolvedValue(undefined),
        get: vi.fn().mockReturnValue({ id: 1, ...paymentData })
      }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPayment)

      const result = await updatePayment(1, paymentData)

      expect(models.PaymentDetail.findByPk).toHaveBeenCalledWith(1)
      expect(mockPayment.update).toHaveBeenCalledWith(paymentData)
      expect(mockPayment.get).toHaveBeenCalledWith({ plain: true })
      expect(result).toEqual({ id: 1, ...paymentData })
    })

    test('should return null if payment not found', async () => {
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(null)

      const result = await updatePayment(999, { payee_name: 'Test' })

      expect(result).toBeNull()
    })
  })

  describe('deletePayment', () => {
    test('should delete a payment', async () => {
      const mockPayment = {
        id: 1,
        destroy: vi.fn().mockResolvedValue(undefined)
      }
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(mockPayment)

      const result = await deletePayment(1)

      expect(models.PaymentDetail.findByPk).toHaveBeenCalledWith(1)
      expect(mockPayment.destroy).toHaveBeenCalled()
      expect(result).toEqual({ deleted: true })
    })

    test('should return null if payment not found', async () => {
      models.PaymentDetail.findByPk = vi.fn().mockResolvedValue(null)

      const result = await deletePayment(999)

      expect(result).toBeNull()
    })
  })

  describe('getAllPaymentsForAdmin', () => {
    test('should return paginated payments', async () => {
      const mockPayments = {
        count: 50,
        rows: [
          { id: 1, payee_name: 'Test 1' },
          { id: 2, payee_name: 'Test 2' }
        ]
      }
      models.PaymentDetail.findAndCountAll = vi.fn().mockResolvedValue(mockPayments)

      const result = await getAllPaymentsForAdmin(2, 20)

      expect(models.PaymentDetail.findAndCountAll).toHaveBeenCalledWith({
        limit: 20,
        offset: 20,
        order: [['id', 'DESC']],
        raw: true
      })
      expect(result).toEqual({
        count: 50,
        rows: mockPayments.rows,
        page: 2,
        totalPages: 3
      })
    })
  })

  describe('searchPaymentsForAdmin', () => {
    test('should search payments by payee name', async () => {
      const mockPayments = {
        count: 10,
        rows: [{ id: 1, payee_name: 'John Smith' }]
      }
      models.PaymentDetail.findAndCountAll = vi.fn().mockResolvedValue(mockPayments)
      models.PaymentDetail.sequelize = {
        Sequelize: {
          Op: { iLike: Symbol('iLike') }
        }
      }

      const result = await searchPaymentsForAdmin('John', 1, 20)

      expect(models.PaymentDetail.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            payee_name: expect.any(Object)
          }),
          limit: 20,
          offset: 0,
          order: [['id', 'DESC']],
          raw: true
        })
      )
      expect(result.count).toBe(10)
      expect(result.rows).toEqual(mockPayments.rows)
    })

    test('should return all payments when search string is empty', async () => {
      const mockPayments = {
        count: 100,
        rows: [{ id: 1 }, { id: 2 }]
      }
      models.PaymentDetail.findAndCountAll = vi.fn().mockResolvedValue(mockPayments)

      const result = await searchPaymentsForAdmin('', 1, 20)

      expect(models.PaymentDetail.findAndCountAll).toHaveBeenCalledWith({
        where: {},
        limit: 20,
        offset: 0,
        order: [['id', 'DESC']],
        raw: true
      })
      expect(result.count).toBe(100)
    })
  })

  describe('deletePaymentsByYear', () => {
    test('should delete all payments for a financial year', async () => {
      models.PaymentDetail.count = vi.fn().mockResolvedValue(50)
      models.SchemePayments.count = vi.fn().mockResolvedValue(5)
      models.PaymentDetail.destroy = vi.fn().mockResolvedValue(50)
      models.SchemePayments.destroy = vi.fn().mockResolvedValue(5)

      const result = await deletePaymentsByYear('23/24')

      expect(models.PaymentDetail.count).toHaveBeenCalledWith({
        where: { financial_year: '23/24' }
      })
      expect(models.SchemePayments.count).toHaveBeenCalledWith({
        where: { financial_year: '23/24' }
      })
      expect(models.PaymentDetail.destroy).toHaveBeenCalledWith({
        where: { financial_year: '23/24' }
      })
      expect(models.SchemePayments.destroy).toHaveBeenCalledWith({
        where: { financial_year: '23/24' }
      })
      expect(result).toEqual({
        deleted: true,
        paymentCount: 50,
        schemeCount: 5
      })
    })
  })

  describe('getFinancialYears', () => {
    test('should return distinct financial years', async () => {
      const mockYears = [
        { financial_year: '23/24' },
        { financial_year: '22/23' },
        { financial_year: '21/22' }
      ]
      models.PaymentDetail.findAll = vi.fn().mockResolvedValue(mockYears)

      const result = await getFinancialYears()

      expect(models.PaymentDetail.findAll).toHaveBeenCalledWith({
        attributes: ['financial_year'],
        group: ['financial_year'],
        raw: true,
        order: [['financial_year', 'DESC']]
      })
      expect(result).toEqual(['23/24', '22/23', '21/22'])
    })

    test('should filter out null values', async () => {
      const mockYears = [
        { financial_year: '23/24' },
        { financial_year: null },
        { financial_year: '22/23' }
      ]
      models.PaymentDetail.findAll = vi.fn().mockResolvedValue(mockYears)

      const result = await getFinancialYears()

      expect(result).toEqual(['23/24', '22/23'])
    })
  })

  describe('bulkUploadPayments', () => {
    test('should import payments from CSV stream', async () => {
      const csvData = `payee_name,part_postcode,town,parliamentary_constituency,county_council,scheme,amount,financial_year,payment_date,scheme_detail,activity_level
John Smith,SW1A,London,Westminster,Greater London,SFI,5000.50,23/24,2023-03-15,Grassland,Standard
Jane Doe,NE1,Newcastle,Newcastle Central,Tyne and Wear,CS,12500.00,23/24,2023-06-20,Hedgerow,Higher`

      const stream = Readable.from([csvData])
      models.PaymentDetail.bulkCreate = vi.fn().mockResolvedValue([])

      const result = await bulkUploadPayments(stream)

      expect(models.PaymentDetail.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            payee_name: 'John Smith',
            part_postcode: 'SW1A',
            amount: 5000.50,
            financial_year: '23/24',
            published_date: expect.any(Date)
          }),
          expect.objectContaining({
            payee_name: 'Jane Doe',
            part_postcode: 'NE1',
            amount: 12500.00,
            financial_year: '23/24',
            published_date: expect.any(Date)
          })
        ]),
        { validate: true }
      )
      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(result.errors).toEqual([])
    })

    test('should set published_date on all imported payments', async () => {
      const csvData = `payee_name,part_postcode,town,parliamentary_constituency,county_council,scheme,amount,financial_year,payment_date,scheme_detail,activity_level
Test Payee,SW1,London,Westminster,Greater London,BPS,1000.00,23/24,2024-01-01,Scheme Detail,Farm`

      const stream = Readable.from([csvData])
      models.PaymentDetail.bulkCreate = vi.fn().mockResolvedValue([])

      const beforeUpload = new Date()
      await bulkUploadPayments(stream)
      const afterUpload = new Date()

      const paymentsCreated = models.PaymentDetail.bulkCreate.mock.calls[0][0]
      expect(paymentsCreated).toHaveLength(1)
      expect(paymentsCreated[0].published_date).toBeInstanceOf(Date)
      expect(paymentsCreated[0].published_date.getTime()).toBeGreaterThanOrEqual(beforeUpload.getTime())
      expect(paymentsCreated[0].published_date.getTime()).toBeLessThanOrEqual(afterUpload.getTime())
    })

    test('should handle CSV with invalid data', async () => {
      const csvData = `payee_name,part_postcode,town,parliamentary_constituency,county_council,scheme,amount,financial_year,payment_date,scheme_detail,activity_level
Test Payee,SW1,London,Westminster,Greater London,BPS,not_a_number,23/24,2024-01-01,Scheme Detail,Farm`

      const stream = Readable.from([csvData])
      models.PaymentDetail.bulkCreate = vi.fn().mockResolvedValue([])

      const result = await bulkUploadPayments(stream)

      // Amount becomes NaN but parsing doesn't fail
      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)
      expect(models.PaymentDetail.bulkCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            payee_name: 'Test Payee',
            amount: NaN,
            published_date: expect.any(Date)
          })
        ]),
        { validate: true }
      )
    })
  })
})
