'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { BarChart2, Search, Bell, RefreshCw, Brain, BellPlus, GitMerge, Zap, ScanLine } from 'lucide-react'
import { PRODUCTS, PLATFORMS, INITIAL_ALERTS } from '../lib/data'
import { getSmartTime } from '../lib/timeUtils'

const PriceDashboard   = dynamic(() => import('../components/PriceDashboard'),   { ssr: false })
const AlertsFeed       = dynamic(() => import('../components/AlertsFeed'),       { ssr: false })
const NewsIntelligence = dynamic(() => import('../components/NewsIntelligence'), { ssr: false })
const ToastSystem      = dynamic(() => import('../components/ToastSystem'),      { ssr: false })
const AlertCreator     = dynamic(() => import('../components/AlertCreator'),     { ssr: false })
const ProductMatcher   = dynamic(() => import('../components/ProductMatcher'),   { ssr: false })
const ImageScanner     = dynamic(() => import('../components/ImageScanner'),     { ssr: false })

type Tab = 'product' | 'price' | 'scan' | 'news' | 'alerts'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'product', label: 'Product',  icon: <GitMerge size={13} />  },
  { id: 'price',   label: 'Category', icon: <BarChart2 size={13} /> },
  { id: 'scan',    label: 'Scan',     icon: <ScanLine size={13} />  },
  { id: 'news',    label: 'Feed',     icon: <Brain size={13} />     },
  { id: 'alerts',  label: 'Alerts',   icon: <Bell size={13} />      },
]

function useLivePrices() {
  const [multipliers, setMultipliers] = useState<Record<string, number>>(
    Object.fromEntries(PLATFORMS.map(p => [p.id, 1]))
  )
  const [lastUpdatedMs, setLastUpdatedMs] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      setMultipliers(() => {
        const next: Record<string, number> = {}
        PLATFORMS.forEach(p => {
          const delta = (Math.random() - 0.5) * 0.006
          next[p.id] = Math.max(0.97, Math.min(1.03, 1 + delta))
        })
        return next
      })
      setLastUpdatedMs(Date.now())
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  return { multipliers, lastUpdatedMs }
}

const criticalCount = INITIAL_ALERTS.filter(a => a.severity === 'critical' || a.isNew).length

export default function RetailLensApp() {
  const [activeTab, setActiveTab] = useState<Tab>('product')
  const [selectedProductId, setSelectedProductId] = useState(PRODUCTS[0].id)
  const [searchQuery, setSearchQuery] = useState('')
  const [syncLabel, setSyncLabel] = useState('just now')
  const [alertCreatorOpen, setAlertCreatorOpen] = useState(false)
  const [liveAlertCount, setLiveAlertCount] = useState(criticalCount)
  const { multipliers, lastUpdatedMs } = useLivePrices()
  const syncRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    syncRef.current = setInterval(() => setSyncLabel(getSmartTime(lastUpdatedMs)), 1000)
    return () => { if (syncRef.current) clearInterval(syncRef.current) }
  }, [lastUpdatedMs])

  const selectedProduct = PRODUCTS.find(p => p.id === selectedProductId) ?? PRODUCTS[0]

  const filteredProducts = searchQuery.trim()
    ? PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : PRODUCTS

  const getLivePrice = useCallback((productId: string, platformId: string) => {
    const base = PRODUCTS.find(p => p.id === productId)?.listings[platformId]?.currentPrice ?? 0
    return Math.round(base * (multipliers[platformId] ?? 1) * 100) / 100
  }, [multipliers])

  const kpis = {
    products:  PRODUCTS.length,
    alerts:    INITIAL_ALERTS.filter(a => a.severity === 'critical').length,
    totalChanges24h: PRODUCTS.reduce((s, p) =>
      s + PLATFORMS.reduce((ps, pl) => ps + p.listings[pl.id].changeCount24h, 0), 0
    ),
    // Products where your price is more than $5 above the market low → need action
    atRisk: PRODUCTS.filter(p => {
      const cheapest = Math.min(...PLATFORMS.map(pl => p.listings[pl.id].currentPrice))
      return p.yourPrice - cheapest > 5
    }).length,
    // Estimated daily revenue lost: gap × ~8 units/day per $1 gap (rough elasticity proxy)
    revenueAtRisk: Math.round(
      PRODUCTS.reduce((s, p) => {
        const cheapest = Math.min(...PLATFORMS.map(pl => p.listings[pl.id].currentPrice))
        const gap = Math.max(0, p.yourPrice - cheapest)
        return s + (gap > 0 ? gap * 7 : 0)
      }, 0)
    ),
    avgGap: Math.round(
      PRODUCTS.reduce((s, p) => {
        const cheapest = Math.min(...PLATFORMS.map(pl => p.listings[pl.id].currentPrice))
        return s + (p.yourPrice - cheapest)
      }, 0) / PRODUCTS.length * 100
    ) / 100,
  }

  const hasSidebar = activeTab === 'price'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* ── TOPBAR ── */}
      <div style={{
        background: 'var(--ink)', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, flexShrink: 0, zIndex: 100,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: 'var(--cream)', letterSpacing: '-0.3px' }}>
            Retail<span style={{ color: 'var(--accent)' }}>Lens</span>
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            AI Price Intelligence
          </span>
        </div>

        <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0 14px', height: 52, display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: 'transparent',
                color: activeTab === tab.id ? 'var(--cream)' : 'var(--mid)',
                borderBottom: `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
                transition: 'color .12s', letterSpacing: '.3px', fontFamily: "'IBM Plex Sans', sans-serif",
                position: 'relative', whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'alerts' && criticalCount > 0 && (
                <span style={{
                  position: 'absolute', top: 10, right: 4,
                  width: 15, height: 15, borderRadius: '50%', background: 'var(--accent)',
                  fontSize: 8, fontWeight: 700, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {criticalCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--mid)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent2)' }} className="blink" />
            LIVE · {syncLabel}
          </div>
          {/* Alert creator button */}
          <button
            onClick={() => setAlertCreatorOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
              color: 'var(--cream)', fontSize: 10, cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
              position: 'relative',
            }}
          >
            <BellPlus size={11} />
            Alerts
            {liveAlertCount > 0 && (
              <span style={{
                position: 'absolute', top: -5, right: -5,
                width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)',
                fontSize: 8, fontWeight: 700, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {liveAlertCount}
              </span>
            )}
          </button>
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
          { label: 'SKUs Tracked',         value: kpis.products,                                color: 'var(--cream)',  unit: '' },
          { label: 'Active Alerts',         value: kpis.alerts,                                  color: 'var(--accent)', unit: '' },
          { label: 'Price Changes Today',   value: kpis.totalChanges24h,                         color: kpis.totalChanges24h > 10 ? 'var(--accent)' : 'var(--amber)', unit: '×' },
          { label: 'SKUs Overpriced >$5',   value: kpis.atRisk,                                  color: kpis.atRisk >= 3 ? 'var(--accent)' : kpis.atRisk >= 1 ? 'var(--amber)' : '#6dd99f', unit: '' },
          { label: 'Est. Daily Rev at Risk',value: `$${kpis.revenueAtRisk}`,                     color: kpis.revenueAtRisk > 30 ? 'var(--accent)' : 'var(--amber)', unit: '/day' },
          { label: 'Avg Gap vs Market Low', value: `$${kpis.avgGap.toFixed(2)}`,                 color: kpis.avgGap > 5 ? 'var(--accent)' : '#6dd99f', unit: '' },
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

        {/* ── SIDEBAR (Price/Visual/SKU tabs only) ── */}
        {hasSidebar && (
          <div style={{
            width: 264, background: 'var(--warm-white)', borderRight: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'var(--ink3)', marginBottom: 8 }}>
                {PRODUCTS.length} SKUs
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={12} color="var(--mid)" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search SKU or name…"
                  style={{
                    width: '100%', background: 'white', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '7px 10px 7px 28px',
                    fontSize: 12, color: 'var(--ink)', fontFamily: "'IBM Plex Sans', sans-serif", outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredProducts.map(product => {
                const isActive = product.id === selectedProductId
                const prices = PLATFORMS.map(p => getLivePrice(product.id, p.id))
                const cheapest = Math.min(...prices)
                const gap = product.yourPrice - cheapest
                const statusColors: Record<string, string> = {
                  matched: 'var(--accent2)', review: 'var(--amber)', failed: 'var(--accent)', pending: 'var(--blue)',
                }
                const totalChanges = PLATFORMS.reduce((s, p) => s + product.listings[p.id].changeCount24h, 0)
                const velocity = PLATFORMS.map(p => product.listings[p.id].priceVelocity)
                const isFalling = velocity.some(v => v === 'falling')
                // ACT = significantly above market AND being undercut; WATCH = minor gap or active changes; HOLD = competitive
                const action = gap > 5 && isFalling ? 'ACT'
                  : gap > 2 || totalChanges > 0 ? 'WATCH'
                  : 'HOLD'
                const actionStyle = {
                  ACT:   { bg: 'var(--accent-soft)',  color: 'var(--accent)',  label: 'ACT NOW' },
                  WATCH: { bg: '#fef6e3',              color: 'var(--amber)',   label: 'WATCH'   },
                  HOLD:  { bg: 'var(--accent2-soft)',  color: 'var(--accent2)', label: 'HOLD'    },
                }[action]

                return (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    style={{
                      padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      background: isActive ? 'white' : 'transparent',
                      borderLeft: isActive ? `3px solid ${action === 'ACT' ? 'var(--accent)' : action === 'WATCH' ? 'var(--amber)' : 'var(--accent2)'}` : '3px solid transparent',
                      paddingLeft: isActive ? 9 : 12,
                      transition: 'background .1s',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 6, overflow: 'hidden',
                        border: '1px solid var(--border)', flexShrink: 0, position: 'relative', background: 'var(--paper)',
                      }}>
                        <Image src={product.imageUrl} alt={product.name} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--blue)', fontWeight: 500 }}>{product.id}</span>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 7, padding: '1px 5px', borderRadius: 3, background: actionStyle.bg, color: actionStyle.color, fontWeight: 700 }}>
                            {actionStyle.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                          {product.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>${product.yourPrice.toFixed(2)}</span>
                            {totalChanges > 0 && (
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: totalChanges >= 3 ? 'var(--accent)' : 'var(--amber)' }}>
                                {totalChanges}×↕
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                            color: gap > 5 ? 'var(--accent)' : gap <= 0 ? 'var(--accent2)' : 'var(--amber)',
                            fontWeight: 600,
                          }}>
                            {gap > 0 ? `+$${gap.toFixed(2)} vs low` : 'Competitive'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer: at-risk summary */}
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={10} color={kpis.atRisk >= 2 ? 'var(--accent)' : 'var(--amber)'} />
              <span style={{ fontSize: 9, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>
                {kpis.atRisk} SKU{kpis.atRisk !== 1 ? 's' : ''} need repricing · ${kpis.revenueAtRisk}/day at risk
              </span>
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
                  {/* Product image */}
                  <div style={{
                    width: 72, height: 72, borderRadius: 10, overflow: 'hidden',
                    border: '1px solid var(--border)', flexShrink: 0, position: 'relative',
                    background: 'var(--warm-white)',
                  }}>
                    <Image
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.name}
                      fill
                      sizes="72px"
                      style={{ objectFit: 'cover' }}
                      unoptimized
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--blue)', marginBottom: 2 }}>{selectedProduct.id}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.2, marginBottom: 6 }}>
                      {selectedProduct.name}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {[selectedProduct.category, selectedProduct.subcategory, ...selectedProduct.tags.slice(0, 2)].map(t => (
                        <span key={t} style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12, fontSize: 10, color: 'var(--ink3)' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  {(() => {
                    const cheapest = Math.min(...PLATFORMS.map(p => getLivePrice(selectedProduct.id, p.id)))
                    const gap = selectedProduct.yourPrice - cheapest
                    const cheapestPlatform = PLATFORMS.find(p => getLivePrice(selectedProduct.id, p.id) === cheapest)
                    const action = gap > 5 ? 'ACT NOW' : gap > 2 ? 'WATCH' : 'HOLD'
                    const actionColor = gap > 5 ? 'var(--accent)' : gap > 2 ? 'var(--amber)' : 'var(--accent2)'
                    return (
                      <>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700, color: actionColor, lineHeight: 1 }}>
                            {gap > 0 ? `+$${gap.toFixed(2)}` : 'Leading'}
                          </div>
                          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.8px', marginTop: 2 }}>
                            vs {cheapestPlatform?.name ?? 'market'} low
                          </div>
                          <div style={{ marginTop: 4, display: 'inline-flex', padding: '2px 8px', borderRadius: 4, background: gap > 5 ? 'var(--accent-soft)' : gap > 2 ? '#fef6e3' : 'var(--accent2-soft)' }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, color: actionColor }}>{action}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button style={{ padding: '7px 18px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '.3px' }}>Reprice</button>
                          <button style={{ padding: '7px 18px', background: 'transparent', color: 'var(--ink2)', border: '1px solid var(--border2)', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Export</button>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
              <PriceDashboard product={selectedProduct} liveMultipliers={multipliers} />
            </>
          )}

          {activeTab === 'product'  && <ProductMatcher />}
          {activeTab === 'scan'    && <ImageScanner />}
          {activeTab === 'news'    && <NewsIntelligence />}
          {activeTab === 'alerts'  && <AlertsFeed />}
        </div>
      </div>

      {/* Global systems — always mounted */}
      <ToastSystem onNewToast={() => setLiveAlertCount(c => c + 1)} />
      {alertCreatorOpen && <AlertCreator onClose={() => setAlertCreatorOpen(false)} />}
    </div>
  )
}
