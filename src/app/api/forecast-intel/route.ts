import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

export interface ForecastIntelRequest {
  productId: string
  productName: string
  category: string
  subcategory: string
  currentPrice: number
  tags: string[]
}

export interface TrendSignal {
  title: string
  description: string
  strength: 'strong' | 'moderate' | 'emerging'
  type: 'design' | 'feature' | 'material' | 'consumer'
  velocityPct: number
}

export interface NextSkuPrediction {
  name: string
  description: string
  confidence: 'high' | 'medium' | 'speculative'
  priceRange: string
  timeToMarket: string
  rationale: string
}

export interface ForecastIntelResponse {
  priceDirection: 'up' | 'down' | 'stable'
  priceChange3M: number
  priceChange6M: number
  priceChange12M: number
  priceRationale: string
  trendSignals: TrendSignal[]
  nextSkuPredictions: NextSkuPrediction[]
  reviewInsights: string[]
  mode: 'ai' | 'fallback'
}

// ── Static fallback per product (used when no API key) ────────────────────────

const FALLBACKS: Record<string, Omit<ForecastIntelResponse, 'mode'>> = {
  'CLR-GLSS-001': {
    priceDirection: 'up', priceChange3M: 2.8, priceChange6M: 5.4, priceChange12M: 9.2,
    priceRationale: 'Fashion eyewear is in a sustained growth cycle, driven by work-from-home screen-time awareness and social media visibility of eyewear as an accessory. Supply-chain normalization has reduced cost pressure, allowing gradual ASP expansion.',
    trendSignals: [
      { title: 'Bold Architectural Frames', description: 'Thick-rim geometric and hexagonal acetate frames are dominating social discovery, up significantly since early 2025.', strength: 'strong', type: 'design', velocityPct: 67 },
      { title: 'Blue-Light Blocking as Standard', description: 'Customers now expect anti-blue-light coating as a default feature, not an add-on - shifting segment ASPs upward.', strength: 'strong', type: 'feature', velocityPct: 41 },
      { title: 'Sustainable Bio-Acetate', description: 'Plant-based acetate frames are gaining traction in premium positioning, with growing review sentiment around eco-credentials.', strength: 'moderate', type: 'material', velocityPct: 28 },
    ],
    nextSkuPredictions: [
      { name: 'Clip-On Lens System', description: 'Interchangeable magnetic clip-on lenses for prescription frames - customers frequently request the ability to switch from clear to tinted.', confidence: 'high', priceRange: '$28–$45', timeToMarket: '3–5 months', rationale: 'Review analysis of eyewear shows "wish I could add sun lenses" as a top-5 feature request.' },
      { name: 'Oversized Retro Cat-Eye (Unisex)', description: 'Wide-frame cat-eye silhouettes are transitioning from niche to mainstream driven by Gen-Z style adoption.', confidence: 'medium', priceRange: '$22–$34', timeToMarket: '5–8 months', rationale: 'Social trend velocity and search volume data point to breakout within 2 quarters.' },
    ],
    reviewInsights: [
      'Customers consistently request better case quality - the frame is praised but cases feel "cheap for the price"',
      'UV protection certification is frequently asked about; explicitly calling it out in listings drives conversion',
      '"Fits comfortably all day" is the #1 praised attribute - comfort messaging should lead product copy',
    ],
  },

  'WHT-TEE-3340': {
    priceDirection: 'down', priceChange3M: -0.9, priceChange6M: -2.4, priceChange12M: -5.1,
    priceRationale: 'Single-unit basic tee demand is structurally declining as multi-pack value formats and performance fabrics take share. Overcapacity from Bangladeshi and Vietnamese suppliers is adding deflationary pressure to commodity cotton garments.',
    trendSignals: [
      { title: 'Multi-Pack Value Format', description: 'Shoppers are shifting to 3–6 packs for value-per-unit, driving the single tee below $15 as brands compete on packs.', strength: 'strong', type: 'consumer', velocityPct: 41 },
      { title: 'Heavyweight Cotton Premium', description: 'Premium 6-oz+ heavyweight singles are carving out a margin-protected niche above $24, leaving mid-range basics squeezed.', strength: 'moderate', type: 'material', velocityPct: 28 },
      { title: 'Performance-Blend Migration', description: 'Moisture-wicking cotton-poly blends are replacing 100% cotton basics for everyday wear, eroding pure-cotton volumes.', strength: 'moderate', type: 'feature', velocityPct: 22 },
    ],
    nextSkuPredictions: [
      { name: '3-Pack Crew Bundle (Heavyweight)', description: 'A 3-pack of 6.5oz heavyweight crewnecks positioned at $26–$28 directly targets the fastest-growing segment.', confidence: 'high', priceRange: '$24–$28', timeToMarket: '2–4 months', rationale: 'Same sourcing infrastructure; packaging change only. Immediate revenue uplift.' },
      { name: 'Recycled-Cotton Eco Tee', description: 'A single eco-positioned tee at $18–22 using recycled cotton blends, targeting sustainability-driven shoppers willing to pay a premium.', confidence: 'medium', priceRange: '$18–$22', timeToMarket: '6–9 months', rationale: 'Growing sustainability search queries; margin-protective premium positioning.' },
    ],
    reviewInsights: [
      'Shrinkage after first wash is the top complaint - pre-shrunk or shrink-resistant claims strongly improve retention',
      'Customers want better collar durability; reviews mention "collar waves after 3 washes"',
      '"True white" vs "off-white" is a frequent complaint - color accuracy in listing photos drives returns',
    ],
  },

  'WHT-SNK-2201': {
    priceDirection: 'up', priceChange3M: 1.8, priceChange6M: 3.9, priceChange12M: 7.2,
    priceRationale: 'Clean canvas sneakers are in a strong growth cycle driven by minimalist fashion trends, "quiet luxury" aesthetics, and school and casual-wear channel expansion. The category has room to expand ASPs toward $35–40 as brand equity builds.',
    trendSignals: [
      { title: 'Platform-Sole Elevation', description: 'Thick-sole and platform canvas styles are commanding $38–52 and growing fast, creating a natural premium ladder for existing clean canvas brands.', strength: 'strong', type: 'design', velocityPct: 38 },
      { title: '"Quiet Luxury" White Sneaker', description: 'Minimalist white footwear has become a wardrobe staple across Gen-Z and Millennial segments, providing durable category tailwinds.', strength: 'strong', type: 'consumer', velocityPct: 44 },
      { title: 'Wide-Toe Box Comfort Design', description: 'Reviews increasingly mention foot-width comfort; wide-fit and relaxed-toe styles are gaining traction as health-conscious consumers prioritize fit.', strength: 'emerging', type: 'feature', velocityPct: 19 },
    ],
    nextSkuPredictions: [
      { name: 'Platform Canvas Low-Top (+1" Sole)', description: 'A platform version of the existing clean low-top at $42–46 - same upper silhouette, elevated sole stack. Zero cannibalization.', confidence: 'high', priceRange: '$40–$46', timeToMarket: '3–5 months', rationale: 'You own the #1 clean-canvas position; platform extension captures the adjacent surging segment.' },
      { name: 'Slip-On Canvas Mule', description: 'Backless slip-on canvas style trending in warm-weather markets. Laceless convenience is a frequently requested feature in reviews.', confidence: 'medium', priceRange: '$28–$36', timeToMarket: '5–7 months', rationale: 'Easy sourcing extension; fills the convenience gap between your current SKU and sandal alternatives.' },
    ],
    reviewInsights: [
      'Sole durability is the top critique - "sole separates after 6 months" appears frequently; extended sole warranty messaging converts well',
      'Customers praise the "true-to-size" fit and specifically recommend it to friends - referral language should be encouraged in packaging',
      'Cleaning instructions are frequently requested; a simple removable insole and washable design are top feature requests',
    ],
  },

  'BLK-BCK-0087': {
    priceDirection: 'down', priceChange3M: -0.8, priceChange6M: -2.1, priceChange12M: -4.3,
    priceRationale: 'Plain drawstring bags are in structural decline due to functional bag alternatives (gym bags with compartments, insulated totes) gaining share. Commodity imports are keeping base prices deflationary. Without functional differentiation, ASPs will compress toward $18.',
    trendSignals: [
      { title: 'Wet/Dry Compartment Gym Bag', description: 'Gym bags with separated wet/dry compartments are the fastest-growing adjacent segment, pulling consumers away from basic drawstrings.', strength: 'strong', type: 'feature', velocityPct: 52 },
      { title: 'Lightweight Packable Daypacks', description: 'Ultralight packable daypacks under 200g are expanding, driven by travel and outdoor consumers who want minimal footprint.', strength: 'moderate', type: 'design', velocityPct: 31 },
      { title: 'Sustainable / Recycled-RPET Bags', description: 'Recycled polyester bags with environmental certification are gaining a price premium among eco-conscious buyers.', strength: 'emerging', type: 'material', velocityPct: 24 },
    ],
    nextSkuPredictions: [
      { name: 'Gym Bag with Wet/Dry Split', description: 'A gym bag with a separate waterproof bottom compartment for wet clothes/shoes. Directly targets the #1 trending segment.', confidence: 'high', priceRange: '$22–$28', timeToMarket: '3–5 months', rationale: 'Adjacent manufacturing capability; 2.5–3× the ASP of the current drawstring with the same sourcing infrastructure.' },
      { name: 'RPET Eco Packable Daypack', description: 'A lightweight 15L daypack made from recycled plastic bottles, packable into its own pocket, targeting eco-conscious commuters.', confidence: 'medium', priceRange: '$26–$34', timeToMarket: '6–9 months', rationale: 'Certification-backed eco claims protect margin and differentiate from commodity imports.' },
    ],
    reviewInsights: [
      '"Straps are too thin and cut into shoulders" - padded shoulder straps are the single most requested upgrade',
      'Side water bottle pockets are frequently mentioned as missing - customers "just want one pocket that works"',
      '"Falls apart at the drawstring after a month" - reinforced cord threading is a key reliability differentiator',
    ],
  },

  'DNM-JNS-4450': {
    priceDirection: 'up', priceChange3M: 1.6, priceChange6M: 3.8, priceChange12M: 7.8,
    priceRationale: 'Denim is in a multi-year up-cycle driven by silhouette renovation (barrel, wide-leg) and the premium positioning of sustainable/selvedge denim. Straight-leg holds steady as the "classic" option while premium alternatives expand the overall category ASP.',
    trendSignals: [
      { title: 'Barrel-Leg / Relaxed-Taper', description: 'The fastest-growing denim silhouette for 5+ weeks, commanding a $6–12 ASP premium over straight-leg. Gen-Z and Millennial driven.', strength: 'strong', type: 'design', velocityPct: 44 },
      { title: 'Wide-Leg Relaxed Fit', description: 'Wide-leg continues growing for 7+ weeks as fashion cycles away from slim/skinny. Currently the second-strongest volume driver.', strength: 'strong', type: 'design', velocityPct: 38 },
      { title: 'Sustainable Denim (Water-Reduced)', description: 'Water-reduced denim washing is gaining certification momentum and allows a $5–8 premium over conventional denim.', strength: 'emerging', type: 'material', velocityPct: 21 },
    ],
    nextSkuPredictions: [
      { name: 'Barrel-Leg Relaxed Taper at $46–50', description: 'A premium barrel-leg or relaxed-taper silhouette to sit above the existing straight-leg. Zero cannibalization, full ASP expansion.', confidence: 'high', priceRange: '$44–$50', timeToMarket: '4–6 months', rationale: '5-week barrel-leg trend with 6–10 weeks of runway remaining. Prime window for entry.' },
      { name: 'Water-Reduced Sustainable Straight-Leg', description: 'An eco-certified version of the existing straight-leg using 50% less water in washing, with a $47–52 premium positioning.', confidence: 'medium', priceRange: '$46–$52', timeToMarket: '7–10 months', rationale: 'Protects the straight-leg segment from ASP erosion with a value-added eco premium.' },
    ],
    reviewInsights: [
      '"Fades too quickly after washing" - color retention is the most-cited quality complaint; reinforcing dye process is a key differentiator',
      'Inseam length options are frequently requested; customers want tall/short inseam choices without going to custom',
      '"Fits perfectly in the waist but tight in the thighs" - a relaxed-hip version of the straight-leg is the top product evolution request',
    ],
  },
}

function getFallback(body: ForecastIntelRequest): ForecastIntelResponse {
  const data = FALLBACKS[body.productId]
  if (data) return { ...data, mode: 'fallback' }
  // Generic fallback
  return {
    priceDirection: 'stable', priceChange3M: 0.5, priceChange6M: 1.2, priceChange12M: 2.4,
    priceRationale: 'Category shows moderate stability with slight upward pressure from input costs.',
    trendSignals: [
      { title: 'Value-for-Money Focus', description: 'Consumers are scrutinizing price-per-use ratios more carefully, rewarding durable products with clear quality signals.', strength: 'strong', type: 'consumer', velocityPct: 28 },
      { title: 'Feature Transparency', description: 'Explicit material and feature callouts in listings are driving conversion improvements of 12–18%.', strength: 'moderate', type: 'feature', velocityPct: 18 },
      { title: 'Sustainability Signaling', description: 'Eco-certifications and sustainability claims are incrementally improving conversion for price-equivalent products.', strength: 'emerging', type: 'material', velocityPct: 14 },
    ],
    nextSkuPredictions: [
      { name: 'Premium Variant with Upgraded Materials', description: 'A premium tier SKU using elevated materials to capture the $5–10 ASP expansion opportunity above your current price point.', confidence: 'medium', priceRange: `$${(body.currentPrice * 1.3).toFixed(0)}–$${(body.currentPrice * 1.5).toFixed(0)}`, timeToMarket: '4–6 months', rationale: 'Premium positioning typically doubles margin contribution vs volume play.' },
      { name: 'Bundle / Multi-Pack Format', description: 'A multi-unit bundle format reducing the per-unit cost while increasing basket size.', confidence: 'medium', priceRange: `$${(body.currentPrice * 2.2).toFixed(0)}–$${(body.currentPrice * 2.8).toFixed(0)}`, timeToMarket: '2–3 months', rationale: 'Bundle formats improve repeat purchase rate and reduce return rates.' },
    ],
    reviewInsights: [
      'Quality consistency is the top concern - customers want the product to match the listing photos exactly',
      'Packaging quality signals product quality - improved unboxing experience reduces return intent',
      'Clear use-case guidance in listings reduces "not what I expected" returns by 15–20%',
    ],
    mode: 'fallback',
  }
}

export async function POST(req: NextRequest) {
  const body: ForecastIntelRequest = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json(getFallback(body))

  const client = new Anthropic({ apiKey })

  const prompt = `You are a senior retail market analyst specializing in pricing strategy and product innovation forecasting.

The retailer sells a private-label product:
- Name: ${body.productName}
- Category: ${body.category} / ${body.subcategory}
- Current Price: $${body.currentPrice.toFixed(2)}
- Product attributes: ${body.tags.join(', ')}

Based on your retail market knowledge, provide a comprehensive price and product intelligence forecast.

Return ONLY a valid JSON object with exactly this structure (no markdown, no explanation outside the JSON):
{
  "priceDirection": "up" | "down" | "stable",
  "priceChange3M": <number - percentage change at 3 months, e.g. 2.5 for +2.5%>,
  "priceChange6M": <number - percentage change at 6 months>,
  "priceChange12M": <number - percentage change at 12 months>,
  "priceRationale": "<2–3 sentences explaining the price forecast, citing market forces>",
  "trendSignals": [
    {
      "title": "<short trend name>",
      "description": "<1–2 sentence description of the trend and why it matters>",
      "strength": "strong" | "moderate" | "emerging",
      "type": "design" | "feature" | "material" | "consumer",
      "velocityPct": <integer - estimated % growth in consumer interest>
    }
  ],
  "nextSkuPredictions": [
    {
      "name": "<product concept name>",
      "description": "<1 sentence product description>",
      "confidence": "high" | "medium" | "speculative",
      "priceRange": "$XX–$XX",
      "timeToMarket": "X–Y months",
      "rationale": "<1 sentence explaining the market opportunity>"
    }
  ],
  "reviewInsights": [
    "<insight 1 - what customers say they wish was different or better>",
    "<insight 2>",
    "<insight 3>"
  ]
}

Provide exactly 3 trend signals, exactly 2 next SKU predictions, and exactly 3 review insights. Make the insights highly specific to the ${body.category} / ${body.subcategory} space.`

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('no JSON')

    const parsed = JSON.parse(match[0]) as Omit<ForecastIntelResponse, 'mode'>
    return NextResponse.json({ ...parsed, mode: 'ai' } satisfies ForecastIntelResponse)
  } catch {
    return NextResponse.json(getFallback(body))
  }
}
