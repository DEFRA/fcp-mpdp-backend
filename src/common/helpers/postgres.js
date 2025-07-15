import { config } from '../../config.js'
import { register } from '../../data/database.js'

export const postgres = {
  plugin: {
    name: 'postgres',
    version: '1.0.0',
    register: async function (server, options) {
      server.logger.info('Setting up Postgres')

      const sequelize = await register(server, options)
      const databaseName = options.database

      await sequelize.authenticate()
      server.logger.info(`Postgres connected to ${databaseName}`)
      server.decorate('server', 'db', sequelize)
    }
  },
  options: config.get('postgres')
}
