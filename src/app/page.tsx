'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { BarChart2, Brain, RefreshCw } from 'lucide-react'
import { PRODUCTS, PLATFORMS, INITIAL_ALERTS } from '../lib/data'

const PriceIntel   = dynamic(() => import('../components/PriceIntel'),   { ssr: false })
const PriceForecast = dynamic(() => import('../components/PriceForecast'), { ssr: false })

type Tab = 'intel' | 'forecast'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'intel',    label: 'Price Intelligence', icon: <BarChart2 size={13} />  },
  { id: 'forecast', label: 'Predictive Analytics', icon: <Brain size={13} /> },
]

// ── Aggregate KPIs (no per-product selection needed) ─────────────────────────

function useKpis() {
  const atRisk = PRODUCTS.filter(p => {
    const cheapest = Math.min(...PLATFORMS.map(pl => p.listings[pl.id].currentPrice))
    return p.yourPrice - cheapest > 5
  }).length

  const revenueAtRisk = Math.round(
    PRODUCTS.reduce((s, p) => {
      const cheapest = Math.min(...PLATFORMS.map(pl => p.listings[pl.id].currentPrice))
      const gap = Math.max(0, p.yourPrice - cheapest)
      return s + (gap > 0 ? gap * 7 : 0)
    }, 0)
  )

  const totalChanges24h = PRODUCTS.reduce((s, p) =>
    s + PLATFORMS.reduce((ps, pl) => ps + p.listings[pl.id].changeCount24h, 0), 0
  )

  const avgGap = Math.round(
    PRODUCTS.reduce((s, p) => {
      const cheapest = Math.min(...PLATFORMS.map(pl => p.listings[pl.id].currentPrice))
      return s + (p.yourPrice - cheapest)
    }, 0) / PRODUCTS.length * 100
  ) / 100

  return { atRisk, revenueAtRisk, totalChanges24h, avgGap, activeAlerts: INITIAL_ALERTS.filter(a => a.severity === 'critical').length }
}

// ── App shell ─────────────────────────────────────────────────────────────────

export default function RetailLensApp() {
  const [activeTab, setActiveTab] = useState<Tab>('intel')
  const kpis = useKpis()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: 'var(--ink)', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, flexShrink: 0, zIndex: 100,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: 'var(--cream)', letterSpacing: '-0.3px' }}>
            Retail<span style={{ color: 'var(--accent)' }}>Lens</span>
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            AI Price Intelligence
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0 22px', height: 52, display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'transparent',
                color: activeTab === tab.id ? 'var(--cream)' : 'var(--mid)',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                transition: 'color .12s', letterSpacing: '.3px', fontFamily: "'IBM Plex Sans', sans-serif",
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Right: live badge + sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)' }} className="blink" />
            LIVE
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '5px 12px', fontSize: 11, color: 'var(--cream)', fontWeight: 500 }}>
            TrendRetail · Pro
          </div>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{
        background: 'var(--ink)', padding: '0 24px 14px',
        display: 'flex', gap: 28, flexShrink: 0, alignItems: 'flex-end',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: 'SKUs Tracked',          value: PRODUCTS.length,             color: 'var(--cream)',  unit: ''     },
          { label: 'Active Alerts',          value: kpis.activeAlerts,           color: 'var(--accent)', unit: ''     },
          { label: 'Price Changes Today',    value: kpis.totalChanges24h,        color: kpis.totalChanges24h > 10 ? 'var(--accent)' : 'var(--amber)', unit: '×' },
          { label: 'SKUs Overpriced >$5',    value: kpis.atRisk,                 color: kpis.atRisk >= 3 ? 'var(--accent)' : kpis.atRisk >= 1 ? 'var(--amber)' : '#6dd99f', unit: '' },
          { label: 'Est. Daily Rev at Risk', value: `$${kpis.revenueAtRisk}`,    color: kpis.revenueAtRisk > 30 ? 'var(--accent)' : 'var(--amber)', unit: '/day' },
          { label: 'Avg Gap vs Market Low',  value: `$${kpis.avgGap.toFixed(2)}`,color: kpis.avgGap > 5 ? 'var(--accent)' : '#6dd99f', unit: '' },
        ].map(kpi => (
          <div key={kpi.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>
              {kpi.value}<span style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", opacity: .6 }}>{kpi.unit}</span>
            </span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {kpi.label}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end' }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, color: 'var(--cream)', fontSize: 11, cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500 }}>
            <RefreshCw size={11} /> Sync All
          </button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
        {activeTab === 'intel'    && <PriceIntel />}
        {activeTab === 'forecast' && <PriceForecast />}
      </div>
    </div>
  )
}
