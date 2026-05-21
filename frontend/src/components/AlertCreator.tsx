'use client'
import { useState } from 'react'
import Image from 'next/image'
import { X, Bell, Plus, Trash2, CheckCircle, ChevronDown } from 'lucide-react'
import { PRODUCTS, PLATFORMS } from '../lib/data'

interface CustomAlert {
  id: string
  productId: string
  platformId: string
  condition: 'drops_below' | 'rises_above' | 'changes_by'
  threshold: number
  active: boolean
  createdAt: string
}

const CONDITION_LABELS: Record<CustomAlert['condition'], string> = {
  drops_below: 'Drops below',
  rises_above: 'Rises above',
  changes_by:  'Changes by more than',
}

const DEFAULT_ALERTS: CustomAlert[] = [
  { id: 'ca1', productId: 'CLR-GLSS-001', platformId: 'AMZ', condition: 'drops_below', threshold: 18.00, active: true, createdAt: '2 days ago' },
  { id: 'ca2', productId: 'WHT-TEE-3340', platformId: 'TGT', condition: 'changes_by',  threshold: 15,    active: true, createdAt: '5 days ago' },
  { id: 'ca3', productId: 'DNM-JNS-4450', platformId: 'WMT', condition: 'drops_below', threshold: 25.00, active: false, createdAt: '1 week ago' },
]

interface Props {
  onClose: () => void
}

export default function AlertCreator({ onClose }: Props) {
  const [alerts, setAlerts] = useState<CustomAlert[]>(DEFAULT_ALERTS)
  const [productId, setProductId] = useState(PRODUCTS[0].id)
  const [platformId, setPlatformId] = useState('AMZ')
  const [condition, setCondition] = useState<CustomAlert['condition']>('drops_below')
  const [threshold, setThreshold] = useState('')
  const [saved, setSaved] = useState(false)

  const selectedProduct = PRODUCTS.find(p => p.id === productId)!
  const selectedPlatform = PLATFORMS.find(p => p.id === platformId)!

  const currentPrice = selectedProduct.listings[platformId]?.currentPrice ?? 0

  const saveAlert = () => {
    if (!threshold || isNaN(parseFloat(threshold))) return
    const newAlert: CustomAlert = {
      id: `ca-${Date.now()}`,
      productId,
      platformId,
      condition,
      threshold: parseFloat(threshold),
      active: true,
      createdAt: 'just now',
    }
    setAlerts(prev => [newAlert, ...prev])
    setThreshold('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))
  }

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  const getProduct = (id: string) => PRODUCTS.find(p => p.id === id)
  const getPlatform = (id: string) => PLATFORMS.find(p => p.id === id)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.35)', zIndex: 1050, backdropFilter: 'blur(2px)' }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'var(--cream)', zIndex: 1051,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s cubic-bezier(0.175,0.885,0.32,1.1) both',
      }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 16px', borderBottom: '1px solid var(--border)', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={15} color="var(--cream)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', fontFamily: "'Playfair Display', serif" }}>Price Alert Manager</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--cream)', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        {/* Content scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Create new alert */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={13} color="var(--accent)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Create New Alert</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Product selector */}
              <div>
                <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', display: 'block', marginBottom: 6 }}>
                  Product
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={productId}
                    onChange={e => setProductId(e.target.value)}
                    style={{ width: '100%', padding: '8px 30px 8px 10px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--ink)', outline: 'none', appearance: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    {PRODUCTS.map(p => (
                      <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} color="var(--mid)" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
                {selectedProduct && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--warm-white)', borderRadius: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 5, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                      <Image src={selectedProduct.imageUrl} alt={selectedProduct.name} fill sizes="28px" style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>Current price on {selectedPlatform.name}</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>${currentPrice.toFixed(2)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Platform + Condition row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', display: 'block', marginBottom: 6 }}>Platform</label>
                  <div style={{ position: 'relative' }}>
                    <select value={platformId} onChange={e => setPlatformId(e.target.value)} style={{ width: '100%', padding: '8px 28px 8px 10px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--ink)', outline: 'none', appearance: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                      {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown size={12} color="var(--mid)" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', display: 'block', marginBottom: 6 }}>Condition</label>
                  <div style={{ position: 'relative' }}>
                    <select value={condition} onChange={e => setCondition(e.target.value as CustomAlert['condition'])} style={{ width: '100%', padding: '8px 28px 8px 10px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--ink)', outline: 'none', appearance: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                      {(Object.keys(CONDITION_LABELS) as CustomAlert['condition'][]).map(c => (
                        <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} color="var(--mid)" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Threshold */}
              <div>
                <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', display: 'block', marginBottom: 6 }}>
                  {condition === 'changes_by' ? 'Threshold (%)' : 'Price ($)'}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--mid)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    {condition === 'changes_by' ? '%' : '$'}
                  </span>
                  <input
                    type="number"
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                    placeholder={condition === 'changes_by' ? '10' : '20.00'}
                    style={{ width: '100%', padding: '8px 10px 8px 28px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, color: 'var(--ink)', outline: 'none', fontFamily: "'IBM Plex Mono', monospace" }}
                  />
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={saveAlert}
                disabled={!threshold}
                style={{
                  padding: '9px 0', background: saved ? 'var(--accent2)' : 'var(--ink)', color: 'var(--cream)',
                  border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'background .2s',
                }}
              >
                {saved ? <><CheckCircle size={13} /> Alert Saved!</> : <><Plus size={13} /> Create Alert</>}
              </button>
            </div>
          </div>

          {/* Active alerts list */}
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span>Active Alerts ({alerts.filter(a => a.active).length}/{alerts.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map(alert => {
                const product = getProduct(alert.productId)
                const platform = getPlatform(alert.platformId)
                if (!product || !platform) return null
                return (
                  <div key={alert.id} style={{
                    background: 'white', border: `1px solid ${alert.active ? 'var(--border)' : 'var(--sand)'}`,
                    borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
                    opacity: alert.active ? 1 : 0.55,
                  }}>
                    {/* Product image */}
                    <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                      <Image src={product.imageUrl} alt={product.name} fill sizes="32px" style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.emoji} {product.name.split(' ').slice(0, 3).join(' ')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: platform.color }} />
                        <span style={{ fontSize: 10, color: 'var(--ink3)' }}>{platform.name}</span>
                        <span style={{ fontSize: 10, color: 'var(--mid)' }}>·</span>
                        <span style={{ fontSize: 10, color: 'var(--ink3)' }}>
                          {CONDITION_LABELS[alert.condition]} {alert.condition === 'changes_by' ? `${alert.threshold}%` : `$${alert.threshold.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                    {/* Toggle */}
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      style={{
                        width: 32, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
                        background: alert.active ? 'var(--accent2)' : 'var(--sand)', position: 'relative',
                        flexShrink: 0, transition: 'background .2s',
                      }}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%', background: 'white',
                        position: 'absolute', top: 2, left: alert.active ? 16 : 2,
                        transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }} />
                    </button>
                    <button onClick={() => removeAlert(alert.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', padding: 2, display: 'flex' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  )
}
