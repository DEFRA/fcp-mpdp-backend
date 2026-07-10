import { invalidateSearchCache, warmSearchCache } from '../data/search.js'
import { metricsCounter } from '../common/helpers/metrics.js'

const cacheAdmin = [
  {
    method: 'POST',
    path: '/v1/payments/admin/cache/invalidate',
    options: {
      description: 'Invalidate the search cache',
      notes: 'Clears the in-memory Fuse.js search index and triggers a background rebuild',
      tags: ['api', 'admin']
    },
    handler: (request, h) => {
      invalidateSearchCache()

      request.logger.info({
        message: 'Cache invalidation requested',
        event: { action: 'cache-invalidate-request', category: 'admin', outcome: 'success' }
      })
      metricsCounter('AdminCacheInvalidate')

      warmSearchCache().catch((err) => {
        request.logger.error(err, 'Failed to rebuild search cache after invalidation')
      })

      return h.response({ message: 'Search cache invalidated' })
    }
  }
]

export { cacheAdmin }
