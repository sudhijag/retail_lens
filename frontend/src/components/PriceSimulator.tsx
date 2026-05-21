'use client'
import { useState, useMemo } from 'react'
import { Sliders, TrendingDown, TrendingUp, Target, DollarSign } from 'lucide-react'
import { PLATFORMS } from '../lib/data'
import type { Product } from '../lib/types'

interface Props {
  product: Product
  liveMultipliers: Record<string, number>
}

function calcWinProbability(yourPrice: number, competitorPrices: number[]): number {
  const min = Math.min(...competitorPrices)
  const max = Math.max(...competitorPrices)
  if (max === min) return 50
  const position = Math.max(0, Math.min(1, (yourPrice - min) / (max - min)))
  // Sigmoid: cheapest → ~80%, average → ~42%, most expensive → ~10%
  return Math.max(5, Math.min(95, Math.round(80 * Math.exp(-2.2 * position))))
}

function calcRevenueImpact(currentPrice: number, newPrice: number, winProb: number): { daily: number; weekly: number } {
  const BASE_DAILY_UNITS = 48 // baseline units/day at market avg
  const priceRatio = newPrice / currentPrice
  // Demand decreases as price increases (elasticity ~1.5)
  const demandAdjust = Math.pow(1 / priceRatio, 1.5)
  const probAdjust = winProb / 50 // relative to 50% baseline
  const adjustedUnits = Math.round(BASE_DAILY_UNITS * demandAdjust * probAdjust)
  return {
    daily:  Math.round(adjustedUnits * newPrice),
    weekly: Math.round(adjustedUnits * newPrice * 7),
  }
}

export default function PriceSimulator({ product, liveMultipliers }: Props) {
  const competitorPrices = useMemo(() =>
    PLATFORMS.map(p => Math.round(product.listings[p.id].currentPrice * (liveMultipliers[p.id] ?? 1) * 100) / 100),
    [product, liveMultipliers]
  )

  const marketMin = Math.min(...competitorPrices)
  const marketMax = Math.max(...competitorPrices)
  const sliderMin = Math.max(0.5, marketMin * 0.85)
  const sliderMax = marketMax * 1.20

  const [simPrice, setSimPrice] = useState(product.yourPrice)
  const [applied, setApplied] = useState(false)

  const winProb = calcWinProbability(simPrice, competitorPrices)
  const currentWinProb = calcWinProbability(product.yourPrice, competitorPrices)
  const revenue = calcRevenueImpact(product.yourPrice, simPrice, winProb)
  const currentRevenue = calcRevenueImpact(product.yourPrice, product.yourPrice, currentWinProb)

  const priceDiff = simPrice - product.yourPrice
  const revenueDiff = revenue.daily - currentRevenue.daily

  // Rank sim price among all prices
  const allPrices = [...competitorPrices, simPrice].sort((a, b) => a - b)
  const simRank = allPrices.indexOf(simPrice) + 1

  const cheapestPlatform = PLATFORMS[competitorPrices.indexOf(marketMin)]
  const sliderPct = ((simPrice - sliderMin) / (sliderMax - sliderMin)) * 100

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Sliders size={13} color="var(--blue)" />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Price Simulator</span>
        <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--blue-soft)', color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Interactive
        </span>
      </div>
      <div style={{ padding: '18px 20px' }}>

        {/* Slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: priceDiff < 0 ? 'var(--accent2)' : priceDiff > 0 ? 'var(--accent)' : 'var(--ink)', lineHeight: 1 }}>
                ${simPrice.toFixed(2)}
              </span>
              {priceDiff !== 0 && (
                <span style={{ marginLeft: 8, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: priceDiff < 0 ? 'var(--accent2)' : 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  {priceDiff < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                  {priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(2)} vs current
                </span>
              )}
            </div>
            <button
              onClick={() => setSimPrice(product.yourPrice)}
              style={{ fontSize: 10, color: 'var(--mid)', background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}
            >
              Reset
            </button>
          </div>

          {/* Platform markers above slider */}
          <div style={{ position: 'relative', height: 24, marginBottom: 4 }}>
            {competitorPrices.map((price, i) => {
              const leftPct = ((price - sliderMin) / (sliderMax - sliderMin)) * 100
              return (
                <div key={PLATFORMS[i].id} style={{
                  position: 'absolute', left: `${leftPct}%`, transform: 'translateX(-50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: PLATFORMS[i].color, border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: PLATFORMS[i].color, whiteSpace: 'nowrap', marginTop: 2 }}>
                    {PLATFORMS[i].shortName}
                  </span>
                </div>
              )
            })}
            {/* Your current price marker */}
            <div style={{
              position: 'absolute',
              left: `${((product.yourPrice - sliderMin) / (sliderMax - sliderMin)) * 100}%`,
              transform: 'translateX(-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--accent)', whiteSpace: 'nowrap', marginTop: 2 }}>YOU</span>
            </div>
          </div>

          {/* Gradient track + thumb */}
          <div style={{ position: 'relative' }}>
            <div style={{ height: 8, borderRadius: 4, background: 'linear-gradient(90deg, var(--accent2) 0%, var(--amber) 50%, var(--accent) 100%)', position: 'relative' }}>
              {/* Thumb indicator */}
              <div style={{
                position: 'absolute',
                left: `${sliderPct}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 18, height: 18, borderRadius: '50%',
                background: 'white', border: '2px solid var(--ink)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                pointerEvents: 'none',
                zIndex: 2,
              }} />
            </div>
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={0.01}
              value={simPrice}
              onChange={e => { setSimPrice(parseFloat(e.target.value)); setApplied(false) }}
              style={{
                position: 'absolute', inset: 0, width: '100%', opacity: 0,
                cursor: 'pointer', height: '100%', margin: 0,
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent2)' }}>${sliderMin.toFixed(2)} (Low)</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--accent)' }}>${sliderMax.toFixed(2)} (High)</span>
          </div>
        </div>

        {/* Metrics grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            {
              icon: <Target size={14} color="var(--blue)" />,
              label: 'Win Probability',
              value: `${winProb}%`,
              delta: winProb - currentWinProb,
              unit: '%',
              color: winProb >= 60 ? 'var(--accent2)' : winProb >= 35 ? 'var(--amber)' : 'var(--accent)',
            },
            {
              icon: <DollarSign size={14} color="var(--accent2)" />,
              label: 'Est. Daily Revenue',
              value: `$${revenue.daily.toLocaleString()}`,
              delta: revenueDiff,
              unit: '$',
              color: revenueDiff >= 0 ? 'var(--accent2)' : 'var(--accent)',
            },
            {
              icon: <DollarSign size={14} color="var(--amber)" />,
              label: 'Est. Weekly Revenue',
              value: `$${revenue.weekly.toLocaleString()}`,
              delta: revenue.weekly - currentRevenue.weekly,
              unit: '$',
              color: revenue.weekly >= currentRevenue.weekly ? 'var(--accent2)' : 'var(--accent)',
            },
            {
              icon: <TrendingDown size={14} color="var(--ink3)" />,
              label: 'Market Rank',
              value: `#${simRank}`,
              delta: null,
              unit: '',
              color: simRank <= 2 ? 'var(--accent2)' : simRank <= 4 ? 'var(--amber)' : 'var(--accent)',
            },
          ].map(metric => (
            <div key={metric.label} style={{ padding: '10px 12px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>{metric.icon}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: metric.color, lineHeight: 1, marginBottom: 2 }}>
                {metric.value}
              </div>
              {metric.delta !== null && metric.delta !== 0 && (
                <div style={{ fontSize: 9, color: (metric.delta ?? 0) >= 0 ? 'var(--accent2)' : 'var(--accent)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: 2 }}>
                  {(metric.delta ?? 0) > 0 ? '+' : ''}{metric.unit === '$' ? `$${Math.abs(metric.delta ?? 0).toLocaleString()}` : `${metric.delta}%`} vs current
                </div>
              )}
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.4px' }}>
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        {/* Insight text + Apply button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, padding: '8px 12px', background: simPrice < marketMin ? 'var(--accent2-soft)' : simPrice <= marketMin * 1.05 ? 'var(--accent2-soft)' : simPrice < product.yourPrice ? 'var(--amber-soft)' : 'var(--accent-soft)', borderRadius: 7, fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>
            {simPrice < marketMin
              ? `🎯 At $${simPrice.toFixed(2)} you'd be the cheapest across all platforms, capturing the highest win probability.`
              : simPrice <= marketMin * 1.05 ? `✅ Competitive with market low (${cheapestPlatform.name} at $${marketMin.toFixed(2)}).`
              : simPrice < product.yourPrice
              ? `⬇️ ${Math.round((1 - simPrice / product.yourPrice) * 100)}% reduction from current price. Win probability improves to ${winProb}%.`
              : simPrice > product.yourPrice
              ? `⬆️ ${Math.round((simPrice / product.yourPrice - 1) * 100)}% increase. Win probability drops to ${winProb}%. Justify with quality/brand narrative.`
              : `Current price maintained. Win probability: ${winProb}%.`
            }
          </div>
          <button
            onClick={() => setApplied(true)}
            style={{
              padding: '10px 18px', background: applied ? 'var(--accent2)' : 'var(--ink)',
              color: 'var(--cream)', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background .2s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {applied ? '✓ Applied' : 'Apply Price'}
          </button>
        </div>
      </div>
    </div>
  )
}
