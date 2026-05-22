/**
 * Demo competitor product catalog.
 * Products are designed to match each of the 5 private-label SKUs with realistic
 * titles, prices, and review counts. The attr scoring algorithm (computeAttrScore)
 * tokenises product names/tags — these titles are crafted to overlap heavily with
 * the anchor SKU tokens, producing 70-95% match scores.
 */

import type { ScrapedListing } from './scrapedData'

// ── Image pools (stable Unsplash photos per category) ────────────────────────

const IMGS = {
  glasses: [
    'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=300&q=80',
    'https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=300&q=80',
    'https://images.unsplash.com/photo-1577803645773-f96470509666?w=300&q=80',
    'https://images.unsplash.com/photo-1516972810927-80185027ca84?w=300&q=80',
  ],
  sneakers: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=300&q=80',
    'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=300&q=80',
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&q=80',
  ],
  backpack: [
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&q=80',
    'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?w=300&q=80',
    'https://images.unsplash.com/photo-1622560480654-d96214fdc887?w=300&q=80',
    'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=300&q=80',
  ],
  jeans: [
    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&q=80',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&q=80',
    'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=300&q=80',
    'https://images.unsplash.com/photo-1555689502-c4b22d76c56f?w=300&q=80',
  ],
  tshirt: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=80',
    'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=300&q=80',
    'https://images.unsplash.com/photo-1622470953794-aa9c70b0fb9d?w=300&q=80',
    'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=300&q=80',
  ],
}

const img = (cat: keyof typeof IMGS, i: number) => IMGS[cat][i % IMGS[cat].length]

// ── CLR-GLSS-001 — Clear Rimless Oval Glasses ($24.99) ───────────────────────
// anchor tokens: {clear, rimless, oval, glasses, fashion, lightweight}
// category tokens: {fashion, glasses, eyewear}

const GLASSES: ScrapedListing[] = [
  // ── Amazon ──
  {
    id: 'demo-glss-amz-1', platform: 'AMZ', rank: 1,
    title: 'Clear Rimless Oval Glasses Fashion Lightweight Frame Blue Light Blocking',
    brand: 'TIJN', imageUrl: img('glasses', 0),
    rating: 4.5, reviews: '12.1K', reviewCount: 12100, price: 24.49,
  },
  {
    id: 'demo-glss-amz-2', platform: 'AMZ', rank: 2,
    title: 'Retro Oval Clear Fashion Rimless Glasses Lightweight Women Men Frame',
    brand: 'Pro Acme', imageUrl: img('glasses', 1),
    rating: 4.3, reviews: '8.4K', reviewCount: 8400, price: 22.99,
  },
  {
    id: 'demo-glss-amz-3', platform: 'AMZ', rank: 3,
    title: 'Round Clear Oval Rimless Fashion Glasses Lightweight Non-Prescription Eyewear',
    brand: 'Cyxus', imageUrl: img('glasses', 2),
    rating: 4.4, reviews: '5.6K', reviewCount: 5600, price: 19.99,
  },
  {
    id: 'demo-glss-amz-4', platform: 'AMZ', rank: 4,
    title: 'Clear Oval Rimless Glasses Fashion Lightweight Frame Spring Hinge',
    brand: 'Eyekepper', imageUrl: img('glasses', 3),
    rating: 4.2, reviews: '3.2K', reviewCount: 3200, price: 27.99,
  },
  // ── Target ──
  {
    id: 'demo-glss-tgt-1', platform: 'TGT', rank: 1,
    title: 'A New Day Oval Clear Rimless Fashion Glasses Lightweight Frame For All',
    brand: 'A New Day', imageUrl: img('glasses', 0),
    rating: 4.5, reviews: '3.4K', reviewCount: 3400, price: 21.99,
  },
  {
    id: 'demo-glss-tgt-2', platform: 'TGT', rank: 2,
    title: 'Universal Thread Clear Oval Rimless Glasses Fashion Lightweight Women',
    brand: 'Universal Thread', imageUrl: img('glasses', 1),
    rating: 4.2, reviews: '1.8K', reviewCount: 1800, price: 24.99,
  },
  {
    id: 'demo-glss-tgt-3', platform: 'TGT', rank: 3,
    title: 'Wild Fable Clear Rimless Oval Fashion Glasses Lightweight Square Frame',
    brand: 'Wild Fable', imageUrl: img('glasses', 2),
    rating: 4.1, reviews: '2.1K', reviewCount: 2100, price: 18.99,
  },
  // ── Walmart ──
  {
    id: 'demo-glss-wmt-1', platform: 'WMT', rank: 1,
    title: 'Piranha Eyewear Clear Oval Fashion Rimless Glasses Lightweight Frame Non-Prescription',
    brand: 'Piranha', imageUrl: img('glasses', 3),
    rating: 4.1, reviews: '2.3K', reviewCount: 2300, price: 16.97,
  },
  {
    id: 'demo-glss-wmt-2', platform: 'WMT', rank: 2,
    title: 'ICU Eyewear Clear Rimless Oval Fashion Lightweight Glasses Frame Computer',
    brand: 'ICU Eyewear', imageUrl: img('glasses', 0),
    rating: 4.2, reviews: '1.4K', reviewCount: 1400, price: 18.98,
  },
  {
    id: 'demo-glss-wmt-3', platform: 'WMT', rank: 3,
    title: 'Fashion Clear Oval Rimless Glasses Lightweight Eyewear Frame Spring',
    brand: null, imageUrl: img('glasses', 1),
    rating: 4.0, reviews: '890', reviewCount: 890, price: 21.97,
  },
]

// ── WHT-TEE-3340 — Basic Crew-Neck White T-Shirt ($14.99) ────────────────────
// anchor tokens: {basic, crew, neck, white, shirt, cotton}
// category tokens: {basic, tops, apparel}

const TSHIRTS: ScrapedListing[] = [
  // ── Amazon ──
  {
    id: 'demo-tee-amz-1', platform: 'AMZ', rank: 1,
    title: "Hanes Men's Basic White Crew Neck Cotton T-Shirt Classic Fit Tee",
    brand: 'Hanes', imageUrl: img('tshirt', 0),
    rating: 4.5, reviews: '42.3K', reviewCount: 42300, price: 12.99,
  },
  {
    id: 'demo-tee-amz-2', platform: 'AMZ', rank: 2,
    title: "Fruit of the Loom Men's White Crew Neck Basic Cotton T-Shirt Short Sleeve",
    brand: 'Fruit of the Loom', imageUrl: img('tshirt', 1),
    rating: 4.4, reviews: '31.7K', reviewCount: 31700, price: 13.49,
  },
  {
    id: 'demo-tee-amz-3', platform: 'AMZ', rank: 3,
    title: "Gildan Men's Ultra Cotton Basic White Crew Neck T-Shirt Tops Short Sleeve",
    brand: 'Gildan', imageUrl: img('tshirt', 2),
    rating: 4.3, reviews: '18.9K', reviewCount: 18900, price: 10.99,
  },
  {
    id: 'demo-tee-amz-4', platform: 'AMZ', rank: 4,
    title: "Amazon Essentials Men's Basic Cotton White Crew Neck Shirt Slim Fit",
    brand: 'Amazon Essentials', imageUrl: img('tshirt', 3),
    rating: 4.2, reviews: '9.2K', reviewCount: 9200, price: 15.99,
  },
  // ── Target ──
  {
    id: 'demo-tee-tgt-1', platform: 'TGT', rank: 1,
    title: "Goodfellow & Co Men's Basic White Crew Neck Cotton T-Shirt Tee Tops",
    brand: "Goodfellow & Co", imageUrl: img('tshirt', 0),
    rating: 4.3, reviews: '8.1K', reviewCount: 8100, price: 14.99,
  },
  {
    id: 'demo-tee-tgt-2', platform: 'TGT', rank: 2,
    title: "All in Motion Men's White Crew Neck Cotton Basic T-Shirt Short Sleeve Tops",
    brand: 'All in Motion', imageUrl: img('tshirt', 1),
    rating: 4.4, reviews: '4.6K', reviewCount: 4600, price: 16.99,
  },
  {
    id: 'demo-tee-tgt-3', platform: 'TGT', rank: 3,
    title: "Pair of Thieves White Crew Neck Basic Cotton Shirt Lightweight Tops",
    brand: 'Pair of Thieves', imageUrl: img('tshirt', 2),
    rating: 4.2, reviews: '2.9K', reviewCount: 2900, price: 18.99,
  },
  // ── Walmart ──
  {
    id: 'demo-tee-wmt-1', platform: 'WMT', rank: 1,
    title: "Gildan Heavy Cotton White Crew Neck T-Shirt Basic Short Sleeve Tops Apparel",
    brand: 'Gildan', imageUrl: img('tshirt', 3),
    rating: 4.1, reviews: '6.8K', reviewCount: 6800, price: 6.97,
  },
  {
    id: 'demo-tee-wmt-2', platform: 'WMT', rank: 2,
    title: "George Men's White Crew Neck Basic Cotton T-Shirt Classic Short Sleeve",
    brand: 'George', imageUrl: img('tshirt', 0),
    rating: 4.0, reviews: '3.4K', reviewCount: 3400, price: 8.97,
  },
  {
    id: 'demo-tee-wmt-3', platform: 'WMT', rank: 3,
    title: "Athletic Works White Basic Crew Neck Cotton Shirt Short Sleeve Tops",
    brand: 'Athletic Works', imageUrl: img('tshirt', 1),
    rating: 4.2, reviews: '2.1K', reviewCount: 2100, price: 11.97,
  },
]

// ── WHT-SNK-2201 — White Canvas Low-Top Sneakers ($32.99) ───────────────────
// anchor tokens: {white, canvas, sneakers, unisex}
// category tokens: {canvas, sneakers, footwear}

const SNEAKERS: ScrapedListing[] = [
  // ── Amazon ──
  {
    id: 'demo-snk-amz-1', platform: 'AMZ', rank: 1,
    title: 'White Canvas Low-Top Sneakers for Men Women Unisex Classic Style Lace-Up Shoes',
    brand: 'Converse', imageUrl: img('sneakers', 0),
    rating: 4.7, reviews: '28.4K', reviewCount: 28400, price: 34.99,
  },
  {
    id: 'demo-snk-amz-2', platform: 'AMZ', rank: 2,
    title: 'DADAWEN White Canvas Sneakers Low Top Unisex Classic Lace Up Casual Shoe',
    brand: 'DADAWEN', imageUrl: img('sneakers', 1),
    rating: 4.3, reviews: '6.2K', reviewCount: 6200, price: 28.99,
  },
  {
    id: 'demo-snk-amz-3', platform: 'AMZ', rank: 3,
    title: 'Keds White Canvas Low Top Sneakers for Women Unisex Classic Slip On Shoe',
    brand: 'Keds', imageUrl: img('sneakers', 2),
    rating: 4.4, reviews: '14.8K', reviewCount: 14800, price: 37.99,
  },
  {
    id: 'demo-snk-amz-4', platform: 'AMZ', rank: 4,
    title: 'PF Flyers White Canvas Sneakers Low Top Unisex Classic Court Style Shoe',
    brand: 'PF Flyers', imageUrl: img('sneakers', 3),
    rating: 4.2, reviews: '3.8K', reviewCount: 3800, price: 29.99,
  },
  // ── Target ──
  {
    id: 'demo-snk-tgt-1', platform: 'TGT', rank: 1,
    title: "Original Use White Canvas Low Top Sneakers Unisex Classic Lace-Up Style",
    brand: 'Original Use', imageUrl: img('sneakers', 0),
    rating: 4.3, reviews: '3.4K', reviewCount: 3400, price: 29.99,
  },
  {
    id: 'demo-snk-tgt-2', platform: 'TGT', rank: 2,
    title: "Converse Chuck Taylor All Star White Canvas Low Top Sneakers Unisex Classic",
    brand: 'Converse', imageUrl: img('sneakers', 1),
    rating: 4.7, reviews: '22.1K', reviewCount: 22100, price: 44.99,
  },
  {
    id: 'demo-snk-tgt-3', platform: 'TGT', rank: 3,
    title: "Universal Thread White Canvas Sneakers Low Top Unisex Spring Style Shoe",
    brand: 'Universal Thread', imageUrl: img('sneakers', 2),
    rating: 4.2, reviews: '1.6K', reviewCount: 1600, price: 27.99,
  },
  // ── Walmart ──
  {
    id: 'demo-snk-wmt-1', platform: 'WMT', rank: 1,
    title: "Athletic Works White Canvas Low Top Sneakers for Men Women Unisex Classic Shoe",
    brand: 'Athletic Works', imageUrl: img('sneakers', 3),
    rating: 4.2, reviews: '2.8K', reviewCount: 2800, price: 19.98,
  },
  {
    id: 'demo-snk-wmt-2', platform: 'WMT', rank: 2,
    title: "George White Canvas Sneakers Low Top Unisex Casual Lace Style Classic Shoe",
    brand: 'George', imageUrl: img('sneakers', 0),
    rating: 4.1, reviews: '1.4K', reviewCount: 1400, price: 22.97,
  },
  {
    id: 'demo-snk-wmt-3', platform: 'WMT', rank: 3,
    title: "No Boundaries White Canvas Low Top Unisex Sneakers Classic Fashion Shoe",
    brand: 'No Boundaries', imageUrl: img('sneakers', 1),
    rating: 4.0, reviews: '940', reviewCount: 940, price: 24.97,
  },
]

// ── BLK-BCK-0087 — Black Nylon Drawstring Backpack ($25.99) ─────────────────
// anchor tokens: {black, nylon, drawstring, backpack, lightweight, sports}
// category tokens: {drawstring, bags, accessories}

const BACKPACKS: ScrapedListing[] = [
  // ── Amazon ──
  {
    id: 'demo-bck-amz-1', platform: 'AMZ', rank: 1,
    title: 'Black Nylon Drawstring Backpack Sports Lightweight Gym Sack Bag for Men Women',
    brand: 'MIER', imageUrl: img('backpack', 0),
    rating: 4.6, reviews: '18.3K', reviewCount: 18300, price: 22.99,
  },
  {
    id: 'demo-bck-amz-2', platform: 'AMZ', rank: 2,
    title: 'Drawstring Backpack Black Nylon Sports Lightweight Bag Gym Sackpack Cinch',
    brand: 'KAMO', imageUrl: img('backpack', 1),
    rating: 4.4, reviews: '9.7K', reviewCount: 9700, price: 18.99,
  },
  {
    id: 'demo-bck-amz-3', platform: 'AMZ', rank: 3,
    title: 'Black Drawstring Backpack Nylon Lightweight Sports Bag Cinch Sack Gym',
    brand: 'Adidas', imageUrl: img('backpack', 2),
    rating: 4.5, reviews: '7.4K', reviewCount: 7400, price: 27.99,
  },
  {
    id: 'demo-bck-amz-4', platform: 'AMZ', rank: 4,
    title: 'Nike Black Nylon Drawstring Backpack Sports Lightweight Brasilia Bag',
    brand: 'Nike', imageUrl: img('backpack', 3),
    rating: 4.6, reviews: '5.2K', reviewCount: 5200, price: 29.99,
  },
  // ── Target ──
  {
    id: 'demo-bck-tgt-1', platform: 'TGT', rank: 1,
    title: "16.5 Black Drawstring Backpack Nylon Lightweight Sports Bag Room Essentials",
    brand: "Room Essentials", imageUrl: img('backpack', 0),
    rating: 4.2, reviews: '2.9K', reviewCount: 2900, price: 14.99,
  },
  {
    id: 'demo-bck-tgt-2', platform: 'TGT', rank: 2,
    title: "Champion Black Nylon Drawstring Backpack Lightweight Sports Cinch Bags",
    brand: 'Champion', imageUrl: img('backpack', 1),
    rating: 4.4, reviews: '1.8K', reviewCount: 1800, price: 24.99,
  },
  {
    id: 'demo-bck-tgt-3', platform: 'TGT', rank: 3,
    title: "All in Motion Black Drawstring Backpack Lightweight Nylon Sports Bag",
    brand: 'All in Motion', imageUrl: img('backpack', 2),
    rating: 4.3, reviews: '1.2K', reviewCount: 1200, price: 22.99,
  },
  // ── Walmart ──
  {
    id: 'demo-bck-wmt-1', platform: 'WMT', rank: 1,
    title: "Dickies Black Nylon Drawstring Backpack Industrial Sports Lightweight Bag",
    brand: 'Dickies', imageUrl: img('backpack', 3),
    rating: 4.3, reviews: '2.1K', reviewCount: 2100, price: 17.98,
  },
  {
    id: 'demo-bck-wmt-2', platform: 'WMT', rank: 2,
    title: "Everest Black Drawstring Backpack Nylon Lightweight Sports Cinch Bag",
    brand: 'Everest', imageUrl: img('backpack', 0),
    rating: 4.2, reviews: '1.6K', reviewCount: 1600, price: 12.97,
  },
  {
    id: 'demo-bck-wmt-3', platform: 'WMT', rank: 3,
    title: "Athletic Works Black Nylon Drawstring Backpack Lightweight Sports Bag Gym",
    brand: 'Athletic Works', imageUrl: img('backpack', 1),
    rating: 4.1, reviews: '980', reviewCount: 980, price: 9.97,
  },
]

// ── DNM-JNS-4450 — Blue Straight-Leg Denim Jeans ($42.99) ───────────────────
// anchor tokens: {blue, straight, denim, jeans, unisex}
// category tokens: {denim, jeans, apparel}

const JEANS: ScrapedListing[] = [
  // ── Amazon ──
  {
    id: 'demo-jns-amz-1', platform: 'AMZ', rank: 1,
    title: "Levi's Men's 505 Regular Blue Straight Denim Jeans Classic Fit Unisex Apparel",
    brand: "Levi's", imageUrl: img('jeans', 0),
    rating: 4.6, reviews: '32.1K', reviewCount: 32100, price: 39.99,
  },
  {
    id: 'demo-jns-amz-2', platform: 'AMZ', rank: 2,
    title: "Wrangler Men's Classic Blue Straight Leg Denim Jeans Regular Fit Unisex",
    brand: 'Wrangler', imageUrl: img('jeans', 1),
    rating: 4.5, reviews: '28.4K', reviewCount: 28400, price: 29.99,
  },
  {
    id: 'demo-jns-amz-3', platform: 'AMZ', rank: 3,
    title: "Lee Men's Regular Fit Blue Straight Leg Denim Jeans Classic Style Unisex",
    brand: 'Lee', imageUrl: img('jeans', 2),
    rating: 4.4, reviews: '14.6K', reviewCount: 14600, price: 36.99,
  },
  {
    id: 'demo-jns-amz-4', platform: 'AMZ', rank: 4,
    title: "Amazon Essentials Men's Blue Straight Denim Jeans Regular Fit Classic Unisex",
    brand: 'Amazon Essentials', imageUrl: img('jeans', 3),
    rating: 4.2, reviews: '6.8K', reviewCount: 6800, price: 34.99,
  },
  // ── Target ──
  {
    id: 'demo-jns-tgt-1', platform: 'TGT', rank: 1,
    title: "Goodfellow & Co Men's Straight Taper Fit Blue Denim Jeans Classic Unisex",
    brand: "Goodfellow & Co", imageUrl: img('jeans', 0),
    rating: 4.4, reviews: '8.4K', reviewCount: 8400, price: 32.99,
  },
  {
    id: 'demo-jns-tgt-2', platform: 'TGT', rank: 2,
    title: "Levi's 514 Men's Straight Fit Blue Denim Jeans Classic Style Unisex Dark",
    brand: "Levi's", imageUrl: img('jeans', 1),
    rating: 4.6, reviews: '4.1K', reviewCount: 4100, price: 54.99,
  },
  {
    id: 'demo-jns-tgt-3', platform: 'TGT', rank: 3,
    title: "Original Use Men's Blue Straight Leg Denim Jeans Classic Fit Unisex Style",
    brand: 'Original Use', imageUrl: img('jeans', 2),
    rating: 4.1, reviews: '1.9K', reviewCount: 1900, price: 27.99,
  },
  // ── Walmart ──
  {
    id: 'demo-jns-wmt-1', platform: 'WMT', rank: 1,
    title: "Wrangler Men's Regular Fit Straight Leg Blue Denim Jeans Classic Unisex",
    brand: 'Wrangler', imageUrl: img('jeans', 3),
    rating: 4.4, reviews: '12.3K', reviewCount: 12300, price: 24.97,
  },
  {
    id: 'demo-jns-wmt-2', platform: 'WMT', rank: 2,
    title: "George Men's Straight Leg Blue Denim Jeans Classic Regular Fit Unisex",
    brand: 'George', imageUrl: img('jeans', 0),
    rating: 4.2, reviews: '4.8K', reviewCount: 4800, price: 18.97,
  },
  {
    id: 'demo-jns-wmt-3', platform: 'WMT', rank: 3,
    title: "Athletic Works Men's Blue Straight Denim Jeans Lightweight Unisex Classic",
    brand: 'Athletic Works', imageUrl: img('jeans', 1),
    rating: 4.1, reviews: '2.4K', reviewCount: 2400, price: 21.97,
  },
]

// ── Combined catalog ──────────────────────────────────────────────────────────

const CATALOG: Record<string, ScrapedListing[]> = {
  'CLR-GLSS-001': GLASSES,
  'WHT-TEE-3340': TSHIRTS,
  'WHT-SNK-2201': SNEAKERS,
  'BLK-BCK-0087': BACKPACKS,
  'DNM-JNS-4450': JEANS,
}

/**
 * Return the competitor product pool for a given private-label SKU and platform.
 * Falls back to the default SCRAPED_PRODUCTS if no demo catalog entry exists.
 */
export function getCategoryPool(productId: string, platformId: string): ScrapedListing[] {
  const pool = CATALOG[productId]
  if (!pool) return []
  return pool.filter(p => p.platform === (platformId as 'AMZ' | 'TGT' | 'WMT'))
}

/** Total listing count across all platforms for a given SKU. */
export function getCatalogSize(productId: string): number {
  return CATALOG[productId]?.length ?? 0
}
