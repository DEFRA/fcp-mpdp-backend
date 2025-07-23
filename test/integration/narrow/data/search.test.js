import { describe, test, beforeEach, vi, expect } from 'vitest'

vi.mock('../../../../src/data/database.js')

const { getAllPayments } = await import('../../../../src/data/database.js')
const { getPaymentData, getSearchSuggestions } = await import('../../../../src/data/search.js')

describe('search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAllPayments.mockResolvedValue([
      { payee_name: 'payee name 1', part_postcode: 'part postcode', town: 'town', county_council: 'county council', scheme: 'scheme 1', financial_year: '20/21', total_amount: 100 },
      { payee_name: 'payee name 2', part_postcode: 'part postcode', town: 'town', county_council: 'county council', scheme: 'scheme 2', financial_year: '20/21', total_amount: 200 },
      { payee_name: 'payee name 2', part_postcode: 'part postcode', town: 'town', county_council: 'county council', scheme: 'scheme 1', financial_year: '20/21', total_amount: 300 },
      { payee_name: 'payee name 2', part_postcode: 'part postcode', town: 'town', county_council: 'county council', scheme: 'scheme 2', financial_year: '20/21', total_amount: 400 },
      { payee_name: 'payee name 3', part_postcode: 'part postcode', town: 'town', county_council: 'county council', scheme: 'scheme 1', financial_year: '21/22', total_amount: 500 }
    ])
  })

  describe('getPaymentData', () => {
    test('should return search results as an object', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 10, offset: 0, sortBy: 'score', filterBy: {} })
      expect(data).toBeInstanceOf(Object)
    })

    test('should return count of search results', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 10, offset: 0, sortBy: 'score', filterBy: {} })
      expect(data.count).toBe(3)
    })

    test('should return search results as an array', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 10, offset: 0, sortBy: 'score', filterBy: {} })
      expect(data.rows).toBeInstanceOf(Array)
    })

    test('should return filter options', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 10, offset: 0, sortBy: 'score', filterBy: {} })
      expect(data.filterOptions).toBeInstanceOf(Object)
    })

    test('should return results grouped by payee name', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 10, offset: 0, sortBy: 'score', filterBy: {} })
      expect(data.count).toBe(3)
      expect(data.rows.find(x => x.payee_name === 'payee name 1')).toBeDefined()
      expect(data.rows.find(x => x.payee_name === 'payee name 2')).toBeDefined()
      expect(data.rows.find(x => x.payee_name === 'payee name 3')).toBeDefined()
    })

    test('should sum total amount for each payee name', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 10, offset: 0, sortBy: 'score', filterBy: {} })
      expect(data.rows.find(x => x.payee_name === 'payee name 1').total_amount).toBe(100)
      expect(data.rows.find(x => x.payee_name === 'payee name 2').total_amount).toBe(900)
      expect(data.rows.find(x => x.payee_name === 'payee name 3').total_amount).toBe(500)
    })

    test('should return all results if action is download', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 1, offset: 0, sortBy: 'score', filterBy: {}, action: 'download' })
      expect(data.count).toBe(3)
    })

    test('should not offset results if action is download', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 1, offset: 1, sortBy: 'score', filterBy: {}, action: 'download' })
      expect(data.rows.length).toBe(3)
    })

    test('should paginate results if action is not download', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 1, offset: 0, sortBy: 'score', filterBy: {} })
      expect(data.rows.length).toBe(1)
      expect(data.rows[0].payee_name).toBe('payee name 1')
    })

    test('should offset results if action is not download and offset is greater than 0', async () => {
      const data = await getPaymentData({ searchString: 'payee name', limit: 1, offset: 1, sortBy: 'score', filterBy: {} })
      expect(data.rows.length).toBe(1)
      expect(data.rows[0].payee_name).toBe('payee name 2')
    })

    test('should return empty results when no filtered results match', async () => {
      // Mock a scenario where search finds no results at all
      getAllPayments.mockResolvedValue([
        { payee_name: 'completely different name', part_postcode: 'different postcode', town: 'different town', county_council: 'different council', scheme: 'scheme 1', financial_year: '20/21', total_amount: 100 }
      ])

      // Search for something that won't match
      const data = await getPaymentData({
        searchString: 'non-existent payee',
        limit: 10,
        offset: 0,
        sortBy: 'score',
        filterBy: {}
      })

      expect(data.count).toBe(0)
      expect(data.rows).toEqual([])
      expect(data.filterOptions).toBeInstanceOf(Object)
    })

    test('should sort results by payee_name when sortBy is payee_name', async () => {
      const data = await getPaymentData({
        searchString: 'payee name',
        limit: 10,
        offset: 0,
        sortBy: 'payee_name',
        filterBy: {}
      })

      expect(data.rows[0].payee_name).toBe('payee name 1')
      expect(data.rows[1].payee_name).toBe('payee name 2')
      expect(data.rows[2].payee_name).toBe('payee name 3')
    })

    test('should sort results by town when sortBy is town', async () => {
      getAllPayments.mockResolvedValue([
        { payee_name: 'test payee 1', part_postcode: 'part postcode', town: 'zebra town', county_council: 'county council', scheme: 'scheme 1', financial_year: '20/21', total_amount: 100 },
        { payee_name: 'test payee 2', part_postcode: 'part postcode', town: 'alpha town', county_council: 'county council', scheme: 'scheme 1', financial_year: '20/21', total_amount: 200 },
        { payee_name: 'test payee 3', part_postcode: 'part postcode', town: 'beta town', county_council: 'county council', scheme: 'scheme 1', financial_year: '20/21', total_amount: 300 }
      ])

      const data = await getPaymentData({
        searchString: 'test payee',
        limit: 10,
        offset: 0,
        sortBy: 'town',
        filterBy: {}
      })

      expect(data.rows[0].town).toBe('alpha town')
      expect(data.rows[1].town).toBe('beta town')
      expect(data.rows[2].town).toBe('zebra town')
    })

    test('should not sort results when sortBy is score', async () => {
      const data = await getPaymentData({
        searchString: 'payee name',
        limit: 10,
        offset: 0,
        sortBy: 'score',
        filterBy: {}
      })

      expect(data.rows).toHaveLength(3)
      expect(data.rows.map(r => r.payee_name)).toEqual(['payee name 1', 'payee name 2', 'payee name 3'])
    })

    test('should not sort results when sortBy is not a valid key', async () => {
      const data = await getPaymentData({
        searchString: 'payee name',
        limit: 10,
        offset: 0,
        sortBy: 'invalid_field',
        filterBy: {}
      })

      expect(data.rows).toHaveLength(3)
      expect(data.rows.map(r => r.payee_name)).toEqual(['payee name 1', 'payee name 2', 'payee name 3'])
    })
  })

  describe('getSearchSuggestions', () => {
    test('should return search suggestions as an object', async () => {
      const data = await getSearchSuggestions('payee name')
      expect(data).toBeInstanceOf(Object)
    })

    test('should return count of search suggestions', async () => {
      const data = await getSearchSuggestions('payee name')
      expect(data.count).toBe(3)
    })

    test('should return search suggestions as an array', async () => {
      const data = await getSearchSuggestions('payee name')
      expect(data.rows).toBeInstanceOf(Array)
    })

    test('should group by payee name', async () => {
      const data = await getSearchSuggestions('payee name')
      expect(data.count).toBe(3)
      expect(data.rows.find(x => x.payee_name === 'payee name 1')).toBeDefined()
      expect(data.rows.find(x => x.payee_name === 'payee name 2')).toBeDefined()
      expect(data.rows.find(x => x.payee_name === 'payee name 3')).toBeDefined()
    })

    test('should remove scheme property', async () => {
      const data = await getSearchSuggestions('payee name')
      expect(data.rows.find(x => x.scheme)).toBeUndefined()
    })

    test('should remove total_amount property', async () => {
      const data = await getSearchSuggestions('payee name')
      expect(data.rows.find(x => x.total_amount)).toBeUndefined()
    })

    test('should remove financial_year property', async () => {
      const data = await getSearchSuggestions('payee name')
      expect(data.rows.find(x => x.financial_year)).toBeUndefined()
    })

    test('should restrict results to 6 suggestions', async () => {
      getAllPayments.mockResolvedValue(Array(50).fill().map((_, i) => ({ payee_name: `payee name ${i}`, part_postcode: 'part postcode', town: 'town', county_council: 'county council', scheme: 'scheme', financial_year: '20/21', total_amount: 100 })))
      const data = await getSearchSuggestions('payee name')
      expect(data.rows.length).toBe(6)
    })
  })
})
