import { defaultNote } from '../utils/brandFormat.js'

function seededFact(partial) {
  const t = '2026-10-01T09:00:00.000Z'
  const text = partial.text || defaultNote(partial.type, partial.value)
  return {
    previousValue: null,
    version: 1,
    createdAt: t,
    updatedAt: t,
    modifiedBy: 'Brand handbook',
    source: 'Chai Tapri Co. brand handbook, Oct 2026',
    description: '',
    effectiveDate: null,
    versions: [],
    active: true,
    ...partial,
    text,
  }
}

function seededRule(partial) {
  const t = '2026-10-01T09:00:00.000Z'
  return {
    version: 1,
    category: 'claims',
    explanation: '',
    versions: [],
    createdAt: t,
    updatedAt: t,
    modifiedBy: 'Brand handbook',
    active: true,
    ...partial,
  }
}

function seededAsset(partial) {
  const t = '2026-10-12T09:00:00.000Z'
  return {
    channel: 'general',
    campaign: 'general',
    linkedFactIds: [],
    linkedRuleIds: [],
    verificationStatus: 'current',
    lastModifiedAt: t,
    lastVerifiedAt: t,
    content: partial.content || partial.note || '',
    ...partial,
  }
}

export function makeBrand(orgCode) {
  return {
    _id: 'brand-' + orgCode,
    orgCode,
    organization: 'Chai Tapri Co.',
    version: 1,
    facts: [
      seededFact({ id: 'F-01', type: 'discount_percent', value: 30, text: 'Maximum discount is 30%', description: 'Cap for advertised discounts, including the ragi snack campaign.' }),
      seededFact({
        id: 'F-03',
        type: 'offer_scope',
        value: { approved: 'cold coffee', forbidden: ['all drinks', 'every drink', 'any drink', 'all beverages'] },
        text: 'Buy 1 Get 1 applies to cold coffee only',
      }),
      seededFact({ id: 'F-04', type: 'offer_end_date', value: '2026-11-14', text: 'Offer ends 14 November' }),
    ],
    rules: [
      seededRule({
        id: 'R-12',
        text: "Do not use superlatives like 'best' without proof",
        bannedWords: ['best', 'finest', 'greatest', 'No.1', 'No. 1', '#1', 'number one', 'number 1', 'world-class', 'unbeatable', 'unmatched'],
        severity: 'medium',
        category: 'tone',
        safeWording: 'Brewed fresh every morning',
        explanation: 'Pride in the product is fine. Ranking claims need a source the brand can show a reviewer.',
      }),
      seededRule({
        id: 'R-13',
        text: 'Do not promise free delivery unless an approved delivery fact exists',
        bannedWords: ['free delivery'],
        severity: 'medium',
        category: 'offer',
        safeWording: 'Ask about delivery options',
        explanation: 'Delivery is arranged per order. Promising free delivery needs a signed-off fact.',
      }),
      seededRule({
        id: 'R-14',
        text: 'Do not make medical or cure claims',
        bannedWords: ['cure', 'cures', 'cured', 'diabetes', 'clinically proven'],
        severity: 'high',
        category: 'legal',
        safeWording: 'Made with ragi, no refined sugar',
        explanation: 'Food advertising cannot imply treatment or cure of a medical condition. The snack line may only use approved ingredient wording.',
      }),
    ],
    assets: [
      seededAsset({ id: 'A-01', type: 'logo', name: 'Primary logo', channel: 'identity', campaign: 'identity', note: 'Do not stretch or recolour. Keep clear space around it.', linkedFactIds: [] }),
      seededAsset({ id: 'A-02', type: 'channel', name: 'Instagram story', channel: 'instagram', campaign: 'festival', note: 'Festival BOGO story', linkedFactIds: ['F-04', 'F-03'], linkedRuleIds: ['R-12'] }),
      seededAsset({ id: 'A-03', type: 'channel', name: 'Table card', channel: 'print', campaign: 'festival', note: 'Counter tent card for the same offer', linkedFactIds: ['F-04', 'F-03'], linkedRuleIds: ['R-12'] }),
      seededAsset({ id: 'A-04', type: 'channel', name: 'WhatsApp message', channel: 'whatsapp', campaign: 'festival', note: 'Customer blast for the BOGO window', linkedFactIds: ['F-04'], linkedRuleIds: ['R-12'] }),
      seededAsset({ id: 'A-05', type: 'channel', name: 'Snack Instagram story', channel: 'instagram', campaign: 'snack', note: 'Ragi snack story. Cap discounts at 30% and never use cure claims.', linkedFactIds: ['F-01'], linkedRuleIds: ['R-14', 'R-13'], content: 'Ragi snacks, 30% off. Made with ragi, no refined sugar.' }),
      seededAsset({ id: 'A-06', type: 'channel', name: 'Snack table card', channel: 'print', campaign: 'snack', note: 'Counter card for the ragi snack line.', linkedFactIds: ['F-01'], linkedRuleIds: ['R-14', 'R-13'], content: '30% off ragi snacks. Ask at the counter.' }),
      seededAsset({ id: 'A-07', type: 'channel', name: 'Snack WhatsApp', channel: 'whatsapp', campaign: 'snack', note: 'Customer blast for the ragi snack discount.', linkedFactIds: ['F-01'], linkedRuleIds: ['R-14', 'R-13'], content: 'Ragi snacks are 30% off this week. Made with ragi, no refined sugar.' }),
    ],
    approvedPhrases: [
      { id: 'W-01', text: 'Our chai, brewed fresh every morning' },
      { id: 'W-02', text: 'Made with ragi, no refined sugar' },
      { id: 'W-03', text: 'Brewed fresh every morning' },
    ],
    factHistory: [],
    activity: [],
    counters: { fact: 4, rule: 14, asset: 7 },
  }
}
