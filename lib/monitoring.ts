import * as Sentry from '@sentry/nextjs'

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', error, context)
    return
  }
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

export function captureMessage(message: string, level: 'info' | 'warning' = 'info') {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${level}]`, message)
    return
  }
  Sentry.captureMessage(message, level)
}
