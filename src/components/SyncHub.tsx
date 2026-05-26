'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  GitPullRequest, CheckCircle, XCircle, Clock, AlertTriangle,
  Zap, TrendingDown, TrendingUp, ChevronRight, Play,
  BarChart2, Package, Scale, Target, Megaphone,
} from 'lucide-react'
import { INITIAL_PCRS, DEPT_CONFIG } from '../lib/departmentData'
import { PRODUCTS, PLATFORMS } from '../lib/data'
import { getSmartTime } from '../lib/timeUtils'
import type { PriceChangeRequest, DeptId, PCRStatus, DeptApproval } from '../lib/departmentData'

const STATUS_CONFIG: Record<PCRStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'var(--mid)',    bg: 'var(--paper)',        icon: <Clock size={11} />        },
  in_review: { label: 'In Review', color: 'var(--amber)',  bg: 'var(--amber-soft)',   icon: <Clock size={11} />        },
  approved:  { label: 'Approved',  color: 'var(--accent2)',bg: 'var(--accent2-soft)', icon: <CheckCircle size={11} />  },
  blocked:   { label: 'Blocked',   color: 'var(--accent)', bg: 'var(--accent-soft)',  icon: <XCircle size={11} />      },
  live:      { label: 'Live',      color: '#10b981',       bg: '#d1fae5',             icon: <Play size={11} />         },
}

const APPROVAL_CONFIG: Record<DeptApproval['status'], { color: string; bg: string; label: string; icon: React.ReactNode }> = {
  pending:      { color: 'var(--mid)',    bg: 'var(--paper)',        label: 'Pending',       icon: <Clock size={12} />       },
  reviewing:    { color: 'var(--amber)',  bg: 'var(--amber-soft)',   label: 'Reviewing',     icon: <Clock size={12} />       },
  approved:     { color: 'var(--accent2)',bg: 'var(--accent2-soft)', label: 'Approved',      icon: <CheckCircle size={12} /> },
  flagged:      { color: 'var(--accent)', bg: 'var(--accent-soft)',  label: 'Flagged',       icon: <AlertTriangle size={12}/> },
  auto_approved:{ color: '#10b981',       bg: '#d1fae5',             label: 'Auto-approved', icon: <Zap size={12} />         },
  na:           { color: 'var(--sand)',   bg: 'var(--paper)',        label: 'N/A',           icon: <span style={{fontSize:10}}>-</span> },
}

const DEPT_ICONS: Record<DeptId, React.ReactNode> = {
  marketing:     <Megaphone size={13} />,
  finance:       <BarChart2 size={13} />,
  supply_chain:  <Package size={13} />,
  legal:         <Scale size={13} />,
  category_mgmt: <Target size={13} />,
}

const DEPT_ORDER: DeptId[] = ['marketing', 'finance', 'supply_chain', 'legal', 'category_mgmt']

function getProduct(id: string) { return PRODUCTS.find(p => p.id === id) }
function getPlatform(id: string) { return PLATFORMS.find(p => p.id === id) }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function PcrRow({ pcr, selected, onSelect }: { pcr: PriceChangeRequest; selected: boolean; onSelect: () => void }) {
  const sc = STATUS_CONFIG[pcr.overallStatus]
  const product = getProduct(pcr.productId)
  const platform = getPlatform(pcr.platformId)
  const approvedCount = DEPT_ORDER.filter(d => ['approved', 'auto_approved'].includes(pcr.departments[d].status)).length
  const blockedCount  = DEPT_ORDER.filter(d => pcr.departments[d].status === 'flagged').length

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '11px 14px', borderBottom: '1px solid var(--border)',
        cursor: 'pointer', background: selected ? 'white' : 'transparent',
        borderLeft: `3px solid ${selected ? sc.color : 'transparent'}`,
        paddingLeft: selected ? 11 : 14,
        transition: 'background .1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {product && (
          <div style={{ width: 36, height: 36, borderRadius: 7, overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid var(--border)' }}>
            <Image src={product.imageUrl} alt={product.name} fill sizes="36px" style={{ objectFit: 'cover' }} unoptimized />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--blue)' }}>{pcr.id.toUpperCase()}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 3, background: sc.bg, color: sc.color, fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, fontWeight: 600, letterSpacing: '.3px' }}>
              {sc.icon} {sc.label.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
            {pcr.productEmoji} {pcr.productName}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {platform && <div style={{ width: 6, height: 6, borderRadius: '50%', background: platform.color }} />}
              <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{platform?.name}</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: pcr.changePercent < 0 ? 'var(--accent2)' : 'var(--accent)', fontWeight: 600 }}>
                {pcr.changePercent > 0 ? '+' : ''}{pcr.changePercent.toFixed(1)}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {blockedCount > 0 && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--accent-soft)', color: 'var(--accent)', fontFamily: "'IBM Plex Mono', monospace" }}>{blockedCount} flagged</span>}
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'var(--accent2-soft)', color: 'var(--accent2)', fontFamily: "'IBM Plex Mono', monospace" }}>{approvedCount}/{DEPT_ORDER.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeptCard({ deptId, approval, isLast, onApprove }: { deptId: DeptId; approval: DeptApproval; isLast: boolean; onApprove?: () => void }) {
  const dept = DEPT_CONFIG[deptId]
  const ac   = APPROVAL_CONFIG[approval.status]

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
      <div style={{
        flex: 1, padding: '14px 16px',
        background: 'white', border: '1px solid var(--border)', borderRadius: 8,
        borderLeft: `3px solid ${ac.color}`,
      }}>
        {/* Dept header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: dept.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: dept.color, flexShrink: 0 }}>
            {DEPT_ICONS[deptId]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>{dept.name}</div>
            <div style={{ fontSize: 9, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>{dept.role}</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 4, background: ac.bg, color: ac.color, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
            {ac.icon} {ac.label}
          </div>
        </div>

        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5, marginBottom: approval.comment ? 8 : 0 }}>
          {approval.metrics.map(m => {
            const mc = m.status === 'good' ? 'var(--accent2)' : m.status === 'bad' ? 'var(--accent)' : m.status === 'warn' ? 'var(--amber)' : 'var(--ink3)'
            return (
              <div key={m.label} style={{ padding: '5px 8px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 5 }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 1 }}>{m.label}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: mc }}>{m.value}</div>
              </div>
            )
          })}
        </div>

        {/* Comment */}
        {approval.comment && (
          <div style={{ padding: '6px 8px', background: 'var(--warm-white)', borderRadius: 5, fontSize: 10, color: 'var(--ink3)', lineHeight: 1.5, marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: dept.color, color: 'white', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {approval.initials}
              </div>
              <span>{approval.comment}</span>
            </div>
          </div>
        )}

        {/* Approve button for pending/reviewing */}
        {(approval.status === 'pending' || approval.status === 'reviewing') && onApprove && (
          <button
            onClick={onApprove}
            style={{
              width: '100%', padding: '6px 0', background: 'var(--ink)', color: 'var(--cream)',
              border: 'none', borderRadius: 5, fontSize: 10, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            <CheckCircle size={11} /> Approve
          </button>
        )}

        {/* Timestamp */}
        {approval.timestampMs && (
          <div style={{ marginTop: 5, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>
            {getSmartTime(approval.timestampMs)}
          </div>
        )}
      </div>

      {/* Arrow connector */}
      {!isLast && (
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--sand)' }}>
          <ChevronRight size={16} />
        </div>
      )}
    </div>
  )
}

export default function SyncHub() {
  const [pcrs, setPcrs] = useState<PriceChangeRequest[]>(INITIAL_PCRS)
  const [selectedId, setSelectedId] = useState(INITIAL_PCRS[0].id)
  const [, setTick] = useState(0)

  // Update timestamps every minute
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const approve = useCallback((pcrId: string, deptId: DeptId) => {
    setPcrs(prev => prev.map(pcr => {
      if (pcr.id !== pcrId) return pcr
      const updated = {
        ...pcr,
        departments: {
          ...pcr.departments,
          [deptId]: { ...pcr.departments[deptId], status: 'approved' as const, timestampMs: Date.now() },
        },
      }
      // Recalculate overall status
      const allApproved = DEPT_ORDER
        .filter(d => updated.departments[d].isBlocking)
        .every(d => ['approved', 'auto_approved'].includes(updated.departments[d].status))
      const anyBlocked  = DEPT_ORDER.some(d => updated.departments[d].status === 'flagged' && updated.departments[d].isBlocking)
      updated.overallStatus = anyBlocked ? 'blocked' : allApproved ? 'approved' : 'in_review'
      return updated
    }))
  }, [])

  const selected = pcrs.find(p => p.id === selectedId)!
  const product  = getProduct(selected.productId)
  const platform = getPlatform(selected.platformId)
  const sc       = STATUS_CONFIG[selected.overallStatus]
  const triggerConf: Record<string, { color: string; label: string }> = {
    competitor_drop: { color: 'var(--accent)',  label: 'Competitor Drop'    },
    promotion:       { color: 'var(--amber)',   label: 'Promotion'          },
    inventory_push:  { color: 'var(--blue)',    label: 'Inventory Push'     },
    strategic:       { color: 'var(--accent2)', label: 'Strategic Decision' },
    manual:          { color: 'var(--mid)',      label: 'Manual'             },
  }
  const tc = triggerConf[selected.triggerType] ?? { color: 'var(--mid)', label: selected.triggerType }

  const kpis = {
    total:    pcrs.length,
    live:     pcrs.filter(p => p.overallStatus === 'live').length,
    inReview: pcrs.filter(p => p.overallStatus === 'in_review').length,
    blocked:  pcrs.filter(p => p.overallStatus === 'blocked').length,
    approved: pcrs.filter(p => p.overallStatus === 'approved').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: 'Price Change Requests', value: kpis.total,    color: 'var(--ink)',    bg: 'white'                 },
          { label: 'Live',                  value: kpis.live,     color: '#10b981',       bg: '#d1fae5'               },
          { label: 'In Review',             value: kpis.inReview, color: 'var(--amber)',  bg: 'var(--amber-soft)'     },
          { label: 'Blocked',               value: kpis.blocked,  color: 'var(--accent)', bg: 'var(--accent-soft)'    },
          { label: 'Approved / Pending Live', value: kpis.approved, color: 'var(--accent2)', bg: 'var(--accent2-soft)' },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '16px 18px', borderRight: i < 4 ? '1px solid var(--border)' : 'none', background: s.bg }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '264px 1fr', gap: 18 }}>

        {/* Left: PCR queue */}
        <div style={{ background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <GitPullRequest size={13} color="var(--blue)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Price Change Queue</span>
          </div>
          <div>
            {pcrs.map(pcr => (
              <PcrRow key={pcr.id} pcr={pcr} selected={pcr.id === selectedId} onSelect={() => setSelectedId(pcr.id)} />
            ))}
          </div>
        </div>

        {/* Right: Selected PCR detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* PCR header */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {product && (
                <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', position: 'relative', flexShrink: 0, border: '1px solid var(--border)' }}>
                  <Image src={product.imageUrl} alt={product.name} fill sizes="56px" style={{ objectFit: 'cover' }} unoptimized />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--blue)' }}>{selected.id.toUpperCase()}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600 }}>
                    {sc.icon} {sc.label.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, background: selected.priority === 'urgent' ? 'var(--accent-soft)' : selected.priority === 'high' ? 'var(--amber-soft)' : 'var(--blue-soft)', color: selected.priority === 'urgent' ? 'var(--accent)' : selected.priority === 'high' ? 'var(--amber)' : 'var(--blue)', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, textTransform: 'uppercase' }}>
                    {selected.priority}
                  </span>
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>
                  {selected.productEmoji} {selected.productName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {platform && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: platform.color }} />
                      <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{platform.name}</span>
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--mid)' }}>·</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--ink3)' }}>
                    ${selected.currentPrice.toFixed(2)} →
                  </span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: selected.changePercent < 0 ? 'var(--accent2)' : 'var(--accent)' }}>
                    ${selected.proposedPrice.toFixed(2)}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: selected.changePercent < 0 ? 'var(--accent2)' : 'var(--accent)', fontWeight: 700 }}>
                    {selected.changePercent < 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                    {selected.changePercent > 0 ? '+' : ''}{selected.changePercent.toFixed(1)}%
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, background: `${tc.color}22`, color: tc.color, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                    {tc.label.toUpperCase()}
                  </span>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>
                  {selected.triggerLabel}
                </div>
                <div style={{ marginTop: 4, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>
                  Initiated by {selected.createdBy} · {getSmartTime(selected.createdMs)}
                </div>
              </div>
            </div>
          </div>

          {/* Department workflow swimlane */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Cross-Department Approval Workflow</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--mid)' }}>
                {DEPT_ORDER.filter(d => ['approved','auto_approved'].includes(selected.departments[d].status)).length}/{DEPT_ORDER.length} approved
              </span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', gap: 0, alignItems: 'stretch', overflowX: 'auto' }}>
              {DEPT_ORDER.map((deptId, i) => (
                <DeptCard
                  key={deptId}
                  deptId={deptId}
                  approval={selected.departments[deptId]}
                  isLast={i === DEPT_ORDER.length - 1}
                  onApprove={
                    (selected.departments[deptId].status === 'pending' || selected.departments[deptId].status === 'reviewing')
                      ? () => approve(selected.id, deptId)
                      : undefined
                  }
                />
              ))}
            </div>
          </div>

          {/* Notes / timeline */}
          {selected.notes.length > 0 && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                Activity Log
              </div>
              <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selected.notes.map((note, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: note.startsWith('BLOCKED') || note.startsWith('FLAGGED') ? 'var(--accent)' : note.startsWith('LIVE') ? '#10b981' : 'var(--mid)', marginTop: 4, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.5 }}>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Department breakdown summary bar */}
          <div style={{ display: 'flex', gap: 8 }}>
            {DEPT_ORDER.map(d => {
              const dept = DEPT_CONFIG[d]
              const appr = selected.departments[d]
              const ac   = APPROVAL_CONFIG[appr.status]
              return (
                <div key={d} style={{ flex: 1, padding: '8px 10px', background: ac.bg, border: `1px solid ${ac.color}40`, borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, marginBottom: 3 }}>{dept.icon}</div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: dept.color, fontWeight: 600, letterSpacing: '.3px' }}>{dept.shortName}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: 3, color: ac.color }}>{ac.icon}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Explainer */}
      <div style={{ padding: '12px 16px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', gap: 10 }}>
        <GitPullRequest size={13} color="var(--mid)" style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--ink2)' }}>How it works:</strong> Every price change - whether triggered by a competitor move, marketing promotion, or inventory signal - flows through a cross-functional approval chain. Marketing checks campaign alignment, Finance validates margin impact, Supply Chain confirms inventory readiness, Legal verifies MAP compliance, and Category Management reviews strategic positioning. Blocking departments must approve before the price goes live. Click <strong style={{ color: 'var(--ink2)' }}>Approve</strong> on any pending department card above to simulate real-time sign-off.
        </div>
      </div>
    </div>
  )
}
