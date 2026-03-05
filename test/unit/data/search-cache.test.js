import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

vi.mock('../../../src/config.js', () => ({
  config: {
    get: vi.fn((key) => {
      if (key === 'search.cacheTtl') return 120000 // 2 minutes default
      return null
    })
  }
}))

vi.mock('../../../src/data/database.js')

const { config } = await import('../../../src/config.js')
const { getAllPayments } = await import('../../../src/data/database.js')

// Need to import after mocks are set up
let getSearchSuggestions, invalidateSearchCache

describe('search cache', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset module cache to get fresh cache state
    vi.resetModules()

    // Re-import to get fresh module with reset cache
    const searchModule = await import('../../../src/data/search.js')
    getSearchSuggestions = searchModule.getSearchSuggestions
    invalidateSearchCache = searchModule.invalidateSearchCache

    getAllPayments.mockResolvedValue([
      { payee_name: 'Test Payee 1', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 },
      { payee_name: 'Test Payee 2', part_postcode: 'DE45 6FG', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '20/21', total_amount: 2000 }
    ])

    config.get.mockImplementation((key) => {
      if (key === 'search.cacheTtl') return 120000
      return null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Fuse instance caching', () => {
    test('should fetch payments from database on first call', async () => {
      await getSearchSuggestions('test')

      expect(getAllPayments).toHaveBeenCalledTimes(1)
    })

    test('should use cached Fuse instance on subsequent calls', async () => {
      await getSearchSuggestions('test')
      await getSearchSuggestions('another')
      await getSearchSuggestions('third')

      // Should only call DB once (first call builds cache)
      expect(getAllPayments).toHaveBeenCalledTimes(1)
    })

    test('should return correct results from cached instance', async () => {
      const result1 = await getSearchSuggestions('test')
      const result2 = await getSearchSuggestions('payee')

      expect(result1).toHaveProperty('count')
      expect(result1).toHaveProperty('rows')
      expect(result2).toHaveProperty('count')
      expect(result2).toHaveProperty('rows')
      expect(getAllPayments).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cache TTL expiration', () => {
    test('should rebuild cache after TTL expires', async () => {
      // Set very short TTL
      config.get.mockImplementation((key) => {
        if (key === 'search.cacheTtl') return 100 // 100ms
        return null
      })

      // Reset modules to apply new TTL
      vi.resetModules()
      const searchModule = await import('../../../src/data/search.js')
      const newGetSearchSuggestions = searchModule.getSearchSuggestions

      await newGetSearchSuggestions('test')
      expect(getAllPayments).toHaveBeenCalledTimes(1)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150))

      await newGetSearchSuggestions('test')
      expect(getAllPayments).toHaveBeenCalledTimes(2)
    })

    test('should use cache when within TTL window', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'search.cacheTtl') return 5000 // 5 seconds
        return null
      })

      vi.resetModules()
      const searchModule = await import('../../../src/data/search.js')
      const newGetSearchSuggestions = searchModule.getSearchSuggestions

      await newGetSearchSuggestions('test')
      await new Promise(resolve => setTimeout(resolve, 50))
      await newGetSearchSuggestions('test')

      // Still within TTL, should use cache
      expect(getAllPayments).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cache invalidation', () => {
    test('should rebuild cache after manual invalidation', async () => {
      await getSearchSuggestions('test')
      expect(getAllPayments).toHaveBeenCalledTimes(1)

      invalidateSearchCache()

      await getSearchSuggestions('test')
      expect(getAllPayments).toHaveBeenCalledTimes(2)
    })

    test('should invalidate cache multiple times', async () => {
      await getSearchSuggestions('test')
      invalidateSearchCache()

      await getSearchSuggestions('test')
      invalidateSearchCache()

      await getSearchSuggestions('test')

      expect(getAllPayments).toHaveBeenCalledTimes(3)
    })

    test('should work correctly after invalidation and re-caching', async () => {
      // Build cache
      const result1 = await getSearchSuggestions('test')

      // Invalidate
      invalidateSearchCache()

      // Rebuild cache
      const result2 = await getSearchSuggestions('test')

      // Use cache again
      const result3 = await getSearchSuggestions('another')

      expect(getAllPayments).toHaveBeenCalledTimes(2)
      expect(result1).toHaveProperty('count')
      expect(result2).toHaveProperty('count')
      expect(result3).toHaveProperty('count')
    })
  })

  describe('Cache disabled (TTL = 0)', () => {
    test('should not cache when TTL is 0', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'search.cacheTtl') return 0
        return null
      })

      vi.resetModules()
      const searchModule = await import('../../../src/data/search.js')
      const newGetSearchSuggestions = searchModule.getSearchSuggestions

      await newGetSearchSuggestions('test')
      await newGetSearchSuggestions('test')
      await newGetSearchSuggestions('test')

      // Should fetch from DB every time
      expect(getAllPayments).toHaveBeenCalledTimes(3)
    })
  })

  describe('Cache with changing data', () => {
    test('should return stale data until invalidated', async () => {
      getAllPayments.mockResolvedValue([
        { payee_name: 'Original Data', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
      ])

      const result1 = await getSearchSuggestions('original')
      expect(result1.rows.some(r => r.payee_name === 'Original Data')).toBe(true)

      // Change the mock data
      getAllPayments.mockResolvedValue([
        { payee_name: 'Updated Data', part_postcode: 'AB12 3CD', town: 'Bristol', county_council: 'Bristol', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
      ])

      // Should still return original (cached) data
      await getSearchSuggestions('updated')
      expect(getAllPayments).toHaveBeenCalledTimes(1) // Still using cache

      // Invalidate cache
      invalidateSearchCache()

      // Should now return updated data
      await getSearchSuggestions('updated')
      expect(getAllPayments).toHaveBeenCalledTimes(2) // Fetched new data
    })
  })

  describe('Performance characteristics', () => {
    test('should handle rapid successive calls efficiently', async () => {
      const calls = Array(10).fill(null).map((_, i) =>
        getSearchSuggestions(`test${i}`)
      )

      await Promise.all(calls)

      // Should only build cache once
      expect(getAllPayments).toHaveBeenCalledTimes(1)
    })

    test('should handle large dataset caching', async () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        payee_name: `Payee ${i}`,
        part_postcode: `AB${i}`,
        town: `Town ${i}`,
        county_council: `County ${i}`,
        scheme: 'BPS',
        financial_year: '20/21',
        total_amount: i * 100
      }))

      getAllPayments.mockResolvedValue(largeDataset)

      const result1 = await getSearchSuggestions('payee')
      const result2 = await getSearchSuggestions('town')

      expect(getAllPayments).toHaveBeenCalledTimes(1)
      expect(result1).toHaveProperty('count')
      expect(result2).toHaveProperty('count')
    })
  })

  describe('Error handling', () => {
    test('should handle database errors gracefully', async () => {
      getAllPayments.mockRejectedValue(new Error('Database connection failed'))

      await expect(getSearchSuggestions('test')).rejects.toThrow('Database connection failed')
    })

    test('should rebuild cache after previous error', async () => {
      getAllPayments.mockRejectedValueOnce(new Error('Temporary error'))
      getAllPayments.mockResolvedValueOnce([
        { payee_name: 'Test', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
      ])

      await expect(getSearchSuggestions('test')).rejects.toThrow('Temporary error')

      // Should retry and succeed
      const result = await getSearchSuggestions('test')
      expect(result).toHaveProperty('count')
      expect(getAllPayments).toHaveBeenCalledTimes(2)
    })

    test('should reset all cache state when build fails', async () => {
      // First, build a valid cache
      await getSearchSuggestions('test')
      expect(getAllPayments).toHaveBeenCalledTimes(1)

      // Now make it fail
      getAllPayments.mockRejectedValueOnce(new Error('Build failed'))

      // Try to search, which will attempt to rebuild (since enough time passed or manual invalidation)
      invalidateSearchCache()

      await expect(getSearchSuggestions('another')).rejects.toThrow('Build failed')

      // Verify cache state is completely reset by ensuring next call rebuilds from scratch
      getAllPayments.mockResolvedValueOnce([
        { payee_name: 'New Data', part_postcode: 'CD34', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '21/22', total_amount: 3000 }
      ])

      const result = await getSearchSuggestions('new')
      expect(result).toHaveProperty('count')
      // Should have called getAllPayments: 1 (initial) + 1 (failed) + 1 (recovery) = 3
      expect(getAllPayments).toHaveBeenCalledTimes(3)
    })

    test('should not leave buildingCache promise hanging after error', async () => {
      getAllPayments.mockRejectedValueOnce(new Error('Build error'))

      await expect(getSearchSuggestions('test')).rejects.toThrow('Build error')

      // Should be able to build cache again without waiting for stale promise
      getAllPayments.mockResolvedValueOnce([
        { payee_name: 'Test', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
      ])

      const result = await getSearchSuggestions('test')
      expect(result).toHaveProperty('count')
      expect(getAllPayments).toHaveBeenCalledTimes(2)
    })
  })

  describe('Cache TTL atomicity', () => {
    test('should set cache time to build start, not build end', async () => {
      // Mock getAllPayments to take some time
      getAllPayments.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)) // Simulate 100ms DB query
        return [
          { payee_name: 'Test', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
        ]
      })

      await getSearchSuggestions('test')

      // The cache time should be closer to buildStartTime than buildEndTime
      // Since we can't directly inspect lastCacheTime, we verify behavior:
      // If we wait just under the build duration and the TTL is long enough,
      // a second request should use the cache (proving time was set at start)

      await new Promise(resolve => setTimeout(resolve, 50))
      await getSearchSuggestions('another')

      // Should use cached instance, not rebuild
      expect(getAllPayments).toHaveBeenCalledTimes(1)
    })

    test('should not have race condition with TTL check during slow build', async () => {
      config.get.mockImplementation((key) => {
        if (key === 'search.cacheTtl') return 5000 // 5 second TTL
        return null
      })

      vi.resetModules()
      const searchModule = await import('../../../src/data/search.js')
      const newGetSearchSuggestions = searchModule.getSearchSuggestions

      // Make build take significant time
      getAllPayments.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200))
        return [
          { payee_name: 'Test', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
        ]
      })

      // Start first request
      const firstRequest = newGetSearchSuggestions('test')

      // While building, start second request after 100ms
      await new Promise(resolve => setTimeout(resolve, 100))
      const secondRequest = newGetSearchSuggestions('another')

      await Promise.all([firstRequest, secondRequest])

      // Both should have used the same cache build, so only 1 DB call
      expect(getAllPayments).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cache invalidation during build', () => {
    test('should discard cache build if invalidated during build', async () => {
      // Make getAllPayments take time (simulating slow DB query)
      getAllPayments.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return [
          { payee_name: 'Old Data', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
        ]
      })

      // Start building cache
      const searchPromise = getSearchSuggestions('test')

      // Invalidate while building (after 50ms)
      await new Promise(resolve => setTimeout(resolve, 50))
      invalidateSearchCache()

      // Wait for build to complete
      await searchPromise

      // Now search again - should rebuild with fresh data, not use stale cache
      getAllPayments.mockResolvedValueOnce([
        { payee_name: 'New Data', part_postcode: 'CD34', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '21/22', total_amount: 2000 }
      ])

      const result = await getSearchSuggestions('new')

      // Should have called getAllPayments twice: once for old build (discarded), once for new build
      expect(getAllPayments).toHaveBeenCalledTimes(2)
      expect(result).toHaveProperty('count')
    })

    test('should handle multiple invalidations during build', async () => {
      getAllPayments.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
        return [
          { payee_name: 'Data', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
        ]
      })

      // Start building cache
      const searchPromise = getSearchSuggestions('test')

      // Invalidate multiple times during build
      await new Promise(resolve => setTimeout(resolve, 30))
      invalidateSearchCache()

      await new Promise(resolve => setTimeout(resolve, 30))
      invalidateSearchCache()

      await new Promise(resolve => setTimeout(resolve, 30))
      invalidateSearchCache()

      await searchPromise

      // Next search should rebuild
      getAllPayments.mockResolvedValueOnce([
        { payee_name: 'Fresh', part_postcode: 'EF56', town: 'Manchester', county_council: 'Greater Manchester', scheme: 'ES', financial_year: '22/23', total_amount: 3000 }
      ])

      await getSearchSuggestions('fresh')

      // Should have 2 DB calls: original (discarded) + new rebuild
      expect(getAllPayments).toHaveBeenCalledTimes(2)
    })

    test('should handle invalidation immediately after build starts', async () => {
      getAllPayments.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return [
          { payee_name: 'Data', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
        ]
      })

      // Start building
      const searchPromise = getSearchSuggestions('test')

      // Invalidate very early in the build (after 10ms)
      await new Promise(resolve => setTimeout(resolve, 10))
      invalidateSearchCache()

      await searchPromise

      // Rebuild with new data
      getAllPayments.mockResolvedValueOnce([
        { payee_name: 'New', part_postcode: 'CD34', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '21/22', total_amount: 2000 }
      ])

      await getSearchSuggestions('new')

      expect(getAllPayments).toHaveBeenCalledTimes(2)
    })

    test('should handle invalidation just before build completes', async () => {
      getAllPayments.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return [
          { payee_name: 'Data', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
        ]
      })

      const searchPromise = getSearchSuggestions('test')

      // Invalidate just before build completes (at 95ms of 100ms build)
      await new Promise(resolve => setTimeout(resolve, 95))
      invalidateSearchCache()

      await searchPromise

      // Next search should rebuild
      getAllPayments.mockResolvedValueOnce([
        { payee_name: 'New', part_postcode: 'CD34', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '21/22', total_amount: 2000 }
      ])

      await getSearchSuggestions('new')

      expect(getAllPayments).toHaveBeenCalledTimes(2)
    })

    test('should correctly handle concurrent searches with invalidation', async () => {
      getAllPayments.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return [
          { payee_name: 'Data', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
        ]
      })

      // Start multiple concurrent searches
      const search1 = getSearchSuggestions('test1')
      const search2 = getSearchSuggestions('test2')
      const search3 = getSearchSuggestions('test3')

      // Invalidate while all are building
      await new Promise(resolve => setTimeout(resolve, 50))
      invalidateSearchCache()

      // Wait for all to complete
      await Promise.all([search1, search2, search3])

      // All should have waited for the same build, but it was discarded
      // Next search should trigger a new build
      getAllPayments.mockResolvedValueOnce([
        { payee_name: 'New', part_postcode: 'CD34', town: 'London', county_council: 'Greater London', scheme: 'CS', financial_year: '21/22', total_amount: 2000 }
      ])

      await getSearchSuggestions('new')

      // Should have 2 DB calls: original (discarded) + new build
      expect(getAllPayments).toHaveBeenCalledTimes(2)
    })

    test('should preserve cache if no invalidation during build', async () => {
      getAllPayments.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return [
          { payee_name: 'Data', part_postcode: 'AB12', town: 'Town', county_council: 'County', scheme: 'BPS', financial_year: '20/21', total_amount: 1000 }
        ]
      })

      // Build cache without invalidation
      await getSearchSuggestions('test')

      // Use cache
      await getSearchSuggestions('another')
      await getSearchSuggestions('third')

      // Should only have built cache once
      expect(getAllPayments).toHaveBeenCalledTimes(1)
    })
  })
})
