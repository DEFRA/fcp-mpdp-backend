import Hapi from '@hapi/hapi'
import Joi from 'joi'

import { config } from './config.js'
import { router } from './plugins/router.js'
import { swagger } from './plugins/swagger.js'
import { requestLogger } from './common/helpers/logging/request-logger.js'
import { failAction } from './common/helpers/fail-action.js'
import { secureContext } from './common/helpers/secure-context/index.js'
import { pulse } from './common/helpers/pulse.js'
import { requestTracing } from './common/helpers/request-tracing.js'
import { setupProxy } from './common/helpers/proxy/setup-proxy.js'
import { postgres } from './common/helpers/postgres.js'

async function createServer () {
  setupProxy()
  const server = Hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        },
        failAction
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    }
  })

  server.validator(Joi)

  // Hapi Plugins:
  // requestLogger  - automatically logs incoming requests
  // requestTracing - trace header logging and propagation
  // secureContext  - loads CA certificates from environment config
  // pulse          - provides shutdown handlers
  // postgres       - database connection
  // swagger        - API documentation
  // router         - routes used in the app
  await server.register([
    requestLogger,
    requestTracing,
    secureContext,
    pulse,
    postgres,
    ...swagger,
    router
  ])

  return server
}

export { createServer }
