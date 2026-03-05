import { describe, test, beforeEach, vi, expect } from 'vitest'

vi.mock('../../../../src/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'search.cacheTtl') return 0 // Disable caching for integration tests
      return null
    })
  }
}))

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

  describe('getSearchSuggestions - Fuzzy Matching Behavior', () => {
    describe('Typo tolerance', () => {
      beforeEach(() => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'Jones Farming Ltd', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'Smith Agriculture', part_postcode: 'DE45 6FG', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'Johnson Partners', part_postcode: 'GH78 9IJ', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'ES', financial_year: '20/21', total_amount: 3000 },
          { payee_name: 'Brown Estates', part_postcode: 'KL01 2MN', town: 'Leeds', county_council: 'West Yorkshire', scheme: 'BPS', financial_year: '21/22', total_amount: 4000 }
        ])
      })

      test('should find "Jones" with single character typo "jons"', async () => {
        const data = await getSearchSuggestions('jons')
        const jonesResult = data.rows.find(x => x.payee_name === 'Jones Farming Ltd')
        expect(jonesResult).toBeDefined()
      })

      test('should find "Brown" with missing character "bown"', async () => {
        const data = await getSearchSuggestions('bown')
        const brownResult = data.rows.find(x => x.payee_name === 'Brown Estates')
        expect(brownResult).toBeDefined()
      })
    })

    describe('Partial matching', () => {
      beforeEach(() => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'Jonathan Smith Farms', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'Jones Family Trust', part_postcode: 'DE45 6FG', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'Jon & Co Agriculture', part_postcode: 'GH78 9IJ', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'ES', financial_year: '20/21', total_amount: 3000 },
          { payee_name: 'Jonesborough Estates', part_postcode: 'KL01 2MN', town: 'Leeds', county_council: 'West Yorkshire', scheme: 'BPS', financial_year: '21/22', total_amount: 4000 }
        ])
      })

      test('should find multiple matches with partial string "jon"', async () => {
        const data = await getSearchSuggestions('jon')
        expect(data.count).toBeGreaterThan(0)
        const payeeNames = data.rows.map(r => r.payee_name)
        // Should match Jonathan, Jones, Jon, Jonesborough
        expect(payeeNames.some(name => name.includes('Jon'))).toBe(true)
      })

      test('should find matches at start of word', async () => {
        const data = await getSearchSuggestions('jones')
        const matchedNames = data.rows.map(r => r.payee_name)
        expect(matchedNames).toContain('Jones Family Trust')
        expect(matchedNames).toContain('Jonesborough Estates')
      })

      test('should find matches in middle of payee name', async () => {
        const data = await getSearchSuggestions('smith')
        const smithResult = data.rows.find(x => x.payee_name === 'Jonathan Smith Farms')
        expect(smithResult).toBeDefined()
      })
    })

    describe('Case insensitivity', () => {
      beforeEach(() => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'McDonald Farming', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'SMITH AGRICULTURE', part_postcode: 'DE45 6FG', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'o\'Brien Estates', part_postcode: 'GH78 9IJ', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'ES', financial_year: '20/21', total_amount: 3000 }
        ])
      })

      test('should find uppercase payee with lowercase search', async () => {
        const data = await getSearchSuggestions('smith')
        const smithResult = data.rows.find(x => x.payee_name === 'SMITH AGRICULTURE')
        expect(smithResult).toBeDefined()
      })

      test('should find mixed case payee with lowercase search', async () => {
        const data = await getSearchSuggestions('mcdonald')
        const mcdonaldResult = data.rows.find(x => x.payee_name === 'McDonald Farming')
        expect(mcdonaldResult).toBeDefined()
      })

      test('should find lowercase/special char payee with uppercase search', async () => {
        const data = await getSearchSuggestions('OBRIEN')
        const obrienResult = data.rows.find(x => x.payee_name === 'o\'Brien Estates')
        expect(obrienResult).toBeDefined()
      })
    })

    describe('Multi-field searching', () => {
      beforeEach(() => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'Adams Agriculture', part_postcode: 'BS1 2AB', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'Bennett Farms', part_postcode: 'AB12 3CD', town: 'Aberdeen', county_council: 'Aberdeenshire', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'Carter Estates', part_postcode: 'DE45 6FG', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'ES', financial_year: '20/21', total_amount: 3000 },
          { payee_name: 'Davis Holdings', part_postcode: 'LS1 7HJ', town: 'Leeds', county_council: 'West Yorkshire', scheme: 'BPS', financial_year: '21/22', total_amount: 4000 }
        ])
      })

      test('should find results by postcode', async () => {
        const data = await getSearchSuggestions('BS1')
        const bristolResult = data.rows.find(x => x.part_postcode === 'BS1 2AB')
        expect(bristolResult).toBeDefined()
        expect(bristolResult.payee_name).toBe('Adams Agriculture')
      })

      test('should find results by town name', async () => {
        const data = await getSearchSuggestions('bristol')
        const bristolResult = data.rows.find(x => x.town === 'Bristol')
        expect(bristolResult).toBeDefined()
      })

      test('should find results by county council', async () => {
        const data = await getSearchSuggestions('aberdeenshire')
        const aberdeenResult = data.rows.find(x => x.county_council === 'Aberdeenshire')
        expect(aberdeenResult).toBeDefined()
        expect(aberdeenResult.payee_name).toBe('Bennett Farms')
      })

      test('should find results by partial postcode', async () => {
        const data = await getSearchSuggestions('LS1')
        const leedsResult = data.rows.find(x => x.part_postcode.startsWith('LS1'))
        expect(leedsResult).toBeDefined()
      })

      test('should prioritize exact matches over fuzzy matches', async () => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'Manchester Farms', part_postcode: 'M1 2AB', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'Smith Agriculture', part_postcode: 'BS12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'Manheim Estates', part_postcode: 'DE45 6FG', town: 'Derby', county_council: 'Derbyshire', scheme: 'ES', financial_year: '20/21', total_amount: 3000 }
        ])

        const data = await getSearchSuggestions('manchester')
        // Exact match should appear first (if Fuse is working correctly)
        expect(data.rows[0].payee_name).toBe('Manchester Farms')
      })
    })

    describe('Special characters and edge cases', () => {
      beforeEach(() => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'O\'Connor & Sons', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'Smith-Jones Farms', part_postcode: 'DE45 6FG', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'Brown & Co.', part_postcode: 'GH78 9IJ', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'ES', financial_year: '20/21', total_amount: 3000 },
          { payee_name: '123 Farming Ltd', part_postcode: 'KL01 2MN', town: 'Leeds', county_council: 'West Yorkshire', scheme: 'BPS', financial_year: '21/22', total_amount: 4000 }
        ])
      })

      test('should find names with apostrophes', async () => {
        const data = await getSearchSuggestions('oconnor')
        const oconnorResult = data.rows.find(x => x.payee_name === 'O\'Connor & Sons')
        expect(oconnorResult).toBeDefined()
      })

      test('should find hyphenated names', async () => {
        const data = await getSearchSuggestions('smith jones')
        const hyphenatedResult = data.rows.find(x => x.payee_name === 'Smith-Jones Farms')
        expect(hyphenatedResult).toBeDefined()
      })

      test('should find names with ampersands', async () => {
        const data = await getSearchSuggestions('brown')
        const ampersandResult = data.rows.find(x => x.payee_name === 'Brown & Co.')
        expect(ampersandResult).toBeDefined()
      })

      test('should find names starting with numbers', async () => {
        const data = await getSearchSuggestions('123')
        const numberResult = data.rows.find(x => x.payee_name === '123 Farming Ltd')
        expect(numberResult).toBeDefined()
      })

      test('should handle empty search string gracefully', async () => {
        const data = await getSearchSuggestions('')
        // Empty search should return some or all results depending on Fuse behavior
        expect(data).toBeDefined()
        expect(data.rows).toBeInstanceOf(Array)
      })

      test('should handle very long search strings', async () => {
        const longSearch = 'a'.repeat(100)
        const data = await getSearchSuggestions(longSearch)
        expect(data).toBeDefined()
        expect(data.rows).toBeInstanceOf(Array)
        expect(data.count).toBe(0) // Should not match anything
      })
    })

    describe('Result quality and relevance', () => {
      beforeEach(() => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'Wilson Farms', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'Wilson Agriculture Ltd', part_postcode: 'DE45 6FG', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'Wilson & Sons', part_postcode: 'GH78 9IJ', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'ES', financial_year: '20/21', total_amount: 3000 },
          { payee_name: 'Williamson Estates', part_postcode: 'KL01 2MN', town: 'Leeds', county_council: 'West Yorkshire', scheme: 'BPS', financial_year: '21/22', total_amount: 4000 },
          { payee_name: 'Smith Agriculture', part_postcode: 'MN34 5OP', town: 'Birmingham', county_council: 'West Midlands', scheme: 'CS', financial_year: '21/22', total_amount: 5000 }
        ])
      })

      test('should find close matches but not very distant ones', async () => {
        const data = await getSearchSuggestions('wilson')
        const payeeNames = data.rows.map(r => r.payee_name)

        // Should find Wilson (exact and similar)
        expect(payeeNames.filter(name => name.includes('Wilson')).length).toBeGreaterThan(0)

        // Williamson might be included (similar) but Smith should not be
        expect(payeeNames).not.toContain('Smith Agriculture')
      })

      test('should return reasonable number of results for common search', async () => {
        const data = await getSearchSuggestions('wilson')
        // With threshold 0.3, should get Wilson matches and possibly Williamson
        expect(data.count).toBeGreaterThanOrEqual(3)
        expect(data.count).toBeLessThanOrEqual(6)
      })

      test('should not return excessive irrelevant results', async () => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'Anderson Ltd', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'Peterson Farms', part_postcode: 'DE45 6FG', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'Thompson Agriculture', part_postcode: 'GH78 9IJ', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'ES', financial_year: '20/21', total_amount: 3000 },
          { payee_name: 'Henderson Estates', part_postcode: 'KL01 2MN', town: 'Leeds', county_council: 'West Yorkshire', scheme: 'BPS', financial_year: '21/22', total_amount: 4000 }
        ])

        const data = await getSearchSuggestions('xyz')
        // Completely unrelated search should return 0 or very few results
        expect(data.count).toBeLessThan(2)
      })
    })

    describe('Performance characteristics', () => {
      test('should handle large dataset efficiently', async () => {
        // Create 1000 records
        const largeDataset = Array(1000).fill().map((_, i) => ({
          payee_name: `Test Payee ${i}`,
          part_postcode: `AB${i} ${i}CD`,
          town: `Town ${i}`,
          county_council: `County ${i}`,
          scheme: 'BPS',
          financial_year: '20/21',
          total_amount: i * 100
        }))

        getAllPayments.mockResolvedValue(largeDataset)

        const data = await getSearchSuggestions('Test Payee 42')

        // Should find the specific payee
        const foundPayee = data.rows.find(x => x.payee_name === 'Test Payee 42')
        expect(foundPayee).toBeDefined()
      })

      test('should handle dataset with duplicate payee names across schemes', async () => {
        getAllPayments.mockResolvedValue([
          { payee_name: 'Wilson Farms', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
          { payee_name: 'Wilson Farms', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'CS', financial_year: '20/21', total_amount: 2000 },
          { payee_name: 'Wilson Farms', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'ES', financial_year: '21/22', total_amount: 3000 }
        ])

        const data = await getSearchSuggestions('wilson')

        // After grouping, should have only one Wilson Farms entry
        expect(data.count).toBe(1)
        expect(data.rows[0].payee_name).toBe('Wilson Farms')
      })
    })
  })
})
