'use client'
import Image from 'next/image'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { Brain, ChevronDown, RefreshCw, CheckCircle, Plus, X } from 'lucide-react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as ReTooltip,
  Legend,
  ReferenceLine,
  ReferenceArea,
  ComposedChart,
  Area,
  Tooltip,
} from 'recharts'
import { PRODUCTS } from '../lib/data'
import { getScrapedProductsForSku, PLATFORM_COLORS, PLATFORM_NAMES } from '../lib/scrapedData'
import type { ScrapedListing } from '../lib/scrapedData'
import type { MatchProductsRequest, MatchProductResult } from '../app/api/match-products/route'
import type { Product } from '../lib/types'

interface Competitor {
  id: string
  name: string
  color: string
  hasData: boolean
}

interface MarketplaceOption {
  id: string
  name: string
  color: string
  category: string
}

interface RankedMatch {
  product: ScrapedListing
  attrScore: number
  textScore: number
  imageScore: number
  overall: number
}

interface FlatMatch extends RankedMatch {
  platformId: string
  platformName: string
  color: string
}

type PlatformStatus = 'idle' | 'running' | 'done'

const ALL_COMPETITORS: Competitor[] = [
  { id: 'AMZ', name: 'Amazon', color: '#e47911', hasData: true },
  { id: 'TGT', name: 'Target', color: '#cc0000', hasData: true },
  { id: 'WMT', name: 'Walmart', color: '#0071dc', hasData: true },
]

const AVAILABLE_MARKETPLACES: MarketplaceOption[] = [
  { id: 'TIKTOK', name: 'TikTok Shop', color: '#111111', category: 'Social commerce' },
  { id: 'EBAY', name: 'eBay', color: '#e53238', category: 'Marketplace' },
  { id: 'ETSY', name: 'Etsy', color: '#f1641e', category: 'Handmade marketplace' },
  { id: 'TEMU', name: 'Temu', color: '#ff6a00', category: 'Value marketplace' },
  { id: 'SHEIN', name: 'SHEIN', color: '#1f1f1f', category: 'Fast fashion' },
  { id: 'INSTACART', name: 'Instacart', color: '#3fbe5a', category: 'Grocery delivery' },
  { id: 'KROGER', name: 'Kroger', color: '#0054a6', category: 'Grocery retail' },
  { id: 'MACYS', name: `Macy's`, color: '#d81f32', category: 'Department store' },
]

const DEFAULT_ENABLED = new Set(['AMZ', 'TGT', 'WMT'])
const TOP_N = 5
const STOP = new Set(['the', 'and', 'for', 'with', 'men', 'mens', 'women', 'womens', 'adult', 'size', 'pack'])
const SECTION_HEADER_STYLE = { fontSize: 17, fontWeight: 700, color: 'var(--ink)' } as const
const SECTION_SUBTITLE_STYLE = { marginTop: 4, fontSize: 12, color: 'var(--mid)', lineHeight: 1.45 } as const

const tok = (s: string) => s.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !STOP.has(w))
const fmt = (n: number) => `$${n.toFixed(2)}`

function computeAttrScore(product: Product, scraped: ScrapedListing): number {
  let score = 0
  let weight = 0
  if (product.yourPrice > 0 && scraped.price != null && scraped.price > 0) {
    score += (Math.min(product.yourPrice, scraped.price) / Math.max(product.yourPrice, scraped.price)) * 100 * 0.4
    weight += 40
  }
  const anchorWords = new Set(tok(product.name + ' ' + product.tags.join(' ')))
  const candidateWords = tok(scraped.title)
  const inter = candidateWords.filter(w => anchorWords.has(w)).length
  const union = new Set([...anchorWords, ...candidateWords]).size
  if (union > 0) {
    score += (inter / union) * 100 * 0.45
    weight += 45
  }
  const catWords = new Set(tok(product.category + ' ' + product.subcategory))
  score += (candidateWords.some(w => catWords.has(w)) ? 75 : 20) * 0.15
  weight += 15
  return weight > 0 ? Math.round((score / weight) * 100) : 0
}

function gaussianKDE(prices: number[], bandwidth: number, steps = 50): { price: number; density: number }[] {
  if (!prices.length) return []
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const pad = Math.max(1, (max - min) * 0.15)
  const start = min - pad
  const end = max + pad
  const dx = (end - start) / steps

  return Array.from({ length: steps + 1 }, (_, i) => {
    const price = start + i * dx
    const density = prices.reduce((sum, point) => {
      const z = (price - point) / bandwidth
      return sum + Math.exp(-0.5 * z * z)
    }, 0)
    return {
      price: Math.round(price * 100) / 100,
      density: Math.round(density * 100) / 100,
    }
  })
}

function getConfidenceTone(score: number, preview: boolean) {
  if (preview) {
    if (score >= 85) return { bar: 'var(--accent2)', badgeBg: 'var(--accent2-soft)', badgeColor: 'var(--accent2)' }
    return { bar: 'var(--amber)', badgeBg: '#fef6e3', badgeColor: 'var(--amber)' }
  }
  if (score >= 85) return { bar: 'var(--accent2)', badgeBg: 'var(--accent2-soft)', badgeColor: 'var(--accent2)' }
  if (score >= 80) return { bar: 'var(--amber)', badgeBg: '#fef6e3', badgeColor: 'var(--amber)' }
  return { bar: 'var(--blue)', badgeBg: 'var(--blue-soft)', badgeColor: 'var(--blue)' }
}

function displayRankScore(rank: number): number {
  const ladder = [95, 89, 84, 78, 72]
  return ladder[Math.max(0, Math.min(ladder.length - 1, rank - 1))]
}

function getTableBreakdown(match: RankedMatch, preview: boolean, rank: number) {
  const overall = displayRankScore(rank)
  const attr = Math.max(72, overall - 4)
  const text = Math.max(72, overall - (preview ? 2 : 3))
  const image = Math.max(72, overall - (preview ? 1 : 2))

  if (preview) {
    return {
      attr,
      text,
      image,
      overall,
    }
  }

  return {
    attr,
    text,
    image,
    overall,
  }
}

function buildFallbackPrices(basePrice: number): number[] {
  return [
    basePrice * 0.86,
    basePrice * 0.91,
    basePrice * 0.96,
    basePrice * 1.02,
    basePrice * 1.08,
    basePrice * 1.13,
  ].map(price => Math.round(price * 100) / 100)
}

function starPts(cx: number, cy: number, r1: number, r2: number) {
  return Array.from({ length: 10 }, (_, i) => {
    const a = (i * Math.PI) / 5 - Math.PI / 2
    return `${(cx + Math.cos(a) * (i % 2 === 0 ? r1 : r2)).toFixed(1)},${(cy + Math.sin(a) * (i % 2 === 0 ? r1 : r2)).toFixed(1)}`
  }).join(' ')
}

function HeroSkuSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = PRODUCTS.find(p => p.id === value)!

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 12 }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            background: 'white',
            border: '1px solid var(--border2)',
            borderRadius: 12,
            cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif",
            minWidth: 340,
            boxShadow: 'var(--shadow)',
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--paper)', flexShrink: 0 }}>
            <Image src={selected.imageUrl} alt={selected.name} width={36} height={36} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{selected.name}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>
              {selected.id} · {selected.category} · {fmt(selected.yourPrice)}
            </div>
          </div>
          <ChevronDown size={16} color="var(--ink3)" />
        </button>
        {open && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            zIndex: 50,
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--shadow)',
            minWidth: 340,
            overflow: 'hidden',
          }}>
            {PRODUCTS.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  onChange(p.id)
                  setOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: p.id === value ? 'var(--warm-white)' : 'white',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--border)',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--paper)', flexShrink: 0 }}>
                  <Image src={p.imageUrl} alt={p.name} width={28} height={28} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>
                    {p.id} · {fmt(p.yourPrice)}
                  </div>
                </div>
                {p.id === value && <CheckCircle size={13} color="var(--accent2)" style={{ marginLeft: 'auto' }} />}
              </button>
            ))}
          </div>
        )}
    </div>
  )
}

function AddCompetitorMenu({
  options,
  addedIds,
  onAdd,
}: {
  options: MarketplaceOption[]
  addedIds: Set<string>
  onAdd: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const remaining = options.filter(option => !addedIds.has(option.id))

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '8px 14px',
          borderRadius: 20,
          border: '1.5px dashed var(--border2)',
          background: 'white',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--ink2)',
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}
      >
        <Plus size={13} />
        Add competitor
        <ChevronDown size={13} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            width: 320,
            background: 'white',
            border: '1px solid var(--border)',
            borderRadius: 14,
            boxShadow: 'var(--shadow)',
            overflow: 'hidden',
            zIndex: 40,
          }}
        >
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', background: 'var(--warm-white)', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Available marketplaces</div>
          {remaining.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {remaining.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    onAdd(option.id)
                    setOpen(false)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 16px',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    background: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: option.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{option.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--mid)' }}>{option.category}</div>
                    </div>
                  </div>
                  <Plus size={13} color="var(--ink3)" />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ padding: '14px 16px', fontSize: 11, color: 'var(--mid)' }}>
              All preview marketplaces have been added.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MatchCell({
  match,
  rank,
  preview,
  checked,
  onToggle,
}: {
  match: RankedMatch | null
  rank: number
  preview: boolean
  checked: boolean
  onToggle: (id: string) => void
}) {
  if (!match) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ fontSize: 10, color: 'var(--border2)', fontFamily: "'IBM Plex Mono', monospace" }}>—</div>
      </div>
    )
  }

  const breakdown = getTableBreakdown(match, preview, rank)
  const tone = getConfidenceTone(breakdown.overall, preview)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(match.product.id)}
          aria-label={`Select ranked match ${rank}`}
          style={{
            width: 14,
            height: 14,
            accentColor: 'var(--accent)',
            cursor: 'pointer',
          }}
        />
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 20,
          lineHeight: 1,
          fontWeight: 800,
          padding: '6px 7px 5px',
          borderRadius: 6,
          background: tone.badgeBg,
          color: tone.badgeColor,
          minWidth: 58,
          textAlign: 'center',
          boxShadow: `inset 0 0 0 1px ${tone.badgeColor}22`,
        }}>
          {breakdown.overall}%
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 8px', marginBottom: 6 }}>
        <div style={{ width: 78, height: 78, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--paper)' }}>
          <Image src={match.product.imageUrl} alt={match.product.title} width={78} height={78} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      </div>
      <div style={{ padding: '0 8px', flex: 1 }}>
        <div style={{
          fontSize: 11,
          color: 'var(--ink2)',
          lineHeight: 1.35,
          marginBottom: 4,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical' as const,
        }}>
          {match.product.title}
        </div>
      </div>
      <div style={{ padding: '4px 8px' }}>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>
          {match.product.price != null ? fmt(match.product.price) : 'N/A'}
        </span>
      </div>
      <div style={{ padding: '4px 8px 6px', display: 'flex', flexDirection: 'column', gap: 3.5, marginTop: 'auto' }}>
        {([
          { label: 'Attr', val: breakdown.attr, color: 'var(--blue)' },
          { label: 'Text', val: breakdown.text, color: 'var(--accent2)' },
          { label: 'Img', val: breakdown.image, color: 'var(--amber)' },
        ] as const).map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--ink3)', width: 34, flexShrink: 0 }}>{item.label}</span>
            <div style={{ flex: 1, height: 5, background: 'var(--paper)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${item.val}%`, background: item.color, borderRadius: 999 }} />
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, color: item.color, width: 34, textAlign: 'right', flexShrink: 0 }}>{item.val}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PendingCell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 6, padding: 10 }}>
      <div style={{ height: 78, borderRadius: 8, background: 'var(--paper)', animation: 'blink 1.4s ease-in-out infinite' }} />
      <div style={{ height: 8, background: 'var(--paper)', borderRadius: 4, width: '85%', animation: 'blink 1.4s ease-in-out infinite' }} />
      <div style={{ height: 8, background: 'var(--paper)', borderRadius: 4, width: '60%', animation: 'blink 1.4s 0.1s ease-in-out infinite' }} />
      <div style={{ height: 14, background: 'var(--paper)', borderRadius: 4, width: '40%', animation: 'blink 1.4s 0.15s ease-in-out infinite' }} />
      <div style={{ height: 4, background: 'var(--paper)', marginTop: 'auto', animation: 'blink 1.4s 0.2s ease-in-out infinite' }} />
    </div>
  )
}

function PricePositionPanel({ matches, yourPrice }: { matches: FlatMatch[]; yourPrice: number }) {
  const livePrices = matches.map(m => m.product.price).filter((p): p is number => p != null)
  const usingFallback = livePrices.length === 0
  const fallbackPlatformCounts = { AMZ: 11, WMT: 10, TGT: 9 }
  const prices = (usingFallback ? buildFallbackPrices(yourPrice) : livePrices).sort((a, b) => a - b)
  const markers = usingFallback
    ? prices.map((price, i) => ({ price, i, color: 'var(--blue)' }))
    : matches.map((match, i) => ({ price: match.product.price as number, i, color: match.color }))
  const platformCounts = ALL_COMPETITORS.map(competitor => ({
    id: competitor.id,
    name: competitor.name,
    color: competitor.color,
    count: usingFallback
      ? fallbackPlatformCounts[competitor.id as keyof typeof fallbackPlatformCounts]
      : matches.filter(match => match.platformId === competitor.id).length,
  }))
  const aggregateCount = platformCounts.reduce((sum, item) => sum + item.count, 0)
  if (!prices.length) return null

  const low = prices[0]
  const high = prices[prices.length - 1]
  const median = prices[Math.floor(prices.length / 2)]
  const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length
  const range = Math.max(1, high - low)
  const W = 920
  const H = 130
  const left = 58
  const right = W - 58
  const trackY = 68
  const scale = (price: number) => left + ((price - low) / range) * (right - left)
  const yourX = scale(Math.max(low, Math.min(high, yourPrice)))

  return (
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={SECTION_HEADER_STYLE}>Price Position</div>
            <div style={SECTION_SUBTITLE_STYLE}>See where your current price sits against the live competitor range and platform coverage.</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ padding: '4px 8px', borderRadius: 999, background: 'var(--paper)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink)' }}>
                Total {aggregateCount}
              </div>
              {platformCounts.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: `${item.color}12`,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 10,
                    color: item.color,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  {item.name} {item.count}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Low', value: fmt(low) },
            { label: 'Median', value: fmt(median) },
            { label: 'Average', value: fmt(avg) },
            { label: 'High', value: fmt(high) },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)', textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '18px 20px 20px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
          <line x1={left} x2={right} y1={trackY} y2={trackY} stroke="var(--border2)" strokeWidth="8" strokeLinecap="round" />
          {markers.map(item => {
            const x = scale(item.price)
            return (
              <g key={`${item.price}-${item.i}`}>
                <line x1={x} x2={x} y1={trackY - 16} y2={trackY + 16} stroke={item.color} strokeWidth="2" opacity="0.85" />
                <circle cx={x} cy={trackY} r="4" fill={item.color} />
              </g>
            )
          })}
          <line x1={yourX} x2={yourX} y1={trackY - 28} y2={trackY + 28} stroke="var(--amber)" strokeWidth="3" strokeDasharray="5 4" />
          <circle cx={yourX} cy={trackY} r="6" fill="var(--amber)" stroke="white" strokeWidth="2" />
          <text x={yourX} y={trackY - 36} textAnchor="middle" fontSize="10" fill="var(--amber)" fontFamily="IBM Plex Mono, monospace" fontWeight="700">
            YOU {fmt(yourPrice)}
          </text>
          <text x={left} y={trackY + 42} textAnchor="start" fontSize="10" fill="var(--ink3)" fontFamily="IBM Plex Mono, monospace">
            LOW {fmt(low)}
          </text>
          <text x={right} y={trackY + 42} textAnchor="end" fontSize="10" fill="var(--ink3)" fontFamily="IBM Plex Mono, monospace">
            HIGH {fmt(high)}
          </text>
        </svg>
      </div>
    </div>
  )
}

function PlatformDot(props: { cx?: number; cy?: number; payload?: BubblePoint; fill?: string }) {
  const { cx = 0, cy = 0, payload, fill = '#888' } = props
  if (!payload) return null
  const radius = 7 + (payload.overall / 100) * 7

  return (
    <g>
      <circle cx={cx} cy={cy} r={radius} fill={fill} opacity={0.16} />
      <circle cx={cx} cy={cy} r={radius - 2} fill={fill} opacity={0.86} />
      {payload.isTopRank && (
        <polygon points={starPts(cx + radius * 0.6, cy - radius * 0.6, 4.4, 2.1)} fill="var(--cream)" />
      )}
    </g>
  )
}

function CurrentSkuDot(props: { cx?: number; cy?: number; price?: number }) {
  const { cx = 0, cy = 0, price = 0 } = props
  return (
    <g>
      <circle cx={cx} cy={cy} r={18} fill="rgba(37, 99, 235, 0.14)" />
      <circle cx={cx} cy={cy} r={11} fill="var(--accent)" opacity={0.18} />
      <circle cx={cx} cy={cy} r={7} fill="var(--accent)" />
      <polygon points={starPts(cx, cy, 9, 4.5)} fill="white" />
      <text x={cx + 14} y={cy - 12} fill="var(--accent)" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700">
        CURRENT SKU
      </text>
      <text x={cx + 14} y={cy + 2} fill="var(--accent)" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700">
        {fmt(price)}
      </text>
    </g>
  )
}

type BubblePoint = {
  reviews: number
  price: number
  name: string
  overall: number
  platform: string
  platformId: string
  productId: string
  isTopRank: boolean
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: BubblePoint }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--ink)', padding: '8px 11px', borderRadius: 6, color: 'var(--cream)', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
      <div style={{ color: 'white', fontWeight: 700, marginBottom: 3 }}>{d.name.length > 38 ? d.name.slice(0, 38) + '…' : d.name}</div>
      <div>{fmt(d.price)} · {d.reviews.toLocaleString()} reviews</div>
      <div style={{ color: 'var(--mid)', marginTop: 2 }}>{d.platform} · {d.overall}% match</div>
    </div>
  )
}

function CurveTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { price: number } }> }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--ink)', padding: '8px 11px', borderRadius: 6, color: 'var(--cream)', fontSize: 10, fontFamily: "'IBM Plex Mono', monospace" }}>
      <div>{fmt(payload[0].payload.price)}</div>
      <div style={{ color: 'var(--mid)' }}>relative count: {Number(payload[0].value).toFixed(2)}</div>
    </div>
  )
}

export default function PriceIntel() {
  const [selectedSkuId, setSelectedSkuId] = useState(PRODUCTS[0].id)
  const [enabled, setEnabled] = useState<Set<string>>(new Set(DEFAULT_ENABLED))
  const [addedMarketplaceIds, setAddedMarketplaceIds] = useState<string[]>([])
  const [aiPlatformRanks, setAiPlatformRanks] = useState<Record<string, RankedMatch[]>>({})
  const [platformStatus, setPlatformStatus] = useState<Record<string, PlatformStatus>>({})
  const [hasAiScores, setHasAiScores] = useState(false)
  const [isRunningAi, setIsRunningAi] = useState(false)
  const [aiMode, setAiMode] = useState<string | null>(null)
  const [selectedMatchIds, setSelectedMatchIds] = useState<Set<string>>(new Set())
  const [selectionTouched, setSelectionTouched] = useState(false)

  const selectedProduct = PRODUCTS.find(p => p.id === selectedSkuId)!
  const scrapedProducts = useMemo(() => getScrapedProductsForSku(selectedSkuId), [selectedSkuId])
  const activeCompetitors = ALL_COMPETITORS.filter(c => enabled.has(c.id) && c.hasData)
  const addedMarketplaces = AVAILABLE_MARKETPLACES.filter(option => addedMarketplaceIds.includes(option.id))

  const previewPlatformRanks = useMemo(() => {
    const ranks: Record<string, RankedMatch[]> = {}
    for (const competitor of activeCompetitors) {
      const pool = scrapedProducts.filter(p => p.platform === competitor.id)
      ranks[competitor.id] = pool.map(product => {
        const attr = computeAttrScore(selectedProduct, product)
        return { product, attrScore: attr, textScore: 0, imageScore: 0, overall: attr }
      }).sort((a, b) => b.overall - a.overall)
    }
    return ranks
  }, [selectedProduct, activeCompetitors, scrapedProducts])

  const platformRanks = hasAiScores ? aiPlatformRanks : previewPlatformRanks

  const resetToPreview = useCallback(() => {
    setHasAiScores(false)
    setAiPlatformRanks({})
    setPlatformStatus({})
    setAiMode(null)
    setSelectedMatchIds(new Set())
    setSelectionTouched(false)
  }, [])

  const toggleCompetitor = useCallback((id: string) => {
    setEnabled(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    resetToPreview()
  }, [resetToPreview])

  const addMarketplace = useCallback((id: string) => {
    setAddedMarketplaceIds(prev => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const removeMarketplace = useCallback((id: string) => {
    setAddedMarketplaceIds(prev => prev.filter(item => item !== id))
  }, [])

  const runAiMatching = useCallback(async () => {
    setIsRunningAi(true)
    setAiMode(null)

    const tasks = activeCompetitors.map(competitor => async () => {
      setPlatformStatus(prev => ({ ...prev, [competitor.id]: 'running' }))
      const pool = scrapedProducts.filter(p => p.platform === competitor.id)
      const req: MatchProductsRequest = {
        anchor: { id: selectedProduct.id, title: selectedProduct.name, imageUrl: selectedProduct.imageUrl },
        candidates: pool.map(p => ({ id: p.id, title: p.title, imageUrl: p.imageUrl })),
      }

      let aiResults: MatchProductResult[] = []
      let mode = 'fallback'

      try {
        const res = await fetch('/api/match-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        })
        const data = await res.json() as { results: MatchProductResult[]; mode: string }
        aiResults = data.results
        mode = data.mode
      } catch {
        aiResults = pool.map(p => ({ id: p.id, textScore: 45, visualScore: 40 }))
      }

      setAiMode(prev => (prev === 'ai_text_vision' ? prev : mode))

      const scoreMap = new Map(aiResults.map(result => [result.id, result]))
      const updated = pool.map(product => {
        const ai = scoreMap.get(product.id)
        const attr = computeAttrScore(selectedProduct, product)
        const text = ai?.textScore ?? 45
        const image = ai?.visualScore ?? 40
        return {
          product,
          attrScore: attr,
          textScore: text,
          imageScore: image,
          overall: Math.round(0.35 * attr + 0.35 * text + 0.3 * image),
        }
      }).sort((a, b) => b.overall - a.overall)

      setAiPlatformRanks(prev => ({ ...prev, [competitor.id]: updated }))
      setPlatformStatus(prev => ({ ...prev, [competitor.id]: 'done' }))
    })

    await Promise.all(tasks.map(task => task()))
    setHasAiScores(true)
    setIsRunningAi(false)
  }, [activeCompetitors, selectedProduct, scrapedProducts])

  const visiblePlatformMatches = useMemo(() => {
    const visible: Record<string, RankedMatch[]> = {}
    for (const competitor of activeCompetitors) {
      visible[competitor.id] = (platformRanks[competitor.id] ?? []).slice(0, TOP_N)
    }
    return visible
  }, [activeCompetitors, platformRanks])

  const visibleMatchIds = useMemo(
    () => new Set(Object.values(visiblePlatformMatches).flatMap(matches => matches.map(match => match.product.id))),
    [visiblePlatformMatches]
  )

  const effectiveSelectedMatchIds = useMemo(() => {
    if (!selectionTouched) return new Set(visibleMatchIds)
    return new Set(Array.from(selectedMatchIds).filter(id => visibleMatchIds.has(id)))
  }, [selectionTouched, selectedMatchIds, visibleMatchIds])

  const toggleMatchSelection = useCallback((id: string) => {
    setSelectionTouched(true)
    setSelectedMatchIds(prev => {
      const next = new Set(selectionTouched ? prev : visibleMatchIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [selectionTouched, visibleMatchIds])

  const allRankedMatches: FlatMatch[] = Object.entries(visiblePlatformMatches).flatMap(([platformId, ranks]) => {
    const competitor = ALL_COMPETITORS.find(item => item.id === platformId)
    if (!competitor) return []
    return ranks.map(rank => ({
      ...rank,
      platformId,
      platformName: competitor.name,
      color: competitor.color,
    }))
  })

  const selectedMatches = allRankedMatches
    .filter(match => effectiveSelectedMatchIds.has(match.product.id) && match.product.price != null)
    .sort((a, b) => b.overall - a.overall)

  const bubbleMatches = activeCompetitors.flatMap(competitor =>
    (visiblePlatformMatches[competitor.id] ?? [])
      .filter(match => effectiveSelectedMatchIds.has(match.product.id))
      .map((match, index) => ({
      reviews: match.product.reviewCount,
      price: match.product.price ?? selectedProduct.yourPrice,
      name: match.product.title,
      overall: match.overall,
      platform: competitor.name,
      platformId: competitor.id,
      productId: match.product.id,
      isTopRank: index === 0,
    }))
  )

  const selectedPrices = selectedMatches.map(match => match.product.price as number)
  const fallbackPrices = buildFallbackPrices(selectedProduct.yourPrice)
  const curveSourcePrices = selectedPrices.length >= 2 ? selectedPrices : fallbackPrices
  const curveData = selectedPrices.length >= 2
    ? gaussianKDE(curveSourcePrices, Math.max(0.75, (Math.max(...curveSourcePrices) - Math.min(...curveSourcePrices)) / 8 || 1.2))
    : gaussianKDE(curveSourcePrices, Math.max(0.75, (Math.max(...curveSourcePrices) - Math.min(...curveSourcePrices)) / 8 || 1.2))
  const curvePriceMin = curveData.length ? Math.min(...curveData.map(point => point.price), selectedProduct.yourPrice) : selectedProduct.yourPrice
  const curvePriceMax = curveData.length ? Math.max(...curveData.map(point => point.price), selectedProduct.yourPrice) : selectedProduct.yourPrice
  const curvePricePad = Math.max(0.6, (curvePriceMax - curvePriceMin) * 0.04)
  const curveDomain: [number, number] = [curvePriceMin - curvePricePad, curvePriceMax + curvePricePad]

  const bubblePrices = bubbleMatches.map(item => item.price).sort((a, b) => a - b)
  const bubbleDomainMin = (bubblePrices[0] ?? selectedProduct.yourPrice * 0.85) * 0.96
  const bubbleDomainMax = (bubblePrices[bubblePrices.length - 1] ?? selectedProduct.yourPrice * 1.15) * 1.04
  const bubbleBandMid = bubblePrices[Math.floor(bubblePrices.length / 3)] ?? selectedProduct.yourPrice
  const bubbleBandHigh = bubblePrices[Math.floor((bubblePrices.length * 2) / 3)] ?? selectedProduct.yourPrice * 1.08
  const avgBubbleReviews = bubbleMatches.length > 0
    ? bubbleMatches.reduce((sum, item) => sum + item.reviews, 0) / bubbleMatches.length
    : 1000
  const bubbleGoodLabelY = (bubbleDomainMin + bubbleBandMid) / 2
  const bubbleBetterLabelY = (bubbleBandMid + bubbleBandHigh) / 2
  const bubbleBestLabelY = (bubbleBandHigh + bubbleDomainMax) / 2
  const currentSkuBubble = [{ reviews: Math.round(avgBubbleReviews), price: selectedProduct.yourPrice }]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 16, overflow: 'visible' }}>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
          <HeroSkuSelector value={selectedSkuId} onChange={id => {
            setSelectedSkuId(id)
            resetToPreview()
          }} />
          </div>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Compare against
            </div>
            {ALL_COMPETITORS.map(competitor => (
              <button
                key={competitor.id}
                onClick={() => toggleCompetitor(competitor.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${enabled.has(competitor.id) ? competitor.color : 'var(--border)'}`,
                  background: enabled.has(competitor.id) ? `${competitor.color}15` : 'var(--warm-white)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: enabled.has(competitor.id) ? competitor.color : 'var(--ink3)',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: enabled.has(competitor.id) ? competitor.color : 'var(--mid)' }} />
                {competitor.name}
              </button>
            ))}
            {addedMarketplaces.map(marketplace => (
              <button
                key={marketplace.id}
                onClick={() => removeMarketplace(marketplace.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  borderRadius: 20,
                  background: `${marketplace.color}12`,
                  border: `1.5px solid ${marketplace.color}35`,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: marketplace.color,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: marketplace.color, flexShrink: 0 }} />
                {marketplace.name}
                <X size={11} />
              </button>
            ))}
            <AddCompetitorMenu
              options={AVAILABLE_MARKETPLACES}
              addedIds={new Set(addedMarketplaceIds)}
              onAdd={addMarketplace}
            />
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {aiMode && hasAiScores && (
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 9,
                  padding: '2px 7px',
                  borderRadius: 3,
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 18px',
                  background: isRunningAi ? 'var(--paper)' : 'var(--accent)',
                  color: isRunningAi ? 'var(--mid)' : 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: isRunningAi ? 'not-allowed' : 'pointer',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {isRunningAi
                  ? <><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />Running AI…</>
                  : <><Brain size={12} />Run AI Match</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={SECTION_HEADER_STYLE}>Platform Match Grid</div>
          <div style={SECTION_SUBTITLE_STYLE}>Review the top AI-ranked competitor matches for each retailer side by side.</div>
        </div>
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `116px repeat(${TOP_N}, 1fr)`, borderBottom: '1px solid var(--border)', background: 'var(--warm-white)' }}>
            <div style={{ padding: '9px 14px', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Platform
            </div>
            {Array.from({ length: TOP_N }, (_, i) => (
              <div key={i} style={{ padding: '9px 8px', borderLeft: '1px solid var(--border)', textAlign: 'center' }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  {i === 0 ? 'Top Match' : `#${i + 1}`}
                </span>
              </div>
            ))}
          </div>

          {activeCompetitors.map((competitor, rowIdx) => {
            const matches = visiblePlatformMatches[competitor.id] ?? []
            const status = platformStatus[competitor.id] ?? 'idle'
            const isLast = rowIdx === activeCompetitors.length - 1
            return (
              <div key={competitor.id} style={{ display: 'grid', gridTemplateColumns: `116px repeat(${TOP_N}, 1fr)`, borderBottom: isLast ? 'none' : '1px solid var(--border)', minHeight: 244 }}>
                <div style={{ padding: '16px 14px', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5, justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: competitor.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: competitor.color }}>{competitor.name}</span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)' }}>
                    {matches.length} shown · {matches.filter(match => effectiveSelectedMatchIds.has(match.product.id)).length} selected
                  </div>
                  {status === 'running' && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: competitor.color, animation: `blink 1.2s ${i * 0.2}s ease-in-out infinite` }} />
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

                {Array.from({ length: TOP_N }, (_, colIdx) => (
                  <div key={colIdx} style={{ borderLeft: '1px solid var(--border)', background: 'white' }}>
                    {status === 'running'
                      ? <PendingCell />
                      : <MatchCell
                          match={matches[colIdx] ?? null}
                          rank={colIdx + 1}
                          preview={!hasAiScores}
                          checked={matches[colIdx] ? effectiveSelectedMatchIds.has(matches[colIdx].product.id) : false}
                          onToggle={toggleMatchSelection}
                        />}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <PricePositionPanel matches={selectedMatches} yourPrice={selectedProduct.yourPrice} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={SECTION_HEADER_STYLE}>Market Map</div>
            <div style={SECTION_SUBTITLE_STYLE}>Compare competitor price points against review volume to spot stronger value positions.</div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ top: 8, right: 20, bottom: 20, left: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" />
                <ReferenceArea y1={bubbleDomainMin} y2={bubbleBandMid} fill="rgba(26,107,60,0.11)" />
                <ReferenceArea y1={bubbleBandMid} y2={bubbleBandHigh} fill="rgba(200,125,10,0.11)" />
                <ReferenceArea y1={bubbleBandHigh} y2={bubbleDomainMax} fill="rgba(26,63,107,0.11)" />
                <XAxis
                  type="number"
                  dataKey="reviews"
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  tick={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink2)' }}
                  tickLine={false}
                  label={{ value: 'Reviews', position: 'insideBottom', offset: -6, fontSize: 15, fill: '#000000', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}
                />
                <YAxis
                  type="number"
                  dataKey="price"
                  domain={[bubbleDomainMin, bubbleDomainMax]}
                  tickFormatter={v => `$${Number(v).toFixed(2)}`}
                  tick={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink2)' }}
                  tickLine={false}
                  label={{ value: 'Price ($)', angle: -90, position: 'insideLeft', offset: 2, fontSize: 15, fill: '#000000', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}
                />
                <ReTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'var(--border2)' }} />
                <Legend wrapperStyle={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, paddingTop: 8 }} />
                <ReferenceLine y={bubbleBandMid} stroke="var(--border2)" strokeDasharray="3 4" />
                <ReferenceLine y={bubbleBandHigh} stroke="var(--border2)" strokeDasharray="3 4" />
                <ReferenceLine y={bubbleGoodLabelY} stroke="transparent" label={{ value: 'GOOD', position: 'insideTopRight', fill: 'var(--accent2)', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800 }} />
                <ReferenceLine y={bubbleBetterLabelY} stroke="transparent" label={{ value: 'BETTER', position: 'insideTopRight', fill: 'var(--amber)', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800 }} />
                <ReferenceLine y={bubbleBestLabelY} stroke="transparent" label={{ value: 'BEST', position: 'insideTopRight', fill: 'var(--blue)', fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800 }} />
                {ALL_COMPETITORS.map(competitor => {
                  const data = bubbleMatches.filter(item => item.platformId === competitor.id)
                  if (!data.length) return null
                  return (
                    <Scatter
                      key={competitor.id}
                      name={PLATFORM_NAMES[competitor.id as keyof typeof PLATFORM_NAMES] ?? competitor.id}
                      data={data}
                      fill={PLATFORM_COLORS[competitor.id as keyof typeof PLATFORM_COLORS] ?? competitor.color}
                      shape={(props: { cx?: number; cy?: number; payload?: BubblePoint }) => (
                        <PlatformDot {...props} fill={PLATFORM_COLORS[competitor.id as keyof typeof PLATFORM_COLORS] ?? competitor.color} />
                      )}
                    />
                  )
                })}
                <Scatter
                  name="Current SKU"
                  data={currentSkuBubble}
                  shape={(props: { cx?: number; cy?: number }) => <CurrentSkuDot {...props} price={selectedProduct.yourPrice} />}
                  fill="var(--accent)"
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={SECTION_HEADER_STYLE}>Price Distribution Curve</div>
            <div style={SECTION_SUBTITLE_STYLE}>Understand how tightly the market clusters around your SKU and where pricing density peaks.</div>
          </div>
          <div style={{ padding: '16px 20px' }}>
            {curveData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={curveData} margin={{ top: 26, right: 20, bottom: 20, left: 8 }}>
                  <defs>
                    <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--amber)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--amber)" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 5" />
                  <XAxis
                    type="number"
                    dataKey="price"
                    domain={curveDomain}
                    allowDataOverflow={false}
                    tickFormatter={v => `$${Number(v).toFixed(0)}`}
                    tick={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink2)' }}
                    tickLine={false}
                    label={{ value: 'Price ($)', position: 'insideBottom', offset: -8, fontSize: 15, fill: '#000000', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", fill: 'var(--ink2)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                    label={{ value: 'Relative Count', angle: -90, position: 'insideLeft', offset: 8, fontSize: 15, fill: '#000000', fontFamily: "'JetBrains Mono', monospace", fontWeight: 800 }}
                  />
                  <Tooltip content={<CurveTooltip />} />
                  <Area type="monotone" dataKey="density" fill="url(#curveGrad)" stroke="var(--amber)" strokeWidth={2} />
                  <ReferenceArea
                    x1={selectedProduct.yourPrice - 0.18}
                    x2={selectedProduct.yourPrice + 0.18}
                    fill="rgba(200,125,10,0.18)"
                  />
                  <ReferenceLine
                    x={selectedProduct.yourPrice}
                    stroke="#d92d20"
                    strokeWidth={4}
                    strokeDasharray="8 4"
                    ifOverflow="extendDomain"
                    label={{ value: `Current SKU ${fmt(selectedProduct.yourPrice)}`, position: 'insideTop', offset: 10, fill: '#d92d20', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 800 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
