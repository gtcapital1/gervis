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

export function formatPercent(value: number, decimals: number = 1): string {
  // Format as percentage with specified number of decimal places
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
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

export function formatMillions(value: number): string {
  // Format numbers in millions with 2 decimals and "M" suffix
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2).replace(/\.?0+$/, '') + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(2).replace(/\.?0+$/, '') + 'K';
  } else {
    return value.toString();
  }
}

export const formatCompactValue = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(1);
};

type ToastOptions = {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
};

// Simple toast function that uses browser's alert for now
// In a real app, you'd use a proper toast component
export function toast(options: ToastOptions) {
  console.log(`${options.title}: ${options.description}`);
  // In development, show alerts for immediate feedback
  if (process.env.NODE_ENV === 'development') {
    alert(`${options.title}\n${options.description}`);
  }
}
