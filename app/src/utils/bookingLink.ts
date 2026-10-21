import type { Router } from 'vue-router'

export const buildProviderBookingLink = (router: Router, providerId: string) =>
  new URL(
    router.resolve({ name: 'model-booking', query: { provider: providerId } }).href,
    window.location.origin,
  ).href
