// Sample posters. The texts must match frontend/src/lib.js.
export const SAMPLES = [
  { id: 'festival', title: 'Festival poster', text: "Buy 1 Get 1 on ALL drinks, till 20 November. India's best chai!" },
  { id: 'snack', title: 'Healthy snack poster', text: 'Cures diabetes naturally! Now 40% off all ragi snacks, free delivery today.' },
]

// Polished wording used while the brand data is still the original seed (consistent demo result).
export const SAMPLE_FIXES = {
  "India's best chai": 'Our chai, brewed fresh every morning',
  'Cures diabetes naturally': 'Made with ragi, no refined sugar',
}

export const SAMPLE_EXTRAS = {
  snack: [
    {
      claim: 'free delivery today',
      status: 'needs_review',
      ruleOrFactId: null,
      reason: 'No approved fact or rule covers delivery offers, so a reviewer should confirm this claim.',
      suggestedFix: 'Ask about delivery options',
      source: 'sample',
    },
  ],
}
