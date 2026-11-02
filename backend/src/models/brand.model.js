// Brand document shape + the pre-loaded sample brand (Chai Tapri Co.).
export function makeBrand(orgCode) {
  return {
    _id: 'brand-' + orgCode,
    orgCode,
    organization: 'Chai Tapri Co.',
    version: 1,
    facts: [
      { id: 'F-01', type: 'discount_percent', value: 30, text: 'Maximum discount is 30%', active: true },
      {
        id: 'F-03',
        type: 'offer_scope',
        value: { approved: 'cold coffee', forbidden: ['all drinks', 'every drink', 'any drink', 'all beverages'] },
        text: 'Buy 1 Get 1 applies to cold coffee only',
        active: true,
      },
      { id: 'F-04', type: 'offer_end_date', value: '2026-11-14', text: 'Offer ends 14 November', active: true },
    ],
    rules: [
      {
        id: 'R-12',
        text: "Do not use superlatives like 'best' without proof",
        bannedWords: ['best', 'finest', 'greatest', 'No.1', 'No. 1', '#1', 'number one', 'number 1', 'world-class', 'unbeatable', 'unmatched'],
        severity: 'medium',
        safeWording: 'Brewed fresh every morning',
        active: true,
      },
      {
        id: 'R-14',
        text: 'Do not make medical or cure claims',
        bannedWords: ['cure', 'cures', 'cured', 'diabetes', 'clinically proven'],
        severity: 'high',
        safeWording: 'Made with wholesome ingredients',
        active: true,
      },
    ],
    assets: [
      { id: 'A-01', type: 'logo', name: 'Primary logo', note: 'Do not stretch or recolour. Keep clear space around it.', linkedFactIds: [] },
      { id: 'A-02', type: 'channel', name: 'Instagram story', note: 'Festival BOGO story', linkedFactIds: ['F-04', 'F-03'] },
      { id: 'A-03', type: 'channel', name: 'Table card', note: 'Counter tent card for the same offer', linkedFactIds: ['F-04', 'F-03'] },
      { id: 'A-04', type: 'channel', name: 'WhatsApp message', note: 'Customer blast for the BOGO window', linkedFactIds: ['F-04'] },
    ],
    approvedPhrases: [
      { id: 'W-01', text: 'Our chai, brewed fresh every morning' },
      { id: 'W-02', text: 'Made with ragi, no refined sugar' },
      { id: 'W-03', text: 'Brewed fresh every morning' },
    ],
    factHistory: [],
    counters: { fact: 4, rule: 14, asset: 4 },
  }
}