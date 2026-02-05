import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'
import {
  models,
  getAnnualPayments,
  getPayeePayments,
  getAllPayments,
  getAllPaymentsByPage
} from '../../../src/data/database.js'
import { createServer } from '../../../src/server.js'

describe('database', () => {
  let server

  beforeEach(async () => {
    vi.clearAllMocks()
    server = await createServer()
    await server.initialize()

    await models.PaymentDetail.truncate()
    await models.PaymentDetail.bulkCreate([
      { id: 1, payee_name: 'payee name 1', part_postcode: 'pp1', town: 'town', county_council: 'county council', financial_year: '20/21', parliamentary_constituency: 'parliamentary constituency', scheme: 'scheme 1', scheme_detail: 'scheme detail 1', amount: 100 },
      { id: 2, payee_name: 'payee name 1', part_postcode: 'pp1', town: 'town', county_council: 'county council', financial_year: '20/21', parliamentary_constituency: 'parliamentary constituency', scheme: 'scheme 1', scheme_detail: 'scheme detail 1', amount: 100 },
      { id: 3, payee_name: 'payee name 1', part_postcode: 'pp1', town: 'town', county_council: 'county council', financial_year: '20/21', parliamentary_constituency: 'parliamentary constituency', scheme: 'scheme 2', scheme_detail: 'scheme detail 1', amount: 100 },
      { id: 4, payee_name: 'payee name 2', part_postcode: 'pp2', town: 'town', county_council: 'county council', financial_year: '20/21', parliamentary_constituency: 'parliamentary constituency', scheme: 'scheme 1', scheme_detail: 'scheme detail 1', amount: 100 }
    ])
  })

  afterEach(async () => {
    await server.stop()
  })

  describe('SchemePayments', () => {
    test('should return a sequelize model for aggregate_scheme_payments table', () => {
      expect(models.SchemePayments).toBeInstanceOf(Function)
      expect(models.SchemePayments.name).toBe('aggregate_scheme_payments')
    })

    test('should include id, financial_year, scheme and total_amount fields', () => {
      const fields = Object.keys(models.SchemePayments.tableAttributes)
      expect(fields).toEqual(['id', 'financial_year', 'scheme', 'total_amount'])
    })
  })

  describe('PaymentData', () => {
    test('should return a sequelize model for payment_activity_data table', () => {
      expect(models.PaymentData).toBeInstanceOf(Function)
      expect(models.PaymentData.name).toBe('payment_activity_data')
    })

    test('should include id, payee_name, part_postcode, town, county_council and amount fields', () => {
      const fields = Object.keys(models.PaymentData.tableAttributes)
      expect(fields).toEqual(['id', 'payee_name', 'part_postcode', 'town', 'county_council', 'amount'])
    })
  })

  describe('PaymentDetail', () => {
    test('should return a sequelize model for payment_activity_data table', () => {
      expect(models.PaymentDetail).toBeInstanceOf(Function)
      expect(models.PaymentDetail.name).toBe('payment_activity_data')
    })

    test('should include id, payee_name, part_postcode, town, county_council, financial_year, parliamentary_constituency, scheme, scheme_detail, amount, payment_date and activity_level fields', () => {
      const fields = Object.keys(models.PaymentDetail.tableAttributes)
      expect(fields).toEqual(['id', 'payee_name', 'part_postcode', 'town', 'county_council', 'financial_year', 'parliamentary_constituency', 'scheme', 'scheme_detail', 'amount', 'payment_date', 'activity_level'])
    })
  })

  describe('getAnnualPayments', () => {
    beforeEach(async () => {
      await models.SchemePayments.truncate()
      await models.SchemePayments.bulkCreate([
        { id: 1, scheme: 'scheme 1', financial_year: '20/21', total_amount: 100 },
        { id: 2, scheme: 'scheme 2', financial_year: '20/21', total_amount: 200 }
      ])
    })

    test('should return all annual payments', async () => {
      const data = await getAnnualPayments()
      expect(data).toEqual([
        { scheme: 'scheme 1', financial_year: '20/21', total_amount: '100.00' },
        { scheme: 'scheme 2', financial_year: '20/21', total_amount: '200.00' }
      ])
    })

    test('should not include id field', async () => {
      const data = await getAnnualPayments()
      expect(data.every(x => !x.id)).toBe(true)
    })
  })

  describe('getPayeePayments', () => {
    test('should return all matching provided payee', async () => {
      const data = await getPayeePayments('payee name 1', 'pp1')
      expect(data).toHaveLength(2)
    })

    test('should group by scheme', async () => {
      const data = await getPayeePayments('payee name 1', 'pp1')
      expect(data[0].scheme).toBe('scheme 1')
      expect(data[1].scheme).toBe('scheme 2')
    })

    test('should sum total amount for payee and scheme and return as amount', async () => {
      const data = await getPayeePayments('payee name 1', 'pp1')
      expect(data[0].amount).toBe('200.00')
    })
  })

  describe('getAllPayments', () => {
    test('should get all payments from database', async () => {
      vi.spyOn(models.PaymentData, 'findAll')
      await getAllPayments()
      expect(models.PaymentData.findAll).toHaveBeenCalledTimes(1)
    })

    test('should group payments by payee and scheme', async () => {
      const data = await getAllPayments()
      expect(data).toHaveLength(3)
    })

    test('should sum total amount for payee and scheme and return as total_amount', async () => {
      const data = await getAllPayments()
      expect(data.find(x => x.payee_name === 'payee name 1' && x.scheme === 'scheme 1').total_amount).toBe('200.00')
      expect(data.find(x => x.payee_name === 'payee name 1' && x.scheme === 'scheme 2').total_amount).toBe('100.00')
      expect(data.find(x => x.payee_name === 'payee name 2' && x.scheme === 'scheme 1').total_amount).toBe('100.00')
    })

    test('should return payee_name, part_postcode, town, county_council, scheme, financial_year and total_amount fields', async () => {
      const data = await getAllPayments()
      expect(Object.keys(data[0])).toEqual(['payee_name', 'part_postcode', 'town', 'county_council', 'scheme', 'financial_year', 'total_amount'])
    })
  })

  describe('getAllPaymentsByPage', () => {
    test('should return all payments by page', async () => {
      const data = await getAllPaymentsByPage(1, 2)
      expect(data).toHaveLength(2)
    })

    test('should sum total amount for payee and scheme and return as total_amount', async () => {
      const data = await getAllPaymentsByPage(1, 2)
      expect(data.find(x => x.payee_name === 'payee name 1' && x.scheme === 'scheme 1').total_amount).toBe('200.00')
      expect(data.find(x => x.payee_name === 'payee name 1' && x.scheme === 'scheme 2').total_amount).toBe('100.00')
    })

    test('should return payee_name, part_postcode, town, county_council, scheme, financial_year, scheme_detail and total_amount fields', async () => {
      const data = await getAllPaymentsByPage(1, 2)
      expect(Object.keys(data[0])).toEqual(['payee_name', 'part_postcode', 'town', 'county_council', 'scheme', 'financial_year', 'scheme_detail', 'total_amount'])
    })

    test('should return requested page', async () => {
      const data = await getAllPaymentsByPage(2, 2)
      expect(data).toHaveLength(1)
      expect(data[0].payee_name).toBe('payee name 2')
    })

    test('should limit to page size', async () => {
      const data = await getAllPaymentsByPage(1, 2)
      expect(data).toHaveLength(2)
    })

    test('should return page one if no page is provided', async () => {
      const data = await getAllPaymentsByPage()
      expect(data).toHaveLength(3)
      expect(data[0].payee_name).toBe('payee name 1')
    })

    test('should order by payee_name', async () => {
      await models.PaymentData.create({ id: 5, payee_name: 'payee name 0', part_postcode: 'pp3', town: 'town', county_council: 'county council', financial_year: '20/21', scheme: 'scheme 1', scheme_detail: 'scheme detail 1', amount: 100 })
      const data = await getAllPaymentsByPage()
      expect(data[0].payee_name).toBe('payee name 0')
    })
  })
})
