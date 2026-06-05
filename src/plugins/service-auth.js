import Jwt from '@hapi/jwt'
import { config } from '../config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

const serviceAuth = {
  plugin: {
    name: 'service-auth',
    register: async (server) => {
      if (!config.get('serviceToServiceAuth.enabled')) {
        logger.info('Service-to-service authentication is disabled')
        return
      }

      const jwksUri = config.get('serviceToServiceAuth.jwksUri')
      const issuer = config.get('serviceToServiceAuth.issuer')
      const audience = config.get('serviceToServiceAuth.audience')

      logger.info('Registering service-to-service JWT authentication')

      await server.register(Jwt)

      const allowedServices = config.get('serviceToServiceAuth.allowedServices')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      server.auth.strategy('service', 'jwt', {
        keys: {
          uri: jwksUri
        },
        verify: {
          aud: audience,
          iss: issuer,
          sub: false
        },
        validate: (artifacts) => {
          const sub = artifacts.decoded.payload.sub
          const serviceName = sub?.split('/').pop()

          if (allowedServices.length > 0 && !allowedServices.includes(serviceName)) {
            logger.warn({ sub, serviceName }, 'Service-to-service auth rejected: service not in allowed list')
            return { isValid: false, credentials: { sub } }
          }

          return { isValid: true, credentials: { sub } }
        }
      })

      server.auth.default('service')
    }
  }
}

export { serviceAuth }
