import { expect, test, describe, beforeEach, vi } from 'vitest'

vi.mock('../../../src/data/database.js')
const { getAnnualPayments } = await import('../../../src/data/database.js')

const { getPaymentSummary, getPaymentSummaryCsv } = await import('../../../src/data/summary.js')

describe('summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAnnualPayments.mockResolvedValue([
      { financial_year: '21/22', scheme: 'scheme', total_amount: 200 },
      { financial_year: '20/21', scheme: 'scheme', total_amount: 100 },
      { financial_year: '21/22', scheme: 'scheme', total_amount: 300 }
    ])
  })

  describe('getPaymentSummary', () => {
    test('should return summary data as an object', async () => {
      const data = await getPaymentSummary()
      expect(data).toBeInstanceOf(Object)
    })

    test('should group payments by year', async () => {
      const data = await getPaymentSummary()
      expect(data).toEqual({
        '20/21': [
          { financial_year: '20/21', scheme: 'scheme', total_amount: 100 }
        ],
        '21/22': [
          { financial_year: '21/22', scheme: 'scheme', total_amount: 200 },
          { financial_year: '21/22', scheme: 'scheme', total_amount: 300 }
        ]
      })
    })
  })

  describe('getPaymentSummaryCsv', () => {
    test('should return headers', async () => {
      const data = await getPaymentSummaryCsv()
      expect(data).toContain('"financial_year","scheme","amount"')
    })

    test('should return data as csv', async () => {
      const data = await getPaymentSummaryCsv()
      expect(data).toContain('"20/21","scheme",100')
      expect(data).toContain('"21/22","scheme",200')
      expect(data).toContain('"21/22","scheme",300')
    })

    test('should sort data by year', async () => {
      const data = await getPaymentSummaryCsv()
      expect(data.indexOf('"20/21"')).toBeLessThan(data.indexOf('"21/22"'))
    })

    test('should handle comma in scheme name', async () => {
      getAnnualPayments.mockResolvedValue([
        { financial_year: '21/22', scheme: 'scheme, with comma', total_amount: 200 }
      ])
      const data = await getPaymentSummaryCsv()
      expect(data).toContain('"21/22","scheme, with comma",200')
    })

    test('should handle double quotes in scheme name', async () => {
      getAnnualPayments.mockResolvedValue([
        { financial_year: '21/22', scheme: 'scheme "with" quotes', total_amount: 200 }
      ])
      const data = await getPaymentSummaryCsv()
      expect(data).toContain('"21/22","scheme ""with"" quotes",200')
    })
  })
})
