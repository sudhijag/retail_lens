'use client'
import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Camera, Upload, Link2, CheckCircle, Brain, Eye, Search, Zap, TrendingDown, TrendingUp, Minus, ScanLine, AlertCircle } from 'lucide-react'
import { PRODUCTS, PLATFORMS } from '../lib/data'
import { SCRAPED_PRODUCTS, PLATFORM_COLORS, PLATFORM_NAMES } from '../lib/scrapedData'
import type { ScanImageResponse, ScanMatch } from '../app/api/scan-image/route'

type InputMode  = 'upload' | 'url'
type ScanPhase  = 'idle' | 'scanning' | 'done' | 'error'

const STEPS = [
  { id: 'load',  label: 'Image loaded' },
  { id: 'ai',    label: 'Identifying product with AI vision…' },
  { id: 'match', label: 'Matching across 15 scraped listings…' },
  { id: 'intel', label: 'Building price intelligence…' },
]

const PLATFORM_ORDER = ['AMZ', 'TGT', 'WMT'] as const

// ── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)', width: 46, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width .5s ease' }} />
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color, fontWeight: 700, width: 24, textAlign: 'right' }}>{score}%</span>
    </div>
  )
}

// ── Platform result card ───────────────────────────────────────────────────────

function PlatformResultCard({
  platformId, match, yourPrice
}: {
  platformId: 'AMZ' | 'TGT' | 'WMT'
  match: ScanMatch | null
  yourPrice?: number
}) {
  const color = PLATFORM_COLORS[platformId]
  const name  = PLATFORM_NAMES[platformId]
  const noMatch = !match || match.overall < 40

  const priceDelta = match?.price != null && yourPrice != null ? match.price - yourPrice : null
  const pricePct   = priceDelta != null && yourPrice ? (priceDelta / yourPrice) * 100 : null

  const [confBg, confColor] = match
    ? match.overall >= 70 ? ['var(--accent2-soft)', 'var(--accent2)']
    : match.overall >= 50 ? ['#fef6e3', 'var(--amber)']
    : ['var(--paper)', 'var(--mid)']
    : ['var(--paper)', 'var(--mid)']

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', flex: 1 }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
        <span style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '.3px', fontFamily: "'IBM Plex Sans', sans-serif" }}>{name}</span>
        {!noMatch && match && (
          <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: confBg, color: confColor, fontFamily: "'IBM Plex Mono', monospace" }}>
            {match.overall}% MATCH
          </span>
        )}
      </div>

      {noMatch ? (
        <div style={{ padding: '28px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <AlertCircle size={20} color="var(--border2)" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mid)' }}>No confident match</div>
            <div style={{ fontSize: 9, color: 'var(--ink3)', marginTop: 2, fontFamily: "'IBM Plex Mono', monospace" }}>below 40% similarity</div>
          </div>
        </div>
      ) : (
        <div style={{ padding: 14 }}>
          {/* Product image + title */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: 7, overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid var(--border)', background: 'var(--paper)' }}>
              <Image src={match!.imageUrl} alt={match!.title} fill sizes="60px" style={{ objectFit: 'cover' }} unoptimized />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink2)', lineHeight: 1.35, marginBottom: 4,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const }}>
                {match!.title}
              </div>
              {match!.brand && (
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)' }}>{match!.brand}</div>
              )}
            </div>
          </div>

          {/* Price */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1, marginBottom: 4 }}>
              {match!.price != null ? `$${match!.price.toFixed(2)}` : 'N/A'}
            </div>
            {priceDelta != null && yourPrice != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {priceDelta < 0
                  ? <><TrendingDown size={10} color="var(--accent)" /><span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>${Math.abs(priceDelta).toFixed(2)} cheaper than you</span></>
                  : priceDelta > 0
                  ? <><TrendingUp size={10} color="var(--accent2)" /><span style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>${priceDelta.toFixed(2)} pricier than you</span></>
                  : <><Minus size={10} color="var(--mid)" /><span style={{ fontSize: 10, color: 'var(--mid)', fontFamily: "'IBM Plex Mono', monospace" }}>Same price as yours</span></>
                }
              </div>
            )}
          </div>

          {/* Score bars */}
          <ScoreBar label="Visual" score={match!.visualScore} color={color} />
          <ScoreBar label="Text"   score={match!.textScore}  color="var(--blue)" />
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ImageScanner() {
  const [inputMode,    setInputMode]    = useState<InputMode>('upload')
  const [pastedUrl,    setPastedUrl]    = useState('')
  const [imageSource,  setImageSource]  = useState<string | null>(null)
  const [scanPhase,    setScanPhase]    = useState<ScanPhase>('idle')
  const [stepsDone,    setStepsDone]    = useState<string[]>([])
  const [results,      setResults]      = useState<ScanImageResponse | null>(null)
  const [dragOver,     setDragOver]     = useState(false)
  const [scanError,    setScanError]    = useState<string | null>(null)
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const runScan = useCallback(async (src: string) => {
    setImageSource(src)
    setScanPhase('scanning')
    setStepsDone([])
    setResults(null)
    setScanError(null)

    // Animate progress steps while API runs
    const stepIds = STEPS.map(s => s.id)
    let i = 0
    const tick = () => {
      if (i >= stepIds.length) return
      setStepsDone(prev => [...prev, stepIds[i++]])
      if (i < stepIds.length) setTimeout(tick, 800 + Math.random() * 600)
    }
    setTimeout(tick, 200)

    try {
      const res = await fetch('/api/scan-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageSource: src }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json() as ScanImageResponse
      // Mark all steps done
      setStepsDone(stepIds)
      setResults(data)
      setScanPhase('done')
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed')
      setScanPhase('error')
    }
  }, [])

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => runScan(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleUrlScan = () => {
    const url = pastedUrl.trim()
    if (!url) return
    runScan(url)
  }

  const handleDemoProduct = (productId: string) => {
    const p = PRODUCTS.find(pr => pr.id === productId)
    if (!p) return
    setSelectedProductId(productId)
    runScan(p.imageUrl)
  }

  const reset = () => {
    setScanPhase('idle')
    setImageSource(null)
    setResults(null)
    setStepsDone([])
    setScanError(null)
    setSelectedProductId(null)
    setPastedUrl('')
  }

  // ── Best match per platform ──────────────────────────────────────────────────
  const bestPerPlatform = (platform: 'AMZ' | 'TGT' | 'WMT'): ScanMatch | null => {
    if (!results) return null
    const pool = results.matches.filter(m => m.platform === platform)
    const best = pool.sort((a, b) => b.overall - a.overall)[0]
    return best ?? null
  }

  // ── Price intelligence ───────────────────────────────────────────────────────
  const priceIntel = (() => {
    if (!results) return null
    const significant = results.matches.filter(m => m.overall >= 40 && m.price != null)
    if (!significant.length) return null
    const prices = significant.map(m => m.price!)
    const lowest  = Math.min(...prices)
    const highest = Math.max(...prices)
    const lowestMatch  = significant.find(m => m.price === lowest)!
    const highestMatch = significant.find(m => m.price === highest)!
    const mostSimilar  = significant.sort((a, b) => b.overall - a.overall)[0]
    const demoProduct  = selectedProductId ? PRODUCTS.find(p => p.id === selectedProductId) : null
    return { lowest, highest, lowestMatch, highestMatch, mostSimilar, demoProduct }
  })()

  // ── IDLE: upload / url input ──────────────────────────────────────────────────
  if (scanPhase === 'idle') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--blue-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ScanLine size={20} color="var(--blue)" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginBottom: 4, fontFamily: "'IBM Plex Sans', sans-serif" }}>
                Visual Product Scanner
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6 }}>
                Upload any product image or paste an image URL - RetailLens identifies the product using AI vision and finds comparable listings across Amazon, Walmart & Target with live price comparison.
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                {[
                  { icon: <Eye size={10} />, label: 'AI vision extraction' },
                  { icon: <Search size={10} />, label: 'Cross-platform matching' },
                  { icon: <Zap size={10} />, label: 'Live price intelligence' },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--ink3)' }}>
                    {m.icon}{m.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          {/* Main input area */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              {([['upload', <Upload size={12} />, 'Upload Image'], ['url', <Link2 size={12} />, 'Image URL']] as const).map(([mode, icon, label]) => (
                <button key={mode} onClick={() => setInputMode(mode as InputMode)} style={{
                  flex: 1, padding: '11px 0', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, fontFamily: "'IBM Plex Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: inputMode === mode ? 'white' : 'var(--warm-white)',
                  color: inputMode === mode ? 'var(--blue)' : 'var(--ink3)',
                  borderBottom: inputMode === mode ? '2px solid var(--blue)' : '2px solid transparent',
                }}>
                  {icon}{label}
                </button>
              ))}
            </div>

            <div style={{ padding: 20 }}>
              {inputMode === 'upload' ? (
                <div
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--blue)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '40px 24px', textAlign: 'center', cursor: 'pointer',
                    background: dragOver ? 'var(--blue-soft)' : 'var(--warm-white)', transition: 'all .15s',
                  }}
                >
                  <Camera size={32} color={dragOver ? 'var(--blue)' : 'var(--mid)'} style={{ margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)', marginBottom: 4 }}>
                    Drop product image here
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mid)' }}>JPG · PNG · WEBP - supplier photos, screenshots, competitor listings</div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 8 }}>
                    Paste a direct image URL (right-click any product image → "Copy Image Address")
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={pastedUrl}
                      onChange={e => setPastedUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUrlScan()}
                      placeholder="https://m.media-amazon.com/images/I/..."
                      style={{
                        flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 6,
                        fontSize: 12, color: 'var(--ink)', fontFamily: "'IBM Plex Mono', monospace",
                        outline: 'none', background: 'white',
                      }}
                    />
                    <button
                      onClick={handleUrlScan}
                      disabled={!pastedUrl.trim()}
                      style={{
                        padding: '10px 20px', background: pastedUrl.trim() ? 'var(--blue)' : 'var(--paper)',
                        color: pastedUrl.trim() ? 'white' : 'var(--mid)', border: 'none', borderRadius: 6,
                        fontSize: 12, fontWeight: 600, cursor: pastedUrl.trim() ? 'pointer' : 'not-allowed',
                        fontFamily: "'IBM Plex Sans', sans-serif",
                      }}
                    >
                      Scan →
                    </button>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 10, color: 'var(--mid)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    Works with Amazon, Target, Walmart CDN image URLs · Unsplash · any public image
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Demo products */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)' }}>
                Try with your catalog
              </div>
            </div>
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {PRODUCTS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleDemoProduct(p.id)}
                  style={{
                    padding: '8px 10px', background: 'var(--warm-white)', border: '1px solid var(--border)',
                    borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9,
                    textAlign: 'left', transition: 'background .1s',
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 5, overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid var(--border)' }}>
                    <Image src={p.imageUrl} alt={p.name} fill sizes="36px" style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>${p.yourPrice.toFixed(2)} · {p.category}</div>
                  </div>
                  <ScanLine size={11} color="var(--mid)" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── SCANNING: progress ────────────────────────────────────────────────────────
  const displayImg = imageSource
  const selectedProduct = selectedProductId ? PRODUCTS.find(p => p.id === selectedProductId) : null

  // ── RESULTS ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Top bar */}
      <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <ScanLine size={14} color="var(--blue)" />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Visual Product Scanner</span>
        {scanPhase === 'done' && results && (
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: results.mode === 'fallback' ? 'var(--paper)' : 'var(--accent2-soft)', color: results.mode === 'fallback' ? 'var(--mid)' : 'var(--accent2)' }}>
            {results.mode === 'ai_text_vision' ? 'TEXT + VISION AI' : results.mode === 'ai_text_only' ? 'SEMANTIC AI' : 'DEMO'}
          </span>
        )}
        <button onClick={reset} style={{ marginLeft: 'auto', padding: '5px 12px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: 'var(--ink2)', fontFamily: "'IBM Plex Sans', sans-serif" }}>
          ← Scan another
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

        {/* Left: image + steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Image preview */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: 200, background: 'var(--paper)' }}>
              {displayImg && (
                displayImg.startsWith('http') ? (
                  <Image src={displayImg} alt="Scanned product" fill sizes="280px" style={{ objectFit: 'contain', padding: 12 }} unoptimized />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={displayImg} alt="Scanned product" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12 }} />
                )
              )}
              {scanPhase === 'scanning' && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,63,107,0.1)' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'var(--blue)', boxShadow: '0 0 12px var(--blue)', animation: 'scanLine 1.5s ease-in-out infinite' }} />
                </div>
              )}
              {scanPhase === 'done' && (
                <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--accent2)', borderRadius: '50%', padding: 4 }}>
                  <CheckCircle size={14} color="white" />
                </div>
              )}
            </div>
            {selectedProduct && (
              <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', background: 'var(--warm-white)' }}>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)', marginBottom: 1 }}>{selectedProduct.id}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink2)' }}>{selectedProduct.name}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--blue)', marginTop: 1 }}>Your price: ${selectedProduct.yourPrice.toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* Progress steps */}
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink3)', marginBottom: 10 }}>
              Scan Progress
            </div>
            {STEPS.map((step, si) => {
              const done   = stepsDone.includes(step.id)
              const active = scanPhase === 'scanning' && stepsDone.length === si
              const stepIcons = [<Upload size={11} />, <Brain size={11} />, <Search size={11} />, <Zap size={11} />]
              return (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', opacity: done || active ? 1 : 0.3 }}>
                  <div style={{ color: done ? 'var(--accent2)' : active ? 'var(--blue)' : 'var(--mid)' }}>
                    {done ? <CheckCircle size={11} /> : stepIcons[si]}
                  </div>
                  <span style={{ fontSize: 11, color: active ? 'var(--blue)' : done ? 'var(--ink2)' : 'var(--mid)', fontWeight: active ? 600 : 400 }}>
                    {step.label}
                  </span>
                  {active && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--blue)', animation: `blink 1.2s ${i * 0.2}s ease-in-out infinite` }} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* AI Description card (only when done) */}
          {scanPhase === 'done' && results && (
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={12} color="var(--blue)" />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>AI Recognition</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.5, marginBottom: 10, fontStyle: 'italic' }}>
                  "{results.description.oneSentence}"
                </div>
                {[
                  { label: 'Category', value: results.description.category },
                  { label: 'Style', value: results.description.style },
                  { label: 'Color', value: results.description.color },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{r.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink2)', textAlign: 'right', maxWidth: 150 }}>{r.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {results.description.keyFeatures.map(f => (
                    <span key={f} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'var(--paper)', color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Error */}
          {scanPhase === 'error' && (
            <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 4 }}>Scan failed</div>
              <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{scanError}</div>
            </div>
          )}

          {/* Scanning placeholder */}
          {scanPhase === 'scanning' && (
            <>
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                <Brain size={24} color="var(--blue)" style={{ margin: '0 auto 10px', animation: 'blink 1.5s ease-in-out infinite' }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink2)', marginBottom: 4 }}>Analyzing product…</div>
                <div style={{ fontSize: 11, color: 'var(--ink3)' }}>Comparing against 15 scraped listings across Amazon, Walmart & Target</div>
              </div>
              {/* Skeleton platform cards */}
              <div style={{ display: 'flex', gap: 14 }}>
                {PLATFORM_ORDER.map(pid => (
                  <div key={pid} style={{ flex: 1, background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: 'var(--warm-white)', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ height: 10, background: 'var(--paper)', borderRadius: 4, width: '60%', animation: 'blink 1.4s ease-in-out infinite' }} />
                    </div>
                    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[80, 60, 40, 70, 50].map((w, i) => (
                        <div key={i} style={{ height: 8, background: 'var(--paper)', borderRadius: 4, width: `${w}%`, animation: `blink 1.4s ${i * 0.1}s ease-in-out infinite` }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Done: platform cards */}
          {scanPhase === 'done' && results && (
            <>
              {/* 3 platform result cards */}
              <div style={{ display: 'flex', gap: 14 }}>
                {PLATFORM_ORDER.map(pid => (
                  <PlatformResultCard
                    key={pid}
                    platformId={pid}
                    match={bestPerPlatform(pid)}
                    yourPrice={selectedProduct?.yourPrice}
                  />
                ))}
              </div>

              {/* Price intelligence strip */}
              {priceIntel && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ padding: '11px 18px 9px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={13} color="var(--amber)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Price Intelligence</span>
                  </div>
                  <div style={{ padding: '12px 18px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
                    {[
                      {
                        label: 'Market Low',
                        value: `$${priceIntel.lowest.toFixed(2)}`,
                        sub: PLATFORM_NAMES[priceIntel.lowestMatch.platform],
                        color: 'var(--accent2)',
                      },
                      {
                        label: 'Market High',
                        value: `$${priceIntel.highest.toFixed(2)}`,
                        sub: PLATFORM_NAMES[priceIntel.highestMatch.platform],
                        color: 'var(--accent)',
                      },
                      {
                        label: 'Closest Match',
                        value: `$${priceIntel.mostSimilar.price?.toFixed(2) ?? 'N/A'}`,
                        sub: `${PLATFORM_NAMES[priceIntel.mostSimilar.platform]} · ${priceIntel.mostSimilar.overall}% similar`,
                        color: 'var(--blue)',
                      },
                      ...(priceIntel.demoProduct ? [{
                        label: 'Your Price',
                        value: `$${priceIntel.demoProduct.yourPrice.toFixed(2)}`,
                        sub: `${priceIntel.demoProduct.yourPrice > priceIntel.lowest ? '+$' + (priceIntel.demoProduct.yourPrice - priceIntel.lowest).toFixed(2) + ' vs low' : 'Market low'}`,
                        color: priceIntel.demoProduct.yourPrice > priceIntel.lowest + 5 ? 'var(--accent)' : 'var(--amber)',
                      }] : []),
                    ].map((item, i, arr) => (
                      <div key={item.label} style={{ padding: '10px 16px', borderRight: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: item.color, lineHeight: 1, marginBottom: 3 }}>
                          {item.value}
                        </div>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 2 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--mid)' }}>{item.sub}</div>
                      </div>
                    ))}
                  </div>

                  {/* Action insight */}
                  {priceIntel.demoProduct && (() => {
                    const gap = priceIntel.demoProduct.yourPrice - priceIntel.lowest
                    const gapPct = (gap / priceIntel.demoProduct.yourPrice * 100).toFixed(0)
                    const isCompetitive = gap <= 2
                    const isCheapest   = gap <= 0
                    return (
                      <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border)', background: isCompetitive ? 'var(--accent2-soft)' : 'var(--accent-soft)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <Zap size={11} color={isCompetitive ? 'var(--accent2)' : 'var(--accent)'} style={{ marginTop: 1, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: isCompetitive ? 'var(--accent2)' : 'var(--accent)', fontWeight: 500, lineHeight: 1.5 }}>
                          {isCheapest
                            ? `You're priced at or below market. Strong competitive position - consider a small margin expansion.`
                            : isCompetitive
                            ? `You're within $2 of market low. Competitive position - hold or test a 3–5% increase.`
                            : `You're $${gap.toFixed(2)} (${gapPct}%) above the cheapest comparable. Most visually similar product: ${PLATFORM_NAMES[priceIntel.mostSimilar.platform]} at $${priceIntel.mostSimilar.price?.toFixed(2)}.`
                          }
                        </span>
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* No matches at all */}
              {!priceIntel && (
                <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '24px 20px', textAlign: 'center' }}>
                  <AlertCircle size={24} color="var(--mid)" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink2)', marginBottom: 4 }}>No comparable products found</div>
                  <div style={{ fontSize: 11, color: 'var(--ink3)', maxWidth: 360, margin: '0 auto' }}>
                    No confident match (≥40%) found in the current catalog of 15 scraped white shirt listings. This product may be in a different category - try scanning a product of the same type.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
