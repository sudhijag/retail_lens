import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export interface MatchProductsRequest {
  anchor: { id: string; title: string; imageUrl: string | null }
  candidates: { id: string; title: string; imageUrl: string | null }[]
}

export interface MatchProductResult {
  id: string
  textScore: number
  visualScore: number
}

export interface MatchProductsResponse {
  results: MatchProductResult[]
  anchorDescription: string
  mode: string
  processingMs: number
}

function fallbackResults(req: MatchProductsRequest): MatchProductResult[] {
  return req.candidates.map(c => {
    const aWords = new Set(req.anchor.title.toLowerCase().split(/\W+/))
    const cWords = c.title.toLowerCase().split(/\W+/)
    const overlap = cWords.filter(w => w.length > 3 && aWords.has(w)).length
    const union = new Set([...aWords, ...cWords]).size
    const textScore = Math.round(Math.min(92, 30 + (overlap / Math.max(union, 1)) * 220))
    const shared = ['shirt','tee','t-shirt','crewneck','crew','polo','blouse','top','jacket','pant','jean','short','dress','coat','sweater','hoodie','cardigan']
    const sameCat = shared.some(k => c.title.toLowerCase().includes(k) && req.anchor.title.toLowerCase().includes(k))
    const visualScore = sameCat ? 55 + Math.round(Math.random() * 30) : 20 + Math.round(Math.random() * 25)
    return { id: c.id, textScore, visualScore }
  })
}

async function runText(
  client: Anthropic,
  anchor: MatchProductsRequest['anchor'],
  candidates: MatchProductsRequest['candidates'],
): Promise<{ anchorDescription: string; scores: Record<string, number> }> {
  const list = candidates.map((c, i) => `Candidate ${i + 1} (ID: ${c.id}): "${c.title}"`).join('\n')

  const prompt = `You are a retail product matching expert. Evaluate how semantically similar each candidate product is to the anchor — based on MEANING, not keyword overlap.

ANCHOR: "${anchor.title}"

CANDIDATES:
${list}

For each candidate evaluate: product type, style, construction, target use, and fit/cut.

Return ONLY a JSON object:
{
  "anchorDescription": "<1-2 sentence description of the anchor>",
  "textScores": { "<candidate_id>": <0-100 integer>, ... }
}`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })
  const raw = (msg.content[0] as { type: string; text: string }).text
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) throw new Error('no JSON')
  const parsed = JSON.parse(m[0]) as { anchorDescription: string; textScores: Record<string, number> }
  return { anchorDescription: parsed.anchorDescription ?? anchor.title, scores: parsed.textScores ?? {} }
}

async function runVision(
  client: Anthropic,
  anchor: MatchProductsRequest['anchor'],
  candidates: MatchProductsRequest['candidates'],
): Promise<Record<string, number>> {
  const withImages = candidates.filter(c => c.imageUrl && c.imageUrl.startsWith('http'))
  if (!anchor.imageUrl || !anchor.imageUrl.startsWith('http') || withImages.length === 0) return {}

  type Block =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'url'; url: string } }

  const labels = withImages.map((c, i) => `Image ${i + 2} (ID: ${c.id}): "${c.title}"`).join('\n')

  const content: Block[] = [
    {
      type: 'text',
      text: `Compare the anchor product image (Image 1) against each candidate image. Rate visual similarity 0–100:
- 85–100: Nearly identical appearance, same style/color/silhouette
- 65–84: Same product type, minor visual differences
- 45–64: Same category, noticeable style differences
- 0–44: Different appearance

Image 1 — ANCHOR: "${anchor.title}"
CANDIDATES:
${labels}

Return ONLY JSON: { "visualScores": { "<id>": <score>, ... } }`,
    },
    { type: 'image', source: { type: 'url', url: anchor.imageUrl } },
    ...withImages.map(c => ({ type: 'image' as const, source: { type: 'url' as const, url: c.imageUrl! } })),
  ]

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: content as Anthropic.MessageParam['content'] }],
  })
  const raw = (msg.content[0] as { type: string; text: string }).text
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return {}
  const parsed = JSON.parse(m[0]) as { visualScores: Record<string, number> }
  return parsed.visualScores ?? {}
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  const body: MatchProductsRequest = await req.json()
  const { anchor, candidates } = body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      results: fallbackResults(body),
      anchorDescription: `"${anchor.title}"`,
      mode: 'fallback',
      processingMs: Date.now() - start,
    } satisfies MatchProductsResponse)
  }

  const client = new Anthropic({ apiKey })

  const [textResult, visualScores] = await Promise.all([
    runText(client, anchor, candidates),
    runVision(client, anchor, candidates).catch(() => ({} as Record<string, number>)),
  ])

  const hasVision = Object.keys(visualScores).length > 0

  const results: MatchProductResult[] = candidates.map(c => {
    const textScore = textResult.scores[c.id] ?? 40
    const visualScore = visualScores[c.id] ?? Math.round(textScore * 0.75)
    return { id: c.id, textScore, visualScore }
  })

  return NextResponse.json({
    results,
    anchorDescription: textResult.anchorDescription,
    mode: hasVision ? 'ai_text_vision' : 'ai_text_only',
    processingMs: Date.now() - start,
  } satisfies MatchProductsResponse)
}
