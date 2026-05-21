'use client'
import { useState, useEffect } from 'react'
import { Brain, Repeat2, BarChart2, AlertTriangle, Zap, TrendingDown, TrendingUp, Globe, Lightbulb } from 'lucide-react'
import { NEWS_ITEMS, PRODUCTS, PLATFORMS } from '../lib/data'
import { getSmartTime } from '../lib/timeUtils'

// ── Compact event feed derived from NEWS_ITEMS ────────────────────────────────

interface CompactEvent {
  id: string
  ms: number
  platformId: string | null
  headline: string
  action: string          // what to DO about it
  severity: 'critical' | 'warning' | 'info'
  confidence: number
  icon: React.ReactNode
}

const EVENTS: CompactEvent[] = [
  {
    id: 'e1', ms: NEWS_ITEMS[0].timestampMs, platformId: 'AMZ', severity: 'critical', confidence: 87,
    headline: 'Amazon repriced Clear Glasses 4× today — A9 elasticity test active',
    action: 'Hold. Expect stabilisation in 6h — do not chase.',
    icon: <TrendingDown size={11} />,
  },
  {
    id: 'e2', ms: NEWS_ITEMS[1].timestampMs, platformId: null, severity: 'info', confidence: 78,
    headline: 'White T-Shirt demand up +34% — back-to-school wave detected',
    action: 'Hold or raise price 5–8% to capture seasonal margin.',
    icon: <TrendingUp size={11} />,
  },
  {
    id: 'e3', ms: NEWS_ITEMS[2].timestampMs, platformId: 'TGT', severity: 'warning', confidence: 71,
    headline: 'Target running Thu–Fri weekend promo cycle on 3 SKUs',
    action: 'Wait for Mon reversion — do not reprice to match.',
    icon: <Repeat2 size={11} />,
  },
  {
    id: 'e4', ms: NEWS_ITEMS[3].timestampMs, platformId: 'WMT', severity: 'warning', confidence: 91,
    headline: 'Walmart Clear Glasses drop is reactive price-match, not a campaign',
    action: 'Hold at $24.99 for 4 days — 92% reversion rate expected.',
    icon: <Repeat2 size={11} />,
  },
  {
    id: 'e5', ms: NEWS_ITEMS[4].timestampMs, platformId: 'AMZ', severity: 'info', confidence: 54,
    headline: 'Sneakers repriced 2× in 24h · 7× in 7d — possible pre-Prime Day signal',
    action: 'Build inventory buffer. Plan counter-promo for late June.',
    icon: <Lightbulb size={11} />,
  },
  {
    id: 'e6', ms: NEWS_ITEMS[5].timestampMs, platformId: null, severity: 'info', confidence: 94,
    headline: 'Amazon 1.4×/wk · Walmart 0.9×/wk · Target 0.4×/wk repricing velocity',
    action: 'Use Target windows (3–5d lag) to test price adjustments.',
    icon: <BarChart2 size={11} />,
  },
  {
    id: 'e7', ms: NEWS_ITEMS[6].timestampMs, platformId: null, severity: 'info', confidence: 82,
    headline: 'Denim jeans entering May–Jun seasonal trough — Target\'s +12% is a margin grab',
    action: 'Consider 10–15% reduction in June to sustain conversion.',
    icon: <Globe size={11} />,
  },
  {
    id: 'e8', ms: NEWS_ITEMS[7].timestampMs, platformId: 'WMT', severity: 'warning', confidence: 83,
    headline: 'Walmart Black Backpack price-match cascade: followed Amazon, 87% reversion rate',
    action: 'Hold at $25.99 — both platforms at temporary floor. Reassess in 5d.',
    icon: <Repeat2 size={11} />,
  },
]

const SEV_COLORS = {
  critical: { color: 'var(--accent)',  bg: 'var(--accent-soft)',  dot: 'var(--accent)'  },
  warning:  { color: 'var(--amber)',   bg: '#fef6e3',             dot: 'var(--amber)'   },
  info:     { color: 'var(--blue)',    bg: 'var(--blue-soft)',    dot: 'var(--blue)'    },
}

// ── Price change frequency table ──────────────────────────────────────────────

function ChangeFrequencyTable() {
  const rows = PRODUCTS.map(p => {
    const platformData = PLATFORMS.map(pl => ({ platform: pl, listing: p.listings[pl.id] }))
    const totalChanges24h = platformData.reduce((s, d) => s + d.listing.changeCount24h, 0)
    const mostActive24h = platformData.reduce((a, b) => b.listing.changeCount24h > a.listing.changeCount24h ? b : a)
    return { product: p, platformData, totalChanges24h, mostActive24h }
  }).sort((a, b) => b.totalChanges24h - a.totalChanges24h)

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Repeat2 size={13} color="var(--amber)" />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Price Change Frequency</span>
        <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>rolling 24h · 7d</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--warm-white)' }}>
            {['Product', ...PLATFORMS.map(p => p.name), '24h Total', 'Most Active'].map(h => (
              <th key={h} style={{ padding: '7px 14px', textAlign: 'left', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ product, platformData, totalChanges24h, mostActive24h }, i) => (
            <tr key={product.id}>
              <td style={{ padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 16 }}>{product.emoji}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink2)', fontWeight: 500 }}>{product.name.split(' ').slice(0, 3).join(' ')}</span>
                </div>
              </td>
              {platformData.map(({ platform, listing }) => (
                <td key={platform.id} style={{ padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: listing.changeCount24h >= 3 ? 'var(--accent)' : listing.changeCount24h >= 1 ? 'var(--amber)' : 'var(--mid)' }}>
                      {listing.changeCount24h}×
                    </span>
                    <span style={{ fontSize: 9, color: 'var(--mid)' }}>
                      {listing.priceVelocity === 'falling' ? '↓' : listing.priceVelocity === 'rising' ? '↑' : '—'}
                    </span>
                  </div>
                </td>
              ))}
              <td style={{ padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', textAlign: 'center' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: totalChanges24h >= 8 ? 'var(--accent)' : totalChanges24h >= 4 ? 'var(--amber)' : 'var(--ink3)' }}>
                  {totalChanges24h}
                </span>
              </td>
              <td style={{ padding: '10px 14px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: mostActive24h.platform.color }} />
                  <span style={{ fontSize: 10, color: 'var(--ink2)' }}>{mostActive24h.platform.name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>({mostActive24h.listing.changeCount24h}×)</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function NewsIntelligence() {
  const [sevFilter, setSevFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [times, setTimes] = useState<Record<string, string>>(() =>
    Object.fromEntries(EVENTS.map(e => [e.id, getSmartTime(e.ms)]))
  )

  useEffect(() => {
    const t = setInterval(() => {
      setTimes(Object.fromEntries(EVENTS.map(e => [e.id, getSmartTime(e.ms)])))
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const filtered = sevFilter === 'all' ? EVENTS : EVENTS.filter(e => e.severity === sevFilter)
  const critCount = EVENTS.filter(e => e.severity === 'critical').length
  const warnCount = EVENTS.filter(e => e.severity === 'warning').length
  const avgConf   = Math.round(EVENTS.reduce((s, e) => s + e.confidence, 0) / EVENTS.length)

  const platformColors: Record<string, string> = { AMZ: '#e47911', TGT: '#cc0000', WMT: '#0071dc' }
  const platformNames: Record<string, string>  = { AMZ: 'Amazon', TGT: 'Target', WMT: 'Walmart' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* KPI strip — 3 boxes only */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: 'Critical Events',   value: critCount,  color: 'var(--accent)',  bg: 'var(--accent-soft)'  },
          { label: 'Warnings',          value: warnCount,  color: 'var(--amber)',   bg: '#fef6e3'             },
          { label: 'Avg AI Confidence', value: `${avgConf}%`, color: 'var(--accent2)', bg: 'var(--accent2-soft)' },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '16px 20px', borderRight: i < 2 ? '1px solid var(--border)' : 'none', background: s.bg }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Two-column: event feed + aggressiveness */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18 }}>

        {/* Compact event feed */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={13} color="var(--blue)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Intelligence Feed</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {(['all', 'critical', 'warning', 'info'] as const).map(f => (
                <button key={f} onClick={() => setSevFilter(f)} style={{
                  padding: '2px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 9,
                  fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.3px',
                  background: sevFilter === f ? 'var(--ink)' : 'var(--paper)',
                  color: sevFilter === f ? 'var(--cream)' : 'var(--ink3)',
                }}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.map((event, i) => {
            const sev = SEV_COLORS[event.severity]
            const platform = event.platformId ? { color: platformColors[event.platformId], name: platformNames[event.platformId] } : null
            return (
              <div key={event.id} style={{ padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 12 }}>
                {/* Left: severity dot + time */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, paddingTop: 2, flexShrink: 0, width: 36 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: sev.dot, flexShrink: 0 }} />
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)', textAlign: 'center', lineHeight: 1.3 }}>{times[event.id]}</span>
                </div>

                {/* Center: content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: sev.color }}>{event.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.4 }}>{event.headline}</span>
                    {platform && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 'auto' }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: platform.color }} />
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)' }}>{platform.name}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: sev.bg, borderRadius: 4, flex: 1 }}>
                      <Zap size={9} color={sev.color} style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: sev.color, fontWeight: 500, lineHeight: 1.35 }}>{event.action}</span>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--mid)', flexShrink: 0 }}>{event.confidence}% conf.</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Aggressiveness + competitive speed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} color="var(--amber)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>Platform Aggressiveness</span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { platform: PLATFORMS[0], score: 71, desc: 'A9 algorithm · 2–4h response time' },
                { platform: PLATFORMS[1], score: 48, desc: 'Reactive match · 4–8h lag' },
                { platform: PLATFORMS[2], score: 22, desc: 'Manual/batch · 3–5d windows' },
              ].map(row => (
                <div key={row.platform.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: row.platform.color }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>{row.platform.name}</span>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 700, color: row.score >= 60 ? 'var(--accent)' : row.score >= 40 ? 'var(--amber)' : 'var(--accent2)' }}>
                      {row.score}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--paper)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}>
                    <div style={{ height: '100%', width: `${row.score}%`, background: row.score >= 60 ? 'var(--accent)' : row.score >= 40 ? 'var(--amber)' : 'var(--accent2)', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{row.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Competitive speed index */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={13} color="var(--blue)" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>Response Windows</span>
            </div>
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'Amazon', color: '#e47911', hours: 2.4, label: '~2–4h' },
                { name: 'Walmart', color: '#0071dc', hours: 6.8, label: '~4–8h' },
                { name: 'Target', color: '#cc0000', hours: 72, label: '3–5 days' },
              ].map(p => (
                <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink2)', width: 58 }}>{p.name}</span>
                  <div style={{ flex: 1, height: 5, background: 'var(--paper)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(p.hours / 80 * 100, 100)}%`, background: p.color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', width: 44, textAlign: 'right' }}>{p.label}</span>
                </div>
              ))}
              <div style={{ marginTop: 2, padding: '8px 10px', background: 'var(--accent2-soft)', borderRadius: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--accent2)', lineHeight: 1.5 }}>
                  Target's 3–5 day window = safe to test price changes without immediate retaliation.
                </span>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{ padding: '10px 12px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', gap: 6 }}>
            <AlertTriangle size={11} color="var(--mid)" style={{ marginTop: 1, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--ink3)', lineHeight: 1.5 }}>
              AI insights from price history and behavioral patterns. Validate predictions &lt;70% confidence before acting.
            </span>
          </div>
        </div>
      </div>

      {/* Velocity table */}
      <ChangeFrequencyTable />
    </div>
  )
}
