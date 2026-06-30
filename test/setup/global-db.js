import { resolve } from 'node:path'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { GenericContainer, Network, Wait } from 'testcontainers'

const DB_NAME = 'fcp_mpdp_backend'
const DB_USER = 'postgres'
const DB_PASSWORD = 'postgres'

export async function setup () {
  const network = await new Network().start()

  const postgres = await new PostgreSqlContainer('postgres:16.6')
    .withNetwork(network)
    .withNetworkAliases('postgres')
    .withDatabase(DB_NAME)
    .withUsername(DB_USER)
    .withPassword(DB_PASSWORD)
    .start()

  const changelogPath = resolve(process.cwd(), 'changelog')

  await new GenericContainer('liquibase/liquibase:4')
    .withNetwork(network)
    .withBindMounts([{ source: changelogPath, target: '/liquibase/changelog' }])
    .withCommand([
      `--url=jdbc:postgresql://postgres:5432/${DB_NAME}`,
      `--username=${DB_USER}`,
      `--password=${DB_PASSWORD}`,
      '--changelog-file=changelog/db.changelog.xml',
      'update'
    ])
    .withWaitStrategy(Wait.forOnMessage('Liquibase command \'update\' successfully executed'))
    .start()

  process.env.POSTGRES_HOST = postgres.getHost()
  process.env.POSTGRES_HOST_READ = postgres.getHost()
  process.env.POSTGRES_PORT = String(postgres.getMappedPort(5432))
  process.env.POSTGRES_USER = DB_USER
  process.env.POSTGRES_PASSWORD = DB_PASSWORD
  process.env.POSTGRES_DB = DB_NAME
  process.env.POSTGRES_GET_TOKEN_FROM_RDS = 'false'
  process.env.NODE_ENV = 'test'

  return async function teardown () {
    await postgres.stop()
    await network.stop()
  }
}
