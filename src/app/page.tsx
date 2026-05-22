'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { BarChart2, Brain } from 'lucide-react'

const PriceIntel   = dynamic(() => import('../components/PriceIntel'),   { ssr: false })
const PriceForecast = dynamic(() => import('../components/PriceForecast'), { ssr: false })

type Tab = 'intel' | 'forecast'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'intel',    label: 'Price Intelligence', icon: <BarChart2 size={13} />  },
  { id: 'forecast', label: 'Predictive Analytics', icon: <Brain size={13} /> },
]

// ── App shell ─────────────────────────────────────────────────────────────────

export default function RetailLensApp() {
  const [activeTab, setActiveTab] = useState<Tab>('intel')

  return (
    <div className="dashboard-shell" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.82)', padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 72, flexShrink: 0, zIndex: 100,
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(18px)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.8px' }}>
            Retail<span style={{ color: 'var(--accent2)' }}>Lens</span>
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--mid)', letterSpacing: '1.8px', textTransform: 'uppercase' }}>
            Private Label Pricing Intelligence
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0 18px', height: 44, display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${activeTab === tab.id ? 'rgba(37, 99, 235, 0.2)' : 'transparent'}`,
                background: activeTab === tab.id ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                color: activeTab === tab.id ? 'var(--ink)' : 'var(--mid)',
                borderRadius: 999,
                transition: 'color .12s', letterSpacing: '.2px', fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Right: live badge + sync */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)' }} className="blink" />
            LIVE
          </div>
          <div style={{ background: 'rgba(15,23,42,0.04)', border: '1px solid var(--border)', borderRadius: 999, padding: '8px 14px', fontSize: 12, color: 'var(--ink)', fontWeight: 600 }}>
            TrendRetail Enterprise
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="dashboard-content" style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {activeTab === 'intel'    && <PriceIntel />}
        {activeTab === 'forecast' && <PriceForecast />}
      </div>
    </div>
  )
}
