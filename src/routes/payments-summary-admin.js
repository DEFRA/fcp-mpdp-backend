import Joi from 'joi'
import {
  getAllPaymentSummaries,
  getPaymentSummaryById,
  createPaymentSummary,
  updatePaymentSummary,
  deletePaymentSummary
} from '../data/payments-summary-admin.js'

const paymentsSummaryAdmin = [
  {
    method: 'GET',
    path: '/v1/payments/admin/summary',
    options: {
      description: 'Get all payment summaries',
      tags: ['api', 'admin', 'summary']
    },
    handler: async (_request, h) => {
      const summaries = await getAllPaymentSummaries()
      return h.response(summaries)
    }
  },
  {
    method: 'GET',
    path: '/v1/payments/admin/summary/{id}',
    options: {
      description: 'Get payment summary by ID',
      tags: ['api', 'admin', 'summary'],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required()
        })
      }
    },
    handler: async (request, h) => {
      const { id } = request.params
      const summary = await getPaymentSummaryById(id)

      if (!summary) {
        return h.response({ error: 'Payment summary not found' }).code(404)
      }

      return h.response(summary)
    }
  },
  {
    method: 'POST',
    path: '/v1/payments/admin/summary',
    options: {
      description: 'Create payment summary',
      tags: ['api', 'admin', 'summary'],
      validate: {
        payload: Joi.object({
          financial_year: Joi.string().max(8).required(),
          scheme: Joi.string().max(64).required(),
          total_amount: Joi.number().required()
        })
      }
    },
    handler: async (request, h) => {
      const summary = await createPaymentSummary(request.payload)
      return h.response(summary).code(201)
    }
  },
  {
    method: 'PUT',
    path: '/v1/payments/admin/summary/{id}',
    options: {
      description: 'Update payment summary',
      tags: ['api', 'admin', 'summary'],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required()
        }),
        payload: Joi.object({
          financial_year: Joi.string().max(8).optional(),
          scheme: Joi.string().max(64).optional(),
          total_amount: Joi.number().optional()
        })
      }
    },
    handler: async (request, h) => {
      const { id } = request.params
      const summary = await updatePaymentSummary(id, request.payload)

      if (!summary) {
        return h.response({ error: 'Payment summary not found' }).code(404)
      }

      return h.response(summary)
    }
  },
  {
    method: 'DELETE',
    path: '/v1/payments/admin/summary/{id}',
    options: {
      description: 'Delete payment summary',
      tags: ['api', 'admin', 'summary'],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required()
        })
      }
    },
    handler: async (request, h) => {
      const { id } = request.params
      const result = await deletePaymentSummary(id)

      if (!result) {
        return h.response({ error: 'Payment summary not found' }).code(404)
      }

      return h.response(result)
    }
  }
]

export { paymentsSummaryAdmin }
