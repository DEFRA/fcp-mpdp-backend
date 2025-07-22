import { expect, test, describe, beforeEach, vi } from 'vitest'

vi.mock('../../../src/routes/health.js')
vi.mock('../../../src/routes/payments.js')
vi.mock('../../../src/routes/payments-payee.js')
vi.mock('../../../src/routes/payments-search.js')
vi.mock('../../../src/routes/payments-summary.js')

const { health } = await import('../../../src/routes/health.js')
const { payments } = await import('../../../src/routes/payments.js')
const { paymentsPayee } = await import('../../../src/routes/payments-payee.js')
const { paymentsSearch } = await import('../../../src/routes/payments-search.js')
const { paymentsSummary } = await import('../../../src/routes/payments-summary.js')

const mockServer = {
  route: vi.fn()
}

const { router } = await import('../../../src/plugins/router.js')

describe('router plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('should have a name', () => {
    expect(router.plugin.name).toBe('router')
  })

  test('should have a register function', () => {
    expect(router.plugin.register).toBeInstanceOf(Function)
  })

  test('should register routes', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledTimes(1)
  })

  test('should register health route', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledWith(expect.arrayContaining([health]))
  })

  test('should register payments route', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledWith(expect.arrayContaining(payments))
  })

  test('should register payments-payee route', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledWith(expect.arrayContaining(paymentsPayee))
  })

  test('should register payments-search route', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledWith(expect.arrayContaining([paymentsSearch]))
  })

  test('should register payments-summary route', () => {
    router.plugin.register(mockServer)
    expect(mockServer.route).toHaveBeenCalledWith(expect.arrayContaining(paymentsSummary))
  })
})
