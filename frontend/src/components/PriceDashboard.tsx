'use client'
import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { TrendingDown, TrendingUp, Star, Truck, Zap, Repeat2, Clock, BarChart2, ArrowUpRight } from 'lucide-react'
import { PLATFORMS, buildChartData, getMarketSummary } from '../lib/data'
import { getSmartTime } from '../lib/timeUtils'
import { getCategoryIntel } from '../lib/categoryIntelligence'
import type { Product } from '../lib/types'

const PriceChart    = dynamic(() => import('./PriceChart'),    { ssr: false })
const PriceSimulator = dynamic(() => import('./PriceSimulator'), { ssr: false })

interface Props {
  product: Product
  liveMultipliers: Record<string, number>
}

const fmt = (n: number) => `$${n.toFixed(2)}`
const pct = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(1)}%`

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Star size={10} fill="#c87d0a" color="#c87d0a" />
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#6b6256' }}>
        {rating.toFixed(1)}
      </span>
    </span>
  )
}

// Per-platform timestamp that updates every minute
function LiveTimestamp({ ms }: { ms: number }) {
  const [label, setLabel] = useState(getSmartTime(ms))
  useEffect(() => {
    const t = setInterval(() => setLabel(getSmartTime(ms)), 30000)
    return () => clearInterval(t)
  }, [ms])
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>
      <Clock size={8} />
      {label}
    </span>
  )
}

export default function PriceDashboard({ product, liveMultipliers }: Props) {
  const chartData = useMemo(() => buildChartData(product), [product])

  const livePrices = useMemo(() => {
    const out: Record<string, number> = {}
    PLATFORMS.forEach(p => {
      out[p.id] = Math.round(product.listings[p.id].currentPrice * (liveMultipliers[p.id] ?? 1) * 100) / 100
    })
    return out
  }, [product, liveMultipliers])

  const summary = useMemo(() => getMarketSummary(product, product.yourPrice), [product])

  const recommendations = useMemo(() => {
    const recs = []
    const gap = product.yourPrice - livePrices[summary.cheapest.platformId]
    if (gap > 5) {
      recs.push({
        icon: <TrendingDown size={13} />, color: '#c8410a', bg: '#fef0e8',
        text: `You are ${fmt(gap)} above market low (${summary.cheapest.platformId}). Consider a ${Math.round((gap / product.yourPrice) * 100)}% price reduction to stay competitive.`,
      })
    }
    if (summary.yourRank === 1) {
      recs.push({
        icon: <Zap size={13} />, color: '#1a6b3c', bg: '#e8f5ed',
        text: 'You are the most price-competitive across all tracked platforms. Strong position — monitor for margin opportunity.',
      })
    }
    const promoCount = PLATFORMS.filter(p => product.listings[p.id].promoLabel).length
    if (promoCount > 0) {
      recs.push({
        icon: <TrendingDown size={13} />, color: '#c87d0a', bg: '#fef6e3',
        text: `${promoCount} platform${promoCount > 1 ? 's' : ''} currently showing promotional pricing. Likely temporary — hold or set a time-bound counter-promo.`,
      })
    }
    return recs
  }, [product, livePrices, summary])

  const marketPosPercent = useMemo(() => {
    const allPrices = [...PLATFORMS.map(p => livePrices[p.id]), product.yourPrice].sort((a, b) => a - b)
    const min = allPrices[0], max = allPrices[allPrices.length - 1]
    if (max === min) return 50
    return Math.round(((product.yourPrice - min) / (max - min)) * 100)
  }, [product, livePrices])

  // Total price changes across all platforms today
  const totalChanges24h = PLATFORMS.reduce((s, p) => s + product.listings[p.id].changeCount24h, 0)
  const mostVolatile = PLATFORMS.reduce((a, b) =>
    product.listings[b.id].changeCount24h > product.listings[a.id].changeCount24h ? b : a
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Platform price matrix ── */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Live Competitor Prices</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {totalChanges24h > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--amber)', background: 'var(--amber-soft)', padding: '2px 7px', borderRadius: 3 }}>
                <Repeat2 size={9} /> {totalChanges24h}× price changes today
              </span>
            )}
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--accent2-soft)', color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Live
            </span>
          </div>
        </div>

        {/* Your price banner */}
        <div style={{ padding: '10px 18px', background: '#fef0e8', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>Your Price</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#6b6256' }}>Your Catalog</span>
          </div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{fmt(product.yourPrice)}</span>
        </div>

        {/* Platform columns */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${PLATFORMS.length},1fr)` }}>
          {PLATFORMS.map((p, i) => {
            const listing = product.listings[p.id]
            const livePrice = livePrices[p.id]
            const diff = livePrice - product.yourPrice
            const diffPct = (diff / product.yourPrice) * 100
            const isCheapest = summary.cheapest.platformId === p.id
            const isMostExp = summary.mostExpensive.platformId === p.id
            const isVolatile = mostVolatile.id === p.id && listing.changeCount24h > 0
            return (
              <div key={p.id} style={{
                borderRight: i < PLATFORMS.length - 1 ? '1px solid var(--border)' : 'none',
                padding: '14px 14px',
                background: isCheapest ? 'rgba(26,107,60,0.03)' : 'white',
              }}>
                {/* Header with platform image area */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>{p.name}</span>
                    {isCheapest && (
                      <span style={{ marginLeft: 'auto', fontSize: 8, background: 'var(--accent2-soft)', color: 'var(--accent2)', padding: '1px 5px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace" }}>LOW</span>
                    )}
                    {isMostExp && (
                      <span style={{ marginLeft: 'auto', fontSize: 8, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace" }}>HIGH</span>
                    )}
                    {listing.promoLabel && !isCheapest && !isMostExp && (
                      <span style={{ marginLeft: 'auto', fontSize: 8, background: 'var(--amber-soft)', color: 'var(--amber)', padding: '1px 5px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace" }}>SALE</span>
                    )}
                  </div>

                  {/* Product thumbnail — platform-specific if available */}
                  <div style={{
                    width: '100%', height: 72, borderRadius: 6, overflow: 'hidden',
                    background: 'var(--warm-white)', border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                  }}>
                    <Image
                      src={product.platformImages?.[p.id] ?? product.imageUrl}
                      alt={`${product.name} on ${p.name}`}
                      fill
                      sizes="120px"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                    {/* Platform color overlay strip at bottom */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: 16, background: p.color, opacity: 0.85,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: 'white', letterSpacing: '.5px' }}>{p.shortName}</span>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                    {fmt(livePrice)}
                  </span>
                  {listing.promoLabel && (
                    <span style={{ marginLeft: 5, textDecoration: 'line-through', fontSize: 10, color: 'var(--mid)' }}>
                      {fmt(listing.originalPrice)}
                    </span>
                  )}
                  <div style={{ marginTop: 2 }}>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                      color: diff < 0 ? 'var(--accent2)' : diff > 0 ? 'var(--accent)' : 'var(--mid)',
                      display: 'inline-flex', alignItems: 'center', gap: 2,
                    }}>
                      {diff === 0 ? '—' : diff < 0
                        ? <><TrendingDown size={9} />{pct(diffPct)} vs yours</>
                        : <><TrendingUp size={9} />{pct(diffPct)} vs yours</>
                      }
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    { label: 'Seller', val: listing.seller, truncate: true },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{r.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--ink2)', fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.val}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Rating</span>
                    <StarRating rating={listing.rating} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Reviews</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink2)' }}>{listing.reviewCount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Ship</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Truck size={9} color="var(--ink3)" />
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: listing.shippingDays <= 2 ? 'var(--accent2)' : listing.shippingDays <= 5 ? 'var(--amber)' : 'var(--ink3)' }}>
                        {listing.shippingDays}d
                      </span>
                    </span>
                  </div>
                  {/* Change count */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Changes</span>
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
                      color: listing.changeCount24h >= 3 ? 'var(--accent)' : listing.changeCount24h >= 1 ? 'var(--amber)' : 'var(--mid)',
                    }}>
                      {listing.changeCount24h}× today
                    </span>
                  </div>
                  {/* Match confidence */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Match</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: listing.matchConfidence >= 90 ? 'var(--accent2)' : listing.matchConfidence >= 75 ? 'var(--amber)' : 'var(--accent)' }}>
                      {listing.matchConfidence}%
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${listing.matchConfidence}%`, background: listing.matchConfidence >= 90 ? 'var(--accent2)' : listing.matchConfidence >= 75 ? 'var(--amber)' : 'var(--accent)', borderRadius: 2 }} />
                  </div>
                  {/* Last updated */}
                  <LiveTimestamp ms={listing.lastUpdatedMs} />
                </div>

                {/* Volatile badge */}
                {isVolatile && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: 'var(--amber-soft)', borderRadius: 4 }}>
                    <Repeat2 size={9} color="var(--amber)" />
                    <span style={{ fontSize: 8, color: 'var(--amber)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>MOST VOLATILE</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart + Market Position */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18 }}>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>30-Day Price History</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--blue-soft)', color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Chart</span>
          </div>
          <div style={{ padding: '12px 18px 16px' }}>
            <PriceChart data={chartData} yourPrice={product.yourPrice} />
          </div>
        </div>

        {/* Market position */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Market Position</span>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: summary.gapFromCheapest > 5 ? 'var(--accent)' : 'var(--accent2)', lineHeight: 1 }}>
                #{summary.yourRank}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 3, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.5px' }}>
                of {summary.totalPlayers} sellers
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent2)' }}>CHEAPEST</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent)' }}>HIGHEST</span>
              </div>
              <div style={{ height: 8, background: 'var(--paper)', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
                <div style={{ position: 'absolute', bottom: -2, left: `${marketPosPercent}%`, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', zIndex: 2 }} />
                <div style={{ height: '100%', width: `${marketPosPercent}%`, background: 'linear-gradient(90deg, var(--accent2), var(--amber) 60%, var(--accent))', borderRadius: 4 }} />
              </div>
            </div>
            {[
              { label: 'Your Price', val: fmt(product.yourPrice), color: 'var(--ink)' },
              { label: 'Market Low', val: fmt(livePrices[summary.cheapest.platformId]), color: 'var(--accent2)', sub: summary.cheapest.platformId },
              { label: 'Market High', val: fmt(livePrices[summary.mostExpensive.platformId]), color: 'var(--accent)', sub: summary.mostExpensive.platformId },
              { label: 'Market Avg', val: fmt(summary.average), color: 'var(--amber)' },
              { label: 'Gap vs Low', val: summary.gapFromCheapest > 0 ? `+${fmt(summary.gapFromCheapest)}` : fmt(summary.gapFromCheapest), color: summary.gapFromCheapest > 5 ? 'var(--accent)' : summary.gapFromCheapest <= 0 ? 'var(--accent2)' : 'var(--amber)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{row.label}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: row.color }}>
                  {row.val}{row.sub ? <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.7 }}>{row.sub}</span> : null}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={13} color="var(--amber)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>AI Pricing Recommendations</span>
          </div>
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recommendations.map((rec, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', background: rec.bg, borderRadius: 7 }}>
                <div style={{ color: rec.color, marginTop: 1, flexShrink: 0 }}>{rec.icon}</div>
                <span style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5 }}>{rec.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Price Simulator */}
      <PriceSimulator product={product} liveMultipliers={liveMultipliers} />

      {/* Category Intelligence */}
      <CategoryIntelligencePanel productId={product.id} />
    </div>
  )
}

// ── SVG bubble scatter chart ──────────────────────────────────────────────────

function abbrevName(name: string): string {
  const words = name.split(/[\s\-\/]+/).filter(w => /^[a-zA-Z]/.test(w) && w.length > 2)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function BubbleChart({ leaders }: { leaders: import('../lib/categoryIntelligence').IndustryLeader[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const W = 460, H = 234
  const PL = 44, PB = 34, PT = 14, PR = 14
  const cW = W - PL - PR, cH = H - PB - PT

  const PC: Record<string, string> = { AMZ: '#e47911', TGT: '#cc0000', WMT: '#0071dc' }
  const PN: Record<string, string> = { AMZ: 'Amazon', TGT: 'Target', WMT: 'Walmart' }

  // rank → approximate market share %: 1→17.5, 2→11.5, 3→5.5, 4→2.5, 5→1.0
  const SHARE = [17.5, 11.5, 5.5, 2.5, 1.0]
  const toX = (rank: number) => PL + ((SHARE[rank - 1] ?? 0.5) / 21) * cW
  // velocity range -20…+80 mapped to Y (higher velocity = higher position)
  const toY = (v: number) => PT + cH * (1 - Math.max(0.03, Math.min(0.97, (v + 20) / 100)))

  const xTicks = [0, 5, 10, 15, 20]
  const yTicks = [-20, 0, 20, 40, 60, 80]

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {/* Dashed grid — horizontal */}
      {yTicks.map(v => (
        <line key={v} x1={PL} x2={W - PR} y1={toY(v)} y2={toY(v)}
          stroke="var(--border)" strokeWidth={0.6} strokeDasharray="3,5" />
      ))}
      {/* Dashed grid — vertical */}
      {xTicks.map(x => {
        const sx = PL + (x / 21) * cW
        return <line key={x} x1={sx} x2={sx} y1={PT} y2={H - PB}
          stroke="var(--border)" strokeWidth={0.6} strokeDasharray="3,5" />
      })}

      {/* Axes */}
      <line x1={PL} x2={PL} y1={PT} y2={H - PB} stroke="var(--border2)" strokeWidth={1} />
      <line x1={PL} x2={W - PR} y1={H - PB} y2={H - PB} stroke="var(--border2)" strokeWidth={1} />

      {/* X-axis labels */}
      {xTicks.map(x => (
        <text key={x} x={PL + (x / 21) * cW} y={H - PB + 12}
          fontSize={7.5} fill="var(--ink3)" textAnchor="middle"
          fontFamily="IBM Plex Mono, monospace">{x}%</text>
      ))}
      <text x={PL + cW / 2} y={H - 1} fontSize={7.5} fill="var(--ink3)"
        textAnchor="middle" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.5">
        MARKET SHARE
      </text>

      {/* Y-axis labels */}
      {yTicks.map(v => (
        <text key={v} x={PL - 5} y={toY(v) + 3}
          fontSize={7.5} fill="var(--ink3)" textAnchor="end"
          fontFamily="IBM Plex Mono, monospace">
          {v > 0 ? `+${v}` : v}
        </text>
      ))}
      <text x={9} y={PT + cH / 2} fontSize={7.5} fill="var(--ink3)"
        textAnchor="middle"
        transform={`rotate(-90,9,${PT + cH / 2})`}
        fontFamily="IBM Plex Mono, monospace" letterSpacing="0.5">
        VELOCITY
      </text>

      {/* Bubbles */}
      {leaders.map((leader, i) => {
        const cx = toX(leader.rank)
        const cy = toY(leader.velocityPct)
        const R = 21
        const color = PC[leader.platform]
        const isYou = leader.isYourProduct ?? false
        const isHov = hovered === i

        const tipW = 146, tipH = 78
        const rawTipX = cx + R + 8
        const tipX = Math.max(PL, Math.min(W - PR - tipW, rawTipX + tipW > W - PR ? cx - R - 8 - tipW : rawTipX))
        const tipY = Math.max(PT, Math.min(H - PB - tipH, cy - tipH / 2))

        return (
          <g key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Gold dashed ring — YOUR product */}
            {isYou && (
              <circle cx={cx} cy={cy} r={R + 7}
                fill="none" stroke="var(--amber)"
                strokeWidth={2.5} strokeDasharray="5,3" opacity={0.9} />
            )}
            {/* Platform outer ring */}
            <circle cx={cx} cy={cy} r={R + 2.5}
              fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
            {/* Main bubble */}
            <circle cx={cx} cy={cy} r={R}
              fill={isYou ? '#fffaed' : `${color}1c`}
              stroke={color} strokeWidth={isYou ? 2.5 : 1.8}
            />
            {/* Abbreviation label */}
            <text x={cx} y={cy + 4} fontSize={9} fontWeight="700"
              fill={isYou ? 'var(--amber)' : color}
              textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
              {abbrevName(leader.name)}
            </text>

            {/* Tooltip (stays within viewBox) */}
            {isHov && (
              <g>
                <rect x={tipX} y={tipY} width={tipW} height={tipH}
                  rx={6} fill="#1a1714" opacity={0.94} />
                <rect x={tipX} y={tipY} width={tipW} height={tipH}
                  rx={6} fill="none" stroke="#3d3830" strokeWidth={0.5} />
                <text x={tipX + 10} y={tipY + 16} fontSize={10} fill="white"
                  fontWeight="700" fontFamily="IBM Plex Sans, sans-serif">
                  {abbrevName(leader.name)}
                </text>
                <text x={tipX + 10} y={tipY + 29} fontSize={8} fill="#c0b5a8"
                  fontFamily="IBM Plex Sans, sans-serif">
                  {leader.name.length > 23 ? leader.name.slice(0, 23) + '…' : leader.name}
                </text>
                <text x={tipX + 10} y={tipY + 42} fontSize={7.5} fill="#8a7f75"
                  fontFamily="IBM Plex Mono, monospace">
                  {PN[leader.platform]} · {leader.priceRange}
                </text>
                <text x={tipX + 10} y={tipY + 55} fontSize={8}
                  fill={leader.velocityPct > 0 ? '#6ce09a' : '#f87070'}
                  fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                  {leader.velocityPct > 0 ? '+' : ''}{leader.velocityPct}% · {leader.weeks}w
                </text>
                <text x={tipX + 10} y={tipY + 67} fontSize={7.5} fill="#6b6256"
                  fontFamily="IBM Plex Mono, monospace">
                  {leader.momentum.toUpperCase()}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Category Intelligence Panel ───────────────────────────────────────────────

function CategoryIntelligencePanel({ productId }: { productId: string }) {
  const [activeTab, setActiveTab] = useState<'ind' | 'cat' | 'subcat'>('cat')
  const intel = getCategoryIntel(productId)
  if (!intel) return null

  const PC: Record<string, string> = { AMZ: '#e47911', TGT: '#cc0000', WMT: '#0071dc' }
  const PN: Record<string, string> = { AMZ: 'Amazon',  TGT: 'Target',  WMT: 'Walmart' }

  const MOM: Record<string, { color: string; bg: string }> = {
    surging:    { color: 'var(--accent2)', bg: 'var(--accent2-soft)' },
    growing:    { color: '#2a8a50',        bg: '#d4f0e0'             },
    emerging:   { color: 'var(--blue)',    bg: 'var(--blue-soft)'    },
    steady:     { color: 'var(--amber)',   bg: '#fef6e3'             },
    plateauing: { color: 'var(--mid)',     bg: 'var(--paper)'        },
    declining:  { color: 'var(--accent)',  bg: 'var(--accent-soft)'  },
  }

  const DCFG = {
    opportunity: { color: 'var(--accent2)', bg: 'var(--accent2-soft)', label: '↗ OPPORTUNITY' },
    warning:     { color: 'var(--accent)',  bg: 'var(--accent-soft)',  label: '⚠ WARNING'     },
    action:      { color: 'var(--blue)',    bg: 'var(--blue-soft)',    label: '→ ACTION NOW'  },
    defend:      { color: 'var(--amber)',   bg: '#fef6e3',             label: '⊕ DEFEND'      },
  }

  const hColor = intel.health.direction === 'growing' ? 'var(--accent2)'
    : intel.health.direction === 'declining' ? 'var(--accent)' : 'var(--amber)'

  // Upcomers = non-your-product leaders with emerging/growing momentum
  const upcomers = intel.leaders.filter(l => !l.isYourProduct && (l.momentum === 'emerging' || l.momentum === 'growing' || l.momentum === 'surging')).slice(0, 3)

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>

      {/* Header + tabs */}
      <div style={{ padding: '11px 18px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 11, flex: 1 }}>
          <BarChart2 size={13} color="var(--blue)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Price · Cat.</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', marginLeft: 4 }}>{intel.label}</span>
          <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: hColor === 'var(--accent2)' ? 'var(--accent2-soft)' : hColor === 'var(--accent)' ? 'var(--accent-soft)' : '#fef6e3', borderRadius: 4 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700, color: hColor }}>
              {intel.health.direction === 'growing' ? '↑' : intel.health.direction === 'declining' ? '↓' : '→'} {intel.health.quarterlyChange}
            </span>
          </div>
        </div>
        {/* Tabs: Ind. / Cat. / Sub cat. */}
        <div style={{ display: 'flex', height: '100%' }}>
          {([['ind', 'Ind.'], ['cat', 'Cat.'], ['subcat', 'Sub cat.']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: '0 16px 11px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 500,
                fontFamily: "'IBM Plex Sans', sans-serif", background: 'transparent',
                color: activeTab === id ? 'var(--blue)' : 'var(--ink3)',
                borderBottom: activeTab === id ? '2px solid var(--blue)' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN BODY: 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', borderBottom: '1px solid var(--border)' }}>

        {/* LEFT: Bubble scatter chart + compact legend */}
        <div style={{ padding: '16px 18px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 10 }}>
            Market Position · {intel.label.split('·')[0].trim()}
          </div>

          {/* Bubble Chart */}
          <div style={{ marginBottom: 12 }}>
            <BubbleChart leaders={intel.leaders} />
          </div>

          {/* Legend: all 5 leaders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {intel.leaders.map((leader, li) => {
              const color = PC[leader.platform]
              const mc = MOM[leader.momentum]
              return (
                <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  {/* Bubble abbrev chip */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: leader.isYourProduct ? '#fffaed' : `${color}1c`,
                    border: `1.5px solid ${leader.isYourProduct ? 'var(--amber)' : color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, fontWeight: 700, color: leader.isYourProduct ? 'var(--amber)' : color }}>
                      {abbrevName(leader.name)}
                    </span>
                  </div>
                  <span style={{ fontSize: 10.5, color: 'var(--ink2)', flex: 1, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {leader.name.length > 28 ? leader.name.slice(0, 28) + '…' : leader.name}
                    {leader.isYourProduct && (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, marginLeft: 6, padding: '1px 4px', borderRadius: 2, background: 'var(--amber)', color: 'white', fontWeight: 700 }}>YOU</span>
                    )}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, color: leader.velocityPct >= 0 ? mc.color : 'var(--accent)', flexShrink: 0 }}>
                    {leader.velocityPct > 0 ? '+' : ''}{leader.velocityPct}%
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, padding: '1px 5px', borderRadius: 3, background: mc.bg, color: mc.color, fontWeight: 600, flexShrink: 0 }}>
                    {leader.momentum.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Sub-category Upcomers */}
        <div style={{ padding: '16px 16px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 12 }}>
            Sub cat. Upcomers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomers.map((u, i) => {
              const mc = MOM[u.momentum]
              const peakVal = Math.max(...u.trendHistory)
              return (
                <div key={i} style={{ padding: '10px 12px', background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 3 }}>{u.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: PC[u.platform] }} />
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)' }}>{PN[u.platform]}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)' }}>{u.priceRange}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: mc.color }}>
                        +{u.velocityPct}%
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)' }}>{u.weeks} weeks</div>
                    </div>
                  </div>
                  {/* Mini trend bar */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 18 }}>
                    {u.trendHistory.map((v, wi) => (
                      <div key={wi} style={{ flex: 1, height: `${Math.max(15, (v / peakVal) * 100)}%`, background: mc.color, borderRadius: '1px 1px 0 0', opacity: 0.3 + (wi / 7) * 0.7 }} />
                    ))}
                  </div>
                </div>
              )
            })}
            {upcomers.length === 0 && (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 11, color: 'var(--mid)' }}>
                No emerging subcategory SKUs detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM: Trends + Actions (left) + Health widget (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px' }}>

        {/* Trends + Actions */}
        <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 10 }}>
            Trends · Action
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {intel.decisions.map((d, i) => {
              const dc = DCFG[d.type]
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: dc.bg, color: dc.color, flexShrink: 0, marginTop: 1 }}>
                    {dc.label}
                  </span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{d.headline}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', lineHeight: 1.5 }}>{d.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Health widget */}
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)' }}>Category Health</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: hColor, lineHeight: 1 }}>
              {intel.health.direction === 'growing' ? '↑' : intel.health.direction === 'declining' ? '↓' : '→'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: hColor, textTransform: 'capitalize', marginTop: 2 }}>{intel.health.direction}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: hColor, fontWeight: 700 }}>{intel.health.quarterlyChange}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 9, color: 'var(--ink3)' }}>Avg ASP</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, color: 'var(--ink2)' }}>{intel.health.avgAsp}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, color: 'var(--ink3)' }}>Platform lead</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: PC[intel.health.topPlatform] }} />
                <span style={{ fontSize: 9, color: 'var(--ink2)' }}>{PN[intel.health.topPlatform]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
