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

const CACHE_SYMBOL_NAME = 'cache-token'

let fuseInstance = null
let lastCacheTime = 0
let buildingCache = null
let cacheToken = Symbol(CACHE_SYMBOL_NAME)

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
  const searchResults = await searchAllPayments(searchString)
  const groupedResults = groupByPayee(searchResults)

  const suggestions = {
    count: groupedResults.length,
    rows: groupedResults
      .map((groupedResult) =>
        removeKeys(groupedResult, ['scheme', 'total_amount', 'financial_year'])
      )
      .slice(0, suggestionResultsLimit)
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

    // Only set cache if token hasn't changed (not invalidated during build)
    if (cacheToken === buildToken) {
      fuseInstance = newInstance
      lastCacheTime = buildStartTime
    }

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

function invalidateSearchCache () {
  cacheToken = Symbol(CACHE_SYMBOL_NAME)
  fuseInstance = null
  lastCacheTime = 0
  buildingCache = null
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

export { getPaymentData, getSearchSuggestions, invalidateSearchCache }
