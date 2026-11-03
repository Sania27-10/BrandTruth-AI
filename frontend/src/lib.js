// Sample posters (must match server/seed.js) and small helpers.
export const SAMPLES = [
  { id: 'festival', title: 'Festival poster', text: "Buy 1 Get 1 on ALL drinks, till 20 November. India's best chai!", uses: ['F-03', 'F-04', 'R-12'] },
  { id: 'snack', title: 'Healthy snack poster', text: 'Cures diabetes naturally! Now 40% off all ragi snacks, free delivery today.', uses: ['F-01', 'R-13', 'R-14'] },
]

// Replace each accepted claim with its suggested fix.
export function applyFixes(text, findings) {
  let out = text
  const accepted = (findings || [])
    .filter((f) => f.decision === 'accepted' && f.suggestedFix && f.claim)
    .sort((a, b) => String(b.claim).length - String(a.claim).length)
  for (const f of accepted) {
    const i = out.toLowerCase().indexOf(f.claim.toLowerCase())
    if (i >= 0) out = out.slice(0, i) + f.suggestedFix + out.slice(i + f.claim.length)
  }
  return out
}

export const fmtDate = (iso) => {
  try { return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) } catch { return '' }
}
