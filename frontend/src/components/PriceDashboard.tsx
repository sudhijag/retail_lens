'use client'
import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { TrendingDown, TrendingUp, Minus, Star, Truck, ShoppingBag, Zap } from 'lucide-react'
import { PLATFORMS, buildChartData, getMarketSummary } from '../lib/data'
import type { Product } from '../lib/types'

const PriceChart = dynamic(() => import('./PriceChart'), { ssr: false })

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

export default function PriceDashboard({ product, liveMultipliers }: Props) {
  const chartData = useMemo(() => buildChartData(product), [product])

  // Apply live price multipliers
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
        icon: <TrendingDown size={13} />,
        color: '#c8410a',
        bg: '#fef0e8',
        text: `You are ${fmt(gap)} above market low (${summary.cheapest.platformId}). Consider a ${Math.round((gap / product.yourPrice) * 100)}% price reduction to stay competitive.`,
      })
    }
    if (summary.yourRank === 1) {
      recs.push({
        icon: <Zap size={13} />,
        color: '#1a6b3c',
        bg: '#e8f5ed',
        text: 'You are the most price-competitive across all tracked platforms. Strong position — monitor for margin opportunity.',
      })
    }
    const promoCount = PLATFORMS.filter(p => product.listings[p.id].promoLabel).length
    if (promoCount > 0) {
      recs.push({
        icon: <TrendingDown size={13} />,
        color: '#c87d0a',
        bg: '#fef6e3',
        text: `${promoCount} platform${promoCount > 1 ? 's' : ''} currently showing promotional pricing. Promo likely temporary — hold or set a time-bound counter-promo.`,
      })
    }
    return recs
  }, [product, livePrices, summary])

  const marketPosPercent = useMemo(() => {
    const allPrices = [...PLATFORMS.map(p => livePrices[p.id]), product.yourPrice].sort((a, b) => a - b)
    const min = allPrices[0], max = allPrices[allPrices.length - 1]
    return Math.round(((product.yourPrice - min) / (max - min)) * 100)
  }, [product, livePrices])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Platform price matrix */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Live Competitor Prices</span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--accent2-soft)', color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Live
          </span>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)' }}>
          {PLATFORMS.map((p, i) => {
            const listing = product.listings[p.id]
            const livePrice = livePrices[p.id]
            const diff = livePrice - product.yourPrice
            const diffPct = (diff / product.yourPrice) * 100
            const isCheapest = summary.cheapest.platformId === p.id
            const isMostExp = summary.mostExpensive.platformId === p.id
            return (
              <div key={p.id} style={{
                borderRight: i < 4 ? '1px solid var(--border)' : 'none',
                padding: '14px 14px',
                background: isCheapest ? 'rgba(26,107,60,0.04)' : 'white',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>{p.name}</span>
                  {isCheapest && (
                    <span style={{ marginLeft: 'auto', fontSize: 8, background: 'var(--accent2-soft)', color: 'var(--accent2)', padding: '1px 5px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.3px' }}>LOW</span>
                  )}
                  {isMostExp && (
                    <span style={{ marginLeft: 'auto', fontSize: 8, background: 'var(--accent-soft)', color: 'var(--accent)', padding: '1px 5px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.3px' }}>HIGH</span>
                  )}
                  {listing.promoLabel && !isCheapest && !isMostExp && (
                    <span style={{ marginLeft: 'auto', fontSize: 8, background: 'var(--amber-soft)', color: 'var(--amber)', padding: '1px 5px', borderRadius: 3, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '.3px' }}>SALE</span>
                  )}
                </div>

                {/* Price */}
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                    {fmt(livePrice)}
                  </span>
                  <span style={{
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, marginLeft: 4,
                    color: diff < 0 ? 'var(--accent2)' : diff > 0 ? 'var(--accent)' : 'var(--mid)',
                  }}>
                    {diff === 0 ? '—' : diff < 0
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}><TrendingDown size={9} />{pct(diffPct)}</span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}><TrendingUp size={9} />{pct(diffPct)}</span>
                    }
                  </span>
                </div>

                {/* Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Seller</span>
                    <span style={{ fontSize: 10, color: 'var(--ink2)', fontWeight: 500, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listing.seller}</span>
                  </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Match</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: listing.matchConfidence >= 90 ? 'var(--accent2)' : listing.matchConfidence >= 75 ? 'var(--amber)' : 'var(--accent)' }}>
                      {listing.matchConfidence}%
                    </span>
                  </div>
                  {/* Confidence bar */}
                  <div style={{ height: 3, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${listing.matchConfidence}%`, background: listing.matchConfidence >= 90 ? 'var(--accent2)' : listing.matchConfidence >= 75 ? 'var(--amber)' : 'var(--accent)', borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Chart + Market Position row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 18 }}>

        {/* Price history chart */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>30-Day Price History</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--blue-soft)', color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              Chart
            </span>
          </div>
          <div style={{ padding: '12px 18px 16px' }}>
            <PriceChart data={chartData} yourPrice={product.yourPrice} />
          </div>
        </div>

        {/* Market position panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Market Position</span>
            </div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Position rank */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: summary.gapFromCheapest > 5 ? 'var(--accent)' : 'var(--accent2)', lineHeight: 1 }}>
                  #{summary.yourRank}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 3, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  of {summary.totalPlayers} sellers
                </div>
              </div>

              {/* Gauge bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent2)' }}>CHEAPEST</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent)' }}>HIGHEST</span>
                </div>
                <div style={{ height: 8, background: 'var(--paper)', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
                  <div style={{ position: 'absolute', bottom: -2, left: `${marketPosPercent}%`, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                  <div style={{ height: '100%', width: `${marketPosPercent}%`, background: `linear-gradient(90deg, var(--accent2), var(--amber) 60%, var(--accent))`, borderRadius: 4 }} />
                </div>
              </div>

              {/* Stats */}
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
      </div>

      {/* Recommendations */}
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

      {/* Product attributes */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShoppingBag size={13} color="var(--blue)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>AI-Extracted Product Attributes</span>
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--blue-soft)', color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Vision
          </span>
        </div>
        <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {product.attributes.map(attr => (
            <div key={attr.label} style={{ padding: '8px 10px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{attr.label}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink2)' }}>{attr.value}</div>
            </div>
          ))}
          <div style={{ padding: '8px 10px', background: 'var(--accent2-soft)', border: '1px solid #b8dfc8', borderRadius: 6 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent2)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>AI Desc</div>
            <div style={{ fontSize: 11, color: 'var(--ink2)', lineHeight: 1.4, gridColumn: 'span 3' }}>{product.aiDescription.slice(0, 80)}…</div>
          </div>
        </div>
      </div>
    </div>
  )
}
