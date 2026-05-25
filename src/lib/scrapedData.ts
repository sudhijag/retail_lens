import { getCategoryPool } from './demoCatalog'

// Real scraped data from Scraped data retailers.xlsx
// Amazon white shirt - Tiago, Target white shirt - Ankita, Walmart white shirt - Sudhi
// First 5 rows per platform, extracted May 2026
//
// Source of truth:
// - `SCRAPED_DATA_BY_SKU` is the structure you should edit by hand.
// - Each SKU owns its own competitor cards and image URLs.
// - `SCRAPED_PRODUCTS` is derived from the default SKU so older callers keep working.

export type PlatformId = 'AMZ' | 'TGT' | 'WMT'

export interface ScrapedListing {
  id: string
  platform: PlatformId
  rank: number
  title: string
  brand: string | null
  imageUrl: string
  rating: number | null
  reviews: string | null
  reviewCount: number
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
  score: number
  reasoning: string
}

export interface ScrapedSkuCards {
  skuId: string
  skuName: string
  cards: Record<PlatformId, ScrapedListing[]>
}

const EMPTY_IMAGE_URL = '/window.svg'

export const SCRAPED_DATA_BY_SKU: Record<string, ScrapedSkuCards> = {
  'WHT-TEE-3340': {
    skuId: 'WHT-TEE-3340',
    skuName: 'Basic Crew-Neck White T-Shirt',
    cards: {
      AMZ: [
        {
          id: 'amz-1',
          platform: 'AMZ',
          rank: 1,
          title: "Men's Long-Sleeve Oxford Shirt",
          brand: 'Amazon Essentials',
          imageUrl: 'https://m.media-amazon.com/images/I/71CdMS3U3WL._AC_UL320_.jpg',
          rating: 4.4,
          reviews: '8.5K',
          reviewCount: 8500,
          price: 19.4,
        },
        {
          id: 'amz-2',
          platform: 'AMZ',
          rank: 2,
          title: 'Mens Cotton Linen Textured Shirt Long Sleeve Button Down Shirts Casual Summer Beach Wedding Tops with Pocket',
          brand: 'Alimens & Gentle',
          imageUrl: 'https://m.media-amazon.com/images/I/71Apt-k1NhL._AC_UL320_.jpg',
          rating: 4.4,
          reviews: null,
          reviewCount: 3200,
          price: 19.99,
        },
        {
          id: 'amz-3',
          platform: 'AMZ',
          rank: 3,
          title: "Men's Stretch Wrinkle Free Dress Shirts Formal Wedding Prom Short Sleeve Slim Fit Button Down Shirt",
          brand: 'JEMITOP',
          imageUrl: 'https://m.media-amazon.com/images/I/51QafrdzsrL._AC_UL320_.jpg',
          rating: 4.6,
          reviews: '1.2K',
          reviewCount: 1200,
          price: 19.99,
        },
        {
          id: 'amz-4',
          platform: 'AMZ',
          rank: 4,
          title: 'Mens Dress Shirts Regular Fit Long Sleeve Stretch Business Dress Shirts for Men',
          brand: 'Alex Vando',
          imageUrl: 'https://m.media-amazon.com/images/I/71XSNyav%2BmL._AC_UL320_.jpg',
          rating: 4.5,
          reviews: '22.6K',
          reviewCount: 22600,
          price: 17.99,
        },
        {
          id: 'amz-5',
          platform: 'AMZ',
          rank: 5,
          title: "Men's Dress Shirts Solid Long Sleeve Stretch Wrinkle-Free Formal Shirt Business Casual Button Down Shirts",
          brand: 'J.VER',
          imageUrl: 'https://m.media-amazon.com/images/I/51rkKPruYvL._AC_UL320_.jpg',
          rating: 4.5,
          reviews: '36K',
          reviewCount: 36000,
          price: 17.99,
        },
      ],
      TGT: [
        {
          id: 'tgt-1',
          platform: 'TGT',
          rank: 1,
          title: "Jockey Generation™ Men's 100% Cotton Crew Neck 3pk Undershirt",
          brand: 'Jockey',
          imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_a94a9ef2-5d0b-4df1-b38f-85bc9e1bb6ff?qlt=65&fmt=webp&hei=350&wid=350',
          rating: 4.6,
          reviews: '518',
          reviewCount: 518,
          price: 21.0,
        },
        {
          id: 'tgt-2',
          platform: 'TGT',
          rank: 2,
          title: "Jockey Generation™ Men's Cotton Stretch Crewneck 3pk Undershirt",
          brand: 'Jockey',
          imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_62aef49e-1044-4962-9845-7015d4631ea9?qlt=65&fmt=webp&hei=350&wid=350',
          rating: 4.6,
          reviews: '194',
          reviewCount: 194,
          price: 26.0,
        },
        {
          id: 'tgt-3',
          platform: 'TGT',
          rank: 3,
          title: "Jockey Generation™ Men's 100% Cotton V-Neck Undershirt 3pk",
          brand: 'Jockey',
          imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_7ba493f3-810d-4823-9525-1aed1e720f1a?qlt=65&fmt=webp&hei=350&wid=350',
          rating: 4.5,
          reviews: '159',
          reviewCount: 159,
          price: 21.0,
        },
        {
          id: 'tgt-4',
          platform: 'TGT',
          rank: 4,
          title: "Men's Short Sleeve 4pk Crewneck T-Shirt - Goodfellow & Co™",
          brand: 'Goodfellow & Co',
          imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_4482189c-7efb-4e36-aa1d-3f1adaae3aa7?qlt=65&fmt=webp&hei=350&wid=350',
          rating: 4.6,
          reviews: '5.5K',
          reviewCount: 5500,
          price: 20.0,
        },
        {
          id: 'tgt-5',
          platform: 'TGT',
          rank: 5,
          title: "Hanes Men's Crewneck T-Shirt 6pk - White",
          brand: 'Hanes',
          imageUrl: 'https://target.scene7.com/is/image/Target/GUEST_d15d3a84-dcbc-4b8c-b589-0ae3efefa154?qlt=65&fmt=webp&hei=350&wid=350',
          rating: 4.3,
          reviews: '1.9K',
          reviewCount: 1900,
          price: 20.0,
        },
      ],
      WMT: [
        {
          id: 'wmt-1',
          platform: 'WMT',
          rank: 1,
          title: 'Gildan Adult Short Sleeve Crew T-Shirt for Crafting White — Soft Cotton Classic Fit 1-Pack Blank Tee',
          brand: 'Gildan',
          imageUrl: 'https://i5.walmartimages.com/seo/Gildan-Adult-Short-Sleeve-Crew-T-Shirt-for-Crafting-White-Adult-Sizes-S-3XL-Soft-Cotton-Classic-Fit-1-Pack-Blank-Tee_13a02b89-79fd-4938-a08f-fddd03a98579.05b829aada1c548268853fd6bfb5b2f1.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
          rating: 3.0,
          reviews: null,
          reviewCount: 2400,
          price: 3.97,
        },
        {
          id: 'wmt-2',
          platform: 'WMT',
          rank: 2,
          title: "George Men's Classic Fit Crewneck Tee with Short Sleeves",
          brand: 'George',
          imageUrl: 'https://i5.walmartimages.com/seo/George-Men-s-Big-Men-s-Crewneck-Tee-with-Short-Sleeves-Sizes-XS-3XL_b1adc09b-8c1b-45fd-9fee-72d4df18454e.a2f5abcc16f77244b50d63b32a2e41f7.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
          rating: null,
          reviews: null,
          reviewCount: 890,
          price: 5.98,
        },
        {
          id: 'wmt-3',
          platform: 'WMT',
          rank: 3,
          title: "Gildan Men's Softstyle Crew Neck Tees 6-Pack",
          brand: 'Gildan',
          imageUrl: 'https://i5.walmartimages.com/seo/Gildan-Men-s-Sft-Style-Crew-Shirt-6-Pack-XL_6238934a-a889-416f-80f1-d2fbb1eaefc9.a89cfa2c61be486358c3aa2299779815.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
          rating: null,
          reviews: null,
          reviewCount: 620,
          price: 12.59,
        },
        {
          id: 'wmt-4',
          platform: 'WMT',
          rank: 4,
          title: "George Men's Crew T-Shirts 6-Pack",
          brand: 'George',
          imageUrl: 'https://i5.walmartimages.com/seo/George-Men-s-Crew-T-Shirts-6-Pack_35432ee9-d375-4ed5-a8c7-2ab5c83d4cde_1.e8a9fbf524034fc4ae3d55885a5c2015.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
          rating: null,
          reviews: null,
          reviewCount: 340,
          price: 17.98,
        },
        {
          id: 'wmt-5',
          platform: 'WMT',
          rank: 5,
          title: 'Elvqul Mens Short Sleeve T-Shirts White Solid Color Button Collared Casual Breathable Button-Up Shirts for Men',
          brand: 'Elvqul',
          imageUrl: 'https://i5.walmartimages.com/seo/Elvqul-Mens-Short-Sleeve-T-Shirts-White-Solid-Color-Button-Collared-Casual-Breathable-Button-up-Shirts-for-Men-Travel_d22aa9ac-af54-4470-ac8a-062d2f799bea.b251193114b26937bd6fe2d0faeec0d6.jpeg?odnHeight=864&odnWidth=576&odnBg=FFFFFF',
          rating: 4.0,
          reviews: null,
          reviewCount: 180,
          price: 4.99,
        },
      ],
    },
  },

  // Drop SKU-specific competitor cards here as you add more scraped coverage.
  'CLR-GLSS-001': {
    skuId: 'CLR-GLSS-001',
    skuName: 'Clear Rimless Oval Glasses',
    cards: {
      AMZ: [
        {
          id: 'clr-amz-1',
          platform: 'AMZ',
          rank: 1,
          title: 'Rimless Oval Blue Light Glasses for Women and Men, Lightweight Clear Frame Look',
          brand: 'Livho',
          imageUrl: '/window.svg',
          rating: 4.3,
          reviews: '6.2K',
          reviewCount: 6200,
          price: 18.99,
        },
        {
          id: 'clr-amz-2',
          platform: 'AMZ',
          rank: 2,
          title: 'Minimalist Rimless Eyeglasses with Adjustable Nose Pads and UV Protection',
          brand: 'TIJN',
          imageUrl: '/window.svg',
          rating: 4.1,
          reviews: '2.1K',
          reviewCount: 2100,
          price: 22.5,
        },
      ],
      TGT: [
        {
          id: 'clr-tgt-1',
          platform: 'TGT',
          rank: 1,
          title: 'A New Day Clear Oval Fashion Glasses',
          brand: 'A New Day',
          imageUrl: '/window.svg',
          rating: 4.4,
          reviews: '184',
          reviewCount: 184,
          price: 19.99,
        },
        {
          id: 'clr-tgt-2',
          platform: 'TGT',
          rank: 2,
          title: 'Universal Thread Rimless Reader-Style Fashion Frames',
          brand: 'Universal Thread',
          imageUrl: '/window.svg',
          rating: 4.2,
          reviews: '96',
          reviewCount: 96,
          price: 24.99,
        },
      ],
      WMT: [
        {
          id: 'clr-wmt-1',
          platform: 'WMT',
          rank: 1,
          title: 'Rimless Oval Eyeglass Frames Clear Lightweight Everyday Fashion Glasses',
          brand: 'AIMISUV',
          imageUrl: '/window.svg',
          rating: 4.0,
          reviews: null,
          reviewCount: 540,
          price: 14.88,
        },
        {
          id: 'clr-wmt-2',
          platform: 'WMT',
          rank: 2,
          title: 'Women\'s Vintage Rimless Lens Glasses with Slim Metal Temples',
          brand: 'SOJOS',
          imageUrl: '/window.svg',
          rating: 4.3,
          reviews: null,
          reviewCount: 310,
          price: 17.96,
        },
      ],
    },
  },
  'WHT-SNK-2201': {
    skuId: 'WHT-SNK-2201',
    skuName: 'White Canvas Low-Top Sneakers',
    cards: {
      AMZ: [
        {
          id: 'snk-amz-1',
          platform: 'AMZ',
          rank: 1,
          title: 'Women\'s Classic White Canvas Lace-Up Sneaker with Cushioned Insole',
          brand: 'Sperry',
          imageUrl: '/window.svg',
          rating: 4.5,
          reviews: '4.8K',
          reviewCount: 4800,
          price: 34.99,
        },
        {
          id: 'snk-amz-2',
          platform: 'AMZ',
          rank: 2,
          title: 'Unisex Low Top Canvas Shoes in All White with Durable Rubber Sole',
          brand: 'hash bubbie',
          imageUrl: '/window.svg',
          rating: 4.2,
          reviews: '9.1K',
          reviewCount: 9100,
          price: 29.99,
        },
      ],
      TGT: [
        {
          id: 'snk-tgt-1',
          platform: 'TGT',
          rank: 1,
          title: 'Women\'s Taylor Lace-Up Sneakers - A New Day White',
          brand: 'A New Day',
          imageUrl: '/window.svg',
          rating: 4.6,
          reviews: '1.3K',
          reviewCount: 1300,
          price: 29.99,
        },
        {
          id: 'snk-tgt-2',
          platform: 'TGT',
          rank: 2,
          title: 'Women\'s Platform Court Sneakers - Wild Fable White',
          brand: 'Wild Fable',
          imageUrl: '/window.svg',
          rating: 4.4,
          reviews: '420',
          reviewCount: 420,
          price: 34.99,
        },
      ],
      WMT: [
        {
          id: 'snk-wmt-1',
          platform: 'WMT',
          rank: 1,
          title: 'Time and Tru Women\'s White Canvas Sneakers with Memory Foam Footbed',
          brand: 'Time and Tru',
          imageUrl: '/window.svg',
          rating: 4.1,
          reviews: null,
          reviewCount: 760,
          price: 19.98,
        },
        {
          id: 'snk-wmt-2',
          platform: 'WMT',
          rank: 2,
          title: 'No Boundaries Unisex Casual Lace-Up Sneaker in White',
          brand: 'No Boundaries',
          imageUrl: '/window.svg',
          rating: 4.0,
          reviews: null,
          reviewCount: 430,
          price: 16.94,
        },
      ],
    },
  },
  'BLK-BCK-0087': {
    skuId: 'BLK-BCK-0087',
    skuName: 'Black Nylon Drawstring Backpack',
    cards: {
      AMZ: [
        {
          id: 'bck-amz-1',
          platform: 'AMZ',
          rank: 1,
          title: 'Water-Resistant Drawstring Gym Backpack with Shoe Compartment and Front Zip Pocket',
          brand: 'WANDF',
          imageUrl: '/window.svg',
          rating: 4.5,
          reviews: '12.4K',
          reviewCount: 12400,
          price: 16.99,
        },
        {
          id: 'bck-amz-2',
          platform: 'AMZ',
          rank: 2,
          title: 'Black Nylon Cinch Sack for Sports, Travel, and Everyday Carry',
          brand: 'BeeGreen',
          imageUrl: '/window.svg',
          rating: 4.4,
          reviews: '7.6K',
          reviewCount: 7600,
          price: 12.99,
        },
      ],
      TGT: [
        {
          id: 'bck-tgt-1',
          platform: 'TGT',
          rank: 1,
          title: 'All in Motion Drawstring Gym Bag Black',
          brand: 'All in Motion',
          imageUrl: '/window.svg',
          rating: 4.5,
          reviews: '286',
          reviewCount: 286,
          price: 20.0,
        },
        {
          id: 'bck-tgt-2',
          platform: 'TGT',
          rank: 2,
          title: 'Embark Cinch Backpack with Exterior Pocket',
          brand: 'Embark',
          imageUrl: '/window.svg',
          rating: 4.2,
          reviews: '144',
          reviewCount: 144,
          price: 18.0,
        },
      ],
      WMT: [
        {
          id: 'bck-wmt-1',
          platform: 'WMT',
          rank: 1,
          title: 'Athletic Works Drawstring Bag with Front Zipper Pocket Black',
          brand: 'Athletic Works',
          imageUrl: '/window.svg',
          rating: 4.1,
          reviews: null,
          reviewCount: 690,
          price: 8.97,
        },
        {
          id: 'bck-wmt-2',
          platform: 'WMT',
          rank: 2,
          title: 'Protege Water-Resistant Cinch Sack Backpack for Travel and Gym',
          brand: 'Protege',
          imageUrl: '/window.svg',
          rating: 4.0,
          reviews: null,
          reviewCount: 350,
          price: 10.88,
        },
      ],
    },
  },
  'DNM-JNS-4450': {
    skuId: 'DNM-JNS-4450',
    skuName: 'Blue Straight-Leg Denim Jeans',
    cards: {
      AMZ: [
        {
          id: 'jns-amz-1',
          platform: 'AMZ',
          rank: 1,
          title: 'Women\'s Mid-Rise Straight Leg Jeans with Stretch Denim and Classic Wash',
          brand: 'Lee',
          imageUrl: '/window.svg',
          rating: 4.4,
          reviews: '5.7K',
          reviewCount: 5700,
          price: 39.9,
        },
        {
          id: 'jns-amz-2',
          platform: 'AMZ',
          rank: 2,
          title: 'Relaxed Straight Denim Jeans in Vintage Blue with Slight Stretch',
          brand: 'Levi\'s',
          imageUrl: '/window.svg',
          rating: 4.3,
          reviews: '3.9K',
          reviewCount: 3900,
          price: 49.5,
        },
      ],
      TGT: [
        {
          id: 'jns-tgt-1',
          platform: 'TGT',
          rank: 1,
          title: 'Women\'s High-Rise Straight Jeans - Universal Thread Medium Wash',
          brand: 'Universal Thread',
          imageUrl: '/window.svg',
          rating: 4.5,
          reviews: '2.4K',
          reviewCount: 2400,
          price: 32.0,
        },
        {
          id: 'jns-tgt-2',
          platform: 'TGT',
          rank: 2,
          title: 'Denizen from Levi\'s Mid-Rise Straight Jeans',
          brand: 'Denizen from Levi\'s',
          imageUrl: '/window.svg',
          rating: 4.3,
          reviews: '810',
          reviewCount: 810,
          price: 36.0,
        },
      ],
      WMT: [
        {
          id: 'jns-wmt-1',
          platform: 'WMT',
          rank: 1,
          title: 'Time and Tru Women\'s Straight Leg Jeans in Medium Indigo',
          brand: 'Time and Tru',
          imageUrl: '/window.svg',
          rating: 4.0,
          reviews: null,
          reviewCount: 1120,
          price: 18.98,
        },
        {
          id: 'jns-wmt-2',
          platform: 'WMT',
          rank: 2,
          title: 'Levi Strauss Signature Women\'s Straight Fit Jeans',
          brand: 'Signature by Levi Strauss & Co.',
          imageUrl: '/window.svg',
          rating: 4.2,
          reviews: null,
          reviewCount: 860,
          price: 24.98,
        },
      ],
    },
  },
}

export const DEFAULT_SCRAPED_SKU_ID = 'WHT-TEE-3340'

export function getScrapedProductsForSku(skuId: string): ScrapedListing[] {
  const skuCards = SCRAPED_DATA_BY_SKU[skuId]
  const defaultSkuCards = SCRAPED_DATA_BY_SKU[DEFAULT_SCRAPED_SKU_ID]
  if (!skuCards && !defaultSkuCards) return []

  const sourceSkuCards = skuCards ?? defaultSkuCards
  const useFallbackImages = skuId !== DEFAULT_SCRAPED_SKU_ID

  return (['AMZ', 'TGT', 'WMT'] as const).flatMap(platform => {
    const authoredCards = (sourceSkuCards?.cards[platform] ?? []).map(card => ({
      ...card,
      imageUrl: useFallbackImages ? EMPTY_IMAGE_URL : card.imageUrl,
    }))
    if (authoredCards.length >= 5) return authoredCards

    const skuFallbackCards = getCategoryPool(skuId, platform)
    const defaultFallbackCards = defaultSkuCards?.cards[platform] ?? []
    const fallbackSource = skuFallbackCards.length > 0 ? skuFallbackCards : defaultFallbackCards
    const fallbackCards = fallbackSource
      .filter(card => !authoredCards.some(authored => authored.title === card.title))
      .slice(0, Math.max(0, 5 - authoredCards.length))
      .map((card, index) => ({
        ...card,
        id: `${skuId}-${platform}-${index + 1}-fallback`,
        rank: authoredCards.length + index + 1,
        imageUrl: useFallbackImages ? EMPTY_IMAGE_URL : card.imageUrl,
      }))

    return [...authoredCards, ...fallbackCards]
  })
}

export const SCRAPED_PRODUCTS = getScrapedProductsForSku(DEFAULT_SCRAPED_SKU_ID)

// The Hanes crewneck undershirt appears across all three platforms — a natural match candidate
export const MATCH_CANDIDATES = {
  amazon: SCRAPED_PRODUCTS.find(p => p.id === 'amz-1')!,
  target: SCRAPED_PRODUCTS.find(p => p.id === 'tgt-5')!,
  walmart: SCRAPED_PRODUCTS.find(p => p.id === 'wmt-1')!,
}

export const PLATFORM_COLORS: Record<PlatformId, string> = {
  AMZ: '#e47911',
  TGT: '#cc0000',
  WMT: '#0071dc',
}

export const PLATFORM_NAMES: Record<PlatformId, string> = {
  AMZ: 'Amazon',
  TGT: 'Target',
  WMT: 'Walmart',
}
