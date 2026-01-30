import { AsyncParser } from '@json2csv/node'
import { getAnnualPayments } from '../data/database.js'

async function getPaymentSummary () {
  const payments = await getAnnualPayments()
  const sortedPayments = sortByFinancialYear(payments)
  return groupPaymentsByYear(sortedPayments)
}

async function getPaymentSummaryCsv () {
  const fields = [
    'financial_year',
    'scheme',
    {
      label: 'amount',
      value: 'total_amount'
    }
  ]
  const payments = await getAnnualPayments()
  const sortedPayments = sortByFinancialYear(payments)

  const parser = new AsyncParser({ fields })
  return parser.parse(sortedPayments).promise()
}

function sortByFinancialYear (payments) {
  return payments.toSorted((a, b) =>
    a.financial_year.localeCompare(b.financial_year)
  )
}

function groupPaymentsByYear (payments) {
  return payments.reduce((acc, item) => {
    if (!acc[item.financial_year]) {
      acc[item.financial_year] = []
    }
    acc[item.financial_year].push(item)
    return acc
  }, {})
}

export { getPaymentSummary, getPaymentSummaryCsv }
