import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

function applyFiltersAndGroupByPayee (
  searchResults,
  { schemes = [], counties = [], amounts = [], years = [] }
) {
  const schemeFilteredResults = filterBySchemes(searchResults, schemes)
  const countyFilteredResults = filterByCounties(
    schemeFilteredResults,
    counties
  )
  const yearFilteredResults = filterByYears(countyFilteredResults, years)
  const groupedResults = groupByPayee(yearFilteredResults)
  const amountFilteredResults = filterByAmounts(groupedResults, amounts)
  return amountFilteredResults.map((result) => removeKeys(result, ['scheme']))
}

function filterBySchemes (searchResults, schemes) {
  if (!schemes.length) {
    return searchResults
  }
  return searchResults.filter((result) =>
    schemes.includes(result.scheme.toLowerCase())
  )
}

function filterByCounties (searchResults, counties) {
  if (!counties.length) {
    return searchResults
  }
  return searchResults.filter((result) =>
    counties.includes(result.county_council.toLowerCase())
  )
}

function filterByYears (results, years) {
  if (!years.length) {
    return results
  }

  return results.filter((x) => years.includes(x.financial_year))
}

function groupByPayee (searchResults) {
  const map = new Map()

  for (const item of searchResults) {
    const key = `${item.payee_name}|${item.part_postcode}`
    const existing = map.get(key)

    if (existing) {
      existing.total_amount =
        Number.parseFloat(existing.total_amount) + Number.parseFloat(item.total_amount)
    } else {
      map.set(key, { ...item })
    }
  }

  return Array.from(map.values())
}

function filterByAmounts (searchResults, amounts) {
  if (!amounts.length) {
    return searchResults
  }
  const amountRanges = amounts.map((range) => {
    const [from, to] = range.split('-')
    return { from: Number.parseFloat(from), to: Number.parseFloat(to) }
  })

  return searchResults.filter((result) => {
    return amountRanges.some((range) => {
      const totalAmount = Number.parseFloat(result.total_amount)
      return !range.to
        ? totalAmount >= range.from
        : totalAmount >= range.from && totalAmount <= range.to
    })
  })
}

function getFilterOptions (searchResults) {
  if (!searchResults.length) {
    return { schemes: [], amounts: [], counties: [], years: [] }
  }

  return {
    schemes: getUniqueFields(searchResults, 'scheme'),
    counties: getUniqueFields(searchResults, 'county_council'),
    amounts: getUniqueFields(groupByPayee(searchResults), 'total_amount'),
    years: getUniqueFields(searchResults, 'financial_year')
  }
}

function getUniqueFields (searchResults, field) {
  try {
    const seen = new Set()
    const result = []

    for (const item of searchResults) {
      const value = item[field]?.toString()
      const lower = value?.toLowerCase()

      if (lower !== undefined && !seen.has(lower)) {
        seen.add(lower)
        result.push(value)
      }
    }

    return result
  } catch (err) {
    logger.error(err, 'Failed to get unique fields')
    return []
  }
}

function removeKeys (obj, keys) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  )
}

export {
  applyFiltersAndGroupByPayee,
  getFilterOptions,
  groupByPayee,
  removeKeys
}
