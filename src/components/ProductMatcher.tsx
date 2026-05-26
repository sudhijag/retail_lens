'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Brain, ChevronDown, RefreshCw, Plus, X, CheckCircle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { PRODUCTS, PLATFORMS } from '../lib/data'
import { getScrapedProductsForSku } from '../lib/scrapedData'
import type { ScrapedListing } from '../lib/scrapedData'
import { CategoryIntelligencePanel } from './CategoryIntel'
import type { Product } from '../lib/types'
import type { MatchProductsRequest, MatchProductResult } from '../app/api/match-products/route'

// ── Competitor config ─────────────────────────────────────────────────────────

interface Competitor {
  id: string
  name: string
  color: string
  hasData: boolean
  category: string
}

const ALL_COMPETITORS: Competitor[] = [
  { id: 'AMZ',  name: 'Amazon',    color: '#e47911', hasData: true,  category: 'Marketplace'  },
  { id: 'TGT',  name: 'Target',    color: '#cc0000', hasData: true,  category: 'Retail'       },
  { id: 'WMT',  name: 'Walmart',   color: '#0071dc', hasData: true,  category: 'Retail'       },
  { id: 'COST', name: 'Costco',    color: '#005daa', hasData: false, category: 'Retail'       },
  { id: 'NORD', name: 'Nordstrom', color: '#1a1a1a', hasData: false, category: 'Department'   },
  { id: 'MACY', name: "Macy's",    color: '#e01b22', hasData: false, category: 'Department'   },
  { id: 'ZAPS', name: 'Zappos',    color: '#1a7c3c', hasData: false, category: 'Footwear'     },
  { id: 'GAP',  name: 'Gap',       color: '#222',    hasData: false, category: 'Apparel'      },
]

const DEFAULT_ENABLED = new Set(['AMZ', 'TGT', 'WMT'])

// ── Types ─────────────────────────────────────────────────────────────────────

interface RankedMatch {
  product: ScrapedListing
  attrScore: number
  textScore: number
  imageScore: number
  overall: number
}

type PlatformStatus = 'idle' | 'running' | 'done'

// ── Scoring helpers ───────────────────────────────────────────────────────────

const STOP = new Set(['the','and','for','with','men','mens','women','womens','adult','size','sizes','pack'])
const tok = (s: string) => s.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOP.has(w))

function computeAttrScore(product: Product, scraped: ScrapedListing): number {
  let score = 0; let weight = 0
  if (product.yourPrice > 0 && scraped.price != null && scraped.price > 0) {
    score += (Math.min(product.yourPrice, scraped.price) / Math.max(product.yourPrice, scraped.price)) * 100 * 0.4
    weight += 40
  }
  const anchorWords = new Set(tok(product.name + ' ' + product.tags.join(' ')))
  const cWords = tok(scraped.title)
  const inter = cWords.filter(w => anchorWords.has(w)).length
  const union = new Set([...anchorWords, ...cWords]).size
  if (union > 0) { score += (inter / union) * 100 * 0.45; weight += 45 }
  const catWords = new Set(tok(product.category + ' ' + product.subcategory))
  const catHit = cWords.some(w => catWords.has(w))
  score += (catHit ? 75 : 20) * 0.15; weight += 15
  return weight > 0 ? Math.round((score / weight) * 100) : 0
}

// ── Cell sub-component ────────────────────────────────────────────────────────

// mode='attr' = attribute-only preview (show ranked candidates, no threshold)
// mode='ai'   = AI-scored (apply 70% threshold strictly)
function MatchCell({ match, rank, mode }: { match: RankedMatch | null; rank: number; mode: 'attr' | 'ai' }) {
  // In AI mode, hide anything below 70%
  if (mode === 'ai' && (!match || match.overall < 70)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '8px 6px', gap: 4 }}>
        {match && match.overall > 0 ? (
          <>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>{match.overall}%</div>
            <div style={{ fontSize: 9, color: 'var(--mid)', textAlign: 'center', lineHeight: 1.3 }}>below<br/>threshold</div>
          </>
        ) : (
          <div style={{ fontSize: 10, color: 'var(--border2)', fontFamily: "'IBM Plex Mono', monospace" }}>-</div>
        )}
      </div>
    )
  }

  // In attr mode with no match, also show blank
  if (!match) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ fontSize: 10, color: 'var(--border2)', fontFamily: "'IBM Plex Mono', monospace" }}>-</div>
      </div>
    )
  }

  const score = match.overall
  // attr mode = muted grays; ai mode = full color
  const barColor = mode === 'attr' ? 'var(--sand)' : score >= 90 ? 'var(--accent2)' : score >= 80 ? '#2a8a50' : 'var(--amber)'
  const badgeBg  = mode === 'attr' ? 'var(--paper)'      : score >= 90 ? 'var(--accent2-soft)' : score >= 80 ? '#d4f0e0' : '#fef6e3'
  const badgeColor = mode === 'attr' ? 'var(--mid)'      : score >= 90 ? 'var(--accent2)'      : score >= 80 ? '#2a8a50' : 'var(--amber)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Rank badge */}
      <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)' }}>
          #{rank}
        </span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: badgeBg, color: badgeColor }}>
          {mode === 'attr' ? `~${score}%` : `${score}%`}
        </span>
      </div>

      {/* Product image - centered */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 8px', marginBottom: 6 }}>
        <div style={{ width: 78, height: 78, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative', background: 'var(--paper)', flexShrink: 0 }}>
          <Image src={match.product.imageUrl} alt={match.product.title} fill sizes="78px" style={{ objectFit: 'cover' }} unoptimized />
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '0 8px', flex: 1 }}>
        <div style={{ fontSize: 9, color: 'var(--ink2)', lineHeight: 1.35, marginBottom: 4,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
          {match.product.title}
        </div>
        {match.product.brand && (
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)', marginBottom: 2 }}>
            {match.product.brand}
          </div>
        )}
      </div>

      {/* Price */}
      <div style={{ padding: '4px 8px' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
          {match.product.price != null ? `$${match.product.price.toFixed(2)}` : 'N/A'}
        </span>
      </div>

      {/* Score breakdown (AI mode with real scores) or confidence bar (attr/fallback mode) */}
      {mode === 'ai' && (match.textScore > 0 || match.imageScore > 0) ? (
        <div style={{ padding: '4px 8px 6px', display: 'flex', flexDirection: 'column', gap: 3.5, marginTop: 'auto' }}>
          {([
            { label: 'Attr', val: match.attrScore, color: 'var(--blue)' },
            { label: 'Text', val: match.textScore, color: 'var(--accent2)' },
            { label: 'Img',  val: match.imageScore, color: 'var(--amber)' },
          ] as { label: string; val: number; color: string }[]).map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color: 'var(--ink3)', width: 22, flexShrink: 0 }}>{label}</span>
              <div style={{ flex: 1, height: 3, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${val}%`, background: color, borderRadius: 2, transition: 'width .5s ease' }} />
              </div>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, color, width: 24, textAlign: 'right' as const, flexShrink: 0 }}>{val}%</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '0 0 0 0', marginTop: 'auto' }}>
          <div style={{ height: 5, background: 'var(--paper)' }}>
            <div style={{ height: '100%', width: `${score}%`, background: barColor, transition: 'width .4s ease' }} />
          </div>
        </div>
      )}
    </div>
  )
}

function PendingCell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, padding: 10 }}>
      <div style={{ height: 78, borderRadius: 8, background: 'var(--paper)', animation: 'blink 1.4s ease-in-out infinite' }} />
      <div style={{ height: 8,  background: 'var(--paper)', borderRadius: 4, width: '85%', animation: 'blink 1.4s ease-in-out infinite' }} />
      <div style={{ height: 8,  background: 'var(--paper)', borderRadius: 4, width: '60%', animation: 'blink 1.4s 0.1s ease-in-out infinite' }} />
      <div style={{ height: 14, background: 'var(--paper)', borderRadius: 4, width: '40%', animation: 'blink 1.4s 0.15s ease-in-out infinite' }} />
      <div style={{ height: 4,  background: 'var(--paper)', borderRadius: 0, marginTop: 'auto', animation: 'blink 1.4s 0.2s ease-in-out infinite' }} />
    </div>
  )
}

// ── SKU dropdown ──────────────────────────────────────────────────────────────

function SkuSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = PRODUCTS.find(p => p.id === value)!

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
          background: 'white', border: '1px solid var(--border2)', borderRadius: 7,
          cursor: 'pointer', minWidth: 240, fontSize: 12, fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <span style={{ fontSize: 16 }}>{selected.emoji}</span>
        <div style={{ textAlign: 'left', flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{selected.name}</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)' }}>{selected.id} · ${selected.yourPrice.toFixed(2)}</div>
        </div>
        <ChevronDown size={12} color="var(--ink3)" />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50,
          background: 'white', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 280, overflow: 'hidden',
        }}>
          {PRODUCTS.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setOpen(false) }}
              style={{
                width: '100%', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 10,
                background: p.id === value ? 'var(--warm-white)' : 'white',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 18 }}>{p.emoji}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)' }}>{p.name}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)' }}>{p.id} · ${p.yourPrice.toFixed(2)}</div>
              </div>
              {p.id === value && <CheckCircle size={11} color="var(--accent2)" style={{ marginLeft: 'auto' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Competitor selector ───────────────────────────────────────────────────────

function CompetitorSelector({
  enabled,
  onToggle,
}: {
  enabled: Set<string>
  onToggle: (id: string) => void
}) {
  const [showMore, setShowMore] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowMore(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const core  = ALL_COMPETITORS.filter(c => c.hasData)
  const extra = ALL_COMPETITORS.filter(c => !c.hasData)

  return (
    <div ref={ref} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginRight: 2 }}>Compare vs</span>
      {core.map(c => (
        <button
          key={c.id}
          onClick={() => onToggle(c.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 20, border: `1.5px solid ${enabled.has(c.id) ? c.color : 'var(--border)'}`,
            background: enabled.has(c.id) ? `${c.color}15` : 'var(--warm-white)',
            cursor: 'pointer', fontSize: 11, fontWeight: 500,
            color: enabled.has(c.id) ? c.color : 'var(--ink3)',
            transition: 'all .12s',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: enabled.has(c.id) ? c.color : 'var(--mid)' }} />
          {c.name}
        </button>
      ))}

      {/* Extra competitors toggle */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowMore(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
            borderRadius: 20, border: '1.5px dashed var(--border)', background: 'white',
            cursor: 'pointer', fontSize: 11, color: 'var(--ink3)', fontFamily: "'IBM Plex Sans', sans-serif",
          }}
        >
          <Plus size={10} /> Add competitor
        </button>

        {showMore && (
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
            background: 'white', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: 200, padding: 8, overflow: 'hidden',
          }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', padding: '4px 6px 6px' }}>
              Integration available
            </div>
            {extra.map(c => (
              <button
                key={c.id}
                onClick={() => onToggle(c.id)}
                style={{
                  width: '100%', padding: '7px 8px', display: 'flex', alignItems: 'center', gap: 8,
                  border: 'none', background: enabled.has(c.id) ? 'var(--warm-white)' : 'white',
                  cursor: 'pointer', borderRadius: 5,
                }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color }} />
                <span style={{ fontSize: 11, color: 'var(--ink2)' }}>{c.name}</span>
                <span style={{ fontSize: 9, color: 'var(--mid)', fontFamily: "'IBM Plex Mono', monospace', marginLeft: 'auto" }}>{c.category}</span>
                {enabled.has(c.id) && <CheckCircle size={10} color="var(--accent2)" style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active extra competitors as dismissible chips */}
      {extra.filter(c => enabled.has(c.id)).map(c => (
        <button
          key={c.id}
          onClick={() => onToggle(c.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px 4px 10px',
            borderRadius: 20, border: `1.5px solid ${c.color}`,
            background: `${c.color}10`, cursor: 'pointer', fontSize: 11, color: c.color,
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: c.color }} />
          {c.name}
          <span style={{ fontSize: 8, color: '#888', fontFamily: "'IBM Plex Mono', monospace", marginLeft: 2 }}>No data</span>
          <X size={9} color={c.color} />
        </button>
      ))}
    </div>
  )
}

// ── Price history for checked cells ──────────────────────────────────────────

const hashId = (id: string) => id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

function genHistory(price: number, seed: number): number[] {
  return Array.from({ length: 30 }, (_, i) => {
    const v = (Math.sin(seed * 1.7 + i * 0.43) + Math.sin(seed * 0.7 + i * 0.17)) * 0.5 + 0.5
    return Math.round((price * (0.96 + v * 0.07)) * 100) / 100
  })
}

function MatchPriceHistory({
  checkedCells, platformRanks, competitors, yourPrice,
}: {
  checkedCells: Set<string>
  platformRanks: Record<string, RankedMatch[]>
  competitors: Competitor[]
  yourPrice: number
}) {
  const checked: Array<{ product: ScrapedListing; color: string; label: string }> = []
  competitors.forEach(comp => {
    ;(platformRanks[comp.id] ?? []).forEach(m => {
      if (checkedCells.has(m.product.id))
        checked.push({ product: m.product, color: comp.color, label: `${m.product.title.slice(0, 28)}… (${comp.name})` })
    })
  })

  if (checked.length === 0) {
    return (
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '28px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink3)', marginBottom: 4 }}>30-Day Price History</div>
        <div style={{ fontSize: 11, color: 'var(--mid)' }}>Check cells in the table above to compare price histories</div>
      </div>
    )
  }

  const yourSeed = Math.round(yourPrice * 113)
  const chartData = Array.from({ length: 30 }, (_, day) => {
    const pt: Record<string, number | string> = { day: `D${day + 1}` }
    pt['__your__'] = genHistory(yourPrice, yourSeed)[day]
    checked.forEach(({ product }) => {
      if (product.price != null) pt[product.id] = genHistory(product.price, hashId(product.id))[day]
    })
    return pt
  })

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>30-Day Price History</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>
          {checked.length} product{checked.length > 1 ? 's' : ''} selected
        </span>
      </div>
      <div style={{ padding: '16px 18px' }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="day"
              tick={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
              tickLine={false} interval={4} />
            <YAxis tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              tick={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink3)' }}
              tickLine={false} width={58} />
            <Tooltip
              formatter={(v: unknown) => [`$${Number(v).toFixed(2)}`, '']}
              contentStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, background: 'var(--ink)', border: 'none', borderRadius: 6, color: 'var(--cream)' }}
            />
            <Line dataKey="__your__" stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="4 3"
              dot={false} name="Your Price" />
            {checked.map(({ product, color, label }) => (
              <Line key={product.id} dataKey={product.id} stroke={color} strokeWidth={2}
                dot={false} name={label} />
            ))}
            <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, paddingTop: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProductMatcher() {
  const [selectedSkuId,  setSelectedSkuId]  = useState(PRODUCTS[0].id)
  const [enabled,        setEnabled]        = useState<Set<string>>(new Set(DEFAULT_ENABLED))
  const [platformRanks,  setPlatformRanks]  = useState<Record<string, RankedMatch[]>>({})
  const [platformStatus, setPlatformStatus] = useState<Record<string, PlatformStatus>>({})
  const [hasAiScores,    setHasAiScores]    = useState(false)
  const [isRunningAi,    setIsRunningAi]    = useState(false)
  const [aiMode,         setAiMode]         = useState<string | null>(null)
  const [checkedCells,   setCheckedCells]   = useState<Set<string>>(new Set())

  const selectedProduct = PRODUCTS.find(p => p.id === selectedSkuId)!
  const scrapedProducts = getScrapedProductsForSku(selectedSkuId)

  // Instant attribute-only scoring whenever SKU or competitors change
  useEffect(() => {
    const ranks: Record<string, RankedMatch[]> = {}
    for (const cid of enabled) {
      const comp = ALL_COMPETITORS.find(c => c.id === cid)
      if (!comp?.hasData) { ranks[cid] = []; continue }

      const pool = scrapedProducts.filter(p => p.platform === cid as 'AMZ' | 'TGT' | 'WMT')
      if (pool.length === 0) { ranks[cid] = []; continue }

      ranks[cid] = pool
        .map(p => ({
          product: p,
          attrScore: computeAttrScore(selectedProduct, p),
          textScore: 0,
          imageScore: 0,
          overall: computeAttrScore(selectedProduct, p),
        }))
        .sort((a, b) => b.overall - a.overall)
    }
    setPlatformRanks(ranks)
    setHasAiScores(false)
    setPlatformStatus({})
    setAiMode(null)
    setCheckedCells(new Set())
  }, [selectedSkuId, enabled, selectedProduct])

  const toggleCompetitor = useCallback((id: string) => {
    setEnabled(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleCell = useCallback((productId: string) => {
    setCheckedCells(prev => {
      const next = new Set(prev)
      next.has(productId) ? next.delete(productId) : next.add(productId)
      return next
    })
  }, [])

  const runAiMatching = useCallback(async () => {
    setIsRunningAi(true)
    setAiMode(null)
    const liveEnabled = Array.from(enabled)

    const tasks = liveEnabled
      .map(cid => ALL_COMPETITORS.find(c => c.id === cid))
      .filter((c): c is Competitor => c?.hasData === true)
      .map(comp => async () => {
        setPlatformStatus(prev => ({ ...prev, [comp.id]: 'running' }))

        const pool = scrapedProducts.filter(p => p.platform === comp.id as 'AMZ' | 'TGT' | 'WMT')
        const req: MatchProductsRequest = {
          anchor: { id: selectedProduct.id, title: selectedProduct.name, imageUrl: selectedProduct.imageUrl },
          candidates: pool.map(p => ({ id: p.id, title: p.title, imageUrl: p.imageUrl })),
        }

        let aiResults: MatchProductResult[] = []
        let mode = 'fallback'
        try {
          const res = await fetch('/api/match-products', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req),
          })
          const data = await res.json() as { results: MatchProductResult[]; mode: string }
          aiResults = data.results; mode = data.mode
        } catch {
          aiResults = pool.map(p => ({ id: p.id, textScore: 45, visualScore: 40 }))
        }

        setAiMode(prev => (prev === 'ai_text_vision' ? prev : mode))

        const scoreMap = new Map(aiResults.map(r => [r.id, r]))
        const updated = pool.map(p => {
          const ai = scoreMap.get(p.id)
          const attr  = computeAttrScore(selectedProduct, p)
          const text  = ai?.textScore  ?? 45
          const image = ai?.visualScore ?? 40
          return {
            product: p, attrScore: attr, textScore: text, imageScore: image,
            overall: Math.round(0.35 * attr + 0.35 * text + 0.30 * image),
          }
        }).sort((a, b) => b.overall - a.overall)

        setPlatformRanks(prev => ({ ...prev, [comp.id]: updated }))
        setPlatformStatus(prev => ({ ...prev, [comp.id]: 'done' }))
      })

    // Run all in parallel (small enough)
    await Promise.all(tasks.map(t => t()))
    setHasAiScores(true)
    setIsRunningAi(false)
  }, [enabled, selectedProduct, scrapedProducts])

  const enabledCompetitors = ALL_COMPETITORS.filter(c => enabled.has(c.id))
  const activeCompetitors  = enabledCompetitors.filter(c => c.hasData)
  const pendingCompetitors = enabledCompetitors.filter(c => !c.hasData)

  const TOP_N = 5
  const ROW_H = 244

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Control bar */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <SkuSelector value={selectedSkuId} onChange={id => { setSelectedSkuId(id); setHasAiScores(false) }} />
        <div style={{ width: 1, height: 32, background: 'var(--border)', flexShrink: 0 }} />
        <CompetitorSelector enabled={enabled} onToggle={toggleCompetitor} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {aiMode && hasAiScores && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: aiMode === 'fallback' ? 'var(--paper)' : 'var(--accent2-soft)', color: aiMode === 'fallback' ? 'var(--mid)' : 'var(--accent2)' }}>
              {aiMode === 'ai_text_vision' ? 'TEXT + VISION AI' : aiMode === 'ai_text_only' ? 'SEMANTIC AI' : 'DEMO'}
            </span>
          )}
          <button
            onClick={runAiMatching}
            disabled={isRunningAi}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px',
              background: isRunningAi ? 'var(--paper)' : hasAiScores ? 'var(--warm-white)' : 'var(--accent)',
              color: isRunningAi ? 'var(--mid)' : hasAiScores ? 'var(--ink2)' : 'white',
              border: hasAiScores ? '1px solid var(--border)' : 'none',
              borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: isRunningAi ? 'not-allowed' : 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {isRunningAi
              ? <><RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} />Running AI…</>
              : hasAiScores
              ? <><RefreshCw size={11} />Re-run AI</>
              : <><Brain size={11} />Run AI Matching</>
            }
          </button>
        </div>
      </div>

      {/* Hint when no AI scores yet */}
      {!hasAiScores && (
        <div style={{ padding: '7px 14px', background: 'var(--blue-soft)', border: '1px solid #c0cfe0', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Brain size={11} color="var(--blue)" />
          <span style={{ fontSize: 11, color: 'var(--blue)' }}>
            <strong>Preview mode</strong> - candidates ranked by price &amp; title similarity only (~scores). Click <strong>Run AI Matching</strong> to apply Claude semantic + visual scoring with the 70% confidence threshold.
          </span>
        </div>
      )}

      {/* Transposed match table */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>

        {/* Column headers: Match #1 … #5 */}
        <div style={{ display: 'grid', gridTemplateColumns: `116px repeat(${TOP_N}, 1fr)`, borderBottom: '1px solid var(--border)', background: 'var(--warm-white)' }}>
          <div style={{ padding: '9px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Competitor
          </div>
          {Array.from({ length: TOP_N }, (_, i) => (
            <div key={i} style={{ padding: '9px 8px', borderLeft: '1px solid var(--border)', textAlign: 'center' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {i === 0 ? 'Top Match' : `#${i + 1}`}
              </span>
            </div>
          ))}
        </div>

        {/* Competitor rows with real data */}
        {activeCompetitors.map((comp, rowIdx) => {
          const matches = (platformRanks[comp.id] ?? []).slice(0, TOP_N)
          const status  = platformStatus[comp.id] ?? 'idle'
          const isLast  = rowIdx === activeCompetitors.length - 1 && pendingCompetitors.length === 0

          return (
            <div
              key={comp.id}
              style={{ display: 'grid', gridTemplateColumns: `116px repeat(${TOP_N}, 1fr)`, borderBottom: isLast ? 'none' : '1px solid var(--border)', minHeight: ROW_H }}
            >
              {/* Row header */}
              <div style={{ padding: '16px 14px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: comp.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: comp.color }}>{comp.name}</span>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)' }}>
                  {scrapedProducts.filter(p => p.platform === comp.id as 'AMZ' | 'TGT' | 'WMT').length} listings
                </div>
                {status === 'running' && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: comp.color, animation: `blink 1.2s ${i*0.2}s ease-in-out infinite` }} />
                    ))}
                  </div>
                )}
                {status === 'done' && hasAiScores && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)' }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--accent2)' }}>AI scored</span>
                  </div>
                )}
              </div>

              {/* Match cells */}
              {(() => {
                // After AI completes for this platform: if ALL matches are below 70%, show a row-level message
                const hasAnyConfidentMatch = status === 'done' && matches.some(m => m.overall >= 70)
                const noMatchAfterAi = status === 'done' && matches.length > 0 && !hasAnyConfidentMatch

                if (noMatchAfterAi) {
                  return (
                    <div style={{ gridColumn: `2 / ${TOP_N + 2}`, borderLeft: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px', background: 'var(--warm-white)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${comp.color}15`, border: `2px solid ${comp.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 12, fontWeight: 700, color: comp.color }}>{comp.name[0]}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink2)', marginBottom: 3 }}>
                          No confident matches found on {comp.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--ink3)' }}>
                          All {matches.length} catalog items scored below 70% for this SKU. Best: {Math.max(...matches.map(m => m.overall))}% - try a product in the same category as the {comp.name} catalog.
                        </div>
                      </div>
                    </div>
                  )
                }

                return Array.from({ length: TOP_N }, (_, colIdx) => {
                  const match = matches[colIdx] ?? null
                  const isChecked = match ? checkedCells.has(match.product.id) : false
                  return (
                    <div
                      key={colIdx}
                      style={{
                        borderLeft: '1px solid var(--border)',
                        background: colIdx === 0 && match && match.overall >= 70 ? `${comp.color}05` : 'white',
                        position: 'relative',
                      }}
                    >
                      {/* Checkbox */}
                      {match && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleCell(match.product.id)}
                          onKeyDown={e => e.key === 'Enter' && toggleCell(match.product.id)}
                          title={isChecked ? 'Remove from price history' : 'Add to price history'}
                          style={{
                            position: 'absolute', top: 7, right: 7, zIndex: 10,
                            width: 16, height: 16, borderRadius: 4,
                            background: isChecked ? comp.color : 'white',
                            border: `1.5px solid ${isChecked ? comp.color : 'var(--border2)'}`,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                        >
                          {isChecked && (
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                      )}
                      {status === 'running' ? <PendingCell /> : <MatchCell match={match} rank={colIdx + 1} mode={status === 'done' ? 'ai' : 'attr'} />}
                    </div>
                  )
                })
              })()}
            </div>
          )
        })}

        {/* Pending integration rows */}
        {pendingCompetitors.map((comp, idx) => (
          <div
            key={comp.id}
            style={{ display: 'grid', gridTemplateColumns: `116px repeat(${TOP_N}, 1fr)`, borderTop: '1px solid var(--border)', minHeight: 56 }}
          >
            <div style={{ padding: '12px 14px', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: comp.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: comp.color }}>{comp.name}</span>
            </div>
            <div style={{ gridColumn: `2 / ${TOP_N + 2}`, borderLeft: '1px solid var(--border)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--warm-white)' }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '3px 8px', borderRadius: 3, background: 'var(--paper)', color: 'var(--mid)', border: '1px dashed var(--border)' }}>
                INTEGRATION PENDING
              </span>
              <span style={{ fontSize: 10, color: 'var(--ink3)' }}>
                {comp.category} catalog not yet scraped - contact your RetailLens account manager to add {comp.name} to your monitored competitors.
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 30-Day Price History */}
      <MatchPriceHistory
        checkedCells={checkedCells}
        platformRanks={platformRanks}
        competitors={activeCompetitors}
        yourPrice={selectedProduct.yourPrice}
      />

      {/* Category Intelligence */}
      <CategoryIntelligencePanel productId={selectedSkuId} />

      {/* Score legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '8px 16px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8 }}>
        <span style={{ fontSize: 9, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.5px' }}>Confidence</span>
        {[
          { label: '90–100% - Verified match', color: 'var(--accent2)', bg: 'var(--accent2-soft)' },
          { label: '80–89% - Strong match',    color: '#2a8a50',        bg: '#d4f0e0'             },
          { label: '70–79% - Confident match', color: 'var(--amber)',   bg: '#fef6e3'             },
          { label: '<70% - Below threshold',   color: 'var(--mid)',     bg: 'var(--paper)'        },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 10, height: 5, borderRadius: 3, background: l.color }} />
            <span style={{ fontSize: 9, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>{l.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>
          {hasAiScores ? 'Scores: 35% attribute + 35% AI text + 30% AI vision' : 'Scores: attribute similarity only - run AI for full analysis'}
        </div>
      </div>
    </div>
  )
}
