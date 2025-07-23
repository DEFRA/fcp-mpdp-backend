import { describe, test, expect, vi, beforeEach } from 'vitest'

const mockSequelize = vi.fn()
vi.mock('sequelize', () => ({
  Sequelize: mockSequelize
}))

const mockSigner = {
  getAuthToken: vi.fn()
}
vi.mock('@aws-sdk/rds-signer', () => ({
  Signer: vi.fn(() => mockSigner)
}))

vi.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: vi.fn(() => ({}))
}))

vi.mock('../../../../src/data/database.js', () => ({
  createModels: vi.fn(),
  healthCheck: vi.fn()
}))

const { createModels, healthCheck } = await import('../../../../src/data/database.js')
const { postgres } = await import('../../../../src/common/helpers/postgres.js')

describe('postgres plugin', () => {
  let mockServer
  let mockOptions

  beforeEach(() => {
    vi.clearAllMocks()

    mockServer = {
      logger: {
        info: vi.fn()
      },
      secureContext: false
    }

    mockOptions = {
      host: 'test-host',
      port: 5432,
      database: 'test-db',
      user: 'test-user',
      passwordForLocalDev: 'test-password',
      dialect: 'postgres',
      getTokenFromRDS: false
    }

    mockSequelize.mockReturnValue({
      authenticate: vi.fn().mockResolvedValue(undefined)
    })
  })

  test('should have correct plugin metadata', () => {
    expect(postgres.plugin.name).toBe('postgres')
    expect(postgres.plugin.version).toBe('1.0.0')
    expect(postgres.plugin.register).toBeInstanceOf(Function)
  })

  describe('plugin registration', () => {
    test('register should create a new Sequelize instance with local dev configuration', async () => {
      await postgres.plugin.register(mockServer, mockOptions)
      expect(mockSequelize).toHaveBeenCalledWith({
        username: mockOptions.user,
        password: mockOptions.passwordForLocalDev,
        host: mockOptions.host,
        port: mockOptions.port,
        dialect: mockOptions.dialect,
        database: mockOptions.database,
        dialectOptions: {
          ssl: false
        },
        logging: expect.any(Function),
        hooks: {},
        retry: {
          backOffBase: 1000,
          backOffExponent: 1.1,
          match: [/SequelizeConnectionError/],
          max: 10,
          name: 'connection',
          timeout: 60000
        },
        define: {
          timestamps: false
        }
      })
    })

    test('register should create a new Sequelize instance with production configuration', async () => {
      mockServer.secureContext = true
      mockOptions.getTokenFromRDS = true

      await postgres.plugin.register(mockServer, mockOptions)

      expect(mockSequelize).toHaveBeenCalledWith({
        username: mockOptions.user,
        password: mockOptions.passwordForLocalDev,
        host: mockOptions.host,
        port: mockOptions.port,
        dialect: mockOptions.dialect,
        database: mockOptions.database,
        dialectOptions: {
          ssl: true
        },
        logging: expect.any(Function),
        hooks: {
          beforeConnect: expect.any(Function)
        },
        retry: {
          backOffBase: 1000,
          backOffExponent: 1.1,
          match: [/SequelizeConnectionError/],
          max: 10,
          name: 'connection',
          timeout: 60000
        },
        define: {
          timestamps: false
        }
      })
    })

    test('should create models', async () => {
      await postgres.plugin.register(mockServer, mockOptions)
      expect(createModels).toHaveBeenCalledWith(expect.any(Object))
    })

    test('should check database connection is healthy', async () => {
      await postgres.plugin.register(mockServer, mockOptions)
      expect(healthCheck).toHaveBeenCalled()
    })
  })

  describe('RDS token authentication', () => {
    test('should setup RDS token hook when getTokenFromRDS is true', async () => {
      mockOptions.getTokenFromRDS = true
      mockOptions.region = 'eu-west-2'
      mockSigner.getAuthToken.mockResolvedValue('mock-rds-token')

      await postgres.plugin.register(mockServer, mockOptions)

      // Get the hooks object from the Sequelize call
      const sequelizeCallArgs = mockSequelize.mock.calls[0][0]
      const beforeConnectHook = sequelizeCallArgs.hooks.beforeConnect

      expect(beforeConnectHook).toBeInstanceOf(Function)

      // Test the beforeConnect hook
      const mockConfig = { password: 'old-password' }
      await beforeConnectHook(mockConfig)

      expect(mockSigner.getAuthToken).toHaveBeenCalled()
      expect(mockConfig.password).toBe('mock-rds-token')
    })
  })
})
