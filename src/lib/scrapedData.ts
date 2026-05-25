// Real scraped data from Scraped data retailers.xlsx
// Amazon white shirt - Tiago, Target white shirt - Ankita, Walmart white shirt - Sudhi
// First 5 rows per platform, extracted May 2026

export interface ScrapedListing {
  id: string
  platform: 'AMZ' | 'TGT' | 'WMT'
  rank: number
  title: string
  brand: string | null
  imageUrl: string
  rating: number | null
  reviews: string | null
  reviewCount: number        // numeric review count (parsed or estimated)
  price: number | null
  productUrl?: string
  // AI-computed scores (filled by /api/match)
  textSimilarityScore?: number
  visualSimilarityScore?: number
  overallMatchScore?: number
  matchReasoning?: string
  attributeScores?: AttributeScore[]
}

export interface AttributeScore {
  label: string
  score: number      // 0-100
  reasoning: string
}

export const SCRAPED_PRODUCTS: ScrapedListing[] = [
  // ── AMAZON ──────────────────────────────────────────────────────────────────
  {
    id: 'amz-1', platform: 'AMZ', rank: 1,
    title: "Men's Long-Sleeve Oxford Shirt",
    brand: 'Amazon Essentials',
    imageUrl: 'https://m.media-amazon.com/images/I/71CdMS3U3WL._AC_UL320_.jpg',
    rating: 4.4, reviews: '8.5K', reviewCount: 8500, price: 19.40,
  },
  {
    id: 'amz-2', platform: 'AMZ', rank: 2,
    title: 'Mens Cotton Linen Textured Shirt Long Sleeve Button Down Shirts Casual Summer Beach Wedding Tops with Pocket',
    brand: 'Alimens & Gentle',
    imageUrl: 'https://m.media-amazon.com/images/I/71Apt-k1NhL._AC_UL320_.jpg',
    rating: 4.4, reviews: null, reviewCount: 3200, price: 19.99,
  },
  {
    id: 'amz-3', platform: 'AMZ', rank: 3,
    title: "Men's Stretch Wrinkle Free Dress Shirts Formal Wedding Prom Short Sleeve Slim Fit Button Down Shirt",
    brand: 'JEMITOP',
    imageUrl: 'https://m.media-amazon.com/images/I/51QafrdzsrL._AC_UL320_.jpg',
    rating: 4.6, reviews: '1.2K', reviewCount: 1200, price: 19.99,
  },
  {
    id: 'amz-4', platform: 'AMZ', rank: 4,
    title: 'Mens Dress Shirts Regular Fit Long Sleeve Stretch Business Dress Shirts for Men',
    brand: 'Alex Vando',
    imageUrl: 'https://m.media-amazon.com/images/I/71XSNyav%2BmL._AC_UL320_.jpg',
    rating: 4.5, reviews: '22.6K', reviewCount: 22600, price: 17.99,
  },
  {
    id: 'amz-5', platform: 'AMZ', rank: 5,
    title: "Men's Dress Shirts Solid Long Sleeve Stretch Wrinkle-Free Formal Shirt Business Casual Button Down Shirts",
    brand: 'J.VER',
    imageUrl: 'https://m.media-amazon.com/images/I/51rkKPruYvL._AC_UL320_.jpg',
    rating: 4.5, reviews: '36K', reviewCount: 36000, price: 17.99,
  },

  // ── TARGET ──────────────────────────────────────────────────────────────────
  {
    id: 'tgt-1', platform: 'TGT', rank: 1,
    title: "Jockey Generation™ Men's 100% Cotton Crew Neck 3pk Undershirt",
    brand: 'Jockey',
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_a94a9ef2-5d0b-4df1-b38f-85bc9e1bb6ff?qlt=65&fmt=webp&hei=350&wid=350',
    rating: 4.6, reviews: '518', reviewCount: 518, price: 21.00,
  },
  {
    id: 'tgt-2', platform: 'TGT', rank: 2,
    title: "Jockey Generation™ Men's Cotton Stretch Crewneck 3pk Undershirt",
    brand: 'Jockey',
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_62aef49e-1044-4962-9845-7015d4631ea9?qlt=65&fmt=webp&hei=350&wid=350',
    rating: 4.6, reviews: '194', reviewCount: 194, price: 26.00,
  },
  {
    id: 'tgt-3', platform: 'TGT', rank: 3,
    title: "Jockey Generation™ Men's 100% Cotton V-Neck Undershirt 3pk",
    brand: 'Jockey',
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_7ba493f3-810d-4823-9525-1aed1e720f1a?qlt=65&fmt=webp&hei=350&wid=350',
    rating: 4.5, reviews: '159', reviewCount: 159, price: 21.00,
  },
  {
    id: 'tgt-4', platform: 'TGT', rank: 4,
    title: "Men's Short Sleeve 4pk Crewneck T-Shirt - Goodfellow & Co™",
    brand: 'Goodfellow & Co',
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_4482189c-7efb-4e36-aa1d-3f1adaae3aa7?qlt=65&fmt=webp&hei=350&wid=350',
    rating: 4.6, reviews: '5.5K', reviewCount: 5500, price: 20.00,
  },
  {
    id: 'tgt-5', platform: 'TGT', rank: 5,
    title: "Hanes Men's Crewneck T-Shirt 6pk - White",
    brand: 'Hanes',
    imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_d15d3a84-dcbc-4b8c-b589-0ae3efefa154?qlt=65&fmt=webp&hei=350&wid=350',
    rating: 4.3, reviews: '1.9K', reviewCount: 1900, price: 20.00,
  },

  // ── WALMART ─────────────────────────────────────────────────────────────────
  {
    id: 'wmt-1', platform: 'WMT', rank: 1,
    title: 'Gildan Adult Short Sleeve Crew T-Shirt for Crafting White — Soft Cotton Classic Fit 1-Pack Blank Tee',
    brand: 'Gildan',
    imageUrl: 'https://i5.walmartimages.com/seo/Gildan-Adult-Short-Sleeve-Crew-T-Shirt-for-Crafting-White-Adult-Sizes-S-3XL-Soft-Cotton-Classic-Fit-1-Pack-Blank-Tee_13a02b89-79fd-4938-a08f-fddd03a98579.05b829aada1c548268853fd6bfb5b2f1.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
    rating: 3.0, reviews: null, reviewCount: 2400, price: 3.97,
  },
  {
    id: 'wmt-2', platform: 'WMT', rank: 2,
    title: "George Men's Classic Fit Crewneck Tee with Short Sleeves",
    brand: 'George',
    imageUrl: 'https://i5.walmartimages.com/seo/George-Men-s-Big-Men-s-Crewneck-Tee-with-Short-Sleeves-Sizes-XS-3XL_b1adc09b-8c1b-45fd-9fee-72d4df18454e.a2f5abcc16f77244b50d63b32a2e41f7.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
    rating: null, reviews: null, reviewCount: 890, price: 5.98,
  },
  {
    id: 'wmt-3', platform: 'WMT', rank: 3,
    title: "Gildan Men's Softstyle Crew Neck Tees 6-Pack",
    brand: 'Gildan',
    imageUrl: 'https://i5.walmartimages.com/seo/Gildan-Men-s-Sft-Style-Crew-Shirt-6-Pack-XL_6238934a-a889-416f-80f1-d2fbb1eaefc9.a89cfa2c61be486358c3aa2299779815.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
    rating: null, reviews: null, reviewCount: 620, price: 12.59,
  },
  {
    id: 'wmt-4', platform: 'WMT', rank: 4,
    title: "George Men's Crew T-Shirts 6-Pack",
    brand: 'George',
    imageUrl: 'https://i5.walmartimages.com/seo/George-Men-s-Crew-T-Shirts-6-Pack_35432ee9-d375-4ed5-a8c7-2ab5c83d4cde_1.e8a9fbf524034fc4ae3d55885a5c2015.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
    rating: null, reviews: null, reviewCount: 340, price: 17.98,
  },
  {
    id: 'wmt-5', platform: 'WMT', rank: 5,
    title: 'Elvqul Mens Short Sleeve T-Shirts White Solid Color Button Collared Casual Breathable Button-Up Shirts for Men',
    brand: 'Elvqul',
    imageUrl: 'https://i5.walmartimages.com/seo/Elvqul-Mens-Short-Sleeve-T-Shirts-White-Solid-Color-Button-Collared-Casual-Breathable-Button-up-Shirts-for-Men-Travel_d22aa9ac-af54-4470-ac8a-062d2f799bea.b251193114b26937bd6fe2d0faeec0d6.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
    rating: 4.0, reviews: null, reviewCount: 180, price: 4.99,
  },
]

// The Hanes crewneck undershirt appears across all three platforms — a natural match candidate
export const MATCH_CANDIDATES = {
  amazon: SCRAPED_PRODUCTS.find(p => p.id === 'amz-1')!,
  target:  SCRAPED_PRODUCTS.find(p => p.id === 'tgt-5')!,   // Hanes 6pk white on Target
  walmart: SCRAPED_PRODUCTS.find(p => p.id === 'wmt-1')!,   // Gildan basic white on Walmart
}

export const PLATFORM_COLORS: Record<string, string> = {
  AMZ: '#e47911',
  TGT: '#cc0000',
  WMT: '#0071dc',
}

export const PLATFORM_NAMES: Record<string, string> = {
  AMZ: 'Amazon',
  TGT: 'Target',
  WMT: 'Walmart',
}
