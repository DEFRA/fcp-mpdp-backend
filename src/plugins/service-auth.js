import Jwt from '@hapi/jwt'
import { config } from '../config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

const logger = createLogger()

const serviceAuth = {
  plugin: {
    name: 'service-auth',
    register: async (server) => {
      if (!config.get('serviceAuth.enabled')) {
        logger.info('Service-to-service authentication is disabled')
        return
      }

      const jwksUri = config.get('serviceAuth.jwksUri')
      const issuer = config.get('serviceAuth.issuer')
      const audience = config.get('serviceAuth.audience')

      logger.info('Registering service-to-service JWT authentication')

      await server.register(Jwt)

      const allowedServices = config.get('serviceAuth.allowedServices')
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

          if (!sub) {
            logger.warn('Service-to-service auth rejected: missing sub claim')
            return { isValid: false }
          }

          const serviceName = sub.split('/').pop()

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
