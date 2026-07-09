import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'
import { config } from '../../config.js'
import { createLogger } from './logging/logger.js'

async function metricsCounter (metricName, value = 1) {
  if (!config.get('isMetricsEnabled')) {
    return
  }

  try {
    const metricsLogger = createMetricsLogger()
    metricsLogger.putMetric(
      metricName,
      value,
      Unit.Count,
      StorageResolution.Standard
    )
    await metricsLogger.flush()
  } catch (err) {
    createLogger().error(err, err.message)
  }
}

async function metricsDuration (metricName, valueMs) {
  if (!config.get('isMetricsEnabled')) {
    return
  }

  try {
    const metricsLogger = createMetricsLogger()
    metricsLogger.putMetric(
      metricName,
      valueMs,
      Unit.Milliseconds,
      StorageResolution.Standard
    )
    await metricsLogger.flush()
  } catch (err) {
    createLogger().error(err, err.message)
  }
}

export { metricsCounter, metricsDuration }
