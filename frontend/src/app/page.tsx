'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  BarChart2, Eye, Layers, Bell, RefreshCw, Search,
} from 'lucide-react'
import { PRODUCTS, PLATFORMS, INITIAL_ALERTS } from '../lib/data'

// Dynamic imports to avoid SSR issues with chart/browser APIs
const PriceDashboard    = dynamic(() => import('../components/PriceDashboard'),    { ssr: false })
const VisualScanner     = dynamic(() => import('../components/VisualScanner'),     { ssr: false })
const SkuMatching       = dynamic(() => import('../components/SkuMatching'),       { ssr: false })
const AlertsFeed        = dynamic(() => import('../components/AlertsFeed'),        { ssr: false })
const CatalogEnrichment = dynamic(() => import('../components/CatalogEnrichment'), { ssr: false })

type Tab = 'price' | 'visual' | 'sku' | 'alerts' | 'catalog'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'price',   label: 'Price Intelligence', icon: <BarChart2 size={13} /> },
  { id: 'visual',  label: 'Visual Scanner',     icon: <Eye size={13} /> },
  { id: 'sku',     label: 'SKU Matching',       icon: <Search size={13} /> },
  { id: 'alerts',  label: 'Alerts',             icon: <Bell size={13} /> },
  { id: 'catalog', label: 'Catalog Enrichment', icon: <Layers size={13} /> },
]

// Simulate tiny live price movements every 4 seconds (±0.3%)
function useLivePrices() {
  const [multipliers, setMultipliers] = useState<Record<string, number>>(
    Object.fromEntries(PLATFORMS.map(p => [p.id, 1]))
  )
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setMultipliers(() => {
        const next: Record<string, number> = {}
        PLATFORMS.forEach(p => {
          // Tiny random walk ±0.3%
          const delta = (Math.random() - 0.5) * 0.006
          next[p.id] = Math.max(0.97, Math.min(1.03, 1 + delta))
        })
        return next
      })
      setLastUpdated(new Date())
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return { multipliers, lastUpdated }
}

// Count new/critical alerts
const criticalCount = INITIAL_ALERTS.filter(a => a.severity === 'critical' || a.isNew).length

export default function RetailLensApp() {
  const [activeTab, setActiveTab] = useState<Tab>('price')
  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id)
  const [searchQuery, setSearchQuery] = useState('')
  const [syncTime, setSyncTime] = useState('just now')
  const { multipliers, lastUpdated } = useLivePrices()
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Update sync timestamp display
  useEffect(() => {
    syncRef.current = setInterval(() => {
      const secs = Math.round((Date.now() - lastUpdated.getTime()) / 1000)
      setSyncTime(secs < 5 ? 'just now' : `${secs}s ago`)
    }, 1000)
    return () => { if (syncRef.current) clearInterval(syncRef.current) }
  }, [lastUpdated])

  const selectedProduct = PRODUCTS.find(p => p.id === selectedProductId) ?? PRODUCTS[0]

  const filteredProducts = searchQuery.trim()
    ? PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : PRODUCTS

  // Live prices for sidebar summary
  const getLivePrice = useCallback((productId: string, platformId: string) => {
    const base = PRODUCTS.find(p => p.id === productId)?.listings[platformId]?.currentPrice ?? 0
    return Math.round(base * (multipliers[platformId] ?? 1) * 100) / 100
  }, [multipliers])

  // Compute KPIs
  const kpis = {
    products: PRODUCTS.length,
    platforms: PLATFORMS.length,
    alerts: INITIAL_ALERTS.filter(a => a.severity === 'critical').length,
    avgGap: Math.round(
      PRODUCTS.reduce((s, p) => {
        const prices = PLATFORMS.map(pl => p.listings[pl.id].currentPrice)
        const cheapest = Math.min(...prices)
        return s + (p.yourPrice - cheapest)
      }, 0) / PRODUCTS.length * 100
    ) / 100,
    monitored: PRODUCTS.reduce((s, p) => s + Object.keys(p.listings).length, 0),
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: 'var(--ink)', padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, flexShrink: 0, zIndex: 100,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: 'var(--cream)', letterSpacing: '-0.3px' }}>
            Retail<span style={{ color: 'var(--accent)' }}>Lens</span>
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Price Intelligence
          </span>
        </div>

        {/* Nav tabs */}
        <div style={{ display: 'flex' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'transparent',
                color: activeTab === tab.id ? 'var(--cream)' : 'var(--mid)',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                transition: 'color .12s', letterSpacing: '.3px', fontFamily: "'IBM Plex Sans', sans-serif",
                position: 'relative',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'alerts' && criticalCount > 0 && (
                <span style={{
                  position: 'absolute', top: 10, right: 8,
                  width: 16, height: 16, borderRadius: '50%', background: 'var(--accent)',
                  fontSize: 9, fontWeight: 700, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {criticalCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)' }} className="blink" />
            LIVE · {syncTime}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '5px 12px', fontSize: 11, color: 'var(--cream)', fontWeight: 500 }}>
            TrendRetail · Pro
          </div>
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div style={{
        background: 'var(--ink)', padding: '0 28px 14px',
        display: 'flex', gap: 32, flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: 'Products Tracked',    value: kpis.products,                  color: 'var(--cream)',  unit: '' },
          { label: 'Platforms Monitored', value: kpis.platforms,                 color: 'var(--cream)',  unit: '' },
          { label: 'Active Alerts',       value: kpis.alerts,                    color: 'var(--accent)', unit: '' },
          { label: 'Listings Watched',    value: kpis.monitored,                 color: 'var(--cream)',  unit: '' },
          { label: 'Avg Price Gap',       value: `$${kpis.avgGap.toFixed(2)}`,   color: kpis.avgGap > 5 ? 'var(--accent)' : '#6dd99f', unit: ' vs low' },
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
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 5, color: 'var(--cream)', fontSize: 11, cursor: 'pointer',
            fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
          }}>
            <RefreshCw size={11} /> Sync All
          </button>
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar — shown only on price/visual/sku tabs */}
        {(activeTab === 'price' || activeTab === 'visual' || activeTab === 'sku') && (
          <div style={{
            width: 268, background: 'var(--warm-white)', borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--ink3)', marginBottom: 8 }}>
                {PRODUCTS.length} SKUs
              </div>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={12} color="var(--mid)" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by SKU or name…"
                  style={{
                    width: '100%', background: 'white', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '7px 10px 7px 28px',
                    fontSize: 12, color: 'var(--ink)', fontFamily: "'IBM Plex Sans', sans-serif",
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Product list */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredProducts.map(product => {
                const isActive = product.id === selectedProductId
                const prices = PLATFORMS.map(p => getLivePrice(product.id, p.id))
                const cheapest = Math.min(...prices)
                const gapFromCheapest = product.yourPrice - cheapest

                const statusColors: Record<string, string> = {
                  matched: 'var(--accent2)', review: 'var(--amber)', failed: 'var(--accent)', pending: 'var(--blue)',
                }

                return (
                  <div
                    key={product.id}
                    onClick={() => { setSelectedProductId(product.id); setActiveTab('price') }}
                    style={{
                      padding: '11px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      background: isActive ? 'white' : 'transparent',
                      borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                      paddingLeft: isActive ? 11 : 14,
                      transition: 'background .1s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--blue)', fontWeight: 500 }}>
                        {product.id}
                      </span>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, padding: '1px 5px', borderRadius: 3,
                        background: `${statusColors[product.matchStatus]}22`,
                        color: statusColors[product.matchStatus], fontWeight: 600, letterSpacing: '.3px',
                      }}>
                        {product.matchStatus.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 16 }}>{product.emoji}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {PLATFORMS.map(p => (
                          <div key={p.id} style={{
                            width: 14, height: 14, borderRadius: 3, background: p.color,
                            fontSize: 8, fontWeight: 700, color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {p.shortName[0]}
                          </div>
                        ))}
                      </div>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                        color: gapFromCheapest > 5 ? 'var(--accent)' : gapFromCheapest <= 0 ? 'var(--accent2)' : 'var(--amber)',
                        fontWeight: 600,
                      }}>
                        {gapFromCheapest > 0 ? `+$${gapFromCheapest.toFixed(2)} gap` : 'Competitive'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Sidebar footer: session summary */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--paper)' }}>
              {[
                { label: 'Matched',    count: PRODUCTS.filter(p => p.matchStatus === 'matched').length,  color: 'var(--accent2)' },
                { label: 'In Review',  count: PRODUCTS.filter(p => p.matchStatus === 'review').length,   color: 'var(--amber)'   },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{s.label}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: s.color, fontWeight: 600 }}>{s.count}/{PRODUCTS.length}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--sand)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(s.count / PRODUCTS.length) * 100}%`, background: s.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONTENT AREA ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {activeTab === 'price' && (
            <>
              {/* Product hero */}
              <div style={{
                background: 'white', border: '1px solid var(--border)', borderRadius: 10,
                padding: '16px 20px', marginBottom: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 10, background: 'var(--warm-white)',
                    border: '1px solid var(--border)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 32, flexShrink: 0,
                  }}>
                    {selectedProduct.emoji}
                  </div>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--blue)', marginBottom: 2 }}>{selectedProduct.id}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2 }}>{selectedProduct.name}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
                      <span style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12, fontSize: 10, color: 'var(--ink3)' }}>{selectedProduct.category}</span>
                      <span style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12, fontSize: 10, color: 'var(--ink3)' }}>{selectedProduct.subcategory}</span>
                      {selectedProduct.tags.slice(0, 2).map(t => (
                        <span key={t} style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12, fontSize: 10, color: 'var(--ink3)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 34, fontWeight: 700, color: 'var(--accent2)', lineHeight: 1 }}>
                    {selectedProduct.overallMatchScore}%
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.8px', marginTop: 3 }}>
                    Match Score
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button style={{ padding: '6px 14px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Reprice</button>
                    <button style={{ padding: '6px 14px', background: 'transparent', color: 'var(--ink2)', border: '1px solid var(--border2)', borderRadius: 5, fontSize: 11, cursor: 'pointer' }}>Export</button>
                  </div>
                </div>
              </div>

              <PriceDashboard product={selectedProduct} liveMultipliers={multipliers} />
            </>
          )}

          {activeTab === 'visual'  && <VisualScanner />}
          {activeTab === 'sku'     && <SkuMatching />}
          {activeTab === 'alerts'  && <AlertsFeed />}
          {activeTab === 'catalog' && <CatalogEnrichment />}
        </div>
      </div>
    </div>
  )
}
