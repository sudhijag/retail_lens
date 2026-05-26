'use client'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts'
import { ChevronDown, CheckCircle, Truck, Zap, Clock } from 'lucide-react'
import { PRODUCTS } from '../lib/data'
import type { Product } from '../lib/types'

const fmt  = (n: number) => `$${n.toFixed(2)}`
const fmtK = (n: number) => `$${(n / 1000).toFixed(1)}K`

const SECTION_HEADER   = { fontSize: 12, fontWeight: 600, color: 'var(--ink)' } as const
const SECTION_SUBTITLE = { marginTop: 4, fontSize: 12, color: 'var(--mid)', lineHeight: 1.45 } as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeliverySlot {
  available: boolean
  label:     string
  hours:     number | null
  note?:     string
}

type TierKey = 'standard' | 'express' | 'sameDay' | 'oneHour'

interface PlatformSpeed {
  id:         string
  name:       string
  color:      string
  isYours:    boolean
  standard:   DeliverySlot
  express:    DeliverySlot
  sameDay:    DeliverySlot
  oneHour:    DeliverySlot
  speedScore: number
}

interface ElasticityPoint {
  tier:            string
  upliftPct:       number
  monthlyRevDelta: number
  investment:      string
  timeline:        string
}

interface ChainAction {
  title:         string
  detail:        string
  speedUnlocked: string
  investment:    string
  timeline:      string
  priority:      'critical' | 'high' | 'medium'
}

// ── Static delivery data ──────────────────────────────────────────────────────

const TIER_KEYS: TierKey[] = ['standard', 'express', 'sameDay', 'oneHour']

const TIER_META: Record<TierKey, { label: string }> = {
  standard: { label: 'Standard'       },
  express:  { label: 'Express 2-Day'  },
  sameDay:  { label: 'Same-Day'       },
  oneHour:  { label: '1-Hour'         },
}

const SPEED_DATA: PlatformSpeed[] = [
  {
    id: 'AMZ', name: 'Amazon', color: '#e47911', isYours: false,
    standard: { available: true,  hours:  72, label: '3 days'     },
    express:  { available: true,  hours:  48, label: '2 days'     },
    sameDay:  { available: true,  hours:   6, label: '6 hrs',    note: 'Prime - 32 metros'       },
    oneHour:  { available: true,  hours:   2, label: '2 hrs',    note: 'Prime Now'               },
    speedScore: 96,
  },
  {
    id: 'WMT', name: 'Walmart', color: '#0071dc', isYours: false,
    standard: { available: true,  hours:  72, label: '3 days'     },
    express:  { available: true,  hours:  48, label: '2 days'     },
    sameDay:  { available: true,  hours:   6, label: '6 hrs',    note: 'Walmart+ metros'         },
    oneHour:  { available: false, hours: null, label: 'Limited', note: '14 pilot cities'         },
    speedScore: 81,
  },
  {
    id: 'TGT', name: 'Target', color: '#cc0000', isYours: false,
    standard: { available: true,  hours:  96, label: '4 days'     },
    express:  { available: true,  hours:  48, label: '2 days',   note: 'Shipt'                   },
    sameDay:  { available: true,  hours:   2, label: '2 hrs',    note: 'Drive Up - 1,800 stores' },
    oneHour:  { available: false, hours: null, label: 'Not offered'                              },
    speedScore: 79,
  },
  {
    id: 'YOU', name: 'TrendRetail', color: '#2563eb', isYours: true,
    standard: { available: true,  hours: 120, label: '5 days'     },
    express:  { available: true,  hours:  72, label: '3 days'     },
    sameDay:  { available: false, hours: null, label: 'Not offered'                              },
    oneHour:  { available: false, hours: null, label: 'Not offered'                              },
    speedScore: 38,
  },
]

// ── Speed elasticity by product category ─────────────────────────────────────

const UPLIFT_BY_CATEGORY: Record<string, { u2day: number; uSameDay: number; u1hr: number }> = {
  Apparel:     { u2day:  9, uSameDay: 15, u1hr: 10 },
  Eyewear:     { u2day:  7, uSameDay: 13, u1hr: 18 },
  Footwear:    { u2day: 11, uSameDay: 17, u1hr: 12 },
  Accessories: { u2day:  8, uSameDay: 14, u1hr:  9 },
}

const BASE_MONTHLY_UNITS = 12000

function getElasticity(product: Product): ElasticityPoint[] {
  const m = UPLIFT_BY_CATEGORY[product.category] ?? UPLIFT_BY_CATEGORY['Apparel']
  const rev = (pct: number) => Math.round(product.yourPrice * BASE_MONTHLY_UNITS * pct / 100)
  return [
    { tier: 'Express 2-Day',   upliftPct: m.u2day,    monthlyRevDelta: rev(m.u2day),    investment: 'Medium', timeline: '3–4 months'  },
    { tier: 'Same-Day',        upliftPct: m.uSameDay, monthlyRevDelta: rev(m.uSameDay), investment: 'High',   timeline: '8–12 months' },
    { tier: '1-Hour Delivery', upliftPct: m.u1hr,     monthlyRevDelta: rev(m.u1hr),     investment: 'High',   timeline: '18+ months'  },
  ]
}

// ── Supply chain investment actions ──────────────────────────────────────────

const ACTIONS: Record<string, ChainAction[]> = {
  Apparel: [
    {
      title:         'FBA Enrollment - Apparel SKUs',
      detail:        'Move core apparel SKUs into Amazon\'s FBA network. Instantly unlocks the Prime 2-day badge, same-day eligibility in 32 metros, and improves buy-box win rate by 15–20%. Highest-ROI action for any apparel brand selling on Amazon.',
      speedUnlocked: '2-day + Same-Day (Amazon)',
      investment:    '$18–24K onboarding + 15% FBA fee',
      timeline:      '4–6 weeks',
      priority:      'critical',
    },
    {
      title:         'Regional DC - Midwest or Southeast Node',
      detail:        'A Columbus OH or Atlanta GA 3PL node reaches 62% of the US within 2 days via standard carrier. Reduces your 5-day standard to 2-day across all platforms for the majority of customers - no platform dependency.',
      speedUnlocked: '2-day Standard (all platforms)',
      investment:    '$120–180K / yr (3PL co-location)',
      timeline:      '3–4 months',
      priority:      'high',
    },
    {
      title:         'Walmart Fulfillment Services (WFS)',
      detail:        'WFS earns the Walmart 2-day badge on Walmart.com and reaches 90% of the US in 2 days. 40% cheaper per-unit than FBA for high-volume commodity apparel - best cost economics at scale.',
      speedUnlocked: '2-day (Walmart)',
      investment:    '$10–15K onboarding + WFS fee (~8%)',
      timeline:      '6–8 weeks',
      priority:      'high',
    },
  ],
  Eyewear: [
    {
      title:         'Forward Stocking Locations (FSLs)',
      detail:        'Partner with a last-mile provider (Darkstore, Ohi) to pre-position eyewear units in urban micro-warehouses. Enables same-day delivery in the top 8 DMAs - eyewear has strong impulse-buy dynamics in urban centers.',
      speedUnlocked: 'Same-Day in top 8 metros',
      investment:    '$40–60K / yr + $3–5 per order',
      timeline:      '2–3 months',
      priority:      'critical',
    },
    {
      title:         'FBA Enrollment - Eyewear',
      detail:        'FBA 2-day badge increases eyewear conversion by 7–11% based on category data. Eyewear is a considered but time-sensitive purchase - fast delivery closes the decision loop before a competitor does.',
      speedUnlocked: '2-day + Same-Day (Amazon)',
      investment:    '$12–18K onboarding + 15% FBA fee',
      timeline:      '4–6 weeks',
      priority:      'high',
    },
    {
      title:         'FedEx Express SLA Upgrade',
      detail:        'Negotiate a dedicated FedEx Express contract to cut your direct-channel express from 3-day to 2-day. At ~$2.20/unit premium, ROI-positive if conversion uplift exceeds 5% - easily achievable for eyewear.',
      speedUnlocked: '2-day Express (direct channel)',
      investment:    '~$2.20/unit carrier premium',
      timeline:      '2–4 weeks',
      priority:      'medium',
    },
  ],
  Footwear: [
    {
      title:         'FBA Enrollment - Footwear',
      detail:        'Footwear has the highest speed elasticity in apparel - customers impulse-buy for outfit completion and event dressing. FBA same-day coverage directly captures the "need it for the weekend" buyer segment.',
      speedUnlocked: '2-day + Same-Day (Amazon)',
      investment:    '$20–28K onboarding + 15% FBA fee',
      timeline:      '4–6 weeks',
      priority:      'critical',
    },
    {
      title:         'West Coast Regional DC - LA or Phoenix',
      detail:        'A West Coast 3PL node unlocks 2-day standard delivery for 38% of US customers currently getting 5-day service. West Coast footwear demand is concentrated in CA, OR, WA, and AZ.',
      speedUnlocked: '2-day Standard (West Coast)',
      investment:    '$100–150K / yr (3PL node)',
      timeline:      '3–4 months',
      priority:      'high',
    },
    {
      title:         'Target Same-Day via Shipt Partnership',
      detail:        'Apply for Target\'s vendor same-day program via Shipt. Footwear via Drive Up achieves 2-hour delivery in 1,800+ store catchment areas with strong urban density and high footwear demand.',
      speedUnlocked: '2-hour Same-Day (Target)',
      investment:    'Rev-share model (~8% of sale)',
      timeline:      '8–12 weeks',
      priority:      'medium',
    },
  ],
  Accessories: [
    {
      title:         'FBA Enrollment - Accessories',
      detail:        'Accessories are high-frequency gift and back-to-school buys - time-sensitive occasions where speed wins conversions. FBA 2-day badge consistently lifts accessories conversion by 9–15% per Amazon seller data.',
      speedUnlocked: '2-day + Same-Day (Amazon)',
      investment:    '$12–18K onboarding + 15% FBA fee',
      timeline:      '4–6 weeks',
      priority:      'critical',
    },
    {
      title:         'Walmart Fulfillment Services (WFS)',
      detail:        'Accessories perform strongly on Walmart.com with the WFS 2-day badge - improves cart attachment and buy-box win probability. Most cost-efficient path to Walmart speed parity for accessories.',
      speedUnlocked: '2-day (Walmart)',
      investment:    '$10–15K onboarding + WFS fee (~8%)',
      timeline:      '6–8 weeks',
      priority:      'high',
    },
    {
      title:         'Express Carrier Priority Agreement',
      detail:        'Secure a priority SLA with UPS or FedEx to cut your direct-channel express from 3 → 2 days. Breakeven at ~7% conversion lift - easily achievable for accessories in the 2-day fulfillment window.',
      speedUnlocked: '2-day Express (direct channel)',
      investment:    '$1.80–2.40/unit carrier premium',
      timeline:      '2–4 weeks',
      priority:      'medium',
    },
  ],
}

function getActions(product: Product): ChainAction[] {
  return ACTIONS[product.category] ?? ACTIONS['Apparel']
}

// ── Sub-components ────────────────────────────────────────────────────────────

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
      <button
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'white', border: '1px solid var(--border2)', borderRadius: 12, cursor: 'pointer', minWidth: 340, fontFamily: "'IBM Plex Sans', sans-serif", boxShadow: 'var(--shadow)' }}
      >
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
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false) }}
              style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: p.id === value ? 'var(--warm-white)' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)', fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
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

function TierCell({ slot, isYours }: { slot: DeliverySlot; isYours: boolean }) {
  if (!slot.available) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <span style={{ fontSize: 16, color: 'var(--mid)', opacity: 0.35 }}>-</span>
        {isYours && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#d92d20', background: 'rgba(217,45,32,0.1)', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
            GAP
          </span>
        )}
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: isYours ? 'var(--accent)' : 'var(--ink2)' }}>
        {slot.label}
      </span>
      {slot.note && (
        <span style={{ fontSize: 9, color: 'var(--ink3)', textAlign: 'center', lineHeight: 1.3, maxWidth: 100 }}>{slot.note}</span>
      )}
    </div>
  )
}

function ElasticityTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ElasticityPoint }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--ink)', padding: '10px 14px', borderRadius: 8, fontSize: 11, color: 'var(--cream)', fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{d.tier}</div>
      <div style={{ color: '#86efac' }}>+{d.upliftPct}% demand uplift</div>
      <div style={{ color: '#6ee7b7', marginTop: 3 }}>+{fmtK(d.monthlyRevDelta)} / month</div>
      <div style={{ color: 'var(--amber)', marginTop: 3 }}>Investment: {d.investment}</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>Timeline: {d.timeline}</div>
    </div>
  )
}

const PRIORITY_CONFIG = {
  critical: { label: 'CRITICAL', color: '#d92d20',       bg: 'rgba(217,45,32,0.08)',   border: 'rgba(217,45,32,0.18)'  },
  high:     { label: 'HIGH',     color: 'var(--amber)',   bg: 'rgba(217,119,6,0.08)',   border: 'rgba(217,119,6,0.18)'  },
  medium:   { label: 'MEDIUM',   color: 'var(--blue)',    bg: 'rgba(29,78,216,0.08)',   border: 'rgba(29,78,216,0.15)'  },
}

function ActionCard({ action }: { action: ChainAction }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = PRIORITY_CONFIG[action.priority]
  return (
    <div
      style={{ padding: '14px 16px', background: 'white', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', borderLeft: `3px solid ${cfg.color}` }}
      onClick={() => setExpanded(v => !v)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, padding: '2px 6px', borderRadius: 3, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{action.title}</span>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Speed Unlocked</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{action.speedUnlocked}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Investment</div>
              <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{action.investment}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Timeline</div>
              <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{action.timeline}</div>
            </div>
          </div>
        </div>
        <Clock size={14} color="var(--ink3)" style={{ flexShrink: 0, marginTop: 2 }} />
      </div>
      {expanded && (
        <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--warm-white)', borderRadius: 8, fontSize: 11, color: 'var(--ink2)', lineHeight: 1.6, borderLeft: `2px solid ${cfg.color}` }}>
          {action.detail}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const BAR_COLORS = ['#059669', '#10b981', '#2dd4bf']

export default function DeliverySpeed() {
  const [selectedSkuId, setSelectedSkuId] = useState(PRODUCTS[0].id)
  const selectedProduct = PRODUCTS.find(p => p.id === selectedSkuId)!
  const elasticity = getElasticity(selectedProduct)
  const actions    = getActions(selectedProduct)

  const youRow     = SPEED_DATA.find(p => p.isYours)!
  const fastestHrs = Math.min(
    ...SPEED_DATA.filter(p => !p.isYours && p.standard.hours != null).map(p => p.standard.hours!)
  )
  const gapHrs  = youRow.standard.hours! - fastestHrs
  const gapDays = Math.round(gapHrs / 24)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Control bar ── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', overflow: 'visible', position: 'relative', zIndex: 2 }}>
        <SkuSelector value={selectedSkuId} onChange={id => setSelectedSkuId(id)} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 12 }}>
          <Truck size={16} color="var(--accent)" />
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 2 }}>Speed Score</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: '#d92d20', lineHeight: 1 }}>{youRow.speedScore}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>/100</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Speed position hero ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Your Standard Delivery</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#d92d20', lineHeight: 1, marginBottom: 6 }}>{youRow.standard.label}</div>
          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Express available in {youRow.express.label}</div>
        </div>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Fastest Competitor</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: 'var(--accent2)', lineHeight: 1, marginBottom: 6 }}>
            {Math.round(fastestHrs / 24)} days
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Amazon · Prime Now 2 hrs in major metros</div>
        </div>
        <div style={{ background: 'rgba(253,240,239,0.9)', border: '1px solid rgba(217,45,32,0.2)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#d92d20', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Speed Gap</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: '#d92d20', lineHeight: 1 }}>{gapHrs}h</span>
            <span style={{ fontSize: 11, color: '#d92d20', fontWeight: 600 }}>behind</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink3)' }}>You are {gapDays} days slower than Amazon standard</div>
        </div>
      </div>

      {/* ── Delivery tier comparison ── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={SECTION_HEADER}>Delivery Tier Comparison</div>
          <div style={SECTION_SUBTITLE}>Platform-by-platform breakdown across all fulfillment tiers. Price, speed, and assortment quality are the three dimensions modern retail competes on.</div>
        </div>
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(4, 1fr)', background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
          <div style={{ padding: '10px 16px' }} />
          {TIER_KEYS.map(key => (
            <div key={key} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {TIER_META[key].label}
              </span>
            </div>
          ))}
        </div>
        {/* Competitor rows */}
        {SPEED_DATA.filter(p => !p.isYours).map(platform => (
          <div key={platform.id} style={{ display: 'grid', gridTemplateColumns: '170px repeat(4, 1fr)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: platform.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{platform.name}</span>
            </div>
            {TIER_KEYS.map(key => {
              const slot = platform[key]
              return (
                <div key={key} style={{ padding: '14px 8px', textAlign: 'center', borderLeft: '1px solid var(--border)', background: slot.available ? 'rgba(5,150,105,0.03)' : 'transparent' }}>
                  <TierCell slot={slot} isYours={false} />
                </div>
              )
            })}
          </div>
        ))}
        {/* "Yours" row */}
        <div style={{ display: 'grid', gridTemplateColumns: '170px repeat(4, 1fr)', background: 'rgba(37,99,235,0.04)', borderTop: '2px solid rgba(37,99,235,0.2)' }}>
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: youRow.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{youRow.name}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--accent)', background: 'rgba(37,99,235,0.1)', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>YOU</span>
          </div>
          {TIER_KEYS.map(key => {
            const slot = youRow[key]
            const isGap = !slot.available
            return (
              <div key={key} style={{ padding: '14px 8px', textAlign: 'center', borderLeft: isGap ? '1px solid rgba(217,45,32,0.15)' : '1px solid var(--border)', background: isGap ? 'rgba(217,45,32,0.04)' : 'rgba(37,99,235,0.04)' }}>
                <TierCell slot={slot} isYours />
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Speed elasticity ── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={SECTION_HEADER}>Speed Elasticity Analysis</div>
            <div style={SECTION_SUBTITLE}>Markets are becoming speed elastic. Estimated demand uplift if you match each competitor delivery tier for {selectedProduct.category.toLowerCase()} SKUs.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--accent2-soft)', borderRadius: 6 }}>
            <Zap size={11} color="var(--accent2)" />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent2)', fontWeight: 700 }}>SPEED ELASTIC</span>
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={elasticity} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" vertical={false} />
                <XAxis
                  dataKey="tier"
                  tick={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tickFormatter={v => `+${v}%`}
                  tick={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                />
                <Tooltip content={<ElasticityTooltip />} />
                <Bar dataKey="upliftPct" radius={[4, 4, 0, 0]}>
                  {elasticity.map((_, i) => <Cell key={i} fill={BAR_COLORS[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '0 0 200px' }}>
            {elasticity.map((e, i) => (
              <div key={i} style={{ padding: '12px 14px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 9, borderLeft: `3px solid ${BAR_COLORS[i]}` }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', marginBottom: 4 }}>{e.tier}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: BAR_COLORS[i], lineHeight: 1 }}>+{e.upliftPct}%</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>demand</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 600, marginTop: 3 }}>
                  +{fmtK(e.monthlyRevDelta)} / month
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Supply chain investment map ── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={SECTION_HEADER}>Supply Chain Investment Map</div>
          <div style={SECTION_SUBTITLE}>Prioritized actions to close your delivery gap and unlock faster fulfillment tiers for {selectedProduct.category.toLowerCase()} SKUs.</div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions.map((action, i) => <ActionCard key={i} action={action} />)}
        </div>
      </div>

    </div>
  )
}
