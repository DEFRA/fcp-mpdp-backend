import { models } from './database.js'
import csvParser from 'csv-parser'

async function getPaymentById (id) {
  return models.PaymentDetail.findByPk(id, { raw: true })
}

async function createPayment (paymentData) {
  return models.PaymentDetail.create({
    ...paymentData,
    published_date: new Date()
  })
}

async function updatePayment (id, paymentData) {
  const payment = await models.PaymentDetail.findByPk(id)
  if (!payment) {
    return null
  }
  await payment.update(paymentData)
  return payment.get({ plain: true })
}

async function deletePayment (id) {
  const payment = await models.PaymentDetail.findByPk(id)
  if (!payment) {
    return null
  }
  await payment.destroy()
  return { deleted: true }
}

async function deletePaymentsByYear (financialYear) {
  const paymentCount = await models.PaymentDetail.count({
    where: { financial_year: financialYear }
  })

  const schemeCount = await models.SchemePayments.count({
    where: { financial_year: financialYear }
  })

  await models.PaymentDetail.destroy({
    where: { financial_year: financialYear }
  })

  await models.SchemePayments.destroy({
    where: { financial_year: financialYear }
  })

  return {
    deleted: true,
    paymentCount,
    schemeCount
  }
}

async function getFinancialYears () {
  const years = await models.PaymentDetail.findAll({
    attributes: ['financial_year'],
    group: ['financial_year'],
    raw: true,
    order: [['financial_year', 'DESC']]
  })
  return years.map(y => y.financial_year).filter(Boolean)
}

async function getAllPaymentsForAdmin (page = 1, limit = 20) {
  const offset = (page - 1) * limit

  const { count, rows } = await models.PaymentDetail.findAndCountAll({
    limit,
    offset,
    order: [['id', 'DESC']],
    raw: true
  })

  return {
    count,
    rows,
    page,
    totalPages: Math.ceil(count / limit)
  }
}

async function searchPaymentsForAdmin (searchString, page = 1, limit = 20) {
  const offset = (page - 1) * limit

  const whereClause = searchString
    ? {
        payee_name: {
          [models.PaymentDetail.sequelize.Sequelize.Op.iLike]: `%${searchString}%`
        }
      }
    : {}

  const { count, rows } = await models.PaymentDetail.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['id', 'DESC']],
    raw: true
  })

  return {
    count,
    rows,
    page,
    totalPages: Math.ceil(count / limit)
  }
}

async function bulkUploadPayments (csvStream) {
  const payments = []
  const errors = []
  let rowNumber = 0

  return new Promise((resolve, reject) => {
    csvStream
      .pipe(csvParser())
      .on('data', (row) => {
        rowNumber++
        try {
          const payment = {
            payee_name: row.payee_name,
            part_postcode: row.part_postcode,
            town: row.town,
            parliamentary_constituency: row.parliamentary_constituency,
            county_council: row.county_council,
            scheme: row.scheme,
            amount: Number.parseFloat(row.amount),
            financial_year: row.financial_year,
            payment_date: row.payment_date ? new Date(row.payment_date) : null,
            scheme_detail: row.scheme_detail,
            activity_level: row.activity_level,
            published_date: new Date()
          }
          payments.push(payment)
        } catch (err) {
          errors.push({ row: rowNumber, error: err.message })
        }
      })
      .on('end', async () => {
        try {
          if (payments.length > 0) {
            await models.PaymentDetail.bulkCreate(payments, { validate: true })
          }
          resolve({
            success: true,
            imported: payments.length,
            errors
          })
        } catch (err) {
          reject(err)
        }
      })
      .on('error', (err) => {
        reject(err)
      })
  })
}

export {
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  deletePaymentsByYear,
  getFinancialYears,
  getAllPaymentsForAdmin,
  searchPaymentsForAdmin,
  bulkUploadPayments
}
