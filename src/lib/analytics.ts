import { track } from '@vercel/analytics'

type EventProperties = Record<string, string | number | boolean | null | undefined>

export function trackEvent(name: string, properties?: EventProperties) {
  track(name, properties)
}
