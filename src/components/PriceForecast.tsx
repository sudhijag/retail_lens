'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceDot,
  ReferenceArea,
} from 'recharts'
import { ChevronDown, CheckCircle, TrendingUp, TrendingDown, Minus, Brain, RefreshCw, Zap, ChevronRight } from 'lucide-react'
import { PRODUCTS } from '../lib/data'
import { getCategoryIntel } from '../lib/categoryIntelligence'
import type { ForecastIntelResponse, TrendSignal, NextSkuPrediction } from '../app/api/forecast-intel/route'
import type { Product } from '../lib/types'

// ── Forecast data generation ───────────────────────────────────────────────────

interface ForecastData {
  chartData: Array<{
    label: string; monthIdx: number
    hist?: number | null; fcast?: number | null
    bandBase?: number | null; bandHeight?: number | null
  }>
  price3M: number; price6M: number; price12M: number
  change3M: number; change6M: number; change12M: number
  annualTrend: number
  nowLabel: string
}

function generateForecast(product: Product): ForecastData {
  const intel      = getCategoryIntel(product.id)
  const direction  = intel?.health.direction ?? 'stable'
  const rawPct     = parseFloat((intel?.health.quarterlyChange ?? '+0%').replace(/[^0-9.-]/g, '')) || 0
  const annualTrend = (direction === 'growing' ? 1 : direction === 'declining' ? -1 : 0)
    * Math.min(rawPct * 4, 18) / 100

  const base = product.yourPrice
  const seed = product.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)

  const historical: number[] = []
  for (let i = 12; i >= 1; i--) {
    const monthFrac = i / 12
    const trendBack = -annualTrend * monthFrac * 0.85
    const seasonal  = Math.sin((i / 12) * Math.PI * 2 + 1) * 0.022
    const noise     = (Math.sin(seed * 2.3 + i * 5.7) * 0.5 + 0.5) * 0.028 - 0.014
    historical.push(Math.round((base * (1 + trendBack + seasonal + noise)) * 100) / 100)
  }
  historical.push(base)

  const forecast: number[] = [base]
  const bandLow:  number[] = [base]
  const bandHigh: number[] = [base]
  for (let i = 1; i <= 12; i++) {
    const f = i / 12
    const fPrice    = Math.round((base * (1 + annualTrend * f + Math.sin((i / 12) * Math.PI * 2 + 1) * 0.018)) * 100) / 100
    const confWidth = base * (0.02 + f * 0.062)
    forecast.push(fPrice)
    bandLow.push(Math.round((fPrice - confWidth) * 100) / 100)
    bandHigh.push(Math.round((fPrice + confWidth) * 100) / 100)
  }

  const now = new Date()
  const labels: string[] = []
  for (let i = 12; i >= 1; i--) {
    const d = new Date(now); d.setMonth(d.getMonth() - i)
    labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }))
  }
  labels.push('Now')
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now); d.setMonth(d.getMonth() + i)
    labels.push(d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }))
  }

  const chartData = labels.map((label, i) => {
    const isHist  = i <= 12
    const isFcast = i >= 12
    const hi = i
    const fi = i - 12
    return {
      label,
      monthIdx: i - 12,
      hist:       isHist  ? historical[hi]           : null,
      fcast:      isFcast ? forecast[fi]             : null,
      bandBase:   isFcast && fi > 0 ? bandLow[fi]   : null,
      bandHeight: isFcast && fi > 0 ? bandHigh[fi] - bandLow[fi] : null,
    }
  })

  return {
    chartData,
    price3M:  forecast[3],  price6M:  forecast[6],  price12M:  forecast[12],
    change3M: ((forecast[3]  - base) / base) * 100,
    change6M: ((forecast[6]  - base) / base) * 100,
    change12M:((forecast[12] - base) / base) * 100,
    annualTrend,
    nowLabel: 'Now',
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const fmt = (n: number) => `$${n.toFixed(2)}`

function ForecastCard({ label, price, changePct }: { label: string; price: number; changePct: number }) {
  const up    = changePct > 0.5
  const down  = changePct < -0.5
  const color = up ? 'var(--accent)' : down ? 'var(--accent2)' : 'var(--amber)'
  const bg    = up ? 'var(--accent-soft)' : down ? 'var(--accent2-soft)' : '#fef6e3'
  const Icon  = up ? TrendingUp : down ? TrendingDown : Minus
  return (
    <div style={{ background: bg, border: `1px solid ${up ? '#f0c0a0' : down ? '#a0d8b4' : '#e8d5a0'}`, borderRadius: 10, padding: '16px 18px', flex: 1 }}>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>{fmt(price)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <Icon size={13} color={color} />
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color }}>
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
        {expanded ? 'Hide implications' : 'What this means for your SKU'}
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
        {expanded ? 'Hide rationale' : 'View full rationale'}
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
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'white', border: '1px solid var(--border2)', borderRadius: 7, cursor: 'pointer', minWidth: 240, fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <span style={{ fontSize: 16 }}>{selected.emoji}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{selected.name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)' }}>{selected.id} · {fmt(selected.yourPrice)}</div>
        </div>
        <ChevronDown size={12} color="var(--ink3)" />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50, background: 'white', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 280, overflow: 'hidden' }}>
          {PRODUCTS.map(p => (
            <button key={p.id} onClick={() => { onChange(p.id); setOpen(false) }} style={{ width: '100%', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10, background: p.id === value ? 'var(--warm-white)' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)' }}>{p.name}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)' }}>{p.id} · {fmt(p.yourPrice)}</div>
              </div>
              {p.id === value && <CheckCircle size={11} color="var(--accent2)" style={{ marginLeft: 'auto' }} />}
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
  const [sliderValue, setSliderValue] = useState(yourPrice)
  const min = Math.round(yourPrice * 0.8 * 100) / 100
  const max = Math.round(yourPrice * 1.2 * 100) / 100

  const diff = sliderValue - yourPrice
  const marketAvg = matchPrices.length > 0 ? matchPrices.reduce((s, p) => s + p, 0) / matchPrices.length : yourPrice
  const aboveMarket = sliderValue - marketAvg
  const volumeImpact = aboveMarket > 0 ? -(aboveMarket * 8) : Math.abs(aboveMarket) * 6
  const revenueImpact = Math.round(sliderValue * (volumeImpact / 100) * 30)

  // Competitive rank: how many of the mock prices + yourPrice is the slider above
  const allPrices = [...matchPrices, yourPrice].sort((a, b) => a - b)
  const rank = allPrices.filter(p => sliderValue >= p).length

  const diffColor = diff > 0 ? 'var(--accent)' : diff < 0 ? 'var(--accent2)' : 'var(--ink3)'
  const volColor  = volumeImpact >= 0 ? 'var(--accent2)' : 'var(--accent)'
  const revColor  = revenueImpact >= 0 ? 'var(--accent2)' : 'var(--accent)'

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Price Sensitivity Analysis</div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>
          Drag to simulate pricing scenarios in real time
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
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)', marginTop: 2 }}>
                If you price at this
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
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: diffColor, textTransform: 'uppercase', marginBottom: 4 }}>vs Current</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: diffColor }}>
              {diff > 0 ? '+' : ''}{fmt(diff)}
            </div>
          </div>

          {/* Volume impact */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: volumeImpact >= 0 ? 'var(--accent2-soft)' : 'var(--accent-soft)', border: `1px solid ${volumeImpact >= 0 ? '#a0d8b4' : '#f0c0a0'}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: volColor, textTransform: 'uppercase', marginBottom: 4 }}>Est. Volume</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: volColor }}>
              {volumeImpact >= 0 ? '+' : ''}{volumeImpact.toFixed(1)}%
            </div>
          </div>

          {/* Revenue impact */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: revenueImpact >= 0 ? 'var(--accent2-soft)' : 'var(--accent-soft)', border: `1px solid ${revenueImpact >= 0 ? '#a0d8b4' : '#f0c0a0'}` }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: revColor, textTransform: 'uppercase', marginBottom: 4 }}>Est. Revenue/mo</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: revColor }}>
              {revenueImpact >= 0 ? '+' : ''}${Math.abs(revenueImpact)}
            </div>
          </div>

          {/* Competitive rank */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--blue-soft)', border: '1px solid #c0cfe0' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--blue)', textTransform: 'uppercase', marginBottom: 4 }}>Comp. Rank</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>
              #{rank} of {allPrices.length}
            </div>
          </div>
        </div>

        {/* Context note */}
        <div style={{ marginTop: 14, padding: '8px 12px', background: 'var(--warm-white)', borderRadius: 7, fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>
          <strong style={{ color: 'var(--ink2)' }}>Methodology:</strong> Volume impact estimated at -8% per $1 above market avg and +6% per $1 below.
          Revenue impact = estimated volume change × price × 30 days. Competitive rank vs market average {fmt(marketAvg)}.
        </div>
      </div>
    </div>
  )
}

// ── Time Period Selector ──────────────────────────────────────────────────────

type TimePeriod = '3M' | '6M' | '12M' | '24M'

const PERIOD_MONTHS: Record<TimePeriod, number> = { '3M': 3, '6M': 6, '12M': 12, '24M': 12 }

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

  useEffect(() => { loadIntel(selectedProduct) }, [selectedSkuId])  // eslint-disable-line react-hooks/exhaustive-deps

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
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>Private Label SKU</div>
          <SkuSelector value={selectedSkuId} onChange={id => setSelectedSkuId(id)} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {intel && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: intel.mode === 'ai' ? 'var(--accent2-soft)' : 'var(--paper)', color: intel.mode === 'ai' ? 'var(--accent2)' : 'var(--mid)' }}>
              {intel.mode === 'ai' ? 'LIVE AI ANALYSIS' : 'CACHED ANALYSIS'}
            </span>
          )}
          <button
            onClick={() => loadIntel(selectedProduct)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: loading ? 'var(--paper)' : 'var(--warm-white)', color: loading ? 'var(--mid)' : 'var(--ink2)', border: '1px solid var(--border)', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {loading ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />Refreshing…</> : <><Brain size={11} />Refresh Intel</>}
          </button>
        </div>
      </div>

      {/* ── Price Forecast Chart ── */}
      {fd && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Price Forecast</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', marginLeft: 10 }}>
                12 months historical + forecast · shaded = confidence band
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <TimePeriodSelector value={timePeriod} onChange={setTimePeriod} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 22, height: 2.5, background: 'var(--blue)', borderRadius: 2 }} />
                  <span style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>Historical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 22, height: 2.5, background: 'var(--amber)', borderRadius: 2 }} />
                  <span style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>Forecast</span>
                </div>
              </div>
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
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                  tickLine={false} interval={3}
                />
                <YAxis
                  tickFormatter={v => `$${Number(v).toFixed(2)}`}
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                  tickLine={false} width={58}
                />
                <Tooltip content={<ChartTooltip />} />

                {/* Forecast zone background */}
                <ReferenceArea
                  x1="Now" x2={visibleData[visibleData.length - 1]?.label ?? 'Now'}
                  fill="rgba(200,125,10,0.04)"
                  strokeDasharray="none"
                />

                {/* Confidence band */}
                <Area type="monotone" dataKey="bandBase"   stackId="band" fill="transparent" stroke="none" connectNulls={false} legendType="none" />
                <Area type="monotone" dataKey="bandHeight" stackId="band" fill="url(#bandFill)" stroke="none" connectNulls={false} legendType="none" />

                {/* Historical line */}
                <Line type="monotone" dataKey="hist"  stroke="var(--blue)"  strokeWidth={2.5} dot={false} connectNulls={false} name="Historical" />
                {/* Forecast line */}
                <Line type="monotone" dataKey="fcast" stroke="var(--amber)" strokeWidth={2.5} strokeDasharray="7 3" dot={false} connectNulls={false} name="Forecast" />

                {/* Today marker */}
                <ReferenceLine x="Now" stroke="var(--ink3)" strokeDasharray="4 3" strokeWidth={1.5}
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
                    label={{ value: fmt(fd.price3M), position: 'top', fill: 'var(--amber)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}
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
                    label={{ value: fmt(fd.price6M), position: 'top', fill: 'var(--amber)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}
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
                    label={{ value: fmt(fd.price12M), position: 'top', fill: 'var(--amber)', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}
                  />
                )}

                <Legend
                  wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, paddingTop: 6 }}
                  formatter={(value: string) => ['Historical', 'Forecast'].includes(value) ? value : null}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Forecast Summary Cards ── */}
      {fd && (
        <div ref={forecastCardsRef}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 10 }}>
            Price Targets
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {showMonths >= 3  && <ForecastCard label="+3 Months"  price={fd.price3M}  changePct={fd.change3M}  />}
            {showMonths >= 6  && <ForecastCard label="+6 Months"  price={fd.price6M}  changePct={fd.change6M}  />}
            {showMonths >= 12 && <ForecastCard label="+12 Months" price={fd.price12M} changePct={fd.change12M} />}
          </div>
          {intel?.priceRationale && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--ink2)', lineHeight: 1.6 }}>
              <strong>Why: </strong>{intel.priceRationale}
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
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>Generating AI market intelligence…</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Analysing {selectedProduct.category} category trends, customer signals, and next SKU opportunities</div>
          </div>
        </div>
      )}

      {intelError && (
        <div style={{ padding: '10px 14px', background: 'var(--amber-soft)', border: '1px solid #e8d5a0', borderRadius: 7, fontSize: 11, color: 'var(--amber)' }}>
          {intelError}
        </div>
      )}

      {/* ── Market Trend Signals ── */}
      {intel && intel.trendSignals?.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Zap size={13} color="var(--amber)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Category Trend Signals</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>
              {selectedProduct.category} · {selectedProduct.subcategory}
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)', marginLeft: 4 }}>
              click any card to expand
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {intel.trendSignals.map((s, i) => <TrendSignalCard key={i} signal={s} />)}
          </div>
        </div>
      )}

      {/* ── Next SKU Predictions ── */}
      {intel && intel.nextSkuPredictions?.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={13} color="var(--accent2)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Next Product Opportunities</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>AI-predicted emerging SKUs in this category</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)', marginLeft: 4 }}>
              click to view full rationale
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {intel.nextSkuPredictions.map((p, i) => <NextSkuCard key={i} prediction={p} />)}
          </div>
        </div>
      )}

      {/* ── Customer Review Insights ── */}
      {intel && intel.reviewInsights?.length > 0 && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Customer Signals</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>what buyers consistently say they want more of</span>
          </div>
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
  )
}
