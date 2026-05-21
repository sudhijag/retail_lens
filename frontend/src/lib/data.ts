import type { Platform, Product, Alert, Listing, PricePoint, NewsItem } from './types'
import { PLATFORM_LAST_UPDATED } from './timeUtils'

export const PLATFORMS: Platform[] = [
  { id: 'AMZ', name: 'Amazon',  shortName: 'AMZ', color: '#e47911', bgClass: 'amz' },
  { id: 'WMT', name: 'Walmart', shortName: 'WMT', color: '#0071dc', bgClass: 'wmt' },
  { id: 'TGT', name: 'Target',  shortName: 'TGT', color: '#cc0000', bgClass: 'tgt' },
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
  'CLR-GLSS-001': { AMZ: 22.99, WMT: 19.99, TGT: 26.99 },
  'WHT-TEE-3340': { AMZ: 12.99, WMT:  9.99, TGT: 13.99 },
  'WHT-SNK-2201': { AMZ: 29.99, WMT: 24.99, TGT: 34.99 },
  'BLK-BCK-0087': { AMZ: 19.99, WMT: 22.99, TGT: 27.99 },
  'DNM-JNS-4450': { AMZ: 34.99, WMT: 28.99, TGT: 39.99 },
}

// Price change counts per platform/product (24h / 7d) and velocity
const CHANGE_DATA: Record<string, Record<string, { c24: number; c7d: number; vel: 'rising'|'falling'|'stable' }>> = {
  'CLR-GLSS-001': { AMZ:{c24:4,c7d:11,vel:'falling'}, WMT:{c24:2,c7d:5,vel:'falling'}, TGT:{c24:0,c7d:2,vel:'stable'} },
  'WHT-TEE-3340': { AMZ:{c24:1,c7d:4,vel:'stable'},   WMT:{c24:0,c7d:1,vel:'stable'},  TGT:{c24:0,c7d:1,vel:'rising'} },
  'WHT-SNK-2201': { AMZ:{c24:2,c7d:7,vel:'falling'},  WMT:{c24:1,c7d:3,vel:'falling'}, TGT:{c24:0,c7d:2,vel:'stable'} },
  'BLK-BCK-0087': { AMZ:{c24:1,c7d:3,vel:'stable'},   WMT:{c24:0,c7d:2,vel:'stable'},  TGT:{c24:0,c7d:1,vel:'rising'} },
  'DNM-JNS-4450': { AMZ:{c24:0,c7d:2,vel:'rising'},   WMT:{c24:0,c7d:1,vel:'stable'},  TGT:{c24:1,c7d:3,vel:'rising'} },
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
  },
  'WHT-TEE-3340': {
    AMZ: { id: 'B09RRLN4YV', seller: 'Gildan Direct',     rating: 4.5, reviews: 42100, ship:  2, conf: 97 },
    WMT: { id: 'WM-201834',  seller: 'Hanes',             rating: 4.4, reviews: 28730, ship:  2, conf: 96 },
    TGT: { id: 'TGT-AT-1102',seller: 'Goodfellow & Co',   rating: 4.3, reviews: 11200, ship:  3, conf: 93 },
  },
  'WHT-SNK-2201': {
    AMZ: { id: 'B0BXZ7KQWP', seller: 'Vans Outlet',      rating: 4.4, reviews: 19300, ship:  2, conf: 92 },
    WMT: { id: 'WM-560123',  seller: 'Athletic Works',    rating: 4.1, reviews:  8740, ship:  3, conf: 87 },
    TGT: { id: 'TGT-FW-3310',seller: 'Universal Thread',  rating: 4.3, reviews:  5220, ship:  4, conf: 90 },
  },
  'BLK-BCK-0087': {
    AMZ: { id: 'B0BYMQSH41', seller: 'Amazon Basics',     rating: 4.5, reviews: 31400, ship:  1, conf: 96 },
    WMT: { id: 'WM-887231',  seller: 'Mainstays',         rating: 4.2, reviews: 14200, ship:  2, conf: 91 },
    TGT: { id: 'TGT-BG-0812',seller: 'Embark',            rating: 4.3, reviews:  7810, ship:  3, conf: 89 },
  },
  'DNM-JNS-4450': {
    AMZ: { id: 'B0CGM1YKQP', seller: "Levi's Direct",    rating: 4.3, reviews: 24800, ship:  2, conf: 95 },
    WMT: { id: 'WM-334729',  seller: 'Wrangler',          rating: 4.2, reviews: 18300, ship:  2, conf: 93 },
    TGT: { id: 'TGT-DN-2240',seller: 'Universal Thread',  rating: 4.1, reviews:  9410, ship:  3, conf: 91 },
  },
}

function buildListings(productId: string, productIdx: number): Record<string, Listing> {
  const result: Record<string, Listing> = {}
  PLATFORMS.forEach((p, pi) => {
    const base = BASE_PRICES[productId][p.id]
    const meta = LISTING_META[productId][p.id]
    const cd   = CHANGE_DATA[productId][p.id]
    const history = generateHistory(base, productIdx, pi)
    const current = history[history.length - 1].price
    const isPromoNow = history[history.length - 1].isPromo
    result[p.id] = {
      platformId:      p.id,
      listingId:       meta.id,
      currentPrice:    current,
      originalPrice:   Math.round(base * 1.15 * 100) / 100,
      inStock:         meta.reviews > 500,
      rating:          meta.rating,
      reviewCount:     meta.reviews,
      matchConfidence: meta.conf,
      priceHistory:    history,
      lastUpdatedMs:   PLATFORM_LAST_UPDATED[p.id] ?? Date.now() - 300000,
      seller:          meta.seller,
      shippingDays:    meta.ship,
      promoLabel:      isPromoNow ? 'SALE' : undefined,
      changeCount24h:  cd.c24,
      changeCount7d:   cd.c7d,
      priceVelocity:   cd.vel,
    }
  })
  return result
}

export const PRODUCTS: Product[] = [
  {
    id: 'CLR-GLSS-001',
    name: 'Clear Rimless Oval Glasses',
    emoji: '🕶️',
    imageUrl: 'https://images.unsplash.com/photo-1625591339971-4c9a87a66871?auto=format&fit=crop&w=300&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=300&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1625860191460-10a66c7384fb?auto=format&fit=crop&w=300&q=80',
    platformImages: {
      AMZ: 'https://images.unsplash.com/photo-1625860191460-10a66c7384fb?auto=format&fit=crop&w=300&q=80',
      WMT: 'https://images.unsplash.com/photo-1608229751021-ed4bd8677753?auto=format&fit=crop&w=300&q=80',
      TGT: 'https://images.unsplash.com/photo-1625860191460-10a66c7384fb?auto=format&fit=crop&w=300&q=80',
    },
    category: 'Footwear',
    subcategory: 'Sneakers',
    tags: ['white', 'canvas', 'low-top', 'unbranded', 'rubber sole'],
    aiDescription:
      'Minimalist low-profile canvas sneaker in all-white. Vulcanized rubber sole, cotton canvas upper, metal eyelet lacing. No visible branding — high visual similarity across 9 competing retailers.',
    yourPrice: 32.99,
    attributes: [
      { label: 'Upper',         value: 'Cotton Canvas' },
      { label: 'Sole',          value: 'Vulcanized Rubber' },
      { label: 'Color',         value: 'All White' },
      { label: 'Closure',       value: 'Lace-Up' },
      { label: 'Toe Shape',     value: 'Round' },
      { label: 'Profile',       value: 'Low-Top' },
      { label: 'Unisex Sizing', value: 'US 5–13' },
    ],
    listings: buildListings('WHT-SNK-2201', 2),
    matchStatus: 'matched',
    overallMatchScore: 88,
  },
  {
    id: 'BLK-BCK-0087',
    name: 'Black Nylon Drawstring Backpack',
    emoji: '🎒',
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=300&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=300&q=80',
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
    id: 'a1', type: 'price_drop', productId: 'CLR-GLSS-001', productName: 'Clear Rimless Oval Glasses',
    platformId: 'WMT', message: 'Walmart dropped price 18%',
    detail: 'Walmart cut price $23.49 → $19.99. You are now $5.00 above the market low.',
    timestamp: '2 min ago', severity: 'critical', isNew: true, actionLabel: 'Reprice Now',
  },
  {
    id: 'a2', type: 'promo_detected', productId: 'WHT-TEE-3340', productName: 'Basic White T-Shirt',
    platformId: 'WMT', message: 'Walmart weekend promo — 12% off',
    detail: 'Walmart dropped white tee to $8.79 (from $9.99). Weekend promotional pricing detected. Likely reverts Monday.',
    timestamp: '7 min ago', severity: 'warning', isNew: true, actionLabel: 'View Sale',
  },
  {
    id: 'a3', type: 'recommendation', productId: 'WHT-SNK-2201', productName: 'White Canvas Sneakers',
    platformId: 'AMZ', message: 'Price optimization opportunity',
    detail: 'Amazon review velocity +22% this week. Price gap: you are $8 above Amazon. Est. +31% conversions if matched.',
    timestamp: '14 min ago', severity: 'info', isNew: false, actionLabel: 'See Analysis',
  },
  {
    id: 'a4', type: 'undercut', productId: 'BLK-BCK-0087', productName: 'Black Nylon Backpack',
    platformId: 'WMT', message: 'Walmart undercutting by $6.00',
    detail: 'Walmart Mainstays backpack at $19.99 — $6.00 below your price of $25.99. 91% visual match confidence.',
    timestamp: '22 min ago', severity: 'warning', isNew: false, actionLabel: 'Review Match',
  },
  {
    id: 'a5', type: 'price_spike', productId: 'DNM-JNS-4450', productName: 'Blue Denim Straight Jeans',
    platformId: 'TGT', message: 'Target increased price 12% — opportunity',
    detail: 'Target raised $35.99 → $39.99. You are now closest to their price. Consider holding margin.',
    timestamp: '38 min ago', severity: 'info', isNew: false, actionLabel: 'Hold Price',
  },
  {
    id: 'a6', type: 'new_match', productId: 'CLR-GLSS-001', productName: 'Clear Rimless Oval Glasses',
    platformId: 'AMZ', message: 'New visual match detected on Amazon',
    detail: 'Amazon listing B0DX9PQZRT — 88% visual similarity to CLR-GLSS-001. Priced at $18.99.',
    timestamp: '1 hr ago', severity: 'info', isNew: false, actionLabel: 'Review Match',
  },
  {
    id: 'a7', type: 'stock_alert', productId: 'WHT-TEE-3340', productName: 'Basic White T-Shirt',
    platformId: 'WMT', message: 'Walmart low stock signal detected',
    detail: 'Walmart stock changed to "Only 3 left". Competitor constraint window: estimated 2–5 days.',
    timestamp: '2 hr ago', severity: 'warning', isNew: false,
  },
]

// ── MARKET INTELLIGENCE NEWS FEED ──────────────────────────────────────────
export const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'n1',
    type: 'price_event',
    headline: 'Amazon repriced Clear Glasses 4× in 24 hours — algorithmic pattern detected',
    body: 'Listing B0CX1RMFTP changed price at 02:14, 08:37, 14:22, and 19:05 UTC today (↓↑↓↑ oscillation). This zig-zag pattern is the signature of Amazon\'s A9 repricing algorithm testing price elasticity in response to Walmart\'s weekend promotion detected at 14:08 UTC. Amazon\'s algorithm historically responds to sub-market pricing within 2–4 hours. Current price ($22.99) is a temporary equilibrium — expect another adjustment within 6 hours.',
    productIds: ['CLR-GLSS-001'],
    platformId: 'AMZ',
    confidence: 87,
    tags: ['algorithmic repricing', 'A9 algorithm', 'price elasticity test'],
    timestampMs: Date.now() - 1000 * 60 * 8,
    severity: 'critical',
    changeFrequency: { platform: 'Amazon', count24h: 4, count7d: 11, direction: '↕' },
  },
  {
    id: 'n2',
    type: 'market_context',
    headline: 'White T-Shirt demand surge: back-to-school cycle starting early',
    body: 'Search volume for "basic white tee" and "crew neck white shirt" is up +34% vs. 4-week average (proxy signal from review velocity). Amazon\'s review count for this SKU increased 22% this week. Combined signal indicates genuine demand uplift — not competitive pressure. Historical pattern: this demand wave typically begins in early May and peaks late August. Recommendation: hold or marginally increase your price to capture margin during the demand window.',
    productIds: ['WHT-TEE-3340'],
    platformId: null,
    confidence: 78,
    tags: ['back-to-school', 'seasonal demand', 'demand surge'],
    timestampMs: Date.now() - 1000 * 60 * 22,
    severity: 'info',
  },
  {
    id: 'n3',
    type: 'competitor_pattern',
    headline: 'Target Thursday–Friday price drops: recurring weekend promotional pattern identified',
    body: 'Target has dropped prices on 3 of 5 tracked SKUs in the past 48 hours. Pattern analysis across 12 weeks of history: Target initiates discount campaigns Thursday/Friday ahead of weekend shopping in 68% of observed weeks, with an average markdown of 8–15%. Typical duration is 3–4 days before reverting to weekday pricing. This week\'s campaign began Thursday 15 May. Recommend: do not reprice to match — wait for Target reversion (expected Mon–Tue 19–20 May) before evaluating any adjustment.',
    productIds: ['CLR-GLSS-001', 'WHT-TEE-3340', 'WHT-SNK-2201'],
    platformId: 'TGT',
    confidence: 71,
    tags: ['Target weekend promo', 'Thursday cycle', 'behavioral pattern', 'do not react'],
    timestampMs: Date.now() - 1000 * 60 * 47,
    severity: 'warning',
  },
  {
    id: 'n4',
    type: 'price_event',
    headline: 'Walmart\'s Clear Glasses drop is a reactive price-match, not a campaign',
    body: 'Walmart dropped Clear Glasses from $23.49 → $19.99 (-15%) exactly 6 hours after Amazon\'s identical move — a clear indicator of reactive automated price matching, not a proactive promotional strategy. Walmart\'s price history shows a 92% reversion rate within 3–5 days when reacting to non-seasonal drops. This is a short-term defensive move. Recommend: hold your current price at $24.99 for the next 4 days and reassess — competing with a temporary floor is unnecessary margin sacrifice.',
    productIds: ['CLR-GLSS-001'],
    platformId: 'WMT',
    confidence: 91,
    tags: ['reactive repricing', 'price match bot', 'hold recommendation', 'temporary floor'],
    timestampMs: Date.now() - 1000 * 60 * 95,
    severity: 'warning',
  },
  {
    id: 'n5',
    type: 'prediction',
    headline: 'Amazon sneaker repricing may signal pre-Prime Day positioning',
    body: 'Amazon\'s White Canvas Sneakers listing has been repriced 2× in the past 24 hours and 7× in the last 7 days — above its 30-day average of 1.2/week. Historical analysis of Amazon\'s repricing behavior shows a significant uptick in test repricing 3–6 weeks before major sale events (Prime Day, Black Friday). Prime Day 2026 is estimated for late June/early July. If this pattern holds, expect a 20–30% deeper discount on this SKU during Prime Day. Recommend: build inventory buffer now and plan a counter-promotion.',
    productIds: ['WHT-SNK-2201'],
    platformId: 'AMZ',
    confidence: 54,
    tags: ['Prime Day', 'pre-event positioning', 'prediction', 'inventory signal'],
    timestampMs: Date.now() - 1000 * 60 * 130,
    severity: 'info',
  },
  {
    id: 'n6',
    type: 'platform_behavior',
    headline: 'Cross-platform repricing velocity analysis: Amazon leads, Target lags',
    body: 'Platform-level price change frequency (past 7 days, all 5 SKUs): Amazon avg 1.4 changes/SKU/week, Walmart 0.9, Target 0.4. Amazon\'s A9 algorithm creates the highest repricing velocity — changes are frequent and data-driven. Walmart\'s moderate frequency reflects semi-automated matching with a 4–6 hour lag behind Amazon moves. Target\'s low frequency indicates weekly-batch or manual pricing decisions — creating predictable windows of 3–5 days where you can reprice without immediate retaliation from Target.',
    productIds: ['CLR-GLSS-001', 'WHT-TEE-3340', 'WHT-SNK-2201', 'BLK-BCK-0087', 'DNM-JNS-4450'],
    platformId: null,
    confidence: 94,
    tags: ['platform intelligence', 'repricing velocity', 'competitive dynamics'],
    timestampMs: Date.now() - 1000 * 60 * 210,
    severity: 'info',
  },
  {
    id: 'n7',
    type: 'market_context',
    headline: 'Denim jeans: post-spring demand trough — Target\'s price hike is a margin grab',
    body: 'Blue denim jeans are entering a seasonal demand trough (May–June) after the spring refresh peak. Target\'s recent +12% price increase ($35.99 → $39.99) is consistent with reduced promotional pressure during low-demand periods — not a signal of rising consumer confidence. Walmart\'s stable pricing at $28.99 indicates their inventory position is comfortable. Your price at $42.99 is 48% above market low. Consider a modest 10–15% reduction in June to maintain conversion velocity through the trough, then re-expand margin in August for back-to-school.',
    productIds: ['DNM-JNS-4450'],
    platformId: null,
    confidence: 82,
    tags: ['seasonal trough', 'denim', 'spring-summer cycle', 'margin strategy'],
    timestampMs: Date.now() - 1000 * 60 * 380,
    severity: 'info',
  },
  {
    id: 'n8',
    type: 'competitor_pattern',
    headline: 'Walmart backpack price match cascade: reactive pricing behind Amazon detected',
    body: 'Walmart repriced the Black Nylon Backpack from $22.99 → $19.99 exactly 5 hours after Amazon moved from $21.99 → $18.99. This is consistent with Walmart\'s semi-automated price-match bot, which targets Amazon\'s price with a fixed $1.00 spread. This is a reactive move, not a campaign. Walmart\'s history on commodity bags shows 87% reversion within 4–6 days when Amazon reverts. Recommend: hold your price at $25.99 — both platforms are in a temporary floor. Reassess in 5 days.',
    productIds: ['BLK-BCK-0087'],
    platformId: 'WMT',
    confidence: 83,
    tags: ['price-match bot', 'Walmart reactive', 'temporary floor', 'hold recommendation'],
    timestampMs: Date.now() - 1000 * 60 * 520,
    severity: 'warning',
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
