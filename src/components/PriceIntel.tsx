'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Brain, ChevronDown, RefreshCw, CheckCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
  ScatterChart, Scatter, Legend,
  ComposedChart, Area,
  Cell,
} from 'recharts'
import { PRODUCTS } from '../lib/data'
import { SCRAPED_PRODUCTS, PLATFORM_COLORS, PLATFORM_NAMES } from '../lib/scrapedData'
import type { MatchProductsRequest, MatchProductResult } from '../app/api/match-products/route'
import type { Product } from '../lib/types'

// ── Competitor config ──────────────────────────────────────────────────────────

interface Competitor { id: string; name: string; color: string; hasData: boolean }

const ALL_COMPETITORS: Competitor[] = [
  { id: 'AMZ', name: 'Amazon',  color: '#e47911', hasData: true },
  { id: 'TGT', name: 'Target',  color: '#cc0000', hasData: true },
  { id: 'WMT', name: 'Walmart', color: '#0071dc', hasData: true },
  { id: 'COST', name: 'Costco',    color: '#005daa', hasData: false },
  { id: 'NORD', name: 'Nordstrom', color: '#1a1a1a', hasData: false },
]

const DEFAULT_ENABLED = new Set(['AMZ', 'TGT', 'WMT'])

// ── Types ──────────────────────────────────────────────────────────────────────

interface RankedMatch {
  product: typeof SCRAPED_PRODUCTS[0]
  attrScore: number
  textScore: number
  imageScore: number
  overall: number
}

interface FlatMatch extends RankedMatch {
  platformId: string
  color: string
  platformName: string
}

type PlatformStatus = 'idle' | 'running' | 'done'

// ── Helpers ────────────────────────────────────────────────────────────────────

const STOP = new Set(['the','and','for','with','men','mens','women','womens','adult','size','pack'])
const tok = (s: string) => s.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOP.has(w))

function starPts(cx: number, cy: number, r1: number, r2: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2
    return `${(cx + Math.cos(a) * (i % 2 === 0 ? r1 : r2)).toFixed(1)},${(cy + Math.sin(a) * (i % 2 === 0 ? r1 : r2)).toFixed(1)}`
  }).join(' ')
}

function computeAttrScore(product: Product, scraped: typeof SCRAPED_PRODUCTS[0]): number {
  let score = 0; let weight = 0
  if (product.yourPrice > 0 && scraped.price != null && scraped.price > 0) {
    score  += (Math.min(product.yourPrice, scraped.price) / Math.max(product.yourPrice, scraped.price)) * 100 * 0.4
    weight += 40
  }
  const av = new Set(tok(product.name + ' ' + product.tags.join(' ')))
  const bv = tok(scraped.title)
  const inter = bv.filter(w => av.has(w)).length
  const union = new Set([...av, ...bv]).size
  if (union > 0) { score += (inter / union) * 100 * 0.45; weight += 45 }
  const cv = new Set(tok(product.category + ' ' + product.subcategory))
  score += (bv.some(w => cv.has(w)) ? 75 : 20) * 0.15; weight += 15
  return weight > 0 ? Math.round((score / weight) * 100) : 0
}

const fmt = (n: number) => `$${n.toFixed(2)}`

// Hardcoded price change counts per product id
const CHANGE_COUNTS: Record<string, number> = {
  'amz-1': 7, 'amz-2': 4, 'amz-3': 9, 'amz-4': 12, 'amz-5': 8,
  'tgt-1': 2, 'tgt-2': 1, 'tgt-3': 3, 'tgt-4': 5, 'tgt-5': 2,
  'wmt-1': 3, 'wmt-2': 2, 'wmt-3': 4, 'wmt-4': 2, 'wmt-5': 1,
}

// Platform pricing strategy
const PLATFORM_STRATEGY: Record<string, string> = {
  AMZ: 'Dynamic', TGT: 'Promo Cycle', WMT: 'EDLP',
}

// Gaussian KDE for bell curve
function gaussianKDE(points: { price: number; volume: number }[], bw = 3, steps = 60): { price: number; density: number }[] {
  const maxP = Math.max(...points.map(p => p.price)) * 1.25
  const minP = 0
  const dx = (maxP - minP) / steps
  return Array.from({ length: steps + 1 }, (_, i) => {
    const p = minP + i * dx
    const density = points.reduce(
      (s, pt) => s + pt.volume * Math.exp(-0.5 * ((p - pt.price) / bw) ** 2),
      0
    )
    return { price: parseFloat(p.toFixed(2)), density }
  })
}

// ── Hero SKU Selector ─────────────────────────────────────────────────────────

function HeroSkuSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = PRODUCTS.find(p => p.id === value)!

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 24 }}>
      {/* Left: selected product hero display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1 }}>
        <span style={{ fontSize: 48, lineHeight: 1 }}>{selected.emoji}</span>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 3 }}>
            PRIVATE LABEL SKU
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 2 }}>
            {selected.name}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', marginBottom: 4 }}>
            {selected.id} · {selected.category}
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
            {fmt(selected.yourPrice)}
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)', marginTop: 2 }}>Your Price</div>
        </div>
      </div>

      {/* Right: Change SKU dropdown */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            background: 'var(--warm-white)', border: '1.5px solid var(--border2)', borderRadius: 8,
            cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12,
            fontWeight: 600, color: 'var(--ink2)',
          }}
        >
          Change SKU <ChevronDown size={13} color="var(--ink3)" />
        </button>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
            background: 'white', border: '1px solid var(--border)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 300, overflow: 'hidden',
          }}>
            {PRODUCTS.map(p => (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false) }}
                style={{
                  width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12,
                  background: p.id === value ? 'var(--warm-white)' : 'white', border: 'none',
                  cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                <span style={{ fontSize: 22 }}>{p.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{p.name}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>
                    {p.id} · {fmt(p.yourPrice)}
                  </div>
                </div>
                {p.id === value && <CheckCircle size={12} color="var(--accent2)" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Top 5 Match Cards ─────────────────────────────────────────────────────────

interface MatchCardProps {
  match: FlatMatch
  rank: number
  isSelected: boolean
  onHover: (id: string | null) => void
  onClick: (id: string) => void
}

function MatchCard({ match, rank, isSelected, onHover, onClick }: MatchCardProps) {
  const score = match.overall
  const confidenceLabel = score >= 90 ? 'HIGH' : score >= 80 ? 'MEDIUM' : 'LOW'
  const confidenceColor = score >= 90 ? 'var(--accent2)' : score >= 80 ? 'var(--amber)' : 'var(--blue)'
  const confidenceBg = score >= 90 ? 'var(--accent2-soft)' : score >= 80 ? '#fef6e3' : 'var(--blue-soft)'
  const barColor = score >= 90 ? 'var(--accent2)' : score >= 80 ? 'var(--amber)' : 'var(--blue)'

  return (
    <div
      onMouseEnter={() => onHover(match.product.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(match.product.id)}
      style={{
        minWidth: 200, borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
        border: isSelected ? `2px solid ${match.color}` : '1px solid var(--border)',
        background: isSelected ? `${match.color}08` : 'white',
        boxShadow: isSelected ? `0 2px 12px ${match.color}22` : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.15s ease', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Image */}
      <div style={{ position: 'relative', width: '100%', height: 100 }}>
        <img
          src={match.product.imageUrl}
          alt={match.product.title}
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x100/f5f1ea/b5a892?text=No+Image' }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        {/* Platform bar overlay */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: match.color, padding: '3px 8px',
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'white', fontWeight: 700 }}>
            {match.platformName.toUpperCase()}
          </span>
        </div>
        {/* Rank badge top-left */}
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(26,23,20,0.75)', borderRadius: 4,
          padding: '1px 5px',
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'white', fontWeight: 700 }}>
            #{rank}
          </span>
        </div>
        {/* Confidence badge top-right */}
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: confidenceBg, borderRadius: 4, padding: '2px 6px',
          border: `1px solid ${confidenceColor}40`,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: confidenceColor, fontWeight: 700 }}>
            {confidenceLabel}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '9px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {/* Product title — 2-line clamp */}
        <div style={{
          fontSize: 11, color: 'var(--ink2)', lineHeight: 1.35,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
        }}>
          {match.product.title}
        </div>
        {/* Price */}
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginTop: 2 }}>
          {match.product.price != null ? fmt(match.product.price) : 'N/A'}
        </div>
        {/* Match score bar */}
        <div style={{ marginTop: 'auto', paddingTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)' }}>Match</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: confidenceColor, fontWeight: 700 }}>{score}%</span>
          </div>
          <div style={{ height: 4, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${score}%`, background: barColor, borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Scatter custom dot ────────────────────────────────────────────────────────

interface ScatterPt {
  reviews: number
  price: number
  name: string
  overall: number
  platform: string
  productId: string
}

const PlatformDot = (props: {
  cx?: number; cy?: number; payload?: ScatterPt; fill?: string; focusedId?: string | null
}) => {
  const { cx = 0, cy = 0, fill = '#888', payload } = props
  const r = payload ? 6 + ((payload.overall - 70) / 30) * 6 : 7
  const isFocused = !props.focusedId || props.focusedId === payload?.productId
  return (
    <circle
      cx={cx} cy={cy} r={r}
      fill={fill} stroke="white" strokeWidth={1.5}
      opacity={isFocused ? 0.9 : 0.2}
    />
  )
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPt }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'var(--ink)', padding: '8px 12px', borderRadius: 6, fontSize: 11,
      color: 'var(--cream)', fontFamily: "'IBM Plex Sans', sans-serif", maxWidth: 220,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 3 }}>{d.name.length > 36 ? d.name.slice(0, 36) + '…' : d.name}</div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>
        {fmt(d.price)} · {d.reviews.toLocaleString()} reviews
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6ce09a', marginTop: 2 }}>
        {d.platform} · {d.overall}% match
      </div>
    </div>
  )
}

// ── Bar chart tooltip ─────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; payload: { fill?: string } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--ink)', padding: '7px 11px', borderRadius: 6, fontSize: 11, color: 'var(--cream)', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ color: 'var(--mid)', marginBottom: 2, fontSize: 9 }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{payload[0].value} changes/30d</div>
    </div>
  )
}

// ── KDE Tooltip ──────────────────────────────────────────────────────────────

function KdeTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) {
  if (!active || !payload?.length) return null
  const price = payload.find(p => p.name === 'price')?.value ?? 0
  const density = payload.find(p => p.name === 'density')?.value ?? 0
  if (density < 0.01) return null
  return (
    <div style={{ background: 'var(--ink)', padding: '7px 11px', borderRadius: 6, fontSize: 10, color: 'var(--cream)', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div>{fmt(price)}</div>
      <div style={{ color: 'var(--mid)' }}>density: {density.toFixed(1)}</div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PriceIntel() {
  const [selectedSkuId,  setSelectedSkuId]  = useState(PRODUCTS[0].id)
  const [enabled,        setEnabled]        = useState<Set<string>>(new Set(DEFAULT_ENABLED))
  const [platformRanks,  setPlatformRanks]  = useState<Record<string, RankedMatch[]>>({})
  const [platformStatus, setPlatformStatus] = useState<Record<string, PlatformStatus>>({})
  const [hasAiScores,    setHasAiScores]    = useState(false)
  const [isRunningAi,    setIsRunningAi]    = useState(false)
  const [aiMode,         setAiMode]         = useState<string | null>(null)
  const [focusedId,      setFocusedId]      = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  const selectedProduct  = PRODUCTS.find(p => p.id === selectedSkuId)!
  const activeCompetitors = ALL_COMPETITORS.filter(c => enabled.has(c.id) && c.hasData)

  // Attribute scoring on SKU / competitor change
  useEffect(() => {
    const ranks: Record<string, RankedMatch[]> = {}
    for (const c of ALL_COMPETITORS.filter(c => enabled.has(c.id))) {
      if (!c.hasData) { ranks[c.id] = []; continue }
      const pool = SCRAPED_PRODUCTS.filter(p => p.platform === c.id as 'AMZ' | 'TGT' | 'WMT')
      ranks[c.id] = pool.map(p => {
        const s = computeAttrScore(selectedProduct, p)
        return { product: p, attrScore: s, textScore: 0, imageScore: 0, overall: s }
      }).sort((a, b) => b.overall - a.overall)
    }
    setPlatformRanks(ranks)
    setHasAiScores(false)
    setPlatformStatus({})
    setAiMode(null)
    setSelectedCardId(null)
  }, [selectedSkuId, enabled, selectedProduct])

  const toggleCompetitor = useCallback((id: string) => {
    setEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }, [])

  const runAiMatching = useCallback(async () => {
    setIsRunningAi(true); setAiMode(null)
    const tasks = activeCompetitors.map(comp => async () => {
      setPlatformStatus(prev => ({ ...prev, [comp.id]: 'running' }))
      const pool = SCRAPED_PRODUCTS.filter(p => p.platform === comp.id as 'AMZ' | 'TGT' | 'WMT')
      const req: MatchProductsRequest = {
        anchor:     { id: selectedProduct.id, title: selectedProduct.name, imageUrl: selectedProduct.imageUrl },
        candidates: pool.map(p => ({ id: p.id, title: p.title, imageUrl: p.imageUrl })),
      }
      let aiResults: MatchProductResult[] = []; let mode = 'fallback'
      try {
        const res  = await fetch('/api/match-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req) })
        const data = await res.json() as { results: MatchProductResult[]; mode: string }
        aiResults = data.results; mode = data.mode
      } catch {
        aiResults = pool.map(p => ({ id: p.id, textScore: 45, visualScore: 40 }))
      }
      setAiMode(prev => (prev === 'ai_text_vision' ? prev : mode))
      const scoreMap = new Map(aiResults.map(r => [r.id, r]))
      const updated = pool.map(p => {
        const ai   = scoreMap.get(p.id)
        const attr = computeAttrScore(selectedProduct, p)
        return {
          product: p, attrScore: attr,
          textScore: ai?.textScore ?? 45, imageScore: ai?.visualScore ?? 40,
          overall: Math.round(0.35 * attr + 0.35 * (ai?.textScore ?? 45) + 0.30 * (ai?.visualScore ?? 40)),
        }
      }).sort((a, b) => b.overall - a.overall)
      setPlatformRanks(prev => ({ ...prev, [comp.id]: updated }))
      setPlatformStatus(prev => ({ ...prev, [comp.id]: 'done' }))
    })
    await Promise.all(tasks.map(t => t()))
    setHasAiScores(true); setIsRunningAi(false)
  }, [activeCompetitors, selectedProduct])

  // Top 5 matches (≥70%, sorted by score)
  const top5Matches: FlatMatch[] = Object.entries(platformRanks)
    .flatMap(([compId, ranks]) => {
      const comp = ALL_COMPETITORS.find(c => c.id === compId)
      if (!comp) return []
      return ranks.map(r => ({ ...r, platformId: compId, color: comp.color, platformName: comp.name }))
    })
    .filter(m => m.overall >= 70)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 5)

  // Derived analytics
  const yourPrice = selectedProduct.yourPrice
  const matchPrices = top5Matches.map(m => m.product.price ?? yourPrice)
  const marketAvg = matchPrices.length > 0 ? matchPrices.reduce((s, p) => s + p, 0) / matchPrices.length : yourPrice
  const priceDiff = yourPrice - marketAvg
  const priceDiffPct = marketAvg > 0 ? (priceDiff / marketAvg) * 100 : 0
  const cheapest = top5Matches.reduce<FlatMatch | null>((acc, m) => {
    if (m.product.price == null) return acc
    if (!acc || m.product.price < (acc.product.price ?? Infinity)) return m
    return acc
  }, null)
  const avgChanges = top5Matches.length > 0
    ? top5Matches.reduce((s, m) => s + (CHANGE_COUNTS[m.product.id] ?? 0), 0) / top5Matches.length
    : 0
  const amzMatches = top5Matches.filter(m => m.platformId === 'AMZ')
  const avgAmzChanges = amzMatches.length > 0
    ? Math.round(amzMatches.reduce((s, m) => s + (CHANGE_COUNTS[m.product.id] ?? 0), 0) / amzMatches.length)
    : 7
  const strategyCounts: Record<string, number> = {}
  for (const m of top5Matches) {
    const s = PLATFORM_STRATEGY[m.platformId] ?? 'Dynamic'
    strategyCounts[s] = (strategyCounts[s] ?? 0) + 1
  }
  const dominantStrategy = Object.entries(strategyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Dynamic'
  const pricePosition = Math.abs(priceDiffPct) < 5
    ? `${Math.abs(priceDiffPct).toFixed(1)}% at market avg`
    : priceDiff > 0
      ? `${priceDiffPct.toFixed(1)}% above market avg`
      : `${Math.abs(priceDiffPct).toFixed(1)}% below market avg`
  const tier = yourPrice <= marketAvg * 0.95 ? 'GOOD' : yourPrice <= marketAvg * 1.05 ? 'BETTER' : 'BEST'
  const tierAdvice: Record<string, string> = {
    GOOD:   'You are price-competitive — monitor for margin expansion opportunity',
    BETTER: 'You are well-positioned at market average — hold and monitor',
    BEST:   'You are in the premium tier — justify with quality differentiation',
  }

  // Scatter data
  const byPlatform = (pid: string) =>
    top5Matches
      .filter(m => m.platformId === pid && m.product.price != null)
      .map(m => ({
        reviews: m.product.reviewCount,
        price: m.product.price!,
        name: m.product.title,
        overall: m.overall,
        platform: m.platformName,
        productId: m.product.id,
      }))

  const avgMatchReviews = top5Matches.length > 0
    ? top5Matches.reduce((s, m) => s + m.product.reviewCount, 0) / top5Matches.length
    : 1000

  // Scatter price bands (thirds of sorted match prices)
  const sortedPrices = [...top5Matches.map(m => m.product.price ?? yourPrice)].sort((a, b) => a - b)
  const bandLow = sortedPrices[0] ?? yourPrice * 0.8
  const bandMid = sortedPrices[Math.floor(sortedPrices.length / 3)] ?? yourPrice
  const bandHigh = sortedPrices[Math.floor((sortedPrices.length * 2) / 3)] ?? yourPrice * 1.1
  const bandMax = (sortedPrices[sortedPrices.length - 1] ?? yourPrice * 1.2) * 1.1

  // KDE data
  const kdePoints = top5Matches
    .filter(m => m.product.price != null)
    .map(m => ({ price: m.product.price!, volume: m.product.reviewCount }))
  const kdeData = kdePoints.length > 0
    ? gaussianKDE(kdePoints, Math.max(3, (sortedPrices[sortedPrices.length - 1] ?? 30) / 10))
    : []

  // Bar chart data for price activity
  const barData = top5Matches.map(m => ({
    name: m.product.title.length > 20 ? m.product.title.slice(0, 20) + '…' : m.product.title,
    changes: CHANGE_COUNTS[m.product.id] ?? 0,
    fill: m.color,
    platform: m.platformName,
  }))
  const highestChange = barData.reduce<{ changes: number; platform: string }>((acc, d) => d.changes > acc.changes ? d : acc, { changes: 0, platform: '' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── A) Hero SKU Selector + B) Controls ── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <HeroSkuSelector value={selectedSkuId} onChange={id => setSelectedSkuId(id)} />

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Control strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Compare against:</div>
          {ALL_COMPETITORS.filter(c => c.hasData).map(c => (
            <button
              key={c.id}
              onClick={() => toggleCompetitor(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
                borderRadius: 20, border: `1.5px solid ${enabled.has(c.id) ? c.color : 'var(--border)'}`,
                background: enabled.has(c.id) ? `${c.color}15` : 'var(--warm-white)',
                cursor: 'pointer', fontSize: 11, fontWeight: 500,
                color: enabled.has(c.id) ? c.color : 'var(--ink3)', fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: enabled.has(c.id) ? c.color : 'var(--mid)' }} />
              {c.name}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {aiMode && hasAiScores && (
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3,
                background: aiMode === 'fallback' ? 'var(--paper)' : 'var(--accent2-soft)',
                color: aiMode === 'fallback' ? 'var(--mid)' : 'var(--accent2)',
              }}>
                {aiMode === 'ai_text_vision' ? 'TEXT + VISION AI' : aiMode === 'ai_text_only' ? 'SEMANTIC AI' : 'DEMO'}
              </span>
            )}
            <button
              onClick={runAiMatching}
              disabled={isRunningAi}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                background: isRunningAi ? 'var(--paper)' : 'var(--accent)',
                color: isRunningAi ? 'var(--mid)' : 'white',
                border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: isRunningAi ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
              }}
            >
              {isRunningAi
                ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Running AI…</>
                : <><Brain size={12} />Run AI Match</>
              }
            </button>
          </div>
        </div>

        {/* Hint */}
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', padding: '4px 0 0' }}>
          Showing only matches ≥70% confidence
        </div>
      </div>

      {/* ── C) Top 5 Matches ── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Top 5 Market Matches</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>(≥70% confidence only)</span>
          {!hasAiScores && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--blue-soft)', color: 'var(--blue)', marginLeft: 4 }}>
              Attribute preview — run AI for ranked results
            </span>
          )}
        </div>

        <div style={{ padding: '16px 20px' }}>
          {top5Matches.length === 0 ? (
            <div style={{
              padding: '32px 24px', textAlign: 'center', color: 'var(--ink3)',
              background: 'var(--warm-white)', borderRadius: 10,
            }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink2)', marginBottom: 6 }}>
                No confident matches found for this SKU
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink3)' }}>
                {hasAiScores
                  ? 'Try a different SKU or expand competitors'
                  : 'Run AI Match to compute confidence scores'
                }
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
              {top5Matches.map((m, i) => (
                <MatchCard
                  key={m.product.id}
                  match={m}
                  rank={i + 1}
                  isSelected={selectedCardId === m.product.id}
                  onHover={setFocusedId}
                  onClick={id => setSelectedCardId(prev => prev === id ? null : id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── D) AI Pricing Intelligence (only after AI run with matches) ── */}
      {hasAiScores && top5Matches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '60fr 40fr', gap: 18 }}>

          {/* LEFT: Competitor Price Activity bar chart */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Competitor Price Activity</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>
                Price changes in last 30 days
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {barData.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={barData}
                    layout="vertical"
                    margin={{ top: 4, right: 20, bottom: 4, left: 8 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                      tickLine={false}
                      label={{ value: 'Price changes / 30d', position: 'insideBottom', offset: -2, fontSize: 9, fill: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                      tickLine={false}
                    />
                    <ReTooltip content={<BarTooltip />} cursor={{ fill: 'var(--warm-white)' }} />
                    <Bar dataKey="changes" radius={[0, 4, 4, 0]}>
                      {barData.map((d, i) => (
                        <Cell key={i} fill={d.fill} opacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {/* Summary line */}
              <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>
                  Avg across matched: <strong style={{ color: 'var(--ink2)' }}>{avgChanges.toFixed(1)} changes/30d</strong>
                </div>
                {highestChange.platform && (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>
                    Highest: <strong style={{ color: 'var(--accent)' }}>{highestChange.changes} changes ({highestChange.platform})</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Pricing Strategy */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Pricing Strategy</div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--ink)', marginBottom: 12 }}>Strategic Recommendation</div>

              {/* 2×2 stat pills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Market Avg', value: fmt(marketAvg), color: 'var(--blue)', bg: 'var(--blue-soft)' },
                  { label: 'Your Position', value: pricePosition, color: Math.abs(priceDiffPct) > 10 ? 'var(--accent)' : 'var(--accent2)', bg: Math.abs(priceDiffPct) > 10 ? 'var(--accent-soft)' : 'var(--accent2-soft)' },
                  { label: 'Avg Changes/30d', value: `${avgChanges.toFixed(1)}×`, color: 'var(--amber)', bg: '#fef6e3' },
                  { label: 'Dominant Strategy', value: dominantStrategy, color: 'var(--ink2)', bg: 'var(--paper)' },
                ].map(pill => (
                  <div key={pill.label} style={{ padding: '8px 10px', background: pill.bg, borderRadius: 8 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: pill.color, fontWeight: 700, marginBottom: 2 }}>
                      {pill.label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: pill.color }}>{pill.value}</div>
                  </div>
                ))}
              </div>

              {/* Bullet insights */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  priceDiffPct > 10 && cheapest
                    ? `Consider a 5-8% price reduction to align with the ${cheapest.platformName} market position (currently ${fmt(cheapest.product.price!)})`
                    : priceDiffPct < -5
                      ? `You have room to increase price by ${Math.abs(priceDiffPct).toFixed(0)}% while staying at market avg (${fmt(marketAvg)})`
                      : `Your price is closely aligned with market average — a strong hold position`,
                  `Amazon reprices this category ${avgAmzChanges}× per month — set automated alerts for >$1 changes`,
                  `Your price is in the ${tier} tier — ${tierAdvice[tier]}`,
                ].map((text, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    padding: '8px 10px', borderRadius: 7,
                    borderLeft: `3px solid ${i === 0 ? 'var(--accent)' : i === 1 ? 'var(--amber)' : 'var(--accent2)'}`,
                    background: i === 0 ? 'var(--accent-soft)' : i === 1 ? '#fef6e3' : 'var(--accent2-soft)',
                  }}>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, color: i === 0 ? 'var(--accent)' : i === 1 ? 'var(--amber)' : 'var(--accent2)', flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink2)', lineHeight: 1.5 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── E) Two charts row ── */}
      {hasAiScores && top5Matches.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>

          {/* LEFT: Market Map — Price × Volume scatter */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Market Map — Price × Volume</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>
                Dot size = match confidence · hover to inspect
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 8, right: 20, bottom: 20, left: 8 }}>
                  <defs>
                    {/* no gradients needed */}
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" />

                  {/* GOOD/BETTER/BEST bands */}
                  <ReferenceArea y1={bandLow} y2={bandMid} fill="rgba(26,107,60,0.07)" label={{ value: 'GOOD', position: 'insideTopRight', fontSize: 9, fill: 'var(--accent2)', fontFamily: "'IBM Plex Mono', monospace" }} />
                  <ReferenceArea y1={bandMid} y2={bandHigh} fill="rgba(200,125,10,0.07)" label={{ value: 'BETTER', position: 'insideTopRight', fontSize: 9, fill: 'var(--amber)', fontFamily: "'IBM Plex Mono', monospace" }} />
                  <ReferenceArea y1={bandHigh} y2={bandMax} fill="rgba(26,63,107,0.07)" label={{ value: 'BEST', position: 'insideTopRight', fontSize: 9, fill: 'var(--blue)', fontFamily: "'IBM Plex Mono', monospace" }} />

                  <XAxis
                    type="number" dataKey="reviews" name="Reviews"
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                    tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                    tickLine={false}
                    label={{ value: 'Reviews (Volume Proxy)', position: 'insideBottom', offset: -8, fontSize: 9, fill: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <YAxis
                    type="number" dataKey="price" name="Price"
                    tickFormatter={v => `$${v}`}
                    tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                    tickLine={false}
                    label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 9, fill: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <ReTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--border2)' }} />
                  <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, paddingTop: 8 }} />

                  {/* Your price reference lines */}
                  <ReferenceLine
                    y={yourPrice} stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="6 3"
                    label={{ value: `Your Price ${fmt(yourPrice)}`, position: 'right', fill: 'var(--amber)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}
                  />
                  <ReferenceLine
                    x={Math.round(avgMatchReviews)} stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="6 3"
                    label={{ value: 'Avg Reviews', position: 'top', fill: 'var(--amber)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }}
                  />

                  {['AMZ', 'TGT', 'WMT'].map(pid => {
                    const data = byPlatform(pid)
                    if (!data.length) return null
                    return (
                      <Scatter
                        key={pid}
                        name={PLATFORM_NAMES[pid] ?? pid}
                        data={data}
                        fill={PLATFORM_COLORS[pid] ?? '#888'}
                        shape={(props: { cx?: number; cy?: number; payload?: ScatterPt }) => (
                          <PlatformDot
                            {...props}
                            fill={PLATFORM_COLORS[pid] ?? '#888'}
                            focusedId={focusedId}
                          />
                        )}
                      />
                    )
                  })}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: Volume Distribution */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Volume Distribution by Price Point</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>
                Bell curve based on market review density
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={kdeData} margin={{ top: 8, right: 20, bottom: 20, left: 8 }}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--amber)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--blue)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" />
                  <XAxis
                    dataKey="price"
                    tickFormatter={v => `$${Number(v).toFixed(0)}`}
                    tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                    tickLine={false}
                    label={{ value: 'Price ($)', position: 'insideBottom', offset: -8, fontSize: 9, fill: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <YAxis
                    tick={false}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    label={{ value: 'Volume (est.)', angle: -90, position: 'insideLeft', offset: 8, fontSize: 9, fill: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                  <ReTooltip content={<KdeTooltip />} />

                  <Area
                    type="monotone"
                    dataKey="density"
                    fill="url(#volGrad)"
                    stroke="var(--amber)"
                    strokeWidth={2}
                  />

                  {/* Your price vertical */}
                  <ReferenceLine
                    x={yourPrice}
                    stroke="var(--amber)"
                    strokeWidth={2}
                    strokeDasharray="6 3"
                    label={{ value: `Your Price ${fmt(yourPrice)}`, position: 'top', fill: 'var(--amber)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}
                  />

                  {/* Per-match price ticks */}
                  {top5Matches.filter(m => m.product.price != null).map(m => (
                    <ReferenceLine
                      key={m.product.id}
                      x={m.product.price!}
                      stroke={m.color}
                      strokeWidth={3}
                      ifOverflow="visible"
                      opacity={0.7}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Confidence legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '8px 16px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.5px' }}>Confidence</span>
        {[
          { label: '≥90% HIGH',    color: 'var(--accent2)' },
          { label: '80–89% MEDIUM', color: 'var(--amber)'  },
          { label: '70–79% LOW',   color: 'var(--blue)'   },
          { label: '<70% Excluded', color: 'var(--mid)'   },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 5, borderRadius: 3, background: l.color }} />
            <span style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>{l.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>
          {hasAiScores ? '35% attr + 35% AI text + 30% AI vision' : 'attribute similarity only — run AI for full analysis'}
        </div>
      </div>
    </div>
  )
}
