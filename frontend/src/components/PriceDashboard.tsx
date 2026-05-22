'use client'
import { useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { TrendingDown, TrendingUp, Star, Truck, Zap, Repeat2, Clock, ArrowUpRight } from 'lucide-react'
import { PLATFORMS, getMarketSummary } from '../lib/data'
import { getSmartTime } from '../lib/timeUtils'
import type { Product } from '../lib/types'

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
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', display: 'none' }}>
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

      {/* Market Position — horizontal strip */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Market Position</span>
        </div>
        <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 24, alignItems: 'center' }}>
          {/* Rank */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 700, color: summary.gapFromCheapest > 5 ? 'var(--accent)' : 'var(--accent2)', lineHeight: 1 }}>
              #{summary.yourRank}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 3, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.5px' }}>
              of {summary.totalPlayers}
            </div>
          </div>
          {/* Price bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--accent2)' }}>CHEAPEST</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--accent)' }}>HIGHEST</span>
            </div>
            <div style={{ height: 8, background: 'var(--paper)', borderRadius: 4, position: 'relative', overflow: 'visible' }}>
              <div style={{ position: 'absolute', bottom: -2, left: `${marketPosPercent}%`, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)', zIndex: 2 }} />
              <div style={{ height: '100%', width: `${marketPosPercent}%`, background: 'linear-gradient(90deg, var(--accent2), var(--amber) 60%, var(--accent))', borderRadius: 4 }} />
            </div>
          </div>
          {/* Key metrics */}
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Your Price', val: fmt(product.yourPrice), color: 'var(--ink)' },
              { label: 'Market Low',  val: fmt(livePrices[summary.cheapest.platformId]),      color: 'var(--accent2)', sub: summary.cheapest.platformId },
              { label: 'Market Avg',  val: fmt(summary.average),                              color: 'var(--amber)'  },
              { label: 'Gap vs Low',  val: summary.gapFromCheapest > 0 ? `+${fmt(summary.gapFromCheapest)}` : fmt(summary.gapFromCheapest), color: summary.gapFromCheapest > 5 ? 'var(--accent)' : summary.gapFromCheapest <= 0 ? 'var(--accent2)' : 'var(--amber)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, color: row.color }}>
                  {row.val}{row.sub ? <span style={{ fontSize: 9, marginLeft: 3, opacity: 0.7 }}>{row.sub}</span> : null}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{row.label}</span>
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
    </div>
  )
}
