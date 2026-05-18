import type { Platform, Product, Alert, Listing, PricePoint } from './types'

export const PLATFORMS: Platform[] = [
  { id: 'AMZ', name: 'Amazon',  shortName: 'AMZ', color: '#e47911', bgClass: 'amz' },
  { id: 'WMT', name: 'Walmart', shortName: 'WMT', color: '#0071dc', bgClass: 'wmt' },
  { id: 'TGT', name: 'Target',  shortName: 'TGT', color: '#cc0000', bgClass: 'tgt' },
  { id: 'EBY', name: 'eBay',    shortName: 'EBY', color: '#e53238', bgClass: 'eby' },
  { id: 'SHN', name: 'Shein',   shortName: 'SHN', color: '#181818', bgClass: 'shn' },
]

// Deterministic PRNG so chart data is stable across renders
function prng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 4294967296
  }
}

function generateHistory(basePrice: number, productIdx: number, platformIdx: number): PricePoint[] {
  const rand = prng(productIdx * 997 + platformIdx * 113)
  const history: PricePoint[] = []
  let price = basePrice * (0.95 + rand() * 0.1)
  const base = new Date('2026-04-18')

  for (let i = 0; i < 30; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    price = price * (1 + (rand() - 0.5) * 0.05)
    price = Math.max(basePrice * 0.72, Math.min(basePrice * 1.25, price))
    const isPromo = rand() < 0.09
    const displayPrice = isPromo ? price * (0.78 + rand() * 0.07) : price
    history.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: Math.round(displayPrice * 100) / 100,
      isPromo,
    })
  }
  return history
}

const BASE_PRICES: Record<string, Record<string, number>> = {
  'CLR-GLSS-001': { AMZ: 22.99, WMT: 19.99, TGT: 26.99, EBY: 15.99, SHN: 11.99 },
  'WHT-TEE-3340': { AMZ: 12.99, WMT:  9.99, TGT: 13.99, EBY:  8.49, SHN:  5.99 },
  'WHT-SNK-2201': { AMZ: 29.99, WMT: 24.99, TGT: 34.99, EBY: 21.99, SHN: 17.99 },
  'BLK-BCK-0087': { AMZ: 19.99, WMT: 22.99, TGT: 27.99, EBY: 17.49, SHN: 13.99 },
  'DNM-JNS-4450': { AMZ: 34.99, WMT: 28.99, TGT: 39.99, EBY: 29.99, SHN: 22.99 },
}

interface ListingMeta {
  id: string; seller: string; rating: number
  reviews: number; ship: number; conf: number
}

const LISTING_META: Record<string, Record<string, ListingMeta>> = {
  'CLR-GLSS-001': {
    AMZ: { id: 'B0CX1RMFTP', seller: 'TIJN Official',    rating: 4.3, reviews:  8241, ship:  2, conf: 94 },
    WMT: { id: 'WM-482991',   seller: 'Clara Frames',     rating: 4.1, reviews:  3102, ship:  3, conf: 89 },
    TGT: { id: 'TGT-GL-0047', seller: 'A.Kjaerbede',      rating: 4.4, reviews:  1847, ship:  4, conf: 91 },
    EBY: { id: 'EBY-294841',  seller: 'eyewear_hub',      rating: 3.9, reviews:   524, ship:  6, conf: 76 },
    SHN: { id: 'SHN-5529012', seller: 'Shein',            rating: 3.7, reviews: 12940, ship: 12, conf: 72 },
  },
  'WHT-TEE-3340': {
    AMZ: { id: 'B09RRLN4YV', seller: 'Gildan Direct',     rating: 4.5, reviews: 42100, ship:  2, conf: 97 },
    WMT: { id: 'WM-201834',  seller: 'Hanes',             rating: 4.4, reviews: 28730, ship:  2, conf: 96 },
    TGT: { id: 'TGT-AT-1102',seller: 'Goodfellow & Co',   rating: 4.3, reviews: 11200, ship:  3, conf: 93 },
    EBY: { id: 'EBY-104923', seller: 'bulk_apparel',      rating: 4.0, reviews:  2310, ship:  5, conf: 81 },
    SHN: { id: 'SHN-7710023',seller: 'Shein',             rating: 3.8, reviews: 67400, ship: 14, conf: 68 },
  },
  'WHT-SNK-2201': {
    AMZ: { id: 'B0BXZ7KQWP', seller: 'Vans Outlet',      rating: 4.4, reviews: 19300, ship:  2, conf: 92 },
    WMT: { id: 'WM-560123',  seller: 'Athletic Works',    rating: 4.1, reviews:  8740, ship:  3, conf: 87 },
    TGT: { id: 'TGT-FW-3310',seller: 'Universal Thread',  rating: 4.3, reviews:  5220, ship:  4, conf: 90 },
    EBY: { id: 'EBY-334910', seller: 'sneaker_surplus',   rating: 4.2, reviews:  1120, ship:  5, conf: 79 },
    SHN: { id: 'SHN-8824120',seller: 'Shein',             rating: 3.6, reviews: 34200, ship: 14, conf: 64 },
  },
  'BLK-BCK-0087': {
    AMZ: { id: 'B0BYMQSH41', seller: 'Amazon Basics',     rating: 4.5, reviews: 31400, ship:  1, conf: 96 },
    WMT: { id: 'WM-887231',  seller: 'Mainstays',         rating: 4.2, reviews: 14200, ship:  2, conf: 91 },
    TGT: { id: 'TGT-BG-0812',seller: 'Embark',            rating: 4.3, reviews:  7810, ship:  3, conf: 89 },
    EBY: { id: 'EBY-509174', seller: 'bags_direct',       rating: 3.8, reviews:   892, ship:  7, conf: 74 },
    SHN: { id: 'SHN-3310482',seller: 'Shein',             rating: 3.5, reviews: 22100, ship: 14, conf: 67 },
  },
  'DNM-JNS-4450': {
    AMZ: { id: 'B0CGM1YKQP', seller: "Levi's Direct",    rating: 4.3, reviews: 24800, ship:  2, conf: 95 },
    WMT: { id: 'WM-334729',  seller: 'Wrangler',          rating: 4.2, reviews: 18300, ship:  2, conf: 93 },
    TGT: { id: 'TGT-DN-2240',seller: 'Universal Thread',  rating: 4.1, reviews:  9410, ship:  3, conf: 91 },
    EBY: { id: 'EBY-712840', seller: 'denim_outlet',      rating: 4.0, reviews:  2830, ship:  5, conf: 82 },
    SHN: { id: 'SHN-6640293',seller: 'Shein',             rating: 3.4, reviews: 41200, ship: 16, conf: 61 },
  },
}

function buildListings(productId: string, productIdx: number): Record<string, Listing> {
  const result: Record<string, Listing> = {}
  PLATFORMS.forEach((p, pi) => {
    const base = BASE_PRICES[productId][p.id]
    const meta = LISTING_META[productId][p.id]
    const history = generateHistory(base, productIdx, pi)
    const current = history[history.length - 1].price
    const isPromoNow = history[history.length - 1].isPromo
    result[p.id] = {
      platformId: p.id,
      listingId: meta.id,
      currentPrice: current,
      originalPrice: Math.round(base * 1.15 * 100) / 100,
      inStock: meta.reviews > 500,
      rating: meta.rating,
      reviewCount: meta.reviews,
      matchConfidence: meta.conf,
      priceHistory: history,
      lastUpdated: '2 min ago',
      seller: meta.seller,
      shippingDays: meta.ship,
      promoLabel: isPromoNow ? 'SALE' : undefined,
    }
  })
  return result
}

export const PRODUCTS: Product[] = [
  {
    id: 'CLR-GLSS-001',
    name: 'Clear Rimless Oval Glasses',
    emoji: '🕶️',
    category: 'Eyewear',
    subcategory: 'Fashion Glasses',
    tags: ['rimless', 'clear frame', 'oval lens', 'unbranded'],
    aiDescription:
      'Lightweight clear-acetate rimless glasses with oval polycarbonate lenses. Adjustable silicone nose pads, spring-hinge temples, UV400 protection. Popular unbranded style replicated by 12+ retailers.',
    yourPrice: 24.99,
    attributes: [
      { label: 'Frame Material', value: 'Clear Acetate' },
      { label: 'Lens Shape',     value: 'Oval' },
      { label: 'Bridge Type',    value: 'Adjustable Nose Pad' },
      { label: 'Hinge',          value: 'Spring Hinge' },
      { label: 'UV Protection',  value: 'UV400' },
      { label: 'Weight',         value: '18g' },
      { label: 'Gender',         value: 'Unisex' },
    ],
    listings: buildListings('CLR-GLSS-001', 0),
    matchStatus: 'matched',
    overallMatchScore: 91,
  },
  {
    id: 'WHT-TEE-3340',
    name: 'Basic Crew-Neck White T-Shirt',
    emoji: '👕',
    category: 'Apparel',
    subcategory: 'Tops',
    tags: ['white', 'crew neck', 'cotton', 'unbranded', 'basic'],
    aiDescription:
      'Classic 100% cotton crew-neck T-shirt in optic white. Ribbed collar, double-needle sleeve and hem, pre-shrunk fabric. One of the most replicated unbranded apparel SKUs across e-commerce.',
    yourPrice: 14.99,
    attributes: [
      { label: 'Material',  value: '100% Cotton' },
      { label: 'Color',     value: 'Optic White' },
      { label: 'Neckline',  value: 'Crew Neck' },
      { label: 'Fit',       value: 'Regular' },
      { label: 'Sleeve',    value: 'Short Sleeve' },
      { label: 'Weight',    value: '180 GSM' },
      { label: 'Sizes',     value: 'XS–3XL' },
    ],
    listings: buildListings('WHT-TEE-3340', 1),
    matchStatus: 'matched',
    overallMatchScore: 96,
  },
  {
    id: 'WHT-SNK-2201',
    name: 'White Canvas Low-Top Sneakers',
    emoji: '👟',
    category: 'Footwear',
    subcategory: 'Sneakers',
    tags: ['white', 'canvas', 'low-top', 'unbranded', 'rubber sole'],
    aiDescription:
      'Minimalist low-profile canvas sneaker in all-white. Vulcanized rubber sole, cotton canvas upper, metal eyelet lacing. No visible branding — high visual similarity across 9 competing retailers.',
    yourPrice: 32.99,
    attributes: [
      { label: 'Upper',          value: 'Cotton Canvas' },
      { label: 'Sole',           value: 'Vulcanized Rubber' },
      { label: 'Color',          value: 'All White' },
      { label: 'Closure',        value: 'Lace-Up' },
      { label: 'Toe Shape',      value: 'Round' },
      { label: 'Profile',        value: 'Low-Top' },
      { label: 'Unisex Sizing',  value: 'US 5–13' },
    ],
    listings: buildListings('WHT-SNK-2201', 2),
    matchStatus: 'matched',
    overallMatchScore: 88,
  },
  {
    id: 'BLK-BCK-0087',
    name: 'Black Nylon Drawstring Backpack',
    emoji: '🎒',
    category: 'Accessories',
    subcategory: 'Bags',
    tags: ['black', 'nylon', 'drawstring', 'lightweight', 'unbranded'],
    aiDescription:
      'Lightweight 210D nylon drawstring backpack in matte black. Reinforced shoulder straps, single inner compartment, small exterior zip pocket. Highly commoditized SKU with 11 near-identical versions.',
    yourPrice: 25.99,
    attributes: [
      { label: 'Material',   value: '210D Nylon' },
      { label: 'Color',      value: 'Matte Black' },
      { label: 'Closure',    value: 'Drawstring' },
      { label: 'Volume',     value: '15L' },
      { label: 'Pockets',    value: '1 Exterior Zip' },
      { label: 'Strap Type', value: 'Reinforced Nylon' },
      { label: 'Weight',     value: '180g' },
    ],
    listings: buildListings('BLK-BCK-0087', 3),
    matchStatus: 'review',
    overallMatchScore: 83,
  },
  {
    id: 'DNM-JNS-4450',
    name: 'Blue Straight-Leg Denim Jeans',
    emoji: '👖',
    category: 'Apparel',
    subcategory: 'Bottoms',
    tags: ['blue', 'denim', 'straight leg', 'mid-rise', 'unbranded'],
    aiDescription:
      'Mid-rise straight-leg jeans in classic medium-wash blue denim. 98% cotton 2% elastane, 5-pocket construction, zip fly. One of the most price-sensitive commodity SKUs in fashion retail.',
    yourPrice: 42.99,
    attributes: [
      { label: 'Material',  value: '98% Cotton, 2% Elastane' },
      { label: 'Wash',      value: 'Medium Blue' },
      { label: 'Rise',      value: 'Mid-Rise' },
      { label: 'Fit',       value: 'Straight Leg' },
      { label: 'Closure',   value: 'Zip Fly' },
      { label: 'Pockets',   value: '5-Pocket' },
      { label: 'Sizes',     value: 'W28–W40, L28–L36' },
    ],
    listings: buildListings('DNM-JNS-4450', 4),
    matchStatus: 'matched',
    overallMatchScore: 93,
  },
]

export const INITIAL_ALERTS: Alert[] = [
  {
    id: 'a1',
    type: 'price_drop',
    productId: 'CLR-GLSS-001',
    productName: 'Clear Rimless Oval Glasses',
    platformId: 'WMT',
    message: 'Walmart dropped price 18%',
    detail: 'Walmart cut price $23.49 → $19.99. You are now $5.00 above the market low.',
    timestamp: '2 min ago',
    severity: 'critical',
    isNew: true,
    actionLabel: 'Reprice Now',
  },
  {
    id: 'a2',
    type: 'promo_detected',
    productId: 'WHT-TEE-3340',
    productName: 'Basic White T-Shirt',
    platformId: 'SHN',
    message: 'Shein flash sale — 30% off',
    detail: 'Shein price dropped to $4.19 (was $5.99). Likely a 24-hr flash event. Monitor for reversal.',
    timestamp: '7 min ago',
    severity: 'warning',
    isNew: true,
    actionLabel: 'View Sale',
  },
  {
    id: 'a3',
    type: 'recommendation',
    productId: 'WHT-SNK-2201',
    productName: 'White Canvas Sneakers',
    platformId: 'AMZ',
    message: 'Price optimization opportunity',
    detail: 'Amazon review velocity +22% this week. Demand rising. Price gap: you are $8 above Amazon. Est. +31% conversions if matched.',
    timestamp: '14 min ago',
    severity: 'info',
    isNew: false,
    actionLabel: 'See Analysis',
  },
  {
    id: 'a4',
    type: 'undercut',
    productId: 'BLK-BCK-0087',
    productName: 'Black Nylon Backpack',
    platformId: 'EBY',
    message: 'eBay seller undercutting by $8.50',
    detail: 'New eBay listing at $17.49 — $8.50 below your price of $25.99. 74% visual match confidence.',
    timestamp: '22 min ago',
    severity: 'warning',
    isNew: false,
    actionLabel: 'Review Match',
  },
  {
    id: 'a5',
    type: 'price_spike',
    productId: 'DNM-JNS-4450',
    productName: 'Blue Denim Straight Jeans',
    platformId: 'TGT',
    message: 'Target increased price 12% — opportunity',
    detail: 'Target raised $35.99 → $39.99. You are now closest to their price at $42.99. Consider holding margin.',
    timestamp: '38 min ago',
    severity: 'info',
    isNew: false,
    actionLabel: 'Hold Price',
  },
  {
    id: 'a6',
    type: 'new_match',
    productId: 'CLR-GLSS-001',
    productName: 'Clear Rimless Oval Glasses',
    platformId: 'AMZ',
    message: 'New visual match detected on Amazon',
    detail: 'Amazon listing B0DX9PQZRT — 88% visual similarity to CLR-GLSS-001. Priced at $18.99. Added to watchlist.',
    timestamp: '1 hr ago',
    severity: 'info',
    isNew: false,
    actionLabel: 'Review Match',
  },
  {
    id: 'a7',
    type: 'stock_alert',
    productId: 'WHT-TEE-3340',
    productName: 'Basic White T-Shirt',
    platformId: 'WMT',
    message: 'Walmart low stock signal detected',
    detail: 'Walmart stock changed to "Only 3 left". Competitor supply constraint window: estimated 2–5 days.',
    timestamp: '2 hr ago',
    severity: 'warning',
    isNew: false,
  },
]

// Build merged chart data for recharts (all platforms per date)
export function buildChartData(product: Product): Record<string, string | number>[] {
  const days = product.listings['AMZ'].priceHistory
  return days.map((point, i) => {
    const entry: Record<string, string | number> = { date: point.date }
    PLATFORMS.forEach(p => {
      entry[p.id] = product.listings[p.id].priceHistory[i].price
    })
    return entry
  })
}

export function getMarketSummary(product: Product, yourPrice: number) {
  const prices = PLATFORMS.map(p => ({
    platformId: p.id,
    price: product.listings[p.id].currentPrice,
  }))
  const sorted = [...prices].sort((a, b) => a.price - b.price)
  const avg = prices.reduce((s, p) => s + p.price, 0) / prices.length
  const cheapest = sorted[0]
  const mostExpensive = sorted[sorted.length - 1]
  const allPrices = [...prices.map(p => p.price), yourPrice].sort((a, b) => a - b)
  const yourRank = allPrices.indexOf(yourPrice) + 1
  return {
    cheapest,
    mostExpensive,
    average: Math.round(avg * 100) / 100,
    yourRank,
    totalPlayers: allPrices.length,
    gapFromCheapest: Math.round((yourPrice - cheapest.price) * 100) / 100,
    gapPercent: Math.round(((yourPrice - cheapest.price) / cheapest.price) * 100),
  }
}
