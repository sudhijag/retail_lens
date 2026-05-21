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
  lastUpdatedMs: number
  seller: string
  shippingDays: number
  promoLabel?: string
  // Price change velocity
  changeCount24h: number
  changeCount7d: number
  priceVelocity: 'rising' | 'falling' | 'stable'
}

export interface ProductAttribute {
  label: string
  value: string
}

export interface Product {
  id: string
  name: string
  emoji: string
  imageUrl: string
  platformImages?: Partial<Record<string, string>>
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

export type AlertType =
  | 'price_drop' | 'promo_detected' | 'new_match'
  | 'stock_alert' | 'price_spike' | 'recommendation' | 'undercut'

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

export type NewsItemType =
  | 'price_event'       // multiple price changes, algorithmic pattern
  | 'market_context'    // external event / season driving prices
  | 'competitor_pattern'// behavioral pattern across platforms
  | 'prediction'        // forward-looking forecast
  | 'platform_behavior' // platform-level analysis

export interface NewsItem {
  id: string
  type: NewsItemType
  headline: string
  body: string
  productIds: string[]
  platformId: string | null  // null = cross-platform
  confidence: number          // 0–100
  tags: string[]              // e.g. ["Prime Day", "algorithmic", "seasonal"]
  timestampMs: number
  severity: 'critical' | 'warning' | 'info'
  changeFrequency?: {
    platform: string
    count24h: number
    count7d: number
    direction: '↑' | '↓' | '↕'
  }
}

export interface MarketSummary {
  cheapest: { platformId: string; price: number }
  mostExpensive: { platformId: string; price: number }
  average: number
  yourRank: number
  totalPlayers: number
  gapFromCheapest: number
  gapPercent: number
}
