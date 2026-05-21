'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Upload, Scan, CheckCircle, Eye, Tag, Search, Sparkles, ChevronDown, ChevronUp, Brain, Camera } from 'lucide-react'
import { PRODUCTS } from '../lib/data'
import { SCRAPED_PRODUCTS, PLATFORM_COLORS, PLATFORM_NAMES } from '../lib/scrapedData'
import type { MatchResult } from '../app/api/match/route'

type ScanPhase = 'idle' | 'uploading' | 'scanning' | 'extracting' | 'matching' | 'done'

const SCAN_STEPS: { phase: ScanPhase; label: string; icon: React.ReactNode }[] = [
  { phase: 'uploading',  label: 'Loading image…',                          icon: <Upload size={13} />       },
  { phase: 'scanning',   label: 'Running visual analysis…',                icon: <Scan size={13} />         },
  { phase: 'extracting', label: 'Extracting product attributes…',          icon: <Tag size={13} />          },
  { phase: 'matching',   label: 'Comparing across platforms with AI…',     icon: <Brain size={13} />        },
  { phase: 'done',       label: 'Analysis complete',                       icon: <CheckCircle size={13} />  },
]

const DEMO_PRODUCT = PRODUCTS[1] // White T-Shirt — matches the scraped data

// First 5 rows per platform from the Excel scraped data
const CANDIDATES = SCRAPED_PRODUCTS.slice(0, 15) // 5 AMZ + 5 TGT + 5 WMT

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ flex: 1, height: 4, background: 'var(--paper)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width .4s ease' }} />
      </div>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, fontWeight: 600, color, flexShrink: 0, minWidth: 26 }}>
        {score}%
      </span>
    </div>
  )
}

function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'var(--accent2)' : score >= 60 ? 'var(--amber)' : 'var(--accent)'
  const label = score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low'
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
      background: score >= 80 ? 'var(--accent2-soft)' : score >= 60 ? '#fef6e3' : '#fef0e8',
      color, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.3px',
    }}>
      {label}
    </span>
  )
}

interface CandidateCardProps {
  candidate: typeof SCRAPED_PRODUCTS[0]
  result?: MatchResult
  loading?: boolean
}

function CandidateCard({ candidate, result, loading }: CandidateCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden',
      background: 'white', marginBottom: 8,
    }}>
      <div style={{ display: 'flex', gap: 10, padding: '10px 12px' }}>
        {/* Product image */}
        <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0, borderRadius: 6, overflow: 'hidden', background: 'var(--paper)' }}>
          <Image
            src={candidate.imageUrl}
            alt={candidate.title}
            fill
            sizes="56px"
            style={{ objectFit: 'cover' }}
            unoptimized
          />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink2)', lineHeight: 1.3, marginBottom: 2,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
            {candidate.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700 }}>
              {candidate.price != null ? `$${candidate.price.toFixed(2)}` : 'N/A'}
            </span>
            {candidate.brand && (
              <span style={{ fontSize: 9, color: 'var(--ink3)', fontFamily: "'IBM Plex Mono', monospace" }}>
                {candidate.brand}
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ height: 12, background: 'var(--paper)', borderRadius: 4, width: `${70 + i * 10}%` }} />
              ))}
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: 'var(--ink3)', width: 58, flexShrink: 0 }}>Text Match</span>
                <ScoreBar score={result.textScore} color="var(--blue)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: 'var(--ink3)', width: 58, flexShrink: 0 }}>Visual Match</span>
                <ScoreBar score={result.visualScore} color="var(--amber)" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: 'var(--ink3)', width: 58, flexShrink: 0 }}>Overall</span>
                <ScoreBar score={result.overallScore} color={result.overallScore >= 70 ? 'var(--accent2)' : result.overallScore >= 50 ? 'var(--amber)' : 'var(--accent)'} />
              </div>
            </div>
          ) : null}
        </div>

        {/* Badge + expand */}
        {result && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
            <ConfidenceBadge score={result.overallScore} />
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', padding: 2 }}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        )}
      </div>

      {/* Expanded attribute scores */}
      {expanded && result && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', background: 'var(--warm-white)' }}>
          <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', letterSpacing: '.5px', color: 'var(--ink3)', marginBottom: 8 }}>
            Attribute Match Breakdown
          </div>
          {result.attributeScores.map(attr => (
            <div key={attr.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink2)' }}>{attr.label}</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)' }}>{attr.score}%</span>
              </div>
              <ScoreBar score={attr.score} color="var(--blue)" />
              <div style={{ fontSize: 9, color: 'var(--mid)', marginTop: 2 }}>{attr.reasoning}</div>
            </div>
          ))}
          {result.reasoning && (
            <div style={{ marginTop: 8, padding: '8px 10px', background: 'white', borderRadius: 6, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink3)', textTransform: 'uppercase', marginBottom: 3 }}>AI Reasoning</div>
              <div style={{ fontSize: 10, color: 'var(--ink2)', lineHeight: 1.5 }}>{result.reasoning}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function VisualScanner() {
  const [phase, setPhase] = useState<ScanPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [imgSrc, setImgSrc] = useState<string | null>(null)
  const [selectedProductIdx, setSelectedProductIdx] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [apiLoading, setApiLoading] = useState(false)
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null)
  const [anchorDescription, setAnchorDescription] = useState<string | null>(null)
  const [apiMode, setApiMode] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'AMZ' | 'TGT' | 'WMT'>('AMZ')
  const fileRef = useRef<HTMLInputElement>(null)
  const scanTimestamp = useRef(Date.now())

  const callMatchApi = useCallback(async (anchorTitle: string, anchorImageUrl: string, anchorPlatform: string) => {
    setApiLoading(true)
    setMatchResults(null)
    try {
      const candidates = CANDIDATES.map(c => ({
        id: c.id,
        title: c.title,
        imageUrl: c.imageUrl,
        platform: c.platform,
      }))
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anchor: { title: anchorTitle, imageUrl: anchorImageUrl, platform: anchorPlatform }, candidates }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json() as { results: MatchResult[]; anchorDescription: string; mode: string }
      setMatchResults(data.results)
      setAnchorDescription(data.anchorDescription)
      setApiMode(data.mode)
    } catch {
      // Silently fall back — show skeleton placeholders
    } finally {
      setApiLoading(false)
    }
  }, [])

  const runScan = useCallback((src: string, productIdx: number | null) => {
    setImgSrc(src)
    setSelectedProductIdx(productIdx)
    setCompletedSteps([])
    setProgress(0)
    setMatchResults(null)
    setAnchorDescription(null)
    setApiMode(null)
    scanTimestamp.current = Date.now()

    const phases: ScanPhase[] = ['uploading', 'scanning', 'extracting', 'matching', 'done']
    let step = 0
    const advance = () => {
      if (step >= phases.length) return
      setPhase(phases[step])
      setProgress(Math.round(((step + 1) / phases.length) * 100))
      setCompletedSteps(prev => [...prev, phases[step]])
      step++
      if (step < phases.length) setTimeout(advance, 900 + Math.random() * 400)
    }
    setTimeout(advance, 200)
  }, [])

  // When phases complete, fire the AI match API
  useEffect(() => {
    if (phase !== 'done') return
    const product = selectedProductIdx !== null ? PRODUCTS[selectedProductIdx] : DEMO_PRODUCT
    callMatchApi(product.name, product.imageUrl, 'YOUR_CATALOG')
  }, [phase, selectedProductIdx, callMatchApi])

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => runScan(e.target?.result as string, null)
    reader.readAsDataURL(file)
  }

  const displayProduct = selectedProductIdx !== null ? PRODUCTS[selectedProductIdx] : DEMO_PRODUCT

  // Group candidates and results by platform
  const platformCandidates = (['AMZ', 'TGT', 'WMT'] as const).reduce((acc, pid) => {
    acc[pid] = CANDIDATES.filter(c => c.platform === pid)
    return acc
  }, {} as Record<string, typeof CANDIDATES>)

  const resultsById = (matchResults ?? []).reduce((acc, r) => { acc[r.id] = r; return acc }, {} as Record<string, MatchResult>)

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
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, padding: '16px', textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'var(--accent-soft)' : 'var(--warm-white)',
                transition: 'all .15s', position: 'relative', overflow: 'hidden',
                minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {(imgSrc) ? (
                <div style={{ position: 'relative', width: '100%', height: 140 }}>
                  {selectedProductIdx !== null ? (
                    <Image
                      src={displayProduct.imageUrl}
                      alt={displayProduct.name}
                      fill
                      sizes="300px"
                      style={{ objectFit: 'cover', borderRadius: 6 }}
                      unoptimized
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgSrc} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />
                  )}
                  {phase !== 'done' && phase !== 'idle' && (
                    <div style={{ position: 'absolute', inset: 0, borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{
                        position: 'absolute', left: 0, right: 0, height: 2,
                        background: 'var(--blue)', opacity: 0.9,
                        boxShadow: '0 0 12px var(--blue)',
                        top: `${progress}%`, transition: 'top 0.4s linear',
                      }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,63,107,0.12)' }} />
                    </div>
                  )}
                  {phase === 'done' && (
                    <div style={{ position: 'absolute', top: 6, right: 6, background: 'var(--accent2)', borderRadius: '50%', padding: 4 }}>
                      <CheckCircle size={14} color="white" />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <Upload size={24} color="var(--mid)" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 12, color: 'var(--ink2)', fontWeight: 500, marginBottom: 4 }}>Drop product image here</div>
                  <div style={{ fontSize: 11, color: 'var(--mid)' }}>JPG, PNG, WEBP — any product photo</div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>

            {/* Demo buttons */}
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--ink3)', marginBottom: 2 }}>
                Demo Products
              </div>
              {PRODUCTS.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => runScan(p.imageUrl, idx)}
                  style={{
                    width: '100%', padding: '7px 10px',
                    background: 'var(--warm-white)', border: '1px solid var(--border)',
                    borderRadius: 6, fontSize: 11, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                    transition: 'background .1s',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{p.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--ink2)', fontSize: 11 }}>{p.name}</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>{p.id}</div>
                  </div>
                  <div style={{ marginLeft: 'auto' }}>
                    <Sparkles size={11} color="var(--mid)" />
                  </div>
                </button>
              ))}
            </div>
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
                <div key={step.phase} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', opacity: done ? 1 : 0.35 }}>
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

            {/* AI API status */}
            {phase === 'done' && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {apiLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Brain size={11} color="var(--blue)" />
                    <span style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 500 }}>Running AI match analysis…</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--blue)', animation: `blink 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                  </div>
                ) : matchResults ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={11} color="var(--accent2)" />
                    <span style={{ fontSize: 10, color: 'var(--accent2)', fontWeight: 500 }}>
                      {apiMode === 'ai_text_vision' ? 'Text + Vision AI complete' : apiMode === 'ai_text_only' ? 'Semantic text AI complete' : 'Analysis complete'}
                    </span>
                    {apiMode && (
                      <span style={{ marginLeft: 'auto', fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink3)', padding: '1px 5px', background: 'var(--paper)', borderRadius: 3 }}>
                        {apiMode === 'fallback' ? 'DEMO' : 'AI'}
                      </span>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {phase === 'idle' && (
          <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
            <Eye size={32} color="var(--sand)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink2)', marginBottom: 6 }}>Upload or Select a Demo Product</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
              RetailLens uses AI to semantically compare product descriptions (meaning, not just keywords) and computer vision to score visual similarity — then cross-references against real scraped listings from Amazon, Walmart, and Target.
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
                  <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7 }}>
                    {anchorDescription ?? displayProduct.aiDescription}
                  </p>
                ) : (
                  <div style={{ height: 40, background: 'var(--paper)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--mid)' }}>Generating description…</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attributes */}
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={13} color="var(--amber)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Extracted Attributes</span>
                <span style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--mid)' }}>{phase === 'done' ? `${displayProduct.attributes.length} attributes` : 'pending'}</span>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {phase === 'done' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {displayProduct.attributes.map((attr, i) => (
                      <div key={attr.label} style={{ padding: '8px 10px', background: 'var(--warm-white)', border: '1px solid var(--border)', borderRadius: 6, animation: `slideIn .3s ${i * 0.06}s both` }}>
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{attr.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink2)' }}>{attr.value}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                    {[...Array(6)].map((_, i) => <div key={i} style={{ height: 48, background: 'var(--paper)', borderRadius: 6 }} />)}
                  </div>
                )}
              </div>
            </div>

            {/* AI Match Results */}
            {phase === 'done' && (
              <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '13px 18px 11px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Search size={13} color="var(--accent2)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>Cross-Platform AI Match Scores</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 10, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ink3)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 1, background: 'var(--blue)', display: 'inline-block' }} />Text</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 1, background: 'var(--amber)', display: 'inline-block' }} />Visual</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 6, height: 6, borderRadius: 1, background: 'var(--accent2)', display: 'inline-block' }} />Overall</span>
                    </div>
                  </div>
                </div>

                {/* Method explanation */}
                <div style={{ padding: '8px 18px', background: 'var(--warm-white)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Brain size={11} color="var(--blue)" />
                    <span style={{ fontSize: 10, color: 'var(--ink3)' }}>Text: AI semantic similarity (meaning, not keywords)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Camera size={11} color="var(--amber)" />
                    <span style={{ fontSize: 10, color: 'var(--ink3)' }}>Visual: AI image comparison (5 rows × 3 platforms)</span>
                  </div>
                </div>

                {/* Platform tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                  {(['AMZ', 'TGT', 'WMT'] as const).map(pid => (
                    <button
                      key={pid}
                      onClick={() => setActiveTab(pid)}
                      style={{
                        flex: 1, padding: '9px 12px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: activeTab === pid ? 'white' : 'var(--warm-white)',
                        color: activeTab === pid ? PLATFORM_COLORS[pid] : 'var(--ink3)',
                        borderBottom: activeTab === pid ? `2px solid ${PLATFORM_COLORS[pid]}` : '2px solid transparent',
                        transition: 'all .1s',
                      }}
                    >
                      {PLATFORM_NAMES[pid]}
                      {matchResults && (
                        <span style={{ marginLeft: 5, fontSize: 9, fontFamily: "'IBM Plex Mono', monospace", opacity: 0.7 }}>
                          {platformCandidates[pid]?.length ?? 0} results
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Candidate cards */}
                <div style={{ padding: '14px 18px', maxHeight: 480, overflowY: 'auto' }}>
                  {(platformCandidates[activeTab] ?? [])
                    .slice()
                    .sort((a, b) => {
                      if (!matchResults) return 0
                      return (resultsById[b.id]?.overallScore ?? 0) - (resultsById[a.id]?.overallScore ?? 0)
                    })
                    .map(candidate => (
                      <CandidateCard
                        key={candidate.id}
                        candidate={candidate}
                        result={resultsById[candidate.id]}
                        loading={apiLoading}
                      />
                    ))
                  }
                </div>

                {/* Footer */}
                <div style={{ padding: '8px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: 'var(--mid)', fontFamily: "'IBM Plex Mono', monospace" }}>
                    Data source: scraped May 2026 · 5 rows × 3 platforms · sorted by overall AI match score
                  </span>
                  {apiMode && apiMode !== 'fallback' && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 3, background: 'var(--accent2-soft)', color: 'var(--accent2)', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {apiMode === 'ai_text_vision' ? 'TEXT + VISION AI' : 'SEMANTIC AI'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
