import Joi from 'joi'
import {
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  deletePaymentsByYear,
  getFinancialYears,
  getAllPaymentsForAdmin,
  searchPaymentsForAdmin,
  bulkUploadPayments
} from '../data/payments-admin.js'

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

      if (searchString) {
        const payments = await searchPaymentsForAdmin(searchString, page, limit)
        return h.response(payments)
      }

      const payments = await getAllPaymentsForAdmin(page, limit)
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
        return h.response(result).code(201)
      } catch (err) {
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
      return h.response(result)
    }
  }
]

export { paymentsAdmin }
