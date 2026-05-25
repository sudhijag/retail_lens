'use client'
import Image from 'next/image'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,
  ReferenceArea,
} from 'recharts'
import { ChevronDown, CheckCircle, TrendingUp, TrendingDown, Minus, Brain, ChevronRight } from 'lucide-react'
import { PRODUCTS } from '../lib/data'
import { getCategoryIntel } from '../lib/categoryIntelligence'
import type { ForecastIntelResponse, TrendSignal, NextSkuPrediction } from '../app/api/forecast-intel/route'
import type { Product } from '../lib/types'

// ── Forecast data generation ───────────────────────────────────────────────────

interface ForecastData {
  chartData: Array<{
    label: string; axisLabel: string; monthIdx: number
    hist?: number | null; fcast?: number | null
    bandBase?: number | null; bandHeight?: number | null
  }>
  price3M: number; price6M: number; price12M: number
  change3M: number; change6M: number; change12M: number
  annualTrend: number
  nowLabel: string
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

function clampPrice(value: number, floor: number) {
  return roundCurrency(Math.max(floor, value))
}

function getForecastFluctuation(seed: number, month: number) {
  const primaryWave = Math.sin(seed * 0.11 + month * 1.75) * 0.05
  const secondaryWave = Math.cos(seed * 0.07 + month * 1.1) * 0.024
  const monthJitter = (((seed + Math.round(month * 17)) % 11) - 5) * 0.006
  return primaryWave + secondaryWave + monthJitter
}

function generateForecast(product: Product): ForecastData {
  const intel      = getCategoryIntel(product.id)
  const direction  = intel?.health.direction ?? 'stable'
  const rawPct     = parseFloat((intel?.health.quarterlyChange ?? '+0%').replace(/[^0-9.-]/g, '')) || 0
  const annualTrend = (direction === 'growing' ? 1 : direction === 'declining' ? -1 : 0)
    * Math.min(rawPct * 1.2, 4) / 100

  const base = product.yourPrice
  const seed = product.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const priceFloor = Math.max(1, base * 0.55)
  const pointsPerMonth = 8
  const historicalMonths = 12
  const forecastMonths = 24

  const historical: number[] = []
  const totalHistoryPoints = historicalMonths * pointsPerMonth
  for (let i = totalHistoryPoints; i >= 1; i--) {
    const monthPosition = i / pointsPerMonth
    const monthFrac = monthPosition / historicalMonths
    const trendBack = -annualTrend * monthFrac * 0.35
    const seasonal  = Math.sin((monthPosition / 12) * Math.PI * 2 + 1) * 0.015
    const oscillation = getForecastFluctuation(seed * 1.7, monthPosition) + Math.sin(seed * 0.13 + i * 1.4) * 0.012
    historical.push(clampPrice(base * (1 + trendBack + seasonal + oscillation), priceFloor))
  }
  historical.push(base)

  const forecast: number[] = [base]
  const bandLow:  number[] = [base]
  const bandHigh: number[] = [base]
  const totalForecastPoints = forecastMonths * pointsPerMonth
  for (let i = 1; i <= totalForecastPoints; i++) {
    const f = i / totalForecastPoints
    const monthPosition = i / pointsPerMonth
    const baselineTrend = annualTrend * f * 0.55
    const seasonalDrift = Math.sin((monthPosition / 12) * Math.PI * 2 + 1) * 0.012
    const fluctuation = getForecastFluctuation(seed, monthPosition) + Math.sin(seed * 0.09 + i * 2.2) * 0.016
    const zigZagBias = i % 2 === 0 ? -0.03 : 0.03
    const meanReversion = -((forecast[i - 1] - base) / base) * 0.28
    const nextPrice = base * (1 + baselineTrend + seasonalDrift + fluctuation + zigZagBias + meanReversion)
    const fPrice = clampPrice(nextPrice, priceFloor)
    const confWidth = Math.max(base * 0.035, base * (0.04 + Math.abs(fluctuation) * 0.35 + f * 0.012))
    forecast.push(fPrice)
    bandLow.push(clampPrice(fPrice - confWidth, priceFloor))
    bandHigh.push(roundCurrency(fPrice + confWidth))
  }

  const now = new Date()
  const labels: Array<{ label: string; axisLabel: string; monthIdx: number }> = []
  for (let i = totalHistoryPoints; i >= 1; i--) {
    const monthIdx = -(i / pointsPerMonth)
    const wholeMonths = Math.ceil(Math.abs(monthIdx))
    const d = new Date(now); d.setMonth(d.getMonth() - wholeMonths)
    const axisLabel = Number.isInteger(Math.abs(monthIdx))
      ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      : ''
    labels.push({ label: `hist-${i}`, axisLabel, monthIdx })
  }
  labels.push({ label: 'now', axisLabel: 'Now', monthIdx: 0 })
  for (let i = 1; i <= totalForecastPoints; i++) {
    const monthIdx = i / pointsPerMonth
    const wholeMonths = Math.ceil(monthIdx)
    const d = new Date(now); d.setMonth(d.getMonth() + wholeMonths)
    const axisLabel = Number.isInteger(monthIdx)
      ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      : ''
    labels.push({ label: `fcast-${i}`, axisLabel, monthIdx })
  }

  const chartData = labels.map((point, i) => {
    const isHist  = i <= totalHistoryPoints
    const isFcast = i >= totalHistoryPoints
    const hi = i
    const fi = i - totalHistoryPoints
    return {
      label: point.label,
      axisLabel: point.axisLabel,
      monthIdx: point.monthIdx,
      hist:       isHist  ? historical[hi]           : null,
      fcast:      isFcast ? forecast[fi]             : null,
      bandBase:   isFcast && fi > 0 ? bandLow[fi]   : null,
      bandHeight: isFcast && fi > 0 ? bandHigh[fi] - bandLow[fi] : null,
    }
  })

  return {
    chartData,
    price3M:  forecast[3 * pointsPerMonth],  price6M:  forecast[6 * pointsPerMonth],  price12M:  forecast[12 * pointsPerMonth],
    change3M: ((forecast[3 * pointsPerMonth]  - base) / base) * 100,
    change6M: ((forecast[6 * pointsPerMonth]  - base) / base) * 100,
    change12M:((forecast[12 * pointsPerMonth] - base) / base) * 100,
    annualTrend,
    nowLabel: 'Now',
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const fmt = (n: number) => `$${n.toFixed(2)}`
const SECTION_HEADER_STYLE = { fontSize: 12, fontWeight: 600, color: 'var(--ink)' } as const
const SECTION_SUBTITLE_STYLE = { marginTop: 4, fontSize: 12, color: 'var(--mid)', lineHeight: 1.45 } as const
const FORECAST_POINTS_PER_MONTH = 8

function ForecastCard({ label, price, changePct }: { label: string; price: number; changePct: number }) {
  const up    = changePct > 0.5
  const down  = changePct < -0.5
  const changeColor = up ? 'var(--accent2)' : down ? '#d92d20' : 'var(--amber)'
  const valueColor = 'var(--accent)'
  const Icon  = up ? TrendingUp : down ? TrendingDown : Minus
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', flex: 1 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: valueColor, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: valueColor, lineHeight: 1, marginBottom: 4 }}>{fmt(price)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={13} color={changeColor} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: changeColor }}>
          {changePct > 0 ? '+' : ''}{changePct.toFixed(1)}% from today
        </span>
      </div>
    </div>
  )
}

const STRENGTH_CONFIG = {
  strong:   { color: 'var(--accent2)', bg: 'var(--accent2-soft)', dot: '#1a6b3c' },
  moderate: { color: 'var(--amber)',   bg: '#fef6e3',             dot: '#c87d0a' },
  emerging: { color: 'var(--blue)',    bg: 'var(--blue-soft)',    dot: '#1a3f6b' },
}

const TYPE_ICON: Record<string, string> = { design: '◈', feature: '⚙', material: '◉', consumer: '◎' }

// Expandable trend signal card with "what this means for your SKU"
const SIGNAL_MEANINGS: Record<string, string[]> = {
  'Bold Architectural Frames':       ['The category leader is surging — a bold-rim SKU would be a zero-cannibalization entry', 'Your clear oval frames now face differentiation pressure from geometric styles', 'Pricing pressure at $18–24 may increase as bold frames expand into the mid-market'],
  'Blue-Light Blocking as Standard': ['Add blue-light blocking to your listing attributes to capture conversion at existing price', 'Customers expect this as baseline — not calling it out is a lost conversion', 'Can justify a $2–3 price increase as a perceived-value differentiator'],
  'Sustainable Bio-Acetate':         ['Premium eco frames are creating a new $28–36 price tier in your category', 'A bio-acetate version of your SKU could hold margin while reducing volume-competition', 'Currently emerging — watch for 4-week velocity increase before committing'],
  'Multi-Pack Value Format':         ['Your single-unit SKU is directly in the declining segment — multi-pack pivot is urgent', '3-pack at $24–26 would compete with the fastest-growing format in this category', 'Holding single-unit price at $14.99 while launching multi-pack is the optimal dual-track'],
  'Heavyweight Cotton Premium':      ['$24+ premium singles are growing while $14 basics decline — an upgrade path is possible', 'Add GSM weight and quality signals to listing to justify a $16–18 price test', 'Heavyweight format protects margin while demand for basic singles compresses'],
  'Performance-Blend Migration':     ['Moisture-wicking blends are eroding pure-cotton volumes — a cotton-poly variant hedges risk', 'Calling out fabric properties (breathable, moisture-managing) converts well at existing price', 'Pure cotton positioning is still valid but needs stronger lifestyle/everyday messaging'],
  'Platform-Sole Elevation':         ['Your clean low-top is the base — a platform-sole variant is a natural ASP-expanding extension', 'Pricing at $42–46 for platform creates a premium tier without cannibalizing your current SKU', 'Enter before the trend peaks — 4+ weeks of runway remaining based on velocity'],
  '"Quiet Luxury" White Sneaker':    ['You are the category leader in this trend — protect and hold price, do not discount', 'Lean into "minimalist" and "essential" messaging to capture the quiet-luxury search intent', 'This trend has structural staying power — invest in review velocity now while growth is high'],
  'Wide-Toe Box Comfort Design':     ['A wide-fit variant at $34–38 captures health-conscious buyers without disrupting existing SKU', 'Add comfort and fit language to your current listing to improve conversion at $32.99', 'Emerging trend — monitor for 3+ weeks before committing to a new SKU'],
  'Wet/Dry Compartment Gym Bag':     ['This is the #1 surging segment — a gym bag SKU would directly capture the fastest-growing buyer', 'Your drawstring is being pulled toward commodity; gym bag is the upgrade path', 'At $22–28 it is adjacent in price to your current SKU with 2.5× higher margin contribution'],
  'Lightweight Packable Daypacks':   ['Travel-oriented buyers represent a growing segment abandoning drawstrings — packable fills the gap', 'A packable daypack at $26–32 can share manufacturing infrastructure with your current SKU', 'Emerging but not urgent — add to 6–9 month roadmap'],
  'Sustainable / Recycled-RPET Bags':['RPET certification adds a $3–6 price premium on functionally equivalent products', 'Eco positioning protects against the commodity price race that is squeezing basic drawstrings', 'Investment in certification pays off in 12–18 months — start the sourcing process now'],
  'Barrel-Leg / Relaxed-Taper':      ['Your straight-leg is a stable hold — but barrel-leg is the growth vector you are missing', 'Entry at $44–50 creates a premium tier with zero cannibalization of your $42.99 straight-leg', '5-week growth trend with 6–10 weeks of runway — enter in the next 3 weeks for best position'],
  'Wide-Leg Relaxed Fit':            ['Wide-leg at $35–50 is growing strongly and is adjacent to your category position', 'Positioning your straight-leg as "the classic" vs wide-leg as "the trend" protects both segments', 'Launching wide-leg at $38–44 gives you two price points covering the growth segments'],
  'Sustainable Denim (Water-Reduced)':['Eco-certified denim adds a $5–8 premium over conventional — significant for your current ASP', 'A water-reduced version of your straight-leg at $47–52 creates a premium tier without cannibalizing', 'Longer lead time (7–10 months) but the strongest margin-protection play in your category'],
}

function getSignalMeanings(title: string): string[] {
  return SIGNAL_MEANINGS[title] ?? [
    'This trend is shifting consumer expectations in your category',
    'Monitor velocity for 2–3 more weeks before making inventory decisions',
    'Cross-reference with your review sentiment to validate the signal',
  ]
}

function TrendSignalCard({ signal }: { signal: TrendSignal }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = STRENGTH_CONFIG[signal.strength]
  const meanings = getSignalMeanings(signal.title)

  return (
    <div
      style={{ padding: '14px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer' }}
      onClick={() => setExpanded(v => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 16, color: cfg.dot }}>{TYPE_ICON[signal.type] ?? '◆'}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>{signal.title}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0, marginLeft: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, padding: '1px 6px', borderRadius: 3, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>
            {signal.strength.toUpperCase()}
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: cfg.color }}>
            +{signal.velocityPct}%
          </span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.55 }}>{signal.description}</div>

      {/* Expand toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, color: 'var(--blue)', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
        <ChevronRight size={11} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        {expanded ? 'Less' : 'Details'}
      </div>

      {expanded && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {meanings.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', background: cfg.bg, borderRadius: 6, borderLeft: `2px solid ${cfg.color}` }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: cfg.color, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontSize: 11, color: 'var(--ink2)', lineHeight: 1.45 }}>{m}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NextSkuCard({ prediction }: { prediction: NextSkuPrediction }) {
  const [expanded, setExpanded] = useState(false)
  const confColor = prediction.confidence === 'high' ? 'var(--accent2)' : prediction.confidence === 'medium' ? 'var(--amber)' : 'var(--mid)'
  const confBg    = prediction.confidence === 'high' ? 'var(--accent2-soft)' : prediction.confidence === 'medium' ? '#fef6e3' : 'var(--paper)'
  return (
    <div
      style={{ padding: '14px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer' }}
      onClick={() => setExpanded(v => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{prediction.name}</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>{prediction.description}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, padding: '1px 6px', borderRadius: 3, background: confBg, color: confColor, fontWeight: 700 }}>
            {prediction.confidence.toUpperCase()}
          </span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{prediction.priceRange}</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)' }}>{prediction.timeToMarket}</span>
        </div>
      </div>

      {/* Expand toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: 'var(--blue)', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
        <ChevronRight size={11} style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        {expanded ? 'Less' : 'Details'}
      </div>

      {expanded && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink2)', lineHeight: 1.6, padding: '8px 10px', background: 'var(--warm-white)', borderRadius: 6 }}>
          {prediction.rationale}
        </div>
      )}
    </div>
  )
}

// ── SKU selector ──────────────────────────────────────────────────────────────

function SkuSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = PRODUCTS.find(p => p.id === value)!
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 12 }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'white', border: '1px solid var(--border2)', borderRadius: 12, cursor: 'pointer', minWidth: 340, fontFamily: "'IBM Plex Sans', sans-serif", boxShadow: 'var(--shadow)' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--paper)', flexShrink: 0 }}>
          <Image src={selected.imageUrl} alt={selected.name} width={34} height={34} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{selected.name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>{selected.id} · {selected.category} · {fmt(selected.yourPrice)}</div>
        </div>
        <ChevronDown size={16} color="var(--ink3)" />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 50, background: 'white', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow)', minWidth: 340, overflow: 'hidden' }}>
          {PRODUCTS.map(p => (
            <button key={p.id} onClick={() => { onChange(p.id); setOpen(false) }} style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: p.id === value ? 'var(--warm-white)' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--paper)', flexShrink: 0 }}>
                <Image src={p.imageUrl} alt={p.name} width={28} height={28} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>{p.id} · {fmt(p.yourPrice)}</div>
              </div>
              {p.id === value && <CheckCircle size={13} color="var(--accent2)" style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Custom chart tooltip ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  const pts = payload.filter(p => p.value != null && p.name !== 'bandBase' && p.name !== 'bandHeight')
  if (!pts.length) return null
  return (
    <div style={{ background: 'var(--ink)', padding: '8px 12px', borderRadius: 6, fontSize: 11, color: 'var(--cream)', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--cream)' }}>{label}</div>
      {pts.map((p, i) => (
        <div key={i} style={{ color: p.color ?? 'var(--cream)' }}>
          {p.name}: {fmt(Number(p.value))}
        </div>
      ))}
    </div>
  )
}

// ── Price Scenario Panel ──────────────────────────────────────────────────────

interface PriceScenarioPanelProps {
  yourPrice: number
  matchPrices: number[]
}

function PriceScenarioPanel({ yourPrice, matchPrices }: PriceScenarioPanelProps) {
  const BASE_MONTHLY_UNITS = 12000
  const [sliderValue, setSliderValue] = useState(yourPrice)
  const min = Math.round(yourPrice * 0.8 * 100) / 100
  const max = Math.round(yourPrice * 1.2 * 100) / 100

  const diff = sliderValue - yourPrice
  const marketAvg = matchPrices.length > 0 ? matchPrices.reduce((s, p) => s + p, 0) / matchPrices.length : yourPrice
  const aboveMarket = sliderValue - marketAvg
  const priceChangePct = (diff / yourPrice) * 100
  const marketGapPct = marketAvg > 0 ? (aboveMarket / marketAvg) * 100 : 0
  const rawVolumeImpact = -(priceChangePct * 1.15) - (marketGapPct * 0.55)
  const volumeImpact = Math.max(-22, Math.min(18, rawVolumeImpact))
  const currentMonthlyRevenue = yourPrice * BASE_MONTHLY_UNITS
  const scenarioUnitsPerMonth = BASE_MONTHLY_UNITS * (1 + volumeImpact / 100)
  const scenarioMonthlyRevenue = sliderValue * scenarioUnitsPerMonth
  const monthlyRevenueDelta = Math.round(scenarioMonthlyRevenue - currentMonthlyRevenue)

  // Competitive rank: how many of the mock prices + yourPrice is the slider above
  const allPrices = [...matchPrices, yourPrice].sort((a, b) => a - b)
  const rank = allPrices.filter(p => sliderValue >= p).length

  const diffColor = diff > 0 ? 'var(--accent)' : diff < 0 ? 'var(--accent2)' : 'var(--ink3)'
  const volColor  = volumeImpact >= 0 ? 'var(--accent2)' : 'var(--accent)'
  const revColor  = monthlyRevenueDelta >= 0 ? 'var(--accent2)' : 'var(--accent)'

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div>
          <div style={SECTION_HEADER_STYLE}>Sensitivity</div>
          <div style={SECTION_SUBTITLE_STYLE}>Test pricing scenarios to estimate volume, revenue, and competitive rank shifts.</div>
        </div>
      </div>
      <div style={{ padding: '20px 24px' }}>
        {/* Slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>{fmt(min)}</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                {fmt(sliderValue)}
              </div>
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>{fmt(max)}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={0.01}
            value={sliderValue}
            onChange={e => setSliderValue(parseFloat(e.target.value))}
            style={{ width: '100%', height: 4, cursor: 'pointer', accentColor: 'var(--accent)' }}
          />
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {/* Change from current */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: Math.abs(diff) < 0.01 ? 'var(--warm-white)' : diff > 0 ? 'var(--accent-soft)' : 'var(--accent2-soft)', border: `1px solid ${Math.abs(diff) < 0.01 ? 'var(--border)' : diff > 0 ? '#f0c0a0' : '#a0d8b4'}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: diffColor, textTransform: 'uppercase', marginBottom: 4 }}>Delta</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: diffColor }}>
              {diff > 0 ? '+' : ''}{fmt(diff)}
            </div>
          </div>

          {/* Volume impact */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: volumeImpact >= 0 ? 'var(--accent2-soft)' : 'var(--accent-soft)', border: `1px solid ${volumeImpact >= 0 ? '#a0d8b4' : '#f0c0a0'}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: volColor, textTransform: 'uppercase', marginBottom: 4 }}>Volume</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: volColor }}>
              {volumeImpact >= 0 ? '+' : ''}{volumeImpact.toFixed(1)}%
            </div>
          </div>

          {/* Revenue impact */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: monthlyRevenueDelta >= 0 ? 'var(--accent2-soft)' : 'var(--accent-soft)', border: `1px solid ${monthlyRevenueDelta >= 0 ? '#a0d8b4' : '#f0c0a0'}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: revColor, textTransform: 'uppercase', marginBottom: 4 }}>Revenue / 30d</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: revColor }}>
              {monthlyRevenueDelta >= 0 ? '+' : '-'}${Math.abs(monthlyRevenueDelta).toLocaleString()}
            </div>
            <div style={{ marginTop: 4, fontSize: 10, color: 'var(--ink3)', lineHeight: 1.35 }}>
              Gross revenue delta vs. current price
            </div>
          </div>

          {/* Competitive rank */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--blue-soft)', border: '1px solid #c0cfe0' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: 4 }}>Rank</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>
              #{rank} of {allPrices.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Time Period Selector ──────────────────────────────────────────────────────

type TimePeriod = '3M' | '6M' | '12M' | '24M'

const PERIOD_MONTHS: Record<TimePeriod, number> = { '3M': 3, '6M': 6, '12M': 12, '24M': 24 }

function TimePeriodSelector({ value, onChange }: { value: TimePeriod; onChange: (t: TimePeriod) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {(['3M', '6M', '12M', '24M'] as TimePeriod[]).map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
            fontFamily: "'IBM Plex Mono', monospace",
            border: `1.5px solid ${value === t ? 'var(--amber)' : 'var(--border)'}`,
            background: value === t ? '#fef6e3' : 'white',
            color: value === t ? 'var(--amber)' : 'var(--ink3)',
            cursor: 'pointer',
          }}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PriceForecast() {
  const [selectedSkuId, setSelectedSkuId] = useState(PRODUCTS[0].id)
  const [forecastData,  setForecastData]  = useState<ForecastData | null>(null)
  const [intel,         setIntel]         = useState<ForecastIntelResponse | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [intelError,    setIntelError]    = useState<string | null>(null)
  const [timePeriod,    setTimePeriod]    = useState<TimePeriod>('12M')
  const forecastCardsRef = useRef<HTMLDivElement>(null)

  const selectedProduct = PRODUCTS.find(p => p.id === selectedSkuId)!

  const loadIntel = useCallback(async (product: Product) => {
    setForecastData(generateForecast(product))
    setLoading(true); setIntel(null); setIntelError(null)
    try {
      const res = await fetch('/api/forecast-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId:    product.id,
          productName:  product.name,
          category:     product.category,
          subcategory:  product.subcategory,
          currentPrice: product.yourPrice,
          tags:         product.tags,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setIntel(await res.json() as ForecastIntelResponse)
    } catch {
      setIntelError('Could not load AI intelligence. Showing cached analysis.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(() => loadIntel(selectedProduct))
  }, [selectedSkuId])  // eslint-disable-line react-hooks/exhaustive-deps

  const fd = forecastData
  const showMonths = PERIOD_MONTHS[timePeriod]

  // Filter chartData to visible range for the selected time period:
  // always show 12 historical + selected forecast window
  const visibleData = fd
    ? fd.chartData.filter(d => {
        if (d.monthIdx <= 0) return true      // historical + now
        return d.monthIdx <= showMonths        // forecast window
      })
    : []

  // Build match prices for scenario panel (simplified with base prices)
  const matchPrices = [
    selectedProduct.yourPrice * 0.88,
    selectedProduct.yourPrice * 0.93,
    selectedProduct.yourPrice * 1.04,
    selectedProduct.yourPrice * 1.11,
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Control bar */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', overflow: 'visible', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 320 }}>
          <SkuSelector value={selectedSkuId} onChange={id => setSelectedSkuId(id)} />
        </div>
      </div>

      {/* ── Price Forecast Chart ── */}
      {fd && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={SECTION_HEADER_STYLE}>Price Forecast</div>
              <div style={SECTION_SUBTITLE_STYLE}>Track projected price movement, confidence bands, and key milestones over time.</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />
            </div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={visibleData} margin={{ top: 12, right: 60, bottom: 8, left: 8 }}>
                <defs>
                  <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--amber)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--amber)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  tickFormatter={(_value, index) => visibleData[index]?.axisLabel ?? ''}
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                  tickLine={false} interval={FORECAST_POINTS_PER_MONTH - 1}
                />
                <YAxis
                  tickFormatter={v => `$${Number(v).toFixed(2)}`}
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                  tickLine={false} width={58}
                />
                <Tooltip content={<ChartTooltip />} />

                {/* Forecast zone background */}
                <ReferenceArea
                  x1="now" x2={visibleData[visibleData.length - 1]?.label ?? 'now'}
                  fill="rgba(200,125,10,0.04)"
                  strokeDasharray="none"
                />

                {/* Confidence band */}
                <Area type="linear" dataKey="bandBase"   stackId="band" fill="transparent" stroke="none" connectNulls={false} legendType="none" isAnimationActive={false} />
                <Area type="linear" dataKey="bandHeight" stackId="band" fill="url(#bandFill)" stroke="none" connectNulls={false} legendType="none" isAnimationActive={false} />

                {/* Historical line */}
                <Line type="linear" dataKey="hist"  stroke="var(--blue)"  strokeWidth={2.5} dot={false} connectNulls={false} name="Historical" isAnimationActive={false} />
                {/* Forecast line */}
                <Line type="linear" dataKey="fcast" stroke="var(--amber)" strokeWidth={2.5} strokeDasharray="7 3" dot={false} connectNulls={false} name="Forecast" isAnimationActive={false} />

                {/* Today marker */}
                <ReferenceLine x="now" stroke="var(--ink3)" strokeDasharray="4 3" strokeWidth={1.5}
                  label={{ value: 'Today', position: 'top', fill: 'var(--ink3)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace" }} />

                {/* Current price reference */}
                <ReferenceLine y={selectedProduct.yourPrice} stroke="var(--ink3)" strokeDasharray="3 5" strokeWidth={1} opacity={0.4} />

                {/* Milestone dots at 3M, 6M, 12M */}
                {showMonths >= 3 && (
                  <ReferenceDot
                    x={fd.chartData.find(d => d.monthIdx === 3)?.label ?? ''}
                    y={fd.price3M}
                    r={5}
                    fill="var(--amber)"
                    stroke="white"
                    strokeWidth={2}
                    onClick={() => forecastCardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ cursor: 'pointer' }}
                  />
                )}
                {showMonths >= 6 && (
                  <ReferenceDot
                    x={fd.chartData.find(d => d.monthIdx === 6)?.label ?? ''}
                    y={fd.price6M}
                    r={5}
                    fill="var(--amber)"
                    stroke="white"
                    strokeWidth={2}
                    onClick={() => forecastCardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ cursor: 'pointer' }}
                  />
                )}
                {showMonths >= 12 && (
                  <ReferenceDot
                    x={fd.chartData.find(d => d.monthIdx === 12)?.label ?? ''}
                    y={fd.price12M}
                    r={5}
                    fill="var(--amber)"
                    stroke="white"
                    strokeWidth={2}
                    onClick={() => forecastCardsRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ cursor: 'pointer' }}
                  />
                )}

              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Forecast Summary Cards ── */}
      {fd && (
        <div ref={forecastCardsRef} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            {showMonths >= 3  && <ForecastCard label="+3 Months"  price={fd.price3M}  changePct={fd.change3M}  />}
            {showMonths >= 6  && <ForecastCard label="+6 Months"  price={fd.price6M}  changePct={fd.change6M}  />}
            {showMonths >= 12 && <ForecastCard label="+12 Months" price={fd.price12M} changePct={fd.change12M} />}
          </div>
          {intel?.priceRationale && (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 11, color: 'var(--ink2)', lineHeight: 1.6 }}>
              {intel.priceRationale}
            </div>
          )}
        </div>
      )}

      {/* ── Price Scenario Panel ── */}
      {fd && (
        <PriceScenarioPanel yourPrice={selectedProduct.yourPrice} matchPrices={matchPrices} />
      )}

      {/* ── Loading / error state ── */}
      {loading && (
        <div style={{ padding: '24px 20px', background: 'white', border: '1px solid var(--border)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Brain size={18} color="var(--blue)" style={{ animation: 'blink 2s ease-in-out infinite' }} />
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Refreshing…</div>
        </div>
      )}

      {intelError && (
        <div style={{ padding: '10px 14px', background: 'var(--amber-soft)', border: '1px solid #e8d5a0', borderRadius: 7, fontSize: 11, color: 'var(--amber)' }}>
          {intelError}
        </div>
      )}

      {/* ── Market Trend Signals ── */}
      {intel && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={SECTION_HEADER_STYLE}>Insights</div>
            <div style={SECTION_SUBTITLE_STYLE}>Review trend signals, next-SKU opportunities, and customer feedback patterns.</div>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {intel.trendSignals?.length > 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                  {intel.trendSignals.map((s, i) => <TrendSignalCard key={i} signal={s} />)}
                </div>
              </div>
            )}
            {intel.nextSkuPredictions?.length > 0 && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {intel.nextSkuPredictions.map((p, i) => <NextSkuCard key={i} prediction={p} />)}
                </div>
              </div>
            )}
            {intel.reviewInsights?.length > 0 && (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {intel.reviewInsights.map((insight, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, color: 'var(--blue)' }}>{i + 1}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink2)', lineHeight: 1.6 }}>{insight}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
