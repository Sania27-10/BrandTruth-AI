// Gemini REST client (optional). Used for AI review and image-to-text.
// Default model is the "latest Flash" alias. Set GEMINI_MODEL in .env to override.
const DEFAULT_MODEL = 'gemini-flash-latest'

export async function gemini({ system, parts, json = true }) {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not set')
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL

  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 30000)
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0, ...(json ? { responseMimeType: 'application/json' } : {}) },
        }),
        signal: ctrl.signal,
      })
      if (!res.ok) {
        const body = await res.text().catch(() => '')
        let msg = body
        try { msg = JSON.parse(body).error?.message || body } catch { /* not JSON */ }
        const err = new Error(`Gemini ${res.status} (model ${model}): ${String(msg).replace(/\s+/g, ' ').slice(0, 220)}`)
        err.status = res.status
        throw err
      }
      const data = await res.json()
      const out = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
      if (!out.trim()) throw new Error(`Gemini returned an empty answer${data.promptFeedback?.blockReason ? ' (blocked: ' + data.promptFeedback.blockReason + ')' : ''}`)
      return out
    } catch (e) {
      const timedOut = e.name === 'AbortError'
      const retryable = timedOut || e.status === 429 || e.status >= 500
      if (!retryable || attempt === 1) throw timedOut ? new Error('Gemini timed out') : e
      await new Promise((r) => setTimeout(r, 800))
    } finally {
      clearTimeout(timer)
    }
  }
}

// Used by /api/health?ai=1 so you can see the real reason when the AI is not working.
export async function pingGemini() {
  if (!process.env.GEMINI_API_KEY) return { ok: false, error: 'GEMINI_API_KEY is not set' }
  try {
    await gemini({ system: 'Reply with the single word OK.', parts: [{ text: 'ping' }], json: false })
    return { ok: true, model: process.env.GEMINI_MODEL || DEFAULT_MODEL }
  } catch (e) {
    return { ok: false, model: process.env.GEMINI_MODEL || DEFAULT_MODEL, error: e.message }
  }
}