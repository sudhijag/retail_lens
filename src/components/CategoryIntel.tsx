'use client'
import { useState } from 'react'
import { BarChart2 } from 'lucide-react'
import { getCategoryIntel } from '../lib/categoryIntelligence'
import type { IndustryLeader } from '../lib/categoryIntelligence'

const PC: Record<string, string> = { AMZ: '#e47911', TGT: '#cc0000', WMT: '#0071dc' }
const PN: Record<string, string> = { AMZ: 'Amazon', TGT: 'Target', WMT: 'Walmart' }

const MOM: Record<string, { color: string; bg: string }> = {
  surging:    { color: 'var(--accent2)', bg: 'var(--accent2-soft)' },
  growing:    { color: '#2a8a50',        bg: '#d4f0e0'             },
  emerging:   { color: 'var(--blue)',    bg: 'var(--blue-soft)'    },
  steady:     { color: 'var(--amber)',   bg: '#fef6e3'             },
  plateauing: { color: 'var(--mid)',     bg: 'var(--paper)'        },
  declining:  { color: 'var(--accent)',  bg: 'var(--accent-soft)'  },
}

const DCFG = {
  opportunity: { color: 'var(--accent2)', bg: 'var(--accent2-soft)', label: '↗ OPPORTUNITY' },
  warning:     { color: 'var(--accent)',  bg: 'var(--accent-soft)',  label: '⚠ WARNING'     },
  action:      { color: 'var(--blue)',    bg: 'var(--blue-soft)',    label: '→ ACTION NOW'  },
  defend:      { color: 'var(--amber)',   bg: '#fef6e3',             label: '⊕ DEFEND'      },
}

function abbrevName(name: string): string {
  const words = name.split(/[\s\-\/]+/).filter(w => /^[a-zA-Z]/.test(w) && w.length > 2)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    pts.push(`${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`)
  }
  return pts.join(' ')
}

function PlatformFill({ platform, cx, cy, r }: { platform: string; cx: number; cy: number; r: number }) {
  if (platform === 'AMZ') {
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill="#ff9900" />
        <text x={cx} y={cy + r * 0.3} fontSize={r * 1.05} fill="white" fontWeight="900"
          textAnchor="middle" dominantBaseline="middle" fontFamily="Georgia, serif">a</text>
        <path
          d={`M ${(cx - r * 0.5).toFixed(1)} ${(cy + r * 0.54).toFixed(1)} Q ${cx.toFixed(1)} ${(cy + r * 0.80).toFixed(1)} ${(cx + r * 0.5).toFixed(1)} ${(cy + r * 0.54).toFixed(1)}`}
          fill="none" stroke="#f9c43d" strokeWidth={r * 0.17} strokeLinecap="round"
        />
      </>
    )
  }
  if (platform === 'TGT') {
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill="#cc0000" />
        <circle cx={cx} cy={cy} r={r * 0.60} fill="white" />
        <circle cx={cx} cy={cy} r={r * 0.30} fill="#cc0000" />
      </>
    )
  }
  // WMT — blue + 6-arm spark (3 lines at 0°/60°/120°)
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="#0071dc" />
      {([0, 60, 120] as const).map(deg => {
        const rad = (deg * Math.PI) / 180
        return (
          <line key={deg}
            x1={(cx + Math.cos(rad) * r * 0.62).toFixed(2)}
            y1={(cy + Math.sin(rad) * r * 0.62).toFixed(2)}
            x2={(cx - Math.cos(rad) * r * 0.62).toFixed(2)}
            y2={(cy - Math.sin(rad) * r * 0.62).toFixed(2)}
            stroke="#ffc220" strokeWidth={r * 0.26} strokeLinecap="round"
          />
        )
      })}
    </>
  )
}

function BubbleChart({ leaders, chartId }: { leaders: IndustryLeader[]; chartId: string }) {
  const [hovered, setHovered] = useState<number | null>(null)

  const W = 460, H = 232
  const PL = 46, PB = 34, PT = 12, PR = 56
  const cW = W - PL - PR, cH = H - PB - PT

  const parseMid = (range: string) => {
    const nums = range.replace(/[$,\s]/g, '').split(/\D+/).map(Number).filter(n => n > 0)
    return nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0] ?? 20
  }

  const midPrices = leaders.map(l => parseMid(l.priceRange))
  const maxRev    = Math.max(...leaders.map(l => l.reviewCount)) * 1.14
  const minPrice  = Math.min(...midPrices)
  const maxPrice  = Math.max(...midPrices)
  const priceSpan = maxPrice - minPrice
  const yAxisMin  = minPrice - priceSpan * 0.13
  const yAxisMax  = maxPrice + priceSpan * 0.13
  const goodMax   = minPrice + priceSpan / 3
  const betterMax = minPrice + (priceSpan * 2) / 3

  const toX = (r: number) => PL + (r / maxRev) * cW
  const toY = (p: number) => PT + cH * (1 - (p - yAxisMin) / (yAxisMax - yAxisMin))

  const bBestTop   = toY(yAxisMax), bBestBot   = toY(betterMax)
  const bBetterTop = toY(betterMax), bBetterBot = toY(goodMax)
  const bGoodTop   = toY(goodMax),   bGoodBot   = toY(yAxisMin)

  const yStep = priceSpan < 10 ? 2 : priceSpan < 22 ? 5 : 10
  const yTickStart = Math.ceil(yAxisMin / yStep) * yStep
  const yTicks: number[] = []
  for (let t = yTickStart; t <= yAxisMax + 0.01; t += yStep) yTicks.push(Math.round(t))

  const xTickStep = Math.ceil(maxRev / 4 / 100) * 100
  const xTicks: number[] = []
  for (let t = 0; t <= maxRev + 0.01; t += xTickStep) xTicks.push(Math.round(t))

  const R = 14
  const positions = leaders.map(l => ({ cx: toX(l.reviewCount), cy: toY(parseMid(l.priceRange)) }))

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <defs>
        {leaders.map((_, i) => (
          <clipPath key={i} id={`${chartId}-clip-${i}`}>
            <circle cx={positions[i].cx} cy={positions[i].cy} r={R} />
          </clipPath>
        ))}
      </defs>

      {/* Price tier bands */}
      <rect x={PL} y={bBestTop}   width={cW} height={bBestBot   - bBestTop}   fill="#e8eef5" opacity={0.7} />
      <rect x={PL} y={bBetterTop} width={cW} height={bBetterBot - bBetterTop} fill="#fef6e3" opacity={0.7} />
      <rect x={PL} y={bGoodTop}   width={cW} height={bGoodBot   - bGoodTop}   fill="#e8f5ed" opacity={0.7} />

      <line x1={PL} x2={PL + cW} y1={bBetterTop} y2={bBetterTop}
        stroke="var(--border2)" strokeWidth={0.8} strokeDasharray="3,4" />
      <line x1={PL} x2={PL + cW} y1={bGoodTop}   y2={bGoodTop}
        stroke="var(--border2)" strokeWidth={0.8} strokeDasharray="3,4" />

      <text x={PL + cW + 7} y={(bBestTop   + bBestBot)   / 2 + 3}
        fontSize={10} fill="var(--blue)"    fontWeight="700" fontFamily="IBM Plex Mono, monospace">BEST</text>
      <text x={PL + cW + 7} y={(bBetterTop + bBetterBot) / 2 + 3}
        fontSize={10} fill="var(--amber)"   fontWeight="700" fontFamily="IBM Plex Mono, monospace">BETTER</text>
      <text x={PL + cW + 7} y={(bGoodTop   + bGoodBot)   / 2 + 3}
        fontSize={10} fill="var(--accent2)" fontWeight="700" fontFamily="IBM Plex Mono, monospace">GOOD</text>

      {/* Axes */}
      <line x1={PL} x2={PL}      y1={PT}     y2={H - PB} stroke="var(--border2)" strokeWidth={1} />
      <line x1={PL} x2={PL + cW} y1={H - PB} y2={H - PB} stroke="var(--border2)" strokeWidth={1} />

      {/* X-axis */}
      {xTicks.map(t => (
        <g key={t}>
          <line x1={toX(t)} x2={toX(t)} y1={H - PB} y2={H - PB + 3}
            stroke="var(--border2)" strokeWidth={0.6} />
          <text x={toX(t)} y={H - PB + 13} fontSize={9} fill="var(--ink3)"
            textAnchor="middle" fontFamily="IBM Plex Mono, monospace">
            {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 === 0 ? 0 : 1)}k` : t}
          </text>
        </g>
      ))}
      <text x={PL + cW / 2} y={H - 1} fontSize={9} fill="var(--ink3)"
        textAnchor="middle" fontFamily="IBM Plex Mono, monospace" letterSpacing="0.5">REVIEWS</text>

      {/* Y-axis */}
      {yTicks.map(t => (
        <g key={t}>
          <line x1={PL - 3} x2={PL} y1={toY(t)} y2={toY(t)}
            stroke="var(--border2)" strokeWidth={0.6} />
          <text x={PL - 5} y={toY(t) + 3} fontSize={9} fill="var(--ink3)"
            textAnchor="end" fontFamily="IBM Plex Mono, monospace">${t}</text>
        </g>
      ))}
      <text x={11} y={PT + cH / 2} fontSize={9} fill="var(--ink3)"
        textAnchor="middle" transform={`rotate(-90,11,${PT + cH / 2})`}
        fontFamily="IBM Plex Mono, monospace" letterSpacing="0.5">PRICE</text>

      {/* Bubbles */}
      {leaders.map((leader, i) => {
        const { cx, cy } = positions[i]
        const color = PC[leader.platform]
        const isYou = leader.isYourProduct ?? false
        const isHov = hovered === i
        const tipW = 152, tipH = 68
        const rawTipX = cx + R + 8
        const tipX = Math.max(PL, Math.min(W - PR - tipW,
          rawTipX + tipW > W - PR ? cx - R - 10 - tipW : rawTipX))
        const tipY = Math.max(PT, Math.min(H - PB - tipH, cy - tipH / 2))

        return (
          <g key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer' }}
          >
            {/* Platform outer ring */}
            <circle cx={cx} cy={cy} r={R + 2.5}
              fill="none" stroke={color} strokeWidth={1.5} opacity={0.45} />
            {/* Platform icon clipped to bubble circle */}
            <g clipPath={`url(#${chartId}-clip-${i})`}>
              <PlatformFill platform={leader.platform} cx={cx} cy={cy} r={R} />
            </g>
            {/* Star badge for YOUR product */}
            {isYou && (
              <>
                <circle
                  cx={cx + R * 0.65} cy={cy - R * 0.65} r={R * 0.38}
                  fill="var(--amber)" stroke="white" strokeWidth={1.2}
                />
                <polygon
                  points={starPoints(cx + R * 0.65, cy - R * 0.65, R * 0.22, R * 0.10)}
                  fill="white"
                />
              </>
            )}
            {/* Hover tooltip */}
            {isHov && (
              <g>
                <rect x={tipX} y={tipY} width={tipW} height={tipH}
                  rx={6} fill="#1a1714" opacity={0.94} />
                <rect x={tipX} y={tipY} width={tipW} height={tipH}
                  rx={6} fill="none" stroke="#3d3830" strokeWidth={0.5} />
                <text x={tipX + 9} y={tipY + 15} fontSize={10} fill="white"
                  fontWeight="700" fontFamily="IBM Plex Sans, sans-serif">
                  {leader.name.length > 22 ? leader.name.slice(0, 22) + '…' : leader.name}
                </text>
                <text x={tipX + 9} y={tipY + 28} fontSize={9} fill="#8a7f75"
                  fontFamily="IBM Plex Mono, monospace">
                  {PN[leader.platform]} · {leader.priceRange}
                </text>
                <text x={tipX + 9} y={tipY + 41} fontSize={9} fill="#c0b5a8"
                  fontFamily="IBM Plex Mono, monospace">
                  {leader.reviewCount.toLocaleString()} reviews
                </text>
                <text x={tipX + 9} y={tipY + 54} fontSize={9}
                  fill={leader.velocityPct > 0 ? '#6ce09a' : '#f87070'}
                  fontFamily="IBM Plex Mono, monospace" fontWeight="700">
                  {leader.velocityPct > 0 ? '+' : ''}{leader.velocityPct}% vel · {leader.weeks}w
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function CategoryIntelligencePanel({ productId }: { productId: string }) {
  const intel = getCategoryIntel(productId)
  if (!intel) return null

  const hColor = intel.health.direction === 'growing' ? 'var(--accent2)'
    : intel.health.direction === 'declining' ? 'var(--accent)' : 'var(--amber)'

  const upcomers = intel.leaders
    .filter(l => !l.isYourProduct &&
      (l.momentum === 'emerging' || l.momentum === 'growing' || l.momentum === 'surging'))
    .slice(0, 3)

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '11px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <BarChart2 size={13} color="var(--blue)" />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Category Intelligence</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--ink3)', marginLeft: 4 }}>{intel.label}</span>
        <div style={{
          marginLeft: 8, display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px',
          background: hColor === 'var(--accent2)' ? 'var(--accent2-soft)' : hColor === 'var(--accent)' ? 'var(--accent-soft)' : '#fef6e3',
          borderRadius: 4,
        }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, color: hColor }}>
            {intel.health.direction === 'growing' ? '↑' : intel.health.direction === 'declining' ? '↓' : '→'} {intel.health.quarterlyChange}
          </span>
        </div>
      </div>

      {/* Main body: 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', borderBottom: '1px solid var(--border)' }}>

        {/* LEFT: Bubble chart + legend */}
        <div style={{ padding: '16px 18px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 10 }}>
            Price Map
          </div>
          <div style={{ marginBottom: 12 }}>
            <BubbleChart leaders={intel.leaders} chartId={productId} />
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {intel.leaders.map((leader, li) => {
              const color = PC[leader.platform]
              const mc = MOM[leader.momentum]
              return (
                <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: leader.isYourProduct ? '#fffaed' : `${color}1c`,
                    border: `1.5px solid ${leader.isYourProduct ? 'var(--amber)' : color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 700, color: leader.isYourProduct ? 'var(--amber)' : color }}>
                      {abbrevName(leader.name)}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--ink2)', flex: 1, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {leader.name.length > 28 ? leader.name.slice(0, 28) + '…' : leader.name}
                    {leader.isYourProduct && (
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, marginLeft: 6, padding: '1px 4px', borderRadius: 2, background: 'var(--amber)', color: 'white', fontWeight: 700 }}>YOU</span>
                    )}
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 700, color: leader.velocityPct >= 0 ? mc.color : 'var(--accent)', flexShrink: 0 }}>
                    {leader.velocityPct > 0 ? '+' : ''}{leader.velocityPct}%
                  </span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '1px 5px', borderRadius: 3, background: mc.bg, color: mc.color, fontWeight: 600, flexShrink: 0 }}>
                    {leader.momentum.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Upcomers */}
        <div style={{ padding: '16px 16px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 12 }}>
            Upcomers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomers.map((u, i) => {
              const mc = MOM[u.momentum]
              const peakVal = Math.max(...u.trendHistory)
              return (
                <div key={i} style={{ padding: '10px 12px', background: 'var(--warm-white)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3, marginBottom: 3 }}>{u.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: PC[u.platform] }} />
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>{PN[u.platform]}</span>
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>{u.priceRange}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 700, color: mc.color }}>
                        +{u.velocityPct}%
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>{u.weeks}w</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 18 }}>
                    {u.trendHistory.map((v, wi) => (
                      <div key={wi} style={{ flex: 1, height: `${Math.max(15, (v / peakVal) * 100)}%`, background: mc.color, borderRadius: '1px 1px 0 0', opacity: 0.3 + (wi / 7) * 0.7 }} />
                    ))}
                  </div>
                </div>
              )
            })}
            {upcomers.length === 0 && (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 11, color: 'var(--mid)' }}>
                No emerging SKUs detected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Actions + Health */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px' }}>
        <div style={{ padding: '14px 18px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 10 }}>
            Pricing Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {intel.decisions.map((d, i) => {
              const dc = DCFG[d.type]
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: dc.bg, color: dc.color, flexShrink: 0, marginTop: 1 }}>
                    {dc.label}
                  </span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{d.headline}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink3)', lineHeight: 1.5 }}>{d.detail}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)' }}>Health</div>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: hColor, lineHeight: 1 }}>
              {intel.health.direction === 'growing' ? '↑' : intel.health.direction === 'declining' ? '↓' : '→'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: hColor, textTransform: 'capitalize', marginTop: 2 }}>{intel.health.direction}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: hColor, fontWeight: 700 }}>{intel.health.quarterlyChange}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)' }}>Avg ASP</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600, color: 'var(--ink2)' }}>{intel.health.avgAsp}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: 'var(--ink3)' }}>Platform lead</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: PC[intel.health.topPlatform] }} />
                <span style={{ fontSize: 10, color: 'var(--ink2)' }}>{PN[intel.health.topPlatform]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
