import { models } from './database.js'

export async function getAllPaymentSummaries () {
  return models.SchemePayments.findAll({
    order: [['financial_year', 'DESC'], ['scheme', 'ASC']]
  })
}

export async function getPaymentSummaryById (id) {
  return models.SchemePayments.findByPk(id)
}

export async function createPaymentSummary (data) {
  return models.SchemePayments.create(data)
}

export async function updatePaymentSummary (id, data) {
  const summary = await models.SchemePayments.findByPk(id)
  if (!summary) {
    return null
  }
  return summary.update(data)
}

export async function deletePaymentSummary (id) {
  const summary = await models.SchemePayments.findByPk(id)
  if (!summary) {
    return null
  }
  await summary.destroy()
  return { deleted: true }
}
