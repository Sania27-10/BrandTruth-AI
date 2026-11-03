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
      ruleOrFactId: 'R-13',
      reason: 'R-13 restricts free-delivery promises unless an approved delivery fact exists.',
      suggestedFix: 'Ask about delivery options',
      source: 'sample',
    },
  ],
}

export const SNACK_SAMPLE_TEXT = 'Cures diabetes naturally! Now 40% off all ragi snacks, free delivery today.'
export const SNACK_APPROVED_COPY = [
  { title: 'Snack Instagram story', assetId: 'A-05', channel: 'instagram', text: 'Ragi snacks, 30% off. Made with ragi, no refined sugar.' },
  { title: 'Snack table card', assetId: 'A-06', channel: 'print', text: '30% off ragi snacks. Ask at the counter.' },
  { title: 'Snack WhatsApp', assetId: 'A-07', channel: 'whatsapp', text: 'Ragi snacks are 30% off this week. Made with ragi, no refined sugar.' },
]
export const SNACK_IGNORED_ADS = [
  { title: 'Wellness chalkboard', text: 'Our ragi mix cures diabetes at home.' },
  { title: 'Gym counter card', text: 'Cures diabetes with every pack of ragi snacks.' },
]
