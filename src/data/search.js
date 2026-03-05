import Fuse from 'fuse.js'
import { getAllPayments } from './database.js'
import {
  applyFiltersAndGroupByPayee,
  getFilterOptions,
  groupByPayee,
  removeKeys
} from './filters.js'
import { config } from '../config.js'

const options = {
  includeScore: true,
  threshold: 0.25,
  ignoreLocation: true,
  useExtendedSearch: false,
  keys: ['payee_name', 'part_postcode', 'town', 'county_council']
}

const suggestionResultsLimit = 6

// Fuse instance cache
let fuseInstance = null
let lastCacheTime = 0
let buildingCache = null // Promise for concurrent request handling
let cacheToken = Symbol('cache-token') // Unique token to detect invalidation during builds

async function getPaymentData ({
  searchString,
  limit,
  offset,
  sortBy,
  filterBy,
  action
}) {
  const searchResults = await searchAllPayments(searchString)
  const filteredResults = applyFiltersAndGroupByPayee(searchResults, filterBy)

  if (!filteredResults.length) {
    return {
      count: 0,
      rows: [],
      filterOptions: getFilterOptions(searchResults)
    }
  }

  const sortedResults = sortResults(filteredResults, sortBy)

  return {
    count: filteredResults.length,
    rows:
      action === 'download'
        ? sortedResults
        : sortedResults.slice(offset, offset + limit),
    filterOptions: getFilterOptions(searchResults)
  }
}

async function getSearchSuggestions (searchString) {
  const totalStartTime = performance.now()
  console.log(`[PERF] getSearchSuggestions START for: "${searchString}"`)

  const searchResults = await searchAllPayments(searchString)
  const groupedResults = groupByPayee(searchResults)

  const result = {
    count: groupedResults.length,
    rows: groupedResults
      .map((result) =>
        removeKeys(result, ['scheme', 'total_amount', 'financial_year'])
      )
      .slice(0, suggestionResultsLimit)
  }

  const totalEndTime = performance.now()
  console.log(`[PERF] getSearchSuggestions TOTAL: ${(totalEndTime - totalStartTime).toFixed(2)}ms (returned ${result.count} suggestions)\n`)

  return result
}

async function getFuseInstance () {
  // If cache is currently being built, wait for it
  if (buildingCache) {
    console.log('[PERF] Waiting for in-progress cache build')
    return buildingCache
  }

  const cacheTtl = config.get('search.cacheTtl')
  const now = Date.now()

  // Return cached instance if still fresh
  if (fuseInstance && cacheTtl > 0 && (now - lastCacheTime) < cacheTtl) {
    console.log('[PERF] Using cached Fuse instance')
    return fuseInstance
  }

  // Build new cache (store promise for concurrent requests)
  console.log('[PERF] Building new Fuse instance (cache miss or expired)')
  const buildToken = cacheToken // Capture current token to detect invalidation

  buildingCache = (async () => {
    const buildStartTime = now
    const payments = await getAllPayments()

    const fuseStartTime = performance.now()
    const newInstance = new Fuse(payments, options)
    const fuseEndTime = performance.now()
    console.log(`[PERF] Fuse instance creation: ${(fuseEndTime - fuseStartTime).toFixed(2)}ms`)

    // Only set cache if token hasn't changed (not invalidated during build)
    if (cacheToken === buildToken) {
      fuseInstance = newInstance
      lastCacheTime = buildStartTime
      console.log('[PERF] Cache build completed and set')
    } else {
      console.log('[PERF] Cache build discarded (invalidated during build)')
    }
    return newInstance
  })()

  try {
    return await buildingCache
  } catch (error) {
    // Reset cache state on error to prevent inconsistent state
    cacheToken = Symbol('cache-token') // Generate new token
    fuseInstance = null
    lastCacheTime = 0
    throw error
  } finally {
    buildingCache = null
  }
}

function invalidateSearchCache () {
  console.log('[PERF] Search cache invalidated')
  cacheToken = Symbol('cache-token') // Generate new unique token
  fuseInstance = null
  lastCacheTime = 0
  buildingCache = null
}

async function searchAllPayments (searchString) {
  const fuse = await getFuseInstance()

  const searchStartTime = performance.now()
  const results = fuse.search(searchString).map((result) => result.item)
  const searchEndTime = performance.now()
  console.log(`[PERF] Fuse search execution: ${(searchEndTime - searchStartTime).toFixed(2)}ms (${results.length} results)`)

  return results
}

function sortResults (results, sortBy) {
  if (sortBy !== 'score' && options.keys.includes(sortBy)) {
    return results.sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : -1))
  }
  return results
}

export { getPaymentData, getSearchSuggestions, invalidateSearchCache }
