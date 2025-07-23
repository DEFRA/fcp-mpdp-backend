import { expect, test, describe, beforeEach, afterAll, vi } from 'vitest'

describe('config', () => {
  const PROCESS_ENV = process.env

  beforeEach(() => {
    vi.resetModules()

    process.env = { ...PROCESS_ENV }

    process.env.NODE_ENV = 'test'

    process.env.HOST = '1.1.1.1'
    process.env.PORT = '6000'
    process.env.SERVICE_VERSION = '1.0.0'
    process.env.ENVIRONMENT = 'dev'
    process.env.LOG_ENABLED = 'true'
    process.env.LOG_LEVEL = 'debug'
    process.env.LOG_FORMAT = 'ecs'
    process.env.HTTP_PROXY = 'http://proxy:8080'
    process.env.ENABLE_SECURE_CONTEXT = 'true'
    process.env.ENABLE_METRICS = 'true'
    process.env.TRACING_HEADER = 'x-custom-trace-id'

    process.env.POSTGRES_HOST = 'test-postgres-host'
    process.env.POSTGRES_HOST_READ = 'test-postgres-read-host'
    process.env.POSTGRES_PORT = '6000'
    process.env.POSTGRES_USER = 'test-postgres-username'
    process.env.POSTGRES_PASSWORD = 'test-postgres-password'
    process.env.POSTGRES_DB = 'test-postgres-db'
    process.env.POSTGRES_GET_TOKEN_FROM_RDS = 'false'
    process.env.POSTGRES_REGION = 'us-west-2'
  })

  afterAll(() => {
    process.env = { ...PROCESS_ENV }
  })

  test('should return host from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('host')).toBe('1.1.1.1')
  })

  test('should default host to 0.0.0.0 if not provided in environment variable', async () => {
    delete process.env.HOST
    const { config } = await import('../../src/config.js')
    expect(config.get('host')).toBe('0.0.0.0')
  })

  test('should throw error if host is not an IP address', async () => {
    process.env.HOST = 'invalid-ip-address'
    await expect(async () => await import('../../src/config.js')).rejects.toThrow()
  })

  test('should return port from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('port')).toBe(6000)
  })

  test('should default port to 3001 if not provided in environment variable', async () => {
    delete process.env.PORT
    const { config } = await import('../../src/config.js')
    expect(config.get('port')).toBe(3001)
  })

  test('should throw error if port is not a number', async () => {
    process.env.PORT = 'invalid-port'
    await expect(async () => await import('../../src/config.js')).rejects.toThrow()
  })

  test('should throw error if port is not a valid port number', async () => {
    process.env.PORT = '99999'
    await expect(async () => await import('../../src/config.js')).rejects.toThrow()
  })

  test('should return service name with default value', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('serviceName')).toBe('fcp-mpdp-backend')
  })

  test('should return service version from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('serviceVersion')).toBe('1.0.0')
  })

  test('should return null service version if not provided in environment variable', async () => {
    delete process.env.SERVICE_VERSION
    const { config } = await import('../../src/config.js')
    expect(config.get('serviceVersion')).toBeNull()
  })

  test('should return cdp environment from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('cdpEnvironment')).toBe('dev')
  })

  test('should default cdp environment to local if not provided in environment variable', async () => {
    delete process.env.ENVIRONMENT
    const { config } = await import('../../src/config.js')
    expect(config.get('cdpEnvironment')).toBe('local')
  })

  test('should return log enabled from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('log.isEnabled')).toBe(true)
  })

  test('should default log enabled to true for non-test environments', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.LOG_ENABLED
    const { config } = await import('../../src/config.js')
    expect(config.get('log.isEnabled')).toBe(true)
  })

  test('should return log level from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('log.level')).toBe('debug')
  })

  test('should default log level to info if not provided in environment variable', async () => {
    delete process.env.LOG_LEVEL
    const { config } = await import('../../src/config.js')
    expect(config.get('log.level')).toBe('info')
  })

  test('should return log format from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('log.format')).toBe('ecs')
  })

  test('should default log format to pino-pretty for non-production environments', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.LOG_FORMAT
    const { config } = await import('../../src/config.js')
    expect(config.get('log.format')).toBe('pino-pretty')
  })

  test('should return http proxy from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('httpProxy')).toBe('http://proxy:8080')
  })

  test('should return null http proxy if not provided in environment variable', async () => {
    delete process.env.HTTP_PROXY
    const { config } = await import('../../src/config.js')
    expect(config.get('httpProxy')).toBeNull()
  })

  test('should return secure context enabled from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('isSecureContextEnabled')).toBe(true)
  })

  test('should default secure context enabled to false for non-production environments', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.ENABLE_SECURE_CONTEXT
    const { config } = await import('../../src/config.js')
    expect(config.get('isSecureContextEnabled')).toBe(false)
  })

  test('should return metrics enabled from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('isMetricsEnabled')).toBe(true)
  })

  test('should default metrics enabled to false for non-production environments', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.ENABLE_METRICS
    const { config } = await import('../../src/config.js')
    expect(config.get('isMetricsEnabled')).toBe(false)
  })

  test('should return tracing header from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('tracing.header')).toBe('x-custom-trace-id')
  })

  test('should default tracing header to x-cdp-request-id if not provided in environment variable', async () => {
    delete process.env.TRACING_HEADER
    const { config } = await import('../../src/config.js')
    expect(config.get('tracing.header')).toBe('x-cdp-request-id')
  })

  test('should return postgres host from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.host')).toBe('test-postgres-host')
  })

  test('should throw error if postgres host is not provided in environment variable', async () => {
    delete process.env.POSTGRES_HOST
    await expect(async () => await import('../../src/config.js')).rejects.toThrow()
  })

  test('should return postgres host read only from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.hostReadOnly')).toBe('test-postgres-read-host')
  })

  test('should default postgres host read only to postgres if not provided in environment variable', async () => {
    delete process.env.POSTGRES_HOST_READ
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.hostReadOnly')).toBe('postgres')
  })

  test('should return postgres port from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.port')).toBe(6000)
  })

  test('should return postgres port as 5432 if not provided in environment variable', async () => {
    delete process.env.POSTGRES_PORT
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.port')).toBe(5432)
  })

  test('should return postgres database name from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.database')).toBe('test-postgres-db')
  })

  test('should return default postgres database name if not provided in environment variable', async () => {
    delete process.env.POSTGRES_DB
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.database')).toBe('fcp_mpdp_backend')
  })

  test('should return postgres username from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.user')).toBe('test-postgres-username')
  })

  test('should return default postgres username if not provided in environment variable', async () => {
    delete process.env.POSTGRES_USER
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.user')).toBe('fcp_mpdp_backend')
  })

  test('should return postgres get token from RDS from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.getTokenFromRDS')).toBe(false)
  })

  test('should default postgres get token from RDS to true if not provided in environment variable', async () => {
    delete process.env.POSTGRES_GET_TOKEN_FROM_RDS
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.getTokenFromRDS')).toBe(true)
  })

  test('should return postgres password from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.passwordForLocalDev')).toBe('test-postgres-password')
  })

  test('should return default postgres password if not provided in environment variable', async () => {
    delete process.env.POSTGRES_PASSWORD
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.passwordForLocalDev')).toBe('postgres')
  })

  test('should not throw error if postgres password is not provided in environment variable', async () => {
    delete process.env.POSTGRES_PASSWORD
    expect(async () => await import('../../src/config.js')).not.toThrow()
  })

  test('should return postgres region from environment variable', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.region')).toBe('us-west-2')
  })

  test('should default postgres region to eu-west-2 if not provided in environment variable', async () => {
    delete process.env.POSTGRES_REGION
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.region')).toBe('eu-west-2')
  })

  test('should return postgres dialect as postgres', async () => {
    const { config } = await import('../../src/config.js')
    expect(config.get('postgres.dialect')).toBe('postgres')
  })
})
