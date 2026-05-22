import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
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
