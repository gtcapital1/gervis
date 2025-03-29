import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  // Format as currency with euro symbol
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export function formatNumber(value: number): string {
  // Format as number with thousand separators
  return new Intl.NumberFormat('it-IT', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(value)
}

export function formatPercent(value: number): string {
  // Format as percentage with 1 decimal place
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 100)
}

export function formatDate(date: string | Date): string {
  // Format date as DD/MM/YYYY
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}
