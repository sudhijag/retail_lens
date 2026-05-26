'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, TrendingDown, TrendingUp, Volume2, VolumeX } from 'lucide-react'
import { PRODUCTS, PLATFORMS } from '../lib/data'

export interface PriceToast {
  id: string
  productId: string
  productName: string
  productEmoji: string
  productImage: string
  platformId: string
  platformName: string
  platformColor: string
  oldPrice: number
  newPrice: number
  type: 'drop' | 'rise'
  timestamp: number
}

// Web Audio API price-change sound
function playTone(type: 'drop' | 'rise') {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = 'sine'
    if (type === 'drop') {
      osc.frequency.setValueAtTime(660, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(330, ctx.currentTime + 0.25)
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2)
    }
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
    setTimeout(() => ctx.close(), 600)
  } catch {}
}

// Generate a realistic price-change toast from live data
function generateToast(): PriceToast {
  const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)]
  const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)]
  const base = product.listings[platform.id].currentPrice
  const dropChance = 0.65 // price drops more dramatic for demo
  const type = Math.random() < dropChance ? 'drop' : 'rise'
  const changePct = 0.04 + Math.random() * 0.14 // 4–18%
  const oldPrice = type === 'drop'
    ? Math.round(base * (1 + changePct) * 100) / 100
    : Math.round(base * (1 - changePct) * 100) / 100
  return {
    id: `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    productId: product.id,
    productName: product.name,
    productEmoji: product.emoji,
    productImage: product.imageUrl,
    platformId: platform.id,
    platformName: platform.name,
    platformColor: platform.color,
    oldPrice,
    newPrice: base,
    type,
    timestamp: Date.now(),
  }
}

const TOAST_DURATION_MS = 6000

function SingleToast({ toast, onDismiss, soundEnabled }: { toast: PriceToast; onDismiss: (id: string) => void; soundEnabled: boolean }) {
  const [progress, setProgress] = useState(100)
  const [visible, setVisible] = useState(false)
  const soundedRef = useRef(false)

  useEffect(() => {
    // Mount animation
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // Play sound on first render
    if (!soundedRef.current && soundEnabled) {
      soundedRef.current = true
      playTone(toast.type)
    }
  }, [toast.type, soundEnabled])

  useEffect(() => {
    // Progress bar countdown
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / TOAST_DURATION_MS) * 100)
      setProgress(remaining)
      if (remaining === 0) {
        clearInterval(interval)
        setVisible(false)
        setTimeout(() => onDismiss(toast.id), 280)
      }
    }, 50)
    return () => clearInterval(interval)
  }, [toast.id, onDismiss])

  const change = toast.newPrice - toast.oldPrice
  const changePct = ((change / toast.oldPrice) * 100).toFixed(1)
  const isDropp = toast.type === 'drop'

  return (
    <div style={{
      width: 320,
      background: 'white',
      border: '1px solid var(--border)',
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
      transform: visible ? 'translateX(0) scale(1)' : 'translateX(340px) scale(0.95)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.28s cubic-bezier(0.175,0.885,0.32,1.275), opacity 0.25s ease',
      pointerEvents: 'all',
    }}>
      {/* Top accent */}
      <div style={{ height: 3, background: isDropp ? 'var(--accent)' : 'var(--accent2)' }} />

      <div style={{ padding: '11px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {/* Product image */}
        <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid var(--border)' }}>
          <Image src={toast.productImage} alt={toast.productName} fill sizes="40px" style={{ objectFit: 'cover' }} unoptimized />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: toast.platformColor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>{toast.platformName}</span>
            </div>
            <button onClick={() => onDismiss(toast.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--mid)', display: 'flex' }}>
              <X size={12} />
            </button>
          </div>

          <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {toast.productEmoji} {toast.productName}
          </div>

          {/* Price change */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'var(--ink3)', textDecoration: 'line-through' }}>
              ${toast.oldPrice.toFixed(2)}
            </span>
            <span style={{ color: 'var(--mid)', fontSize: 10 }}>→</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              ${toast.newPrice.toFixed(2)}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 2,
              fontSize: 10, fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace",
              color: isDropp ? 'var(--accent)' : 'var(--accent2)',
              background: isDropp ? 'var(--accent-soft)' : 'var(--accent2-soft)',
              padding: '1px 5px', borderRadius: 4,
            }}>
              {isDropp ? <TrendingDown size={9} /> : <TrendingUp size={9} />}
              {isDropp ? '' : '+'}{changePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--paper)' }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: isDropp ? 'var(--accent)' : 'var(--accent2)',
          transition: 'width 0.05s linear',
        }} />
      </div>
    </div>
  )
}

interface Props {
  onNewToast?: (toast: PriceToast) => void
}

export default function ToastSystem({ onNewToast }: Props) {
  const [toasts, setToasts] = useState<PriceToast[]>([])
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [soundUnlocked, setSoundUnlocked] = useState(false)

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Unlock audio context on first user interaction
  const unlockSound = useCallback(() => {
    setSoundUnlocked(true)
    setSoundEnabled(true)
    // Play a silent tone to unlock AudioContext
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.001)
      setTimeout(() => ctx.close(), 200)
    } catch {}
  }, [])

  // Generate price change toasts periodically
  useEffect(() => {
    // First toast after 3 seconds
    const first = setTimeout(() => {
      const t = generateToast()
      setToasts(prev => [t, ...prev].slice(0, 5))
      onNewToast?.(t)
    }, 3000)

    // Then every 8-15 seconds
    const interval = setInterval(() => {
      const t = generateToast()
      setToasts(prev => [t, ...prev].slice(0, 5))
      onNewToast?.(t)
    }, 8000 + Math.random() * 7000)

    return () => { clearTimeout(first); clearInterval(interval) }
  }, [onNewToast])

  return (
    <>
      {/* Sound toggle button - fixed top-left area of toast zone */}
      <div style={{
        position: 'fixed', top: 66, right: 24, zIndex: 999,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {!soundUnlocked ? (
          <button
            onClick={unlockSound}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', background: 'white',
              border: '1px solid var(--border)', borderRadius: 6,
              fontSize: 10, color: 'var(--ink3)', cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <VolumeX size={11} /> Enable Price Alerts Sound
          </button>
        ) : (
          <button
            onClick={() => setSoundEnabled(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', background: soundEnabled ? 'var(--ink)' : 'white',
              border: '1px solid var(--border)', borderRadius: 6,
              fontSize: 10, color: soundEnabled ? 'var(--cream)' : 'var(--ink3)', cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 500,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            {soundEnabled ? <Volume2 size={11} /> : <VolumeX size={11} />}
            {soundEnabled ? 'Sound On' : 'Sound Off'}
          </button>
        )}
      </div>

      {/* Toast stack */}
      <div style={{
        position: 'fixed', top: 96, right: 24, zIndex: 1000,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(toast => (
          <SingleToast
            key={toast.id}
            toast={toast}
            onDismiss={dismiss}
            soundEnabled={soundEnabled}
          />
        ))}
      </div>
    </>
  )
}
