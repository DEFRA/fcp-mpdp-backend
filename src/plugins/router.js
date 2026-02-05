import { health } from '../routes/health.js'
import { payments } from '../routes/payments.js'
import { paymentsSearch } from '../routes/payments-search.js'
import { paymentsSummary } from '../routes/payments-summary.js'
import { paymentsPayee } from '../routes/payments-payee.js'
import { paymentsAdmin } from '../routes/payments-admin.js'
import { paymentsSummaryAdmin } from '../routes/payments-summary-admin.js'

const router = {
  plugin: {
    name: 'router',
    register: (server, _options) => {
      server.route(
        [].concat(
          health,
          paymentsAdmin,
          paymentsSummaryAdmin,
          payments,
          paymentsSearch,
          paymentsSummary,
          paymentsPayee
        )
      )
    }
  }
}

export { router }
