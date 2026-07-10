import { Metrics } from '@defra/cdp-metrics'
import { createLogger } from './logging/logger.js'

const serverMetrics = new Metrics(createLogger())

export { serverMetrics }
