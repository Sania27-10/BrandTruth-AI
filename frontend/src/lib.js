// Sample posters (must match server/seed.js) and small helpers.
export const SAMPLES = [
  { id: 'festival', title: 'Festival poster', text: "Buy 1 Get 1 on ALL drinks, till 20 November. India's best chai!" },
  { id: 'snack', title: 'Healthy snack poster', text: 'Cures diabetes naturally! Now 40% off all ragi snacks, free delivery today.' },
]

// Replace each accepted claim with its suggested fix.
export function applyFixes(text, findings) {
  let out = text
  for (const f of findings) {
    if (f.decision !== 'accepted' || !f.suggestedFix) continue
    const i = out.toLowerCase().indexOf(f.claim.toLowerCase())
    if (i >= 0) out = out.slice(0, i) + f.suggestedFix + out.slice(i + f.claim.length)
  }
  return out
}

export const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '' }
}
