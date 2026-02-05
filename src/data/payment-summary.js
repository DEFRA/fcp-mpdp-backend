import { models } from './database.js'

export async function getAllPaymentSummaries () {
  return await models.SchemePayments.findAll({
    order: [['financial_year', 'DESC'], ['scheme', 'ASC']]
  })
}

export async function getPaymentSummaryById (id) {
  return await models.SchemePayments.findByPk(id)
}

export async function createPaymentSummary (data) {
  return await models.SchemePayments.create(data)
}

export async function updatePaymentSummary (id, data) {
  const summary = await models.SchemePayments.findByPk(id)
  if (!summary) {
    return null
  }
  return await summary.update(data)
}

export async function deletePaymentSummary (id) {
  const summary = await models.SchemePayments.findByPk(id)
  if (!summary) {
    return null
  }
  await summary.destroy()
  return { deleted: true }
}
