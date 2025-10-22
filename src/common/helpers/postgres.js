import { Sequelize } from 'sequelize'
import { Signer } from '@aws-sdk/rds-signer'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { config } from '../../config.js'
import { healthCheck, createModels } from '../../data/database.js'

export const postgres = {
  plugin: {
    name: 'postgres',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up Postgres')

      if (options.getTokenFromRDS) {
        options.hooks = {
          beforeConnect: async (cfg) => {
            cfg.password = await getToken(options)
          }
        }
      }

      const sequelize = new Sequelize({
        username: options.user,
        password: options.passwordForLocalDev,
        host: options.host,
        port: options.port,
        dialect: options.dialect,
        database: options.database,
        pool: {
          max: options.poolMax,
          min: options.poolMin,
          idle: options.poolIdle,
          acquire: 30000,
          evict: 60000
        },
        dialectOptions: {
          ssl: server.secureContext || false,
          keepAlive: true,
          keepAliveInitialDelayMillis: 0
        },
        logging: (msg) => server.logger.info(msg),
        hooks: options.hooks || {},
        retry: {
          backOffBase: 1000,
          backOffExponent: 1.1,
          match: [/SequelizeConnectionError/],
          max: 10,
          name: 'connection',
          timeout: 60 * 1000
        },
        define: {
          timestamps: false
        }
      })
      const databaseName = options.database

      createModels(sequelize)
      await healthCheck()

      server.logger.info(`Postgres connected to ${databaseName}`)
    }
  },
  options: config.get('postgres')
}

async function getToken (options) {
  const signer = new Signer({
    hostname: options.host,
    port: options.port,
    username: options.user,
    credentials: fromNodeProviderChain(),
    region: options.region
  })
  return signer.getAuthToken()
}
