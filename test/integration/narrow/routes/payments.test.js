import { describe, test, beforeEach, afterEach, vi, expect } from 'vitest'

vi.mock('../../../../src/data/database.js', () => {
  return {
    createModels: vi.fn(),
    healthCheck: vi.fn()
  }
})

vi.mock('../../../../src/data/search.js')
vi.mock('../../../../src/data/payments.js')

const { getPaymentData } = await import('../../../../src/data/search.js')
const { getAllPaymentsCsvStream, getPaymentsCsv } = await import('../../../../src/data/payments.js')
const { createServer } = await import('../../../../src/server.js')

getPaymentData.mockResolvedValue('payment data')
getAllPaymentsCsvStream.mockReturnValue('csv stream')
getPaymentsCsv.mockResolvedValue('payments,csv')

const searchString = 'searchString'
const limit = 1
const offset = 1
const sortBy = 'sort'
const action = 'download'
const schemes = ['scheme']
const counties = ['county']
const amounts = ['amount']
const years = ['year']

let server

describe('payments routes', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    server = await createServer()
    await server.initialize()
  })

  afterEach(async () => {
    await server.stop()
  })

  test('POST /v1/payments should return 200', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  test('POST /v1/payments should return payment data', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.payload).toBe('payment data')
  })

  test('POST /v1/payments should trim search string', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString: ` ${searchString} `,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ searchString }))
  })

  test('POST /v1/payments should return 400 if searchString is empty string', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString: '',
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return error message if searchString is not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.payload).toBe('ValidationError: "searchString" is required')
  })

  test('POST /v1/payments should return 400 if limit is not a number', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit: 'limit',
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 400 if limit is not an integer', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit: 1.1,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 400 if limit is less than 1', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit: 0,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 400 if limit is not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 400 if offset is not a number', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset: 'offset',
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 400 if offset is not an integer', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset: 1.1,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 400 if offset is less than 0', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset: -1,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should allow offset as 0', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset: 0,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  test('POST /v1/payments should default offset to 0 if not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }))
  })

  test('POST /v1/payments should return 400 if sortBy is not a string', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy: 1,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should default sortBy to "score" if not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'score' }))
  })

  test('POST /v1/payments should return 400 if filterBy is not an object', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: 'filterBy',
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should default filterBy to an empty object if not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        action
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ filterBy: {} }))
  })

  test('POST /v1/payments should return 400 if filterBy includes an invalid property', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          invalid: 'invalid'
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 400 if filterBy.schemes is not an array', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes: 'schemes',
          counties,
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should convert filterBy.schemes to lowercase', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes: ['SCHEME'],
          counties,
          amounts,
          years
        },
        action
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ filterBy: expect.objectContaining({ schemes: ['scheme'] }) }))
  })

  test.each([' schemes ', 'schemes '])('POST /v1/payments should trim filterBy.schemes', async (scheme) => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes: [scheme],
          counties,
          amounts,
          years
        },
        action
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ filterBy: expect.objectContaining({ schemes: ['schemes'] }) }))
  })

  test('POST /v1/payments should return 400 if filterBy.counties is not an array', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties: 'counties',
          amounts,
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should convert filterBy.counties to lowercase', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties: ['COUNTY'],
          amounts,
          years
        },
        action
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ filterBy: expect.objectContaining({ counties: ['county'] }) }))
  })

  test.each([' counties ', 'counties '])('POST /v1/payments should trim filterBy.counties', async (county) => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties: [county],
          amounts,
          years
        },
        action
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ filterBy: expect.objectContaining({ counties: ['counties'] }) }))
  })

  test('POST /v1/payments should return 400 if filterBy.amounts is not an array', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts: 'amounts',
          years
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 400 if filterBy.years is not an array', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years: 'years'
        },
        action
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments should return 200 if action is not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  test.each([' action ', 'action '])('POST /v1/payments should trim action', async (act) => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action: act
      }
    }
    await server.inject(options)
    expect(getPaymentData).toHaveBeenCalledWith(expect.objectContaining({ action: 'action' }))
  })

  test('POST /v1/payments should return 400 if action empty string', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments',
      payload: {
        searchString,
        limit,
        offset,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        },
        action: ''
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments/file should return 200', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })

  test('POST /v1/payments/file should return payments csv', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.payload).toBe('payments,csv')
  })

  test('POST /v1/payments/file should trim search string', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString: ` ${searchString} `,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        }
      }
    }
    await server.inject(options)
    expect(getPaymentsCsv).toHaveBeenCalledWith(expect.objectContaining({ searchString }))
  })

  test('POST /v1/payments/file should return 400 if searchString is empty string', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString: '',
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments/file should return error message if searchString is not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.payload).toBe('ValidationError: "searchString" is required')
  })

  test('POST /v1/payments/file should return 400 if sortBy is not a string', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy: 1,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments/file should default sortBy to "score" if not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        filterBy: {
          schemes,
          counties,
          amounts,
          years
        }
      }
    }
    await server.inject(options)
    expect(getPaymentsCsv).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'score' }))
  })

  test('POST /v1/payments/file should return 400 if filterBy is not an object', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: 'filterBy'
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments/file should default filterBy to an empty object if not provided', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy
      }
    }
    await server.inject(options)
    expect(getPaymentsCsv).toHaveBeenCalledWith(expect.objectContaining({ filterBy: {} }))
  })

  test('POST /v1/payments/file should return 400 if filterBy includes an invalid property', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          invalid: 'invalid'
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments/file should return 400 if filterBy.schemes is not an array', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes: 'schemes',
          counties,
          amounts,
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments/file should convert filterBy.schemes to lowercase', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes: ['SCHEME'],
          counties,
          amounts,
          years
        }
      }
    }
    await server.inject(options)
    expect(getPaymentsCsv).toHaveBeenCalledWith(expect.objectContaining({ filterBy: expect.objectContaining({ schemes: ['scheme'] }) }))
  })

  test.each([' schemes ', 'schemes '])('POST /v1/payments/file should trim filterBy.schemes', async (scheme) => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes: [scheme],
          counties,
          amounts,
          years
        }
      }
    }
    await server.inject(options)
    expect(getPaymentsCsv).toHaveBeenCalledWith(expect.objectContaining({ filterBy: expect.objectContaining({ schemes: ['schemes'] }) }))
  })

  test('POST /v1/payments/file should return 400 if filterBy.counties is not an array', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes,
          counties: 'counties',
          amounts,
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments/file should convert filterBy.counties to lowercase', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes,
          counties: ['COUNTY'],
          amounts,
          years
        }
      }
    }
    await server.inject(options)
    expect(getPaymentsCsv).toHaveBeenCalledWith(expect.objectContaining({ filterBy: expect.objectContaining({ counties: ['county'] }) }))
  })

  test.each([' counties ', 'counties '])('POST /v1/payments/file should trim filterBy.counties', async (county) => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes,
          counties: [county],
          amounts,
          years
        }
      }
    }
    await server.inject(options)
    expect(getPaymentsCsv).toHaveBeenCalledWith(expect.objectContaining({ filterBy: expect.objectContaining({ counties: ['counties'] }) }))
  })

  test('POST /v1/payments/file should return 400 if filterBy.amounts is not an array', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts: 'amounts',
          years
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('POST /v1/payments/file should return 400 if filterBy.years is not an array', async () => {
    const options = {
      method: 'POST',
      url: '/v1/payments/file',
      payload: {
        searchString,
        sortBy,
        filterBy: {
          schemes,
          counties,
          amounts,
          years: 'years'
        }
      }
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(400)
  })

  test('GET /v1/payments/file should return 200', async () => {
    const options = {
      method: 'GET',
      url: '/v1/payments/file'
    }
    const response = await server.inject(options)
    expect(response.statusCode).toBe(200)
  })
})
