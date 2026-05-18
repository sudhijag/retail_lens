export interface Platform {
  id: string
  name: string
  shortName: string
  color: string
  bgClass: string
}

export interface PricePoint {
  date: string
  price: number
  isPromo: boolean
}

export interface Listing {
  platformId: string
  listingId: string
  currentPrice: number
  originalPrice: number
  inStock: boolean
  rating: number
  reviewCount: number
  matchConfidence: number
  priceHistory: PricePoint[]
  lastUpdated: string
  seller: string
  shippingDays: number
  promoLabel?: string
}

export interface ProductAttribute {
  label: string
  value: string
}

export interface Product {
  id: string
  name: string
  emoji: string
  category: string
  subcategory: string
  tags: string[]
  aiDescription: string
  yourPrice: number
  attributes: ProductAttribute[]
  listings: Record<string, Listing>
  matchStatus: 'matched' | 'review' | 'failed' | 'pending'
  overallMatchScore: number
}

export type AlertType = 'price_drop' | 'promo_detected' | 'new_match' | 'stock_alert' | 'price_spike' | 'recommendation' | 'undercut'

export interface Alert {
  id: string
  type: AlertType
  productId: string
  productName: string
  platformId: string
  message: string
  detail: string
  timestamp: string
  severity: 'critical' | 'warning' | 'info'
  isNew: boolean
  actionLabel?: string
}

export interface MarketSummary {
  cheapest: { platformId: string; price: number }
  mostExpensive: { platformId: string; price: number }
  average: number
  yourRank: number
  gapFromCheapest: number
  gapPercent: number
}
