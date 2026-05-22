import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Convert a dollar amount to written words for the PA ASR form
// e.g. 325000 → "Three Hundred Twenty-Five Thousand"
export function numberToWords(n) {
  if (!n || isNaN(n)) return ''
  n = Math.round(n)
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
  ]
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function chunk(num) {
    if (num === 0) return ''
    if (num < 20) return ones[num]
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? '-' + ones[num % 10] : '')
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + chunk(num % 100) : '')
  }

  if (n === 0) return 'Zero'
  const parts = []
  if (n >= 1_000_000) { parts.push(chunk(Math.floor(n / 1_000_000)) + ' Million');  n %= 1_000_000 }
  if (n >= 1_000)     { parts.push(chunk(Math.floor(n / 1_000))     + ' Thousand'); n %= 1_000 }
  if (n > 0)            parts.push(chunk(n))
  return parts.join(' ')
}

export function formatCurrency(value) {
  if (!value && value !== 0) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export const STATUS_COLORS = {
  draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  sent: 'bg-blue-100 text-blue-800 border-blue-200',
  pending_signature: 'bg-purple-100 text-purple-800 border-purple-200',
  executed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  pending_signature: 'Pending Signature',
  executed: 'Executed',
  cancelled: 'Cancelled',
}
