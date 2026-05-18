'use client'
import { useState, useRef, useCallback } from 'react'
import { Upload, Scan, CheckCircle, Eye, Tag, Search, Sparkles } from 'lucide-react'
import { PLATFORMS, PRODUCTS } from '../lib/data'

type ScanPhase = 'idle' | 'uploading' | 'scanning' | 'extracting' | 'matching' | 'done'

const SCAN_STEPS = [
  { phase: 'uploading',   label: 'Loading image...',               icon: <Upload size={13} /> },
  { phase: 'scanning',    label: 'Running visual analysis...',     icon: <Scan size={13} /> },
  { phase: 'extracting',  label: 'Extracting product attributes...', icon: <Tag size={13} /> },
  { phase: 'matching',    label: 'Matching across platforms...',   icon: <Search size={13} /> },
  { phase: 'done',        label: 'Analysis complete',              icon: <CheckCircle size={13} /> },
]

const DEMO_PRODUCT = PRODUCTS[0] // Clear glasses as demo

export default function VisualScanner() {
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const runScan = useCallback((src: string) => {
    setImgSrc(src)
    setCompletedSteps([])
    setProgress(0)

    const phases: ScanPhase[] = ['uploading', 'scanning', 'extracting', 'matching', 'done']
    let step = 0

    const advance = () => {
      if (step >= phases.length) return
      setPhase(phases[step])
      setProgress(Math.round(((step + 1) / phases.length) * 100))
      setCompletedSteps(prev => [...prev, phases[step]])
      step++
      if (step < phases.length) {
        setTimeout(advance, 900 + Math.random() * 400)
      }
    }
    setTimeout(advance, 200)
  }, [])

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => runScan(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDemoScan = () => {
    runScan('/demo-glasses.png') // will be shown as placeholder
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 18 }}>

      {/* Upload panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Eye size={13} color="var(--blue)" />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Visual Product Scanner</span>
          </div>
          <div style={{ padding: 16 }}>
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'var(--accent-soft)' : 'var(--warm-white)',
                transition: 'all .15s',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {imgSrc ? (
                <div style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgSrc}
                    alt="Scanned product"
                    style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 6, objectFit: 'contain' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  {/* Demo placeholder if img fails */}
                  <div style={{ fontSize: 48, lineHeight: 1, margin: '8px 0' }}>{DEMO_PRODUCT.emoji}</div>
                  {/* Scan overlay */}
                  {phase !== 'done' && phase !== 'idle' && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(26,63,107,0.08)',
                      borderRadius: 6, overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', left: 0, right: 0, height: 2,
                        background: 'var(--blue)', opacity: 0.7,
                        boxShadow: '0 0 8px var(--blue)',
                        top: `${progress}%`,
                        transition: 'top 0.3s linear',
                      }} />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Upload size={24} color="var(--mid)" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 500, marginBottom: 4 }}>
                    Drop product image here
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mid)' }}>JPG, PNG, WEBP — any product photo</div>
                </>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            {/* Demo button */}
            <button
              onClick={handleDemoScan}
              style={{
                width: '100%', marginTop: 10, padding: '8px 0',
                background: 'var(--ink)', color: 'var(--cream)', border: 'none',
                borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Sparkles size={12} /> Run Demo Scan (Clear Glasses)
            </button>
          </div>
        </div>

        {/* Progress steps */}
        {phase !== 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>Analysis Progress</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'var(--ink3)' }}>{progress}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? 'var(--accent2)' : 'var(--blue)', borderRadius: 2, transition: 'width .4s ease' }} />
              </div>
            </div>
            {SCAN_STEPS.map(step => {
              const done = completedSteps.includes(step.phase)
              const active = phase === step.phase && phase !== 'done'
              return (
                <div key={step.phase} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                  opacity: done ? 1 : 0.35,
                }}>
                  <div style={{ color: done ? (step.phase === 'done' ? 'var(--accent2)' : 'var(--blue)') : 'var(--mid)' }}>
                    {step.icon}
                  </div>
                  <span style={{ fontSize: 11, color: active ? 'var(--blue)' : done ? 'var(--ink2)' : 'var(--mid)', fontWeight: active ? 600 : 400 }}>
                    {step.label}
                  </span>
                  {active && (
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--blue)', animation: `blink 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                  )}
                  {done && step.phase !== 'done' && <CheckCircle size={11} color="var(--accent2)" style={{ marginLeft: 'auto' }} />}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Results panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {phase !== 'done' && phase === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
            <Eye size={32} color="var(--sand)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink2)', marginBottom: 6 }}>Upload a Product Image</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
              RetailLens uses computer vision to identify products, extract structured attributes, and find matching listings across Amazon, Walmart, Target, eBay, and Shein — even for unbranded items.
            </div>
          </div>
        )}

        {phase !== 'idle' && (
          <>
            {/* AI Description */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} color="var(--blue)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>AI Product Description</span>
                {phase !== 'done' && <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)' }} className="blink" />}
                {phase === 'done' && <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--accent2-soft)', color: 'var(--accent2)', fontFamily: "'IBM Plex Mono', monospace" }}>COMPLETE</span>}
              </div>
              <div style={{ padding: '14px 18px' }}>
                {phase === 'done' ? (
                  <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7 }}>{DEMO_PRODUCT.aiDescription}</p>
                ) : (
                  <div style={{ height: 40, background: 'var(--paper)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--mid)' }}>Generating description…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Extracted attributes */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={13} color="var(--amber)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Extracted Attributes</span>
                <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>{phase === 'done' ? `${DEMO_PRODUCT.attributes.length} attributes` : 'pending'}</span>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {phase === 'done' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {DEMO_PRODUCT.attributes.map((attr, i) => (
                      <div key={attr.label} style={{
                        padding: '8px 10px', background: 'var(--warm-white)',
                        border: '1px solid var(--border)', borderRadius: 6,
                        animation: `slideIn .3s ${i * 0.06}s both`,
                      }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{attr.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink2)' }}>{attr.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[...Array(6)].map((_, i) => (
                      <div key={i} style={{ height: 48, background: 'var(--paper)', borderRadius: 6 }} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Platform matches */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Search size={13} color="var(--accent2)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Cross-Platform Matches</span>
                {phase === 'done' && (
                  <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '2px 7px', borderRadius: 3, background: 'var(--accent2-soft)', color: 'var(--accent2)' }}>
                    {PLATFORMS.length} platforms scanned
                  </span>
                )}
              </div>
              {phase === 'done' ? (
                <div>
                  {PLATFORMS.map((p, i) => {
                    const listing = DEMO_PRODUCT.listings[p.id]
                    return (
                      <div key={p.id} style={{
                        padding: '12px 18px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 12,
                        animation: `slideIn .3s ${i * 0.08}s both`,
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink2)' }}>{p.name}</span>
                            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
                              ${listing.currentPrice.toFixed(2)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)' }}>{listing.listingId}</span>
                              <span style={{ fontSize: 10, color: 'var(--mid)' }}>{listing.seller}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ height: 4, width: 60, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${listing.matchConfidence}%`, background: listing.matchConfidence >= 90 ? 'var(--accent2)' : listing.matchConfidence >= 75 ? 'var(--amber)' : 'var(--accent)', borderRadius: 2 }} />
                              </div>
                              <span style={{
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, fontWeight: 600,
                                color: listing.matchConfidence >= 90 ? 'var(--accent2)' : listing.matchConfidence >= 75 ? 'var(--amber)' : 'var(--accent)',
                              }}>
                                {listing.matchConfidence}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} style={{ height: 44, background: 'var(--paper)', borderRadius: 6 }} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
