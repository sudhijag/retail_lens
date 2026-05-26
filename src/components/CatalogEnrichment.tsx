'use client'
import { useState } from 'react'
import { Layers, Download, CheckCircle, AlertTriangle } from 'lucide-react'
import { PRODUCTS, PLATFORMS } from '../lib/data'

type EnrichField = 'description' | 'attributes' | 'category' | 'tags'

const FIELD_LABELS: Record<EnrichField, string> = {
  description: 'AI Description',
  attributes:  'Product Attributes',
  category:    'Category / Subcategory',
  tags:        'Search Tags',
}

export default function CatalogEnrichment() {
  const [selected, setSelected] = useState<Set<EnrichField>>(new Set(['description', 'attributes', 'tags']))
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>({})

  const toggleField = (f: EnrichField) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(f) ? next.delete(f) : next.add(f)
      return next
    })
  }

  const runEnrichment = () => {
    setRunning(true)
    setDone(false)
    setProgress({})
    let i = 0
    const productIds = PRODUCTS.map(p => p.id)
    const tick = () => {
      if (i >= productIds.length) {
        setRunning(false)
        setDone(true)
        return
      }
      const id = productIds[i]
      setProgress(prev => ({ ...prev, [id]: 100 }))
      i++
      setTimeout(tick, 500)
    }
    tick()
  }

  const priceGaps = PRODUCTS.map(p => {
    const prices = PLATFORMS.map(pl => p.listings[pl.id].currentPrice)
    const cheapest = Math.min(...prices)
    const gap = p.yourPrice - cheapest
    return { product: p, gap, cheapest }
  }).sort((a, b) => b.gap - a.gap)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Enrichment job panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={13} color="var(--blue)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Catalog Enrichment Job</span>
          </div>
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 8 }}>
                Fields to Generate
              </div>
              {(Object.keys(FIELD_LABELS) as EnrichField[]).map(f => (
                <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                  <input
                    type="checkbox"
                    checked={selected.has(f)}
                    onChange={() => toggleField(f)}
                    style={{ width: 13, height: 13, accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontSize: 12, color: 'var(--ink2)' }}>{FIELD_LABELS[f]}</span>
                </label>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 6 }}>
                Scope
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', padding: '6px 10px', background: 'var(--warm-white)', borderRadius: 5, border: '1px solid var(--border)' }}>
                All {PRODUCTS.length} products · {PLATFORMS.length} platforms
              </div>
            </div>
            <button
              onClick={runEnrichment}
              disabled={running || selected.size === 0}
              style={{
                padding: '9px 0', background: running ? 'var(--sand)' : 'var(--ink)', color: 'var(--cream)',
                border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600,
                cursor: running ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              {running ? (
                <>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cream)' }} className="blink" />
                  Enriching…
                </>
              ) : done ? (
                <><CheckCircle size={13} /> Run Again</>
              ) : (
                <><Layers size={13} /> Run Enrichment</>
              )}
            </button>
            {done && (
              <button style={{
                padding: '7px 0', background: 'transparent', color: 'var(--ink2)',
                border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
                <Download size={12} /> Export Enriched Catalog (.CSV)
              </button>
            )}
          </div>
        </div>

        {/* Product enrichment results */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Enrichment Status</span>
          </div>
          <div>
            {PRODUCTS.map((p, i) => {
              const pct = progress[p.id] ?? 0
              const isDone = pct === 100
              return (
                <div key={p.id} style={{ padding: '12px 18px', borderBottom: i < PRODUCTS.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{p.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--blue)' }}>{p.id}</span>
                        <span style={{ fontSize: 12, color: 'var(--ink2)', marginLeft: 8 }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize: 10, color: isDone ? 'var(--accent2)' : running ? 'var(--amber)' : 'var(--mid)', fontFamily: "'IBM Plex Mono', monospace" }}>
                        {isDone ? 'DONE' : running ? 'QUEUED' : 'IDLE'}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: isDone ? 'var(--accent2)' : 'var(--blue)', borderRadius: 2, transition: 'width .4s ease' }} />
                    </div>
                  </div>
                  {isDone && <CheckCircle size={14} color="var(--accent2)" style={{ flexShrink: 0 }} />}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Price gap analysis - always-on intelligence */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={13} color="var(--amber)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Catalog-Wide Price Gap Analysis</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--mid)' }}>Sorted by gap from market low</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--warm-white)' }}>
              {['Product', 'Your Price', 'Market Low', 'Gap $', 'Gap %', 'Estimated Revenue Risk / Week', 'Action'].map(h => (
                <th key={h} style={{ padding: '8px 18px', textAlign: 'left', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {priceGaps.map(({ product, gap, cheapest }, i) => {
              const gapPct = Math.round((gap / product.yourPrice) * 100)
              const revenueRisk = Math.round(gap * 143 * (gapPct / 100) * 10) / 10 // heuristic
              const riskColor = gapPct > 20 ? 'var(--accent)' : gapPct > 10 ? 'var(--amber)' : 'var(--accent2)'
              return (
                <tr key={product.id} style={{ background: 'white' }}>
                  <td style={{ padding: '11px 18px', borderBottom: i < priceGaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{product.emoji}</span>
                      <span style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 500 }}>{product.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 18px', borderBottom: i < priceGaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700 }}>${product.yourPrice.toFixed(2)}</span>
                  </td>
                  <td style={{ padding: '11px 18px', borderBottom: i < priceGaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--accent2)' }}>${cheapest.toFixed(2)}</span>
                  </td>
                  <td style={{ padding: '11px 18px', borderBottom: i < priceGaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: gap > 0 ? riskColor : 'var(--accent2)' }}>
                      {gap > 0 ? `+$${gap.toFixed(2)}` : `-$${Math.abs(gap).toFixed(2)}`}
                    </span>
                  </td>
                  <td style={{ padding: '11px 18px', borderBottom: i < priceGaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, color: riskColor }}>{gapPct > 0 ? `+${gapPct}%` : `${gapPct}%`}</span>
                  </td>
                  <td style={{ padding: '11px 18px', borderBottom: i < priceGaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: riskColor }}>
                      {gap > 0 ? `~$${revenueRisk.toLocaleString()}` : '-'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 18px', borderBottom: i < priceGaps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {gap > 3 && (
                      <button style={{ padding: '4px 10px', background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid #f5c8b0', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Reprice
                      </button>
                    )}
                    {gap <= 3 && gap >= 0 && (
                      <button style={{ padding: '4px 10px', background: 'var(--accent2-soft)', color: 'var(--accent2)', border: '1px solid #b8dfc8', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        Hold
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
