import Fuse from 'fuse.js'
import { getAllPayments, getDistinctPayees } from './database.js'
import {
  applyFiltersAndGroupByPayee,
  getFilterOptions
} from './filters.js'
import { config } from '../config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { serverMetrics } from '../common/helpers/metrics.js'

const logger = createLogger()

const options = {
  includeScore: true,
  threshold: 0.25,
  ignoreLocation: true,
  useExtendedSearch: false,
  keys: ['payee_name', 'part_postcode', 'town', 'county_council']
}

const suggestionResultsLimit = 6

const CACHE_SYMBOL_NAME = 'cache-token'

// Full search cache (used by getPaymentData)
let fuseInstance = null
let lastCacheTime = 0
let buildingCache = null
let cacheToken = Symbol(CACHE_SYMBOL_NAME)

// Autocomplete cache (used by getSearchSuggestions)
let autocompleteFuseInstance = null
let autocompleteLastCacheTime = 0
let autocompleteBuildingCache = null
let autocompleteCacheToken = Symbol(CACHE_SYMBOL_NAME)

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
  const fuse = await getAutocompleteFuseInstance()
  const searchResults = fuse
    .search(searchString.slice(0, 32), { limit: 50 })
    .map((result) => result.item)

  const suggestions = {
    count: searchResults.length,
    rows: searchResults.slice(0, suggestionResultsLimit)
  }

  return suggestions
}

async function getFuseInstance () {
  // If cache is currently being built, wait for it
  if (buildingCache) {
    return buildingCache
  }

  const cacheTtl = config.get('search.cacheTtl')
  const now = Date.now()

  // Return cached instance if still fresh
  if (fuseInstance && cacheTtl > 0 && (now - lastCacheTime) < cacheTtl) {
    return fuseInstance
  }

  // Build new cache
  const buildToken = cacheToken

  buildingCache = (async () => {
    const buildStartTime = now
    const payments = await getAllPayments()

    const newInstance = new Fuse(payments, options)

    if (cacheToken === buildToken && payments.length > 0) {
      fuseInstance = newInstance
      lastCacheTime = buildStartTime
    }

    const buildDuration = Date.now() - buildStartTime
    logger.info({
      message: 'Search cache built',
      event: { action: 'cache-build', category: 'search' },
      recordCount: payments.length,
      durationMs: buildDuration
    })
    serverMetrics.millis('CacheBuildDuration', buildDuration)
    serverMetrics.counter('CacheRecordCount', payments.length)

    return newInstance
  })()

  try {
    return await buildingCache
  } catch (error) {
    cacheToken = Symbol(CACHE_SYMBOL_NAME)
    fuseInstance = null
    lastCacheTime = 0
    throw error
  } finally {
    buildingCache = null
  }
}

async function getAutocompleteFuseInstance () {
  if (autocompleteBuildingCache) {
    return autocompleteBuildingCache
  }

  const cacheTtl = config.get('search.cacheTtl')
  const now = Date.now()

  if (autocompleteFuseInstance && cacheTtl > 0 && (now - autocompleteLastCacheTime) < cacheTtl) {
    return autocompleteFuseInstance
  }

  const buildToken = autocompleteCacheToken

  autocompleteBuildingCache = (async () => {
    const buildStartTime = now
    const payees = await getDistinctPayees()

    const newInstance = new Fuse(payees, options)

    // Only cache if data is not empty — avoid caching a stale empty index on startup
    if (autocompleteCacheToken === buildToken && payees.length > 0) {
      autocompleteFuseInstance = newInstance
      autocompleteLastCacheTime = buildStartTime
    }

    return newInstance
  })()

  try {
    return await autocompleteBuildingCache
  } catch (error) {
    autocompleteCacheToken = Symbol(CACHE_SYMBOL_NAME)
    autocompleteFuseInstance = null
    autocompleteLastCacheTime = 0
    throw error
  } finally {
    autocompleteBuildingCache = null
  }
}

function invalidateSearchCache () {
  cacheToken = Symbol(CACHE_SYMBOL_NAME)
  fuseInstance = null
  lastCacheTime = 0
  buildingCache = null

  autocompleteCacheToken = Symbol(CACHE_SYMBOL_NAME)
  autocompleteFuseInstance = null
  autocompleteLastCacheTime = 0
  autocompleteBuildingCache = null

  logger.info({
    message: 'Search cache invalidated',
    event: { action: 'cache-invalidate', category: 'search' }
  })
  serverMetrics.counter('CacheInvalidate')
}

async function warmSearchCache () {
  await Promise.all([
    getFuseInstance(),
    getAutocompleteFuseInstance()
  ])
}

async function searchAllPayments (searchString) {
  const fuse = await getFuseInstance()
  const results = fuse.search(searchString.slice(0, 32)).map((result) => result.item)
  return results
}

function sortResults (results, sortBy) {
  if (sortBy !== 'score' && options.keys.includes(sortBy)) {
    return results.sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : -1))
  }
  return results
}

export { getPaymentData, getSearchSuggestions, invalidateSearchCache, warmSearchCache }
