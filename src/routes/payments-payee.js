import Joi from 'joi'
import { getPayeeDetails, getPayeeDetailsCsv } from '../data/payee.js'
import { metricsCounter } from '../common/helpers/metrics.js'

const options = {
  tags: ['api', 'payments'],
  validate: {
    params: Joi.object({
      payeeName: Joi.string().trim().required(),
      partPostcode: Joi.string().trim().required()
    }),
    failAction: async (_request, h, error) =>
      h.response(error.toString()).code(400).takeover()
  }
}

const paymentsPayee = [
  {
    method: 'GET',
    path: '/v1/payments/{payeeName}/{partPostcode}',
    options: {
      ...options,
      description: 'Get specific payee payment details',
      notes: 'Returns detailed payment information for a specific payee'
    },
    handler: async (request, h) => {
      const { payeeName, partPostcode } = request.params
      const payeeDetails = await getPayeeDetails(payeeName, partPostcode)

      if (!payeeDetails) {
        return h.response('Payee not found').code(404)
      }

      request.logger.info({
        message: 'Payee detail lookup',
        event: { action: 'payee-detail', category: 'payment' }
      })
      metricsCounter('PayeeDetailRequests')

      return h.response(payeeDetails)
    }
  },
  {
    method: 'GET',
    path: '/v1/payments/{payeeName}/{partPostcode}/file',
    options: {
      ...options,
      description: 'Download specific payee payment details as CSV',
      notes: 'Returns payment details for a specific payee as a downloadable CSV file'
    },
    handler: async (request, h) => {
      const { payeeName, partPostcode } = request.params
      const payeeDetailsCsv = await getPayeeDetailsCsv(payeeName, partPostcode)

      request.logger.info({
        message: 'CSV download payee detail',
        event: { action: 'download-payee-detail', category: 'download' }
      })
      metricsCounter('CsvDownloadPayeeDetail')

      return h
        .response(payeeDetailsCsv)
        .type('text/csv')
        .header(
          'Content-Disposition',
          'attachment;filename=ffc-payment-details.csv'
        )
    }
  }
]

export { paymentsPayee }
