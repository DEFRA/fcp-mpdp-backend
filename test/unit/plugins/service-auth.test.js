import { describe, test, beforeEach, vi, expect } from 'vitest'

const mockConfigGet = vi.fn()

vi.mock('../../../src/config.js', () => ({
  config: { get: mockConfigGet }
}))

vi.mock('@hapi/jwt', () => ({
  default: {
    plugin: {
      name: 'jwt',
      register: vi.fn()
    }
  }
}))

vi.mock('../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn()
  })
}))

const Jwt = await import('@hapi/jwt')
const { serviceAuth } = await import('../../../src/plugins/service-auth.js')

describe('service-auth plugin', () => {
  let mockServer

  beforeEach(() => {
    vi.clearAllMocks()
    mockServer = {
      register: vi.fn(),
      auth: {
        strategy: vi.fn(),
        default: vi.fn()
      }
    }
  })

  test('should have the name service-auth', () => {
    expect(serviceAuth.plugin.name).toBe('service-auth')
  })

  describe('when service-to-service auth is disabled', () => {
    beforeEach(() => {
      mockConfigGet.mockImplementation((key) => {
        if (key === 'serviceToServiceAuth.enabled') return false
        return null
      })
    })

    test('should not register the JWT plugin', async () => {
      await serviceAuth.plugin.register(mockServer)
      expect(mockServer.register).not.toHaveBeenCalled()
    })

    test('should not create an auth strategy', async () => {
      await serviceAuth.plugin.register(mockServer)
      expect(mockServer.auth.strategy).not.toHaveBeenCalled()
    })

    test('should not set a default auth strategy', async () => {
      await serviceAuth.plugin.register(mockServer)
      expect(mockServer.auth.default).not.toHaveBeenCalled()
    })
  })

  describe('when service-to-service auth is enabled', () => {
    beforeEach(() => {
      mockConfigGet.mockImplementation((key) => {
        if (key === 'serviceToServiceAuth.enabled') return true
        if (key === 'serviceToServiceAuth.jwksUri') return 'https://test-jwks.example.com'
        if (key === 'serviceToServiceAuth.issuer') return 'https://test-issuer.example.com'
        if (key === 'serviceToServiceAuth.audience') return 'fcp-mpdp-backend'
        return null
      })
    })

    test('should register the JWT plugin', async () => {
      await serviceAuth.plugin.register(mockServer)
      expect(mockServer.register).toHaveBeenCalledWith(Jwt.default)
    })

    test('should create a service auth strategy with the correct keys', async () => {
      await serviceAuth.plugin.register(mockServer)
      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'service',
        'jwt',
        expect.objectContaining({
          keys: { uri: 'https://test-jwks.example.com' }
        })
      )
    })

    test('should create a service auth strategy with the correct verification options', async () => {
      await serviceAuth.plugin.register(mockServer)
      expect(mockServer.auth.strategy).toHaveBeenCalledWith(
        'service',
        'jwt',
        expect.objectContaining({
          verify: {
            aud: 'fcp-mpdp-backend',
            iss: 'https://test-issuer.example.com',
            sub: false
          }
        })
      )
    })

    test('should set service as the default auth strategy', async () => {
      await serviceAuth.plugin.register(mockServer)
      expect(mockServer.auth.default).toHaveBeenCalledWith('service')
    })

    test('validate callback should return valid credentials from the JWT payload', async () => {
      await serviceAuth.plugin.register(mockServer)
      const strategyOptions = mockServer.auth.strategy.mock.calls[0][2]
      const result = strategyOptions.validate({
        decoded: {
          payload: { sub: 'arn:aws:iam::123456789012:role/fcp-mpdp-frontend' }
        }
      })
      expect(result).toEqual({
        isValid: true,
        credentials: { sub: 'arn:aws:iam::123456789012:role/fcp-mpdp-frontend' }
      })
    })
  })
})
