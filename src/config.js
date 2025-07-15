import convict from 'convict'
import convictFormatWithValidator from 'convict-format-with-validator'

convict.addFormats(convictFormatWithValidator)

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'

const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'fcp-mpdp-backend'
  },
  cdpEnvironment: {
    doc: 'The CDP environment the app is running in. With the addition of "local" for local development',
    format: [
      'local',
      'infra-dev',
      'management',
      'dev',
      'test',
      'perf-test',
      'ext-test',
      'prod'
    ],
    default: 'local',
    env: 'ENVIRONMENT'
  },
  log: {
    isEnabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy URL',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  tracing: {
    header: {
      doc: 'CDP tracing header name',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  },
  postgres: {
    host: {
      doc: 'Postgres host',
      format: String,
      default: 'postgres',
      env: 'POSTGRES_HOST'
    },
    hostReadOnly: {
      doc: 'Postgres read-only host',
      format: String,
      default: 'postgres',
      env: 'POSTGRES_HOST_READ'
    },
    port: {
      doc: 'Postgres port',
      format: 'port',
      default: 5432,
      env: 'POSTGRES_PORT'
    },
    database: {
      doc: 'Postgres database name',
      format: String,
      default: 'fcp_mpdp_backend',
      env: 'POSTGRES_DB'
    },
    user: {
      doc: 'Postgres user',
      format: String,
      default: 'fcp_mpdp_backend',
      env: 'POSTGRES_USER'
    },
    getTokenFromRDS: {
      doc: 'Get token from RDS',
      format: Boolean,
      default: true,
      env: 'POSTGRES_GET_TOKEN_FROM_RDS'
    },
    passwordForLocalDev: {
      doc: 'Postgres password for local development',
      format: String,
      default: 'postgres',
      env: 'POSTGRES_PASSWORD'
    },
    region: {
      doc: 'AWS region for RDS',
      format: String,
      default: 'eu-west-2',
      env: 'POSTGRES_REGION'
    },
    dialect: {
      doc: 'Sequelize dialect',
      format: String,
      default: 'postgres'
    }
  }
})

config.validate({ allowed: 'strict' })

export { config }
