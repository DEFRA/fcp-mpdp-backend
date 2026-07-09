import Joi from 'joi'
import {
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  deletePaymentsByYear,
  deletePaymentsByPublishedDate,
  getFinancialYears,
  getAllPaymentsForAdmin,
  searchPaymentsForAdmin,
  bulkUploadPayments,
  bulkSetPublishedDate,
  getPaymentsByPublishedDateTotals
} from '../data/payments-admin.js'
import { metricsCounter } from '../common/helpers/metrics.js'

const paymentsAdmin = [
  {
    method: 'GET',
    path: '/v1/payments/admin/payments',
    options: {
      description: 'Get paginated list of all payments for admin',
      notes: 'Returns all payment records with pagination',
      tags: ['api', 'admin', 'payments'],
      validate: {
        query: Joi.object({
          page: Joi.number().integer().positive().default(1),
          limit: Joi.number().integer().positive().max(100).default(20),
          searchString: Joi.string().trim().optional()
        })
      }
    },
    handler: async (request, h) => {
      const { page, limit, searchString } = request.query

      const payments = searchString
        ? await searchPaymentsForAdmin(searchString, page, limit)
        : await getAllPaymentsForAdmin(page, limit)

      return h.response(payments)
    }
  },
  {
    method: 'GET',
    path: '/v1/payments/admin/payments/{id}',
    options: {
      description: 'Get a single payment by ID',
      notes: 'Returns payment record details',
      tags: ['api', 'admin', 'payments'],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required()
        })
      }
    },
    handler: async (request, h) => {
      const { id } = request.params
      const payment = await getPaymentById(id)

      if (!payment) {
        return h.response({ error: 'Payment not found' }).code(404)
      }

      return h.response(payment)
    }
  },
  {
    method: 'POST',
    path: '/v1/payments/admin/payments',
    options: {
      description: 'Create a new payment record',
      notes: 'Adds a new payment to the database',
      tags: ['api', 'admin', 'payments'],
      validate: {
        payload: Joi.object({
          payee_name: Joi.string().max(128).required(),
          part_postcode: Joi.string().max(8).required(),
          town: Joi.string().max(128).optional().allow('').allow(null),
          parliamentary_constituency: Joi.string().max(64).optional().allow('').allow(null),
          county_council: Joi.string().max(128).optional().allow('').allow(null),
          scheme: Joi.string().max(64).optional().allow('').allow(null),
          amount: Joi.number().required(),
          financial_year: Joi.string().max(8).required(),
          payment_date: Joi.date().optional().allow(null),
          scheme_detail: Joi.string().max(128).optional().allow('').allow(null),
          activity_level: Joi.string().max(64).optional().allow('').allow(null)
        })
      }
    },
    handler: async (request, h) => {
      const payment = await createPayment(request.payload)

      request.logger.info({
        message: 'Payment created',
        event: { action: 'create-payment', category: 'admin', outcome: 'success' }
      })
      metricsCounter('AdminPaymentCreate')

      return h.response(payment).code(201)
    }
  },
  {
    method: 'PUT',
    path: '/v1/payments/admin/payments/{id}',
    options: {
      description: 'Update an existing payment record',
      notes: 'Updates payment details by ID',
      tags: ['api', 'admin', 'payments'],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required()
        }),
        payload: Joi.object({
          payee_name: Joi.string().max(128).optional(),
          part_postcode: Joi.string().max(8).optional(),
          town: Joi.string().max(128).optional().allow('').allow(null),
          parliamentary_constituency: Joi.string().max(64).optional().allow('').allow(null),
          county_council: Joi.string().max(128).optional().allow('').allow(null),
          scheme: Joi.string().max(64).optional().allow('').allow(null),
          amount: Joi.number().optional(),
          financial_year: Joi.string().max(8).optional(),
          payment_date: Joi.date().optional().allow(null),
          scheme_detail: Joi.string().max(128).optional().allow('').allow(null),
          activity_level: Joi.string().max(64).optional().allow('').allow(null)
        })
      }
    },
    handler: async (request, h) => {
      const { id } = request.params
      const payment = await updatePayment(id, request.payload)

      if (!payment) {
        return h.response({ error: 'Payment not found' }).code(404)
      }

      request.logger.info({
        message: 'Payment updated',
        event: { action: 'update-payment', category: 'admin', outcome: 'success' },
        paymentId: id
      })
      metricsCounter('AdminPaymentUpdate')

      return h.response(payment)
    }
  },
  {
    method: 'DELETE',
    path: '/v1/payments/admin/payments/{id}',
    options: {
      description: 'Delete a payment record',
      notes: 'Removes a payment from the database',
      tags: ['api', 'admin', 'payments'],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required()
        })
      }
    },
    handler: async (request, h) => {
      const { id } = request.params
      const result = await deletePayment(id)

      if (!result) {
        return h.response({ error: 'Payment not found' }).code(404)
      }

      request.logger.info({
        message: 'Payment deleted',
        event: { action: 'delete-payment', category: 'admin', outcome: 'success' },
        paymentId: id
      })
      metricsCounter('AdminPaymentDelete')

      return h.response(result)
    }
  },
  {
    method: 'POST',
    path: '/v1/payments/admin/payments/bulk-upload',
    options: {
      description: 'Bulk upload payments from CSV',
      notes: 'Upload CSV file to add multiple payments',
      tags: ['api', 'admin', 'payments'],
      payload: {
        parse: false,
        output: 'stream',
        allow: 'text/csv',
        maxBytes: 104857600 // 100MB
      }
    },
    handler: async (request, h) => {
      try {
        const result = await bulkUploadPayments(request.payload)

        request.logger.info({
          message: 'Bulk upload completed',
          event: { action: 'bulk-upload', category: 'admin', outcome: 'success' },
          recordCount: result.count
        })
        metricsCounter('AdminBulkUpload')

        return h.response(result).code(201)
      } catch (err) {
        request.logger.info({
          message: 'Bulk upload failed',
          event: { action: 'bulk-upload', category: 'admin', outcome: 'failure' },
          error: { message: err.message }
        })
        return h.response({
          success: false,
          error: err.message
        }).code(400)
      }
    }
  },
  {
    method: 'GET',
    path: '/v1/payments/admin/financial-years',
    options: {
      description: 'Get list of all financial years',
      notes: 'Returns unique financial years from payment data',
      tags: ['api', 'admin']
    },
    handler: async (_request, h) => {
      const years = await getFinancialYears()
      return h.response(years)
    }
  },
  {
    method: 'DELETE',
    path: '/v1/payments/admin/payments/year/{financialYear}',
    options: {
      description: 'Delete all payments by financial year',
      notes: 'Removes all payment and scheme records for a financial year',
      tags: ['api', 'admin', 'payments'],
      validate: {
        params: Joi.object({
          financialYear: Joi.string().max(8).required()
        })
      }
    },
    handler: async (request, h) => {
      const { financialYear } = request.params
      const result = await deletePaymentsByYear(financialYear)

      request.logger.info({
        message: 'Payments deleted by year',
        event: { action: 'delete-by-year', category: 'admin', outcome: 'success' },
        financialYear
      })
      metricsCounter('AdminDeleteByYear')

      return h.response(result)
    }
  },
  {
    method: 'DELETE',
    path: '/v1/payments/admin/payments/published-date/{publishedDate}',
    options: {
      description: 'Delete all payments by published date',
      notes: 'Removes all payment records with published date equal to or earlier than the provided date',
      tags: ['api', 'admin', 'payments'],
      validate: {
        params: Joi.object({
          publishedDate: Joi.date().iso().required()
        })
      }
    },
    handler: async (request, h) => {
      const { publishedDate } = request.params
      const result = await deletePaymentsByPublishedDate(publishedDate)

      request.logger.info({
        message: 'Payments deleted by published date',
        event: { action: 'delete-by-published-date', category: 'admin', outcome: 'success' },
        publishedDate
      })
      metricsCounter('AdminDeleteByPublishedDate')

      return h.response(result)
    }
  },
  {
    method: 'PUT',
    path: '/v1/payments/admin/payments/year/{financialYear}/published-date',
    options: {
      description: 'Bulk set published date for all payments by financial year',
      notes: 'Updates the published_date field for all payment records matching the financial year',
      tags: ['api', 'admin', 'payments'],
      validate: {
        params: Joi.object({
          financialYear: Joi.string().max(8).required()
        }),
        payload: Joi.object({
          published_date: Joi.date().required()
        })
      }
    },
    handler: async (request, h) => {
      const { financialYear } = request.params
      const { published_date: publishedDate } = request.payload
      const result = await bulkSetPublishedDate(financialYear, publishedDate)

      request.logger.info({
        message: 'Published date set for year',
        event: { action: 'set-published-date', category: 'admin', outcome: 'success' },
        financialYear,
        publishedDate
      })
      metricsCounter('AdminSetPublishedDate')

      return h.response(result)
    }
  },
  {
    method: 'GET',
    path: '/v1/payments/admin/payments/published-date-totals',
    options: {
      description: 'Get payment counts grouped by published date and financial year',
      notes: 'Returns all payment records grouped by published date and financial year with a count',
      tags: ['api', 'admin', 'payments']
    },
    handler: async (_request, h) => {
      const totals = await getPaymentsByPublishedDateTotals()
      return h.response(totals)
    }
  }
]

export { paymentsAdmin }
