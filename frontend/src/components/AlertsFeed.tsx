'use client'
import { useState, useEffect } from 'react'
import {
  TrendingDown, TrendingUp, Tag, ShoppingBag, Zap, Bell, AlertTriangle, CheckCircle, Info,
} from 'lucide-react'
import { INITIAL_ALERTS, PLATFORMS } from '../lib/data'
import type { Alert, AlertType } from '../lib/types'

const TYPE_CONFIG: Record<AlertType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  price_drop:     { icon: <TrendingDown size={13} />, label: 'Price Drop',    color: '#c8410a', bg: '#fef0e8' },
  promo_detected: { icon: <Tag size={13} />,          label: 'Promo',         color: '#c87d0a', bg: '#fef6e3' },
  new_match:      { icon: <CheckCircle size={13} />,  label: 'New Match',     color: '#1a6b3c', bg: '#e8f5ed' },
  stock_alert:    { icon: <ShoppingBag size={13} />,  label: 'Stock Alert',   color: '#c87d0a', bg: '#fef6e3' },
  price_spike:    { icon: <TrendingUp size={13} />,   label: 'Price Spike',   color: '#1a6b3c', bg: '#e8f5ed' },
  recommendation: { icon: <Zap size={13} />,          label: 'Insight',       color: '#1a3f6b', bg: '#e8eef5' },
  undercut:       { icon: <AlertTriangle size={13} />,label: 'Undercut',      color: '#c8410a', bg: '#fef0e8' },
}

const SEVERITY_CONFIG = {
  critical: { icon: <AlertTriangle size={11} />, color: '#c8410a', label: 'Critical' },
  warning:  { icon: <Info size={11} />,          color: '#c87d0a', label: 'Warning'  },
  info:     { icon: <CheckCircle size={11} />,   color: '#1a6b3c', label: 'Info'     },
}

const SYNTHETIC_ALERTS: Omit<Alert, 'id' | 'timestamp' | 'isNew'>[] = [
  {
    type: 'price_drop',
    productId: 'WHT-SNK-2201',
    productName: 'White Canvas Sneakers',
    platformId: 'WMT',
    message: 'Walmart dropped sneaker price to $22.99',
    detail: 'Walmart cut from $24.99 → $22.99. You are now $10 above Walmart. Consider a temporary counter-promotion.',
    severity: 'critical',
    actionLabel: 'Create Counter-Promo',
  },
  {
    type: 'recommendation',
    productId: 'DNM-JNS-4450',
    productName: 'Blue Denim Jeans',
    platformId: 'WMT',
    message: 'Review velocity signal on Walmart Jeans',
    detail: 'Walmart jeans page views +34% in 48 hours. Demand signal elevated. Hold price to capture margin.',
    severity: 'info',
    actionLabel: 'View Trend',
  },
  {
    type: 'new_match',
    productId: 'BLK-BCK-0087',
    productName: 'Black Nylon Backpack',
    platformId: 'TGT',
    message: 'New Target listing matches BLK-BCK-0087',
    detail: 'Target listing #TGT-BG-9134 identified — 82% visual match. Priced at $24.99 vs your $25.99.',
    severity: 'info',
    actionLabel: 'Confirm Match',
  },
]

export default function AlertsFeed() {
  const [alerts, setAlerts] = useState<Alert[]>(INITIAL_ALERTS)
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const [syntheticIdx, setSyntheticIdx] = useState(0)

  // Inject a new synthetic alert every 18 seconds to simulate live feed
  useEffect(() => {
    const t = setInterval(() => {
      setSyntheticIdx(i => {
        const next = i % SYNTHETIC_ALERTS.length
        const template = SYNTHETIC_ALERTS[next]
        const newAlert: Alert = {
          ...template,
          id: `live-${Date.now()}`,
          timestamp: 'just now',
          isNew: true,
        }
        setAlerts(prev => [newAlert, ...prev])
        return i + 1
      })
    }, 18000)
    return () => clearInterval(t)
  }, [])

  const filtered = alerts.filter(a => filter === 'all' || a.severity === filter)
  const counts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    warning:  alerts.filter(a => a.severity === 'warning').length,
    info:     alerts.filter(a => a.severity === 'info').length,
  }

  const getPlatform = (id: string) => PLATFORMS.find(p => p.id === id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {[
          { label: 'Total Alerts',  value: alerts.length,    color: 'var(--ink)',    bg: 'white'                 },
          { label: 'Critical',      value: counts.critical,  color: 'var(--accent)', bg: 'var(--accent-soft)'    },
          { label: 'Warnings',      value: counts.warning,   color: 'var(--amber)',  bg: 'var(--amber-soft)'     },
          { label: 'Informational', value: counts.info,      color: 'var(--blue)',   bg: 'var(--blue-soft)'      },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '16px 18px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', background: s.bg }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs + feed */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '11px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bell size={13} color="var(--ink2)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Intelligence Feed</span>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent2)', marginLeft: 2 }} className="blink" />
          </div>
          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'critical', 'warning', 'info'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '3px 10px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 500,
                  textTransform: 'uppercase', letterSpacing: '.5px',
                  background: filter === f ? 'var(--ink)' : 'var(--paper)',
                  color: filter === f ? 'var(--cream)' : 'var(--ink3)',
                  transition: 'all .12s',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Alert items */}
        <div>
          {filtered.map((alert, i) => {
            const typeConf = TYPE_CONFIG[alert.type]
            const sevConf = SEVERITY_CONFIG[alert.severity]
            const platform = getPlatform(alert.platformId)
            return (
              <div
                key={alert.id}
                className={alert.isNew ? 'slide-in' : ''}
                style={{
                  padding: '14px 18px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  background: alert.isNew ? (alert.severity === 'critical' ? '#fff9f8' : '#f9fffe') : 'white',
                  transition: 'background .3s',
                }}
              >
                {/* Type icon */}
                <div style={{ width: 32, height: 32, borderRadius: 7, background: typeConf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, color: typeConf.color }}>
                  {typeConf.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 3, gap: 8 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {alert.isNew && (
                          <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'var(--accent)', color: 'white', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, letterSpacing: '.5px' }}>NEW</span>
                        )}
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{alert.message}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{alert.productName}</span>
                        {platform && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: platform.color }} />
                            <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{platform.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: sevConf.color }}>
                        {sevConf.icon}
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: sevConf.color, fontWeight: 500 }}>{sevConf.label}</span>
                      </div>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>{alert.timestamp}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--ink3)', lineHeight: 1.55, marginBottom: alert.actionLabel ? 8 : 0 }}>{alert.detail}</p>
                  {alert.actionLabel && (
                    <button style={{
                      padding: '4px 12px', background: 'var(--ink)', color: 'var(--cream)',
                      border: 'none', borderRadius: 4, fontSize: 10, fontWeight: 600,
                      cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif",
                      letterSpacing: '.3px',
                    }}>
                      {alert.actionLabel}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
