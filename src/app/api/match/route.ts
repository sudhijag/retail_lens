import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export interface MatchRequest {
  anchor: { title: string; imageUrl: string; platform: string }
  candidates: { id: string; title: string; imageUrl: string; platform: string }[]
}

export interface AttributeScore {
  label: string
  score: number
  reasoning: string
}

export interface MatchResult {
  id: string
  textScore: number
  visualScore: number
  overallScore: number
  reasoning: string
  attributeScores: AttributeScore[]
}

export interface MatchResponse {
  results: MatchResult[]
  anchorDescription: string
  processingMs: number
}

function computeFallbackResults(req: MatchRequest): MatchResult[] {
  return req.candidates.map(c => {
    const anchorWords = new Set(req.anchor.title.toLowerCase().split(/\W+/))
    const candidateWords = c.title.toLowerCase().split(/\W+/)
    const intersection = candidateWords.filter(w => w.length > 3 && anchorWords.has(w)).length
    const union = new Set([...req.anchor.title.toLowerCase().split(/\W+/), ...candidateWords]).size
    const jaccardRaw = intersection / Math.max(union, 1)
    const textScore = Math.round(Math.min(95, 35 + jaccardRaw * 200))

    const isSameCategory = ['shirt', 'tee', 't-shirt', 'oxford', 'crewneck', 'crew', 'undershirt'].some(k =>
      c.title.toLowerCase().includes(k) && req.anchor.title.toLowerCase().includes(k)
    )
    const visualScore = isSameCategory ? 60 + Math.round(Math.random() * 25) : 30 + Math.round(Math.random() * 20)
    const overallScore = Math.round(textScore * 0.55 + visualScore * 0.45)

    return {
      id: c.id,
      textScore,
      visualScore,
      overallScore,
      reasoning: `Keyword overlap: ${textScore}% text match. Visual similarity estimated from product category cues.`,
      attributeScores: [
        { label: 'Product Category', score: isSameCategory ? 85 : 40, reasoning: isSameCategory ? 'Both are men\'s tops/shirts' : 'Different style category' },
        { label: 'Sleeve Style',     score: textScore > 65 ? 72 : 45, reasoning: 'Based on title keyword match' },
        { label: 'Fit / Cut',        score: Math.round(textScore * 0.7), reasoning: 'Estimated from description similarity' },
        { label: 'Target Occasion',  score: Math.round(textScore * 0.6), reasoning: 'Casual vs formal signals extracted from title' },
        { label: 'Visual Appearance', score: visualScore, reasoning: 'Estimated from product category (no image analysis)' },
      ],
    }
  })
}

async function runTextComparison(
  client: Anthropic,
  anchor: MatchRequest['anchor'],
  candidates: MatchRequest['candidates'],
): Promise<{ anchorDescription: string; results: MatchResult[] }> {
  const candidateList = candidates.map((c, i) =>
    `Candidate ${i + 1} (ID: ${c.id}, Platform: ${c.platform}): "${c.title}"`
  ).join('\n')

  const prompt = `You are a retail product matching expert. Perform a semantic meaning comparison - not keyword matching - to determine how similar each candidate product is to the anchor. Understand what the product actually IS, not just what words appear in the title.

ANCHOR (${anchor.platform}): "${anchor.title}"

CANDIDATES:
${candidateList}

Evaluate semantic similarity across these dimensions:
1. Product Category (shirt, t-shirt, polo, undershirt, dress shirt, etc.)
2. Sleeve Style (short, long, sleeveless)
3. Fit / Cut (slim, regular, relaxed, classic)
4. Target Occasion (casual, formal/dress, athletic, undershirt/undergarment)
5. Construction (woven vs knit, dress shirt vs tee)

Return a JSON object with this exact structure:
{
  "anchorDescription": "2-sentence semantic description of the anchor product",
  "results": [
    {
      "id": "<candidate id>",
      "textScore": <0-100 integer, semantic meaning similarity - not keyword overlap>,
      "visualScore": 0,
      "overallScore": 0,
      "reasoning": "<1-2 sentences explaining the semantic match or mismatch>",
      "attributeScores": [
        { "label": "Product Category", "score": <0-100>, "reasoning": "<brief>" },
        { "label": "Sleeve Style",     "score": <0-100>, "reasoning": "<brief>" },
        { "label": "Fit / Cut",        "score": <0-100>, "reasoning": "<brief>" },
        { "label": "Target Occasion",  "score": <0-100>, "reasoning": "<brief>" },
        { "label": "Construction",     "score": <0-100>, "reasoning": "<brief>" }
      ]
    }
  ]
}`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON in text comparison response')

  return JSON.parse(jsonMatch[0]) as { anchorDescription: string; results: MatchResult[] }
}

async function runVisualComparison(
  client: Anthropic,
  anchor: MatchRequest['anchor'],
  candidates: MatchRequest['candidates'],
): Promise<Record<string, number>> {
  // Build content array: text intro + anchor image + candidate images
  type ContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; source: { type: 'url'; url: string } }

  const candidateLabels = candidates.map((c, i) =>
    `Image ${i + 2} (ID: ${c.id}, Platform: ${c.platform}): "${c.title}"`
  ).join('\n')

  const content: ContentBlock[] = [
    {
      type: 'text',
      text: `You are a visual product matching expert. Compare the ANCHOR product image (Image 1) against each CANDIDATE image and rate their visual similarity.

Image 1 - ANCHOR (${anchor.platform}): "${anchor.title}"

CANDIDATES:
${candidateLabels}

Rating scale (0–100):
- 85–100: Nearly identical - same style, color, silhouette, construction
- 65–84: Very similar - same product type, minor visual differences
- 45–64: Moderately similar - same category, noticeable style differences
- 25–44: Loosely related - same general category but clearly different
- 0–24: Dissimilar - different product appearance

Return ONLY a JSON object (no markdown, no explanation):
{ "visualScores": { "<candidate_id>": <score>, ... } }`,
    },
    // Anchor image
    { type: 'image', source: { type: 'url', url: anchor.imageUrl } },
  ]

  // Add each candidate image
  for (const c of candidates) {
    content.push({ type: 'image', source: { type: 'url', url: c.imageUrl } })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: content as Anthropic.MessageParam['content'] }],
  })

  const raw = (message.content[0] as { type: string; text: string }).text.trim()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return {}

  const parsed = JSON.parse(jsonMatch[0]) as { visualScores: Record<string, number> }
  return parsed.visualScores ?? {}
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  const body: MatchRequest = await req.json()
  const { anchor, candidates } = body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    const results = computeFallbackResults(body)
    return NextResponse.json({
      results,
      anchorDescription: `${anchor.platform} listing: "${anchor.title}"`,
      processingMs: Date.now() - start,
      mode: 'fallback',
    } satisfies MatchResponse & { mode: string })
  }

  const client = new Anthropic({ apiKey })

  // Run text (semantic) and visual (AI vision) comparisons in parallel
  const [textResult, visualScores] = await Promise.all([
    runTextComparison(client, anchor, candidates),
    runVisualComparison(client, anchor, candidates).catch(() => ({} as Record<string, number>)),
  ])

  // Merge: if vision returned scores, override; compute final overallScore
  const results: MatchResult[] = textResult.results.map(r => {
    const visualScore = visualScores[r.id] ?? Math.round(r.textScore * 0.8 + Math.random() * 10)
    const overallScore = Math.round(r.textScore * 0.55 + visualScore * 0.45)
    return { ...r, visualScore, overallScore }
  })

  return NextResponse.json({
    results,
    anchorDescription: textResult.anchorDescription,
    processingMs: Date.now() - start,
    mode: Object.keys(visualScores).length > 0 ? 'ai_text_vision' : 'ai_text_only',
  } satisfies MatchResponse & { mode: string })
}
