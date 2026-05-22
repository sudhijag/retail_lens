export type MomentumType = 'surging' | 'growing' | 'emerging' | 'steady' | 'plateauing' | 'declining'

export interface IndustryLeader {
  rank: number
  name: string
  platform: 'AMZ' | 'TGT' | 'WMT'
  priceRange: string
  velocityPct: number   // current weekly trend % (positive or negative)
  weeks: number         // how long this trend has been running
  momentum: MomentumType
  trendHistory: number[] // 8-week demand index (0–100), oldest → newest
  reviewCount: number    // approximate reviews on leading platform listing
  isYourProduct?: boolean
  yourNote?: string      // displayed when isYourProduct is true
}

export interface CategoryHealth {
  direction: 'growing' | 'stable' | 'declining'
  quarterlyChange: string  // e.g. "+12% vs 3 months ago"
  avgAsp: string
  topPlatform: 'AMZ' | 'TGT' | 'WMT'
  note: string             // one-sentence category context
}

export interface PricingDecision {
  type: 'opportunity' | 'warning' | 'action' | 'defend'
  headline: string
  detail: string
}

export interface CategoryIntel {
  label: string
  health: CategoryHealth
  leaders: IndustryLeader[]  // exactly 5
  decisions: PricingDecision[] // exactly 3
}

const INTEL: Record<string, CategoryIntel> = {

  // ── EYEWEAR ────────────────────────────────────────────────────────────────
  'CLR-GLSS-001': {
    label: 'Fashion Glasses · Eyewear',
    health: {
      direction: 'growing',
      quarterlyChange: '+12% vs 3 months ago',
      avgAsp: '$19–26',
      topPlatform: 'AMZ',
      note: 'Category growing on Amazon-led discovery; bold-rim and clear-frame styles splitting volume.',
    },
    leaders: [
      {
        rank: 1, platform: 'AMZ', name: 'Bold black thick-rim acetate frames',
        priceRange: '$18–32', velocityPct: 67, weeks: 12, momentum: 'surging',
        trendHistory: [20, 26, 32, 40, 48, 56, 62, 67],
        reviewCount: 2400,
      },
      {
        rank: 2, platform: 'AMZ', name: 'Clear oval acetate frames',
        priceRange: '$16–24', velocityPct: 28, weeks: 6, momentum: 'growing',
        trendHistory: [14, 16, 18, 21, 23, 25, 27, 28],
        reviewCount: 1180,
        isYourProduct: true, yourNote: 'Your SKU (CLR-GLSS-001) is in this segment',
      },
      {
        rank: 3, platform: 'AMZ', name: 'Geometric wire-rim frames',
        priceRange: '$12–18', velocityPct: 34, weeks: 4, momentum: 'emerging',
        trendHistory: [8, 10, 13, 17, 22, 27, 31, 34],
        reviewCount: 560,
      },
      {
        rank: 4, platform: 'TGT', name: 'Blue-light blocking lenses',
        priceRange: '$18–28', velocityPct: 19, weeks: 8, momentum: 'steady',
        trendHistory: [14, 15, 15, 16, 16, 17, 18, 19],
        reviewCount: 840,
      },
      {
        rank: 5, platform: 'WMT', name: 'Oversized tortoiseshell frames',
        priceRange: '$12–22', velocityPct: -8, weeks: 3, momentum: 'declining',
        trendHistory: [38, 34, 30, 25, 22, 18, 14, 10],
        reviewCount: 320,
      },
    ],
    decisions: [
      {
        type: 'opportunity',
        headline: 'Bold thick-rim frames: +67% for 12 weeks, no SKU in your catalog',
        detail: 'The category leader is surging at an ASP of $20–28 and you have zero coverage. This is a $0-cannibalization adjacent entry. A single bold-rim SKU at $22–26 captures the #1 category trend.',
      },
      {
        type: 'warning',
        headline: 'Clear oval segment likely plateauing in 6–8 weeks',
        detail: 'Your segment is at 28% velocity over 6 weeks — a classic mid-cycle growth pattern. Based on 3 prior eyewear cycles, similar segments plateau 7–9 weeks in. Extract margin now at $24.99 before discount pressure arrives.',
      },
      {
        type: 'action',
        headline: 'Price clear oval at $21–23 while planning bold-rim entry',
        detail: 'A $2 price reduction on your current SKU (to $22.99) aligns with market average ASP and defends share while you prepare the bold-rim SKU. Estimated +14% conversion, +8% revenue vs holding at $24.99.',
      },
    ],
  },

  // ── BASIC TOPS ─────────────────────────────────────────────────────────────
  'WHT-TEE-3340': {
    label: 'Basic Tops · Apparel',
    health: {
      direction: 'declining',
      quarterlyChange: '-8% vs 3 months ago',
      avgAsp: '$14–22',
      topPlatform: 'WMT',
      note: 'Category declining in single-unit basics; volume shifting to multi-packs and performance tees.',
    },
    leaders: [
      {
        rank: 1, platform: 'WMT', name: 'Multi-pack crewneck basics (3–6pk)',
        priceRange: '$14–26', velocityPct: 41, weeks: 7, momentum: 'surging',
        trendHistory: [14, 18, 23, 28, 33, 37, 39, 41],
        reviewCount: 3800,
      },
      {
        rank: 2, platform: 'AMZ', name: 'Premium heavyweight cotton single',
        priceRange: '$18–26', velocityPct: 28, weeks: 5, momentum: 'growing',
        trendHistory: [14, 17, 19, 21, 24, 25, 27, 28],
        reviewCount: 2100,
      },
      {
        rank: 3, platform: 'TGT', name: 'Performance / moisture-wicking crew',
        priceRange: '$16–22', velocityPct: 22, weeks: 6, momentum: 'growing',
        trendHistory: [12, 13, 15, 16, 18, 19, 21, 22],
        reviewCount: 1650,
      },
      {
        rank: 4, platform: 'AMZ', name: 'Basic single crew-neck tee',
        priceRange: '$9–16', velocityPct: -3, weeks: 3, momentum: 'plateauing',
        trendHistory: [12, 12, 11, 10, 10, 9, 8, 7],
        reviewCount: 1020,
        isYourProduct: true, yourNote: 'Your SKU (WHT-TEE-3340) is in this segment',
      },
      {
        rank: 5, platform: 'AMZ', name: 'Ribbed slim-fit premium crew',
        priceRange: '$22–32', velocityPct: 15, weeks: 4, momentum: 'steady',
        trendHistory: [9, 10, 11, 11, 12, 13, 14, 15],
        reviewCount: 580,
      },
    ],
    decisions: [
      {
        type: 'warning',
        headline: 'Your segment (basic single tee) is in structural decline',
        detail: 'Single-unit basic tees are down -3% weekly and the overall category is -8% q/q. You are in the segment with the least future growth. This is not a pricing problem — it is a portfolio problem.',
      },
      {
        type: 'opportunity',
        headline: 'Multi-packs surging +41% for 7 weeks — immediate pivot target',
        detail: 'A 3-pack SKU at $24–26 would compete directly with the #1 trending segment. Inventory requirement is minimal (same SKU, different packaging). Estimated uplift: +$9–11 per transaction vs current single at $14.99.',
      },
      {
        type: 'action',
        headline: 'Hold $14.99 on basic single; invest in multi-pack SKU',
        detail: 'Do not cut price on the basic single — you have no margin to sacrifice. Hold at $14.99 to preserve cash while launching a 3-pack at $24.99 targeting the Walmart-led multi-pack surge. Run both for 4 weeks and compare velocity.',
      },
    ],
  },

  // ── CANVAS SNEAKERS ────────────────────────────────────────────────────────
  'WHT-SNK-2201': {
    label: 'Canvas Sneakers · Footwear',
    health: {
      direction: 'growing',
      quarterlyChange: '+6% vs 3 months ago',
      avgAsp: '$26–42',
      topPlatform: 'AMZ',
      note: 'Category healthy with new silhouettes creating premium expansion opportunities above $38.',
    },
    leaders: [
      {
        rank: 1, platform: 'AMZ', name: 'Clean white canvas low-top',
        priceRange: '$24–38', velocityPct: 38, weeks: 5, momentum: 'growing',
        trendHistory: [18, 22, 26, 29, 32, 34, 37, 38],
        reviewCount: 2950,
        isYourProduct: true, yourNote: 'Your SKU (WHT-SNK-2201) is the category leader here',
      },
      {
        rank: 2, platform: 'TGT', name: 'Platform / thick-sole canvas sneaker',
        priceRange: '$38–52', velocityPct: 29, weeks: 4, momentum: 'emerging',
        trendHistory: [12, 15, 18, 22, 25, 27, 28, 29],
        reviewCount: 880,
      },
      {
        rank: 3, platform: 'WMT', name: 'Slip-on canvas sneaker',
        priceRange: '$18–28', velocityPct: 24, weeks: 6, momentum: 'steady',
        trendHistory: [14, 16, 17, 19, 20, 22, 23, 24],
        reviewCount: 1640,
      },
      {
        rank: 4, platform: 'AMZ', name: 'High-top canvas sneaker',
        priceRange: '$32–48', velocityPct: 12, weeks: 4, momentum: 'steady',
        trendHistory: [8, 9, 9, 10, 10, 11, 12, 12],
        reviewCount: 760,
      },
      {
        rank: 5, platform: 'TGT', name: 'Two-tone / color-block canvas',
        priceRange: '$28–42', velocityPct: -5, weeks: 2, momentum: 'declining',
        trendHistory: [22, 20, 18, 16, 14, 13, 12, 11],
        reviewCount: 410,
      },
    ],
    decisions: [
      {
        type: 'opportunity',
        headline: 'Platform-sole canvas emerging at $38–52 — natural premium extension',
        detail: 'You own the #1 position in clean low-tops. Platform-sole is at +29% with 4 weeks of runway — entering at $42–46 expands your ASP without touching your existing SKU. Zero cannibalization risk.',
      },
      {
        type: 'defend',
        headline: 'You are the category leader — protect it with controlled pricing',
        detail: 'At +38% velocity you have pricing power. Do not discount. The risk is margin erosion from competitors entering at $28–32. Hold $32.99. If a competitor breaks below $29, respond with a limited-time promo only.',
      },
      {
        type: 'action',
        headline: 'Add platform-sole SKU at $42–46 in next 4 weeks',
        detail: 'The platform-sole window is 4 weeks old out of an estimated 8–12 week emerging cycle. You have 4–8 weeks to enter before it peaks. Price at $44 to position as a premium extension of your current clean canvas range.',
      },
    ],
  },

  // ── DRAWSTRING BAGS ────────────────────────────────────────────────────────
  'BLK-BCK-0087': {
    label: 'Drawstring Bags · Accessories',
    health: {
      direction: 'declining',
      quarterlyChange: '-4% vs 3 months ago',
      avgAsp: '$20–30',
      topPlatform: 'AMZ',
      note: 'Basic drawstring declining; utility bags with functional differentiation are the growth vector.',
    },
    leaders: [
      {
        rank: 1, platform: 'AMZ', name: 'Gym bag with wet / dry compartment',
        priceRange: '$22–35', velocityPct: 52, weeks: 3, momentum: 'surging',
        trendHistory: [18, 24, 32, 39, 44, 48, 50, 52],
        reviewCount: 2200,
      },
      {
        rank: 2, platform: 'WMT', name: 'Lightweight hiking daypack',
        priceRange: '$22–35', velocityPct: 31, weeks: 6, momentum: 'growing',
        trendHistory: [14, 17, 20, 22, 25, 27, 29, 31],
        reviewCount: 1480,
      },
      {
        rank: 3, platform: 'TGT', name: 'Insulated lunch tote / cooler bag',
        priceRange: '$18–28', velocityPct: 18, weeks: 8, momentum: 'steady',
        trendHistory: [12, 13, 14, 14, 15, 16, 17, 18],
        reviewCount: 1150,
      },
      {
        rank: 4, platform: 'AMZ', name: 'Basic drawstring backpack',
        priceRange: '$15–26', velocityPct: -4, weeks: 2, momentum: 'plateauing',
        trendHistory: [14, 13, 13, 12, 11, 10, 9, 8],
        reviewCount: 790,
        isYourProduct: true, yourNote: 'Your SKU (BLK-BCK-0087) is in this segment',
      },
      {
        rank: 5, platform: 'AMZ', name: 'Rolling / wheeled carry-on backpack',
        priceRange: '$28–48', velocityPct: -12, weeks: 4, momentum: 'declining',
        trendHistory: [22, 20, 18, 16, 13, 11, 9, 8],
        reviewCount: 350,
      },
    ],
    decisions: [
      {
        type: 'warning',
        headline: 'Your segment (basic drawstring) is in the #4 position and plateauing',
        detail: 'Basic drawstring bags are losing share to utility-functional bags. You are not just losing to competitors — the category itself is moving away from your segment. The -4% category decline is concentrated in plain drawstrings.',
      },
      {
        type: 'opportunity',
        headline: 'Gym bag with wet/dry compartment: +52% in 3 weeks — fastest mover',
        detail: 'This is the highest-velocity segment in the category by far. Entry at $22–28 is achievable. A wet/dry gym bag is adjacent to drawstring (same manufacturing infrastructure) with a $6–8 ASP premium. The window is 3 weeks old — likely 5–9 weeks of runway remaining.',
      },
      {
        type: 'action',
        headline: 'Hold $25.99 drawstring; pilot gym bag SKU at $24–27',
        detail: 'Do not discount the drawstring — you will lose margin without gaining share. Instead, use the drawstring as a cash-generating hold while piloting a gym bag SKU. If the gym bag reaches 30+ units/week in 4 weeks, shift primary inventory investment.',
      },
    ],
  },

  // ── DENIM JEANS ────────────────────────────────────────────────────────────
  'DNM-JNS-4450': {
    label: 'Denim Jeans · Apparel',
    health: {
      direction: 'growing',
      quarterlyChange: '+8% vs 3 months ago',
      avgAsp: '$32–48',
      topPlatform: 'WMT',
      note: 'Category growing but volume is shifting from straight-leg to barrel/wide-leg silhouettes.',
    },
    leaders: [
      {
        rank: 1, platform: 'AMZ', name: 'Barrel-leg / relaxed-taper denim',
        priceRange: '$38–55', velocityPct: 44, weeks: 5, momentum: 'surging',
        trendHistory: [18, 23, 28, 33, 37, 40, 42, 44],
        reviewCount: 1720,
      },
      {
        rank: 2, platform: 'TGT', name: 'Wide-leg relaxed fit jeans',
        priceRange: '$35–50', velocityPct: 38, weeks: 7, momentum: 'growing',
        trendHistory: [14, 18, 22, 26, 29, 33, 36, 38],
        reviewCount: 1380,
      },
      {
        rank: 3, platform: 'WMT', name: 'Straight-leg mid-rise denim',
        priceRange: '$28–40', velocityPct: 21, weeks: 4, momentum: 'steady',
        trendHistory: [20, 20, 21, 21, 20, 21, 21, 21],
        reviewCount: 2050,
        isYourProduct: true, yourNote: 'Your SKU (DNM-JNS-4450) is in this segment',
      },
      {
        rank: 4, platform: 'AMZ', name: 'Cargo-pocket denim / utility jeans',
        priceRange: '$32–48', velocityPct: 16, weeks: 6, momentum: 'steady',
        trendHistory: [10, 11, 11, 12, 13, 14, 15, 16],
        reviewCount: 710,
      },
      {
        rank: 5, platform: 'AMZ', name: 'Skinny / slim-fit denim',
        priceRange: '$25–40', velocityPct: -14, weeks: 8, momentum: 'declining',
        trendHistory: [42, 38, 33, 28, 24, 20, 17, 14],
        reviewCount: 1860,
      },
    ],
    decisions: [
      {
        type: 'opportunity',
        headline: 'Barrel-leg denim: +44% for 5 weeks, category ASP $38–55',
        detail: 'Barrel/relaxed-taper is the fastest-growing denim silhouette. It commands an $8–12 ASP premium over your straight-leg. A barrel-leg SKU at $44–50 would be your first premium price point and capture Gen-Z/Millennial growth demand.',
      },
      {
        type: 'warning',
        headline: 'Straight-leg growth (+21%) is understated relative to category shift',
        detail: 'While +21% sounds healthy, barrel and wide-leg are capturing 60%+ of new denim purchases. Your segment is stable in absolute volume but declining in relative share. If barrel-leg growth continues 6+ more weeks, straight-leg will show negative velocity.',
      },
      {
        type: 'action',
        headline: 'Hold straight-leg at $42.99; launch barrel-leg at $46–50 in 3 weeks',
        detail: 'Straight-leg is a cash-generating hold at good margin — do not discount. Use that margin to fund a barrel-leg SKU entry. 5 weeks in, barrel-leg likely has 6–10 weeks of growth runway. Price at $47–49 to capture premium while differentiating from your existing SKU.',
      },
    ],
  },
}

export function getCategoryIntel(productId: string): CategoryIntel | null {
  return INTEL[productId] ?? null
}
