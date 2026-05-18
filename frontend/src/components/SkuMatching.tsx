'use client'
import { useState } from 'react'
import { CheckCircle, Clock, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { PLATFORMS, PRODUCTS } from '../lib/data'
import type { Product } from '../lib/types'

const STATUS_CONFIG = {
  matched:  { label: 'MATCHED',  icon: <CheckCircle size={11} />, color: 'var(--accent2)', bg: 'var(--accent2-soft)' },
  review:   { label: 'REVIEW',   icon: <Clock size={11} />,        color: 'var(--amber)',   bg: 'var(--amber-soft)'   },
  failed:   { label: 'FAILED',   icon: <XCircle size={11} />,      color: 'var(--accent)',  bg: 'var(--accent-soft)'  },
  pending:  { label: 'PENDING',  icon: <AlertTriangle size={11} />,color: 'var(--blue)',    bg: 'var(--blue-soft)'    },
}

function ConfBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = (value / max) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ height: 4, width: 64, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: value >= 90 ? 'var(--accent2)' : value >= 75 ? 'var(--amber)' : 'var(--accent)', borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: value >= 90 ? 'var(--accent2)' : value >= 75 ? 'var(--amber)' : 'var(--accent)' }}>{value}%</span>
    </div>
  )
}

function ProductRow({ product }: { product: Product }) {
  const [expanded, setExpanded] = useState(false)
  const status = STATUS_CONFIG[product.matchStatus]
  const activePlatforms = PLATFORMS.filter(p => product.listings[p.id])
  const avgConf = Math.round(activePlatforms.reduce((s, p) => s + product.listings[p.id].matchConfidence, 0) / activePlatforms.length)

  return (
    <>
      <tr
        style={{ cursor: 'pointer', background: expanded ? '#fafaf9' : 'white' }}
        onClick={() => setExpanded(v => !v)}
      >
        <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{product.emoji}</span>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--blue)', marginBottom: 2 }}>{product.id}</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{product.name}</div>
              <div style={{ fontSize: 10, color: 'var(--ink3)' }}>{product.category} · {product.subcategory}</div>
            </div>
          </div>
        </td>
        <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {activePlatforms.map(p => (
              <div key={p.id} title={p.name} style={{
                width: 22, height: 22, borderRadius: 4, background: p.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700, color: 'white', letterSpacing: .3,
              }}>
                {p.shortName[0]}
              </div>
            ))}
          </div>
        </td>
        <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 4, background: status.bg }}>
            <span style={{ color: status.color }}>{status.icon}</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, color: status.color, letterSpacing: '.5px' }}>{status.label}</span>
          </div>
        </td>
        <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
          <ConfBar value={avgConf} />
        </td>
        <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
            ${product.yourPrice.toFixed(2)}
          </span>
        </td>
        <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {product.tags.slice(0, 2).map(tag => (
              <span key={tag} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: 'var(--paper)', color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>
                {tag}
              </span>
            ))}
          </div>
        </td>
        <td style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', verticalAlign: 'middle', textAlign: 'right' }}>
          {expanded ? <ChevronUp size={14} color="var(--mid)" /> : <ChevronDown size={14} color="var(--mid)" />}
        </td>
      </tr>

      {expanded && (
        <tr>
          <td colSpan={7} style={{ background: 'var(--warm-white)', borderBottom: '2px solid var(--border)' }}>
            <div style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 14 }}>
                {PLATFORMS.map(p => {
                  const listing = product.listings[p.id]
                  return (
                    <div key={p.id} style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>{p.name}</span>
                      </div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
                        ${listing.currentPrice.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 2 }}>{listing.listingId}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink3)', marginBottom: 6 }}>{listing.seller}</div>
                      <ConfBar value={listing.matchConfidence} />
                    </div>
                  )
                })}
              </div>

              <div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 8 }}>
                  AI Description
                </div>
                <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6 }}>{product.aiDescription}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function SkuMatching() {
  const stats = {
    matched: PRODUCTS.filter(p => p.matchStatus === 'matched').length,
    review:  PRODUCTS.filter(p => p.matchStatus === 'review').length,
    failed:  PRODUCTS.filter(p => p.matchStatus === 'failed').length,
    pending: PRODUCTS.filter(p => p.matchStatus === 'pending').length,
  }
  const avgScore = Math.round(PRODUCTS.reduce((s, p) => s + p.overallMatchScore, 0) / PRODUCTS.length)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: 'Matched',    value: stats.matched,  color: 'var(--accent2)', bg: 'var(--accent2-soft)' },
          { label: 'In Review',  value: stats.review,   color: 'var(--amber)',   bg: 'var(--amber-soft)'   },
          { label: 'Failed',     value: stats.failed,   color: 'var(--accent)',  bg: 'var(--accent-soft)'  },
          { label: 'Pending',    value: stats.pending,  color: 'var(--blue)',    bg: 'var(--blue-soft)'    },
          { label: 'Avg Confidence', value: `${avgScore}%`, color: 'var(--ink)', bg: 'white' },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '16px 18px', borderRight: i < 4 ? '1px solid var(--border)' : 'none', background: s.bg }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>SKU Matching Results</span>
          <span style={{ marginLeft: 10, fontSize: 10, color: 'var(--mid)' }}>Click a row to expand platform detail</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--warm-white)' }}>
              {['Product', 'Platforms', 'Status', 'Confidence', 'Your Price', 'Tags', ''].map(h => (
                <th key={h} style={{
                  padding: '8px 18px', textAlign: 'left',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase',
                  letterSpacing: '1px', color: 'var(--ink3)',
                  borderBottom: '1px solid var(--border)', fontWeight: 500,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRODUCTS.map(p => <ProductRow key={p.id} product={p} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
