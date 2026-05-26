export type DeptId = 'marketing' | 'finance' | 'supply_chain' | 'legal' | 'category_mgmt'

export interface DeptMetric {
  label: string
  value: string
  status: 'good' | 'warn' | 'bad' | 'neutral'
}

export interface DeptApproval {
  status: 'pending' | 'reviewing' | 'approved' | 'flagged' | 'auto_approved' | 'na'
  analyst: string
  initials: string
  comment?: string
  timestampMs?: number
  metrics: DeptMetric[]
  isBlocking: boolean
}

export type TriggerType = 'competitor_drop' | 'promotion' | 'inventory_push' | 'strategic' | 'manual'
export type PCRStatus    = 'draft' | 'in_review' | 'approved' | 'blocked' | 'live'
export type Priority     = 'urgent' | 'high' | 'normal'

export interface PriceChangeRequest {
  id: string
  productId: string
  productName: string
  productEmoji: string
  platformId: string
  triggerType: TriggerType
  triggerLabel: string
  currentPrice: number
  proposedPrice: number
  changePercent: number
  priority: Priority
  createdMs: number
  createdBy: string
  initiatingDept: DeptId
  overallStatus: PCRStatus
  departments: Record<DeptId, DeptApproval>
  notes: string[]
}

export const DEPT_CONFIG: Record<DeptId, { name: string; shortName: string; icon: string; color: string; bg: string; role: string }> = {
  marketing:     { name: 'Marketing',          shortName: 'MKT', icon: '📢', color: '#e47911', bg: '#fff8f0', role: 'Campaign & Promo Alignment' },
  finance:       { name: 'Finance & Revenue',  shortName: 'FIN', icon: '💰', color: '#1a6b3c', bg: '#e8f5ed', role: 'Margin & P&L Review'         },
  supply_chain:  { name: 'Supply Chain',       shortName: 'SCM', icon: '📦', color: '#1a3f6b', bg: '#e8eef5', role: 'Inventory & Fulfillment'      },
  legal:         { name: 'Legal & Compliance', shortName: 'LGL', icon: '⚖️', color: '#c8410a', bg: '#fef0e8', role: 'MAP & Channel Policy'         },
  category_mgmt: { name: 'Category Mgmt',      shortName: 'CAT', icon: '🎯', color: '#c87d0a', bg: '#fef6e3', role: 'Strategic Positioning'        },
}

const now = Date.now()

const mkDept = (
  status: DeptApproval['status'],
  analyst: string,
  initials: string,
  isBlocking: boolean,
  metrics: DeptMetric[],
  comment?: string,
  timestampMs?: number,
): DeptApproval => ({ status, analyst, initials, isBlocking, metrics, comment, timestampMs })

export const INITIAL_PCRS: PriceChangeRequest[] = [
  {
    id: 'pcr-001',
    productId: 'CLR-GLSS-001',
    productName: 'Clear Rimless Oval Glasses',
    productEmoji: '🕶️',
    platformId: 'WMT',
    triggerType: 'competitor_drop',
    triggerLabel: 'Walmart dropped 18% to match Amazon algorithmic reprice',
    currentPrice: 24.99,
    proposedPrice: 20.99,
    changePercent: -16.0,
    priority: 'urgent',
    createdMs: now - 1000 * 60 * 8,
    createdBy: 'Priya S. (Pricing Automation)',
    initiatingDept: 'category_mgmt',
    overallStatus: 'in_review',
    departments: {
      marketing:     mkDept('approved',      'Jordan Lee',      'JL', false, [{ label: 'Campaign Alignment', value: 'Q2 Eyewear Push', status: 'good' }, { label: 'Promo Budget', value: '$0 organic', status: 'good' }, { label: 'Brand Risk', value: 'Low', status: 'good' }], 'Aligned with Q2 eyewear push. No promo budget needed.', now - 1000 * 60 * 6),
      finance:       mkDept('reviewing',     'Rahul M.',        'RM', true,  [{ label: 'Gross Margin Before', value: '38.0%', status: 'good' }, { label: 'Gross Margin After', value: '28.8%', status: 'warn' }, { label: 'Daily Revenue Delta', value: '-$192', status: 'warn' }, { label: 'Break-even Delta', value: '+31%', status: 'warn' }], 'Margin drops 38% to 29%. Need VP sign-off below 30% floor.', now - 1000 * 60 * 3),
      supply_chain:  mkDept('approved',      'Dana K.',         'DK', false, [{ label: 'Current Stock', value: '1,840 units', status: 'good' }, { label: 'Demand Lift Est.', value: '+40%', status: 'warn' }, { label: 'Days of Supply', value: '14.2 days', status: 'good' }, { label: 'Reorder Lead', value: '10 days', status: 'good' }], 'Stock 1,840 units. At +40% demand lift, 14 days supply - safe.', now - 1000 * 60 * 5),
      legal:         mkDept('auto_approved', 'Compliance Bot',  'CB', true,  [{ label: 'MAP Minimum', value: '$18.50', status: 'good' }, { label: 'Proposed Price', value: '$20.99', status: 'good' }, { label: 'MAP Status', value: 'Compliant', status: 'good' }], '$20.99 above MAP of $18.50. Auto-approved.', now - 1000 * 60 * 7),
      category_mgmt: mkDept('approved',      'Tara B.',         'TB', false, [{ label: 'Category Share', value: '8.2% to 11.4%', status: 'good' }, { label: 'Market Rank', value: '#4 to #2', status: 'good' }, { label: 'Strategic Fit', value: 'High', status: 'good' }], 'Eyewear losing share to Walmart. $20.99 positions us at #2.', now - 1000 * 60 * 7),
    },
    notes: ['Competitor scrape confirmed Walmart at $19.99 since 14:22 UTC.', 'Finance VP review requested for margin below 30%.'],
  },
  {
    id: 'pcr-002',
    productId: 'WHT-TEE-3340',
    productName: 'Basic Crew-Neck White T-Shirt',
    productEmoji: '👕',
    platformId: 'AMZ',
    triggerType: 'promotion',
    triggerLabel: 'Marketing launching Back-to-School 20% off promotion next Monday',
    currentPrice: 14.99,
    proposedPrice: 11.99,
    changePercent: -20.0,
    priority: 'high',
    createdMs: now - 1000 * 60 * 34,
    createdBy: 'Jordan Lee (Marketing)',
    initiatingDept: 'marketing',
    overallStatus: 'approved',
    departments: {
      marketing:     mkDept('approved',      'Jordan Lee',      'JL', false, [{ label: 'Campaign', value: 'Back-to-School', status: 'good' }, { label: 'Promo Duration', value: '7 days', status: 'good' }, { label: 'Budget', value: '$8,000', status: 'good' }, { label: 'Expected ROAS', value: '3.2x', status: 'good' }], 'Back-to-School campaign. 7-day window. $8K allocated.', now - 1000 * 60 * 34),
      finance:       mkDept('approved',      'Rahul M.',        'RM', true,  [{ label: 'Gross Margin Before', value: '42.0%', status: 'good' }, { label: 'Gross Margin After', value: '28.5%', status: 'warn' }, { label: 'Volume Forecast', value: '+85%', status: 'good' }, { label: 'Net Revenue (7d)', value: '+$4,200', status: 'good' }], 'Short-term margin hit justified by volume. Target maintained.', now - 1000 * 60 * 28),
      supply_chain:  mkDept('approved',      'Dana K.',         'DK', false, [{ label: 'Current Stock', value: '4,200 units', status: 'good' }, { label: 'Demand Lift Est.', value: '+85%', status: 'good' }, { label: 'Days of Supply', value: '22 days', status: 'good' }, { label: 'Pre-order Buffer', value: '+3,000 units', status: 'good' }], 'Pre-ordered +3,000 units. Fulfillment confirmed.', now - 1000 * 60 * 25),
      legal:         mkDept('auto_approved', 'Compliance Bot',  'CB', true,  [{ label: 'MAP Minimum', value: '$9.99', status: 'good' }, { label: 'Proposed Price', value: '$11.99', status: 'good' }, { label: 'MAP Status', value: 'Compliant', status: 'good' }], '$11.99 above MAP of $9.99. Compliant.', now - 1000 * 60 * 33),
      category_mgmt: mkDept('approved',      'Tara B.',         'TB', false, [{ label: 'Season', value: 'Peak Aug', status: 'good' }, { label: 'Promo Placement', value: 'Amazon Banner', status: 'good' }, { label: 'Category Rank', value: '#8 to #3', status: 'good' }], 'Peak season. Approves for Amazon banner placement.', now - 1000 * 60 * 22),
    },
    notes: ['All departments approved. Scheduled live Monday 08:00 UTC.', 'Amazon PPC budget increased to $1,200/day for promo window.'],
  },
  {
    id: 'pcr-003',
    productId: 'DNM-JNS-4450',
    productName: 'Blue Straight-Leg Denim Jeans',
    productEmoji: '👖',
    platformId: 'TGT',
    triggerType: 'promotion',
    triggerLabel: 'Marketing: summer clearance 30% markdown on Target',
    currentPrice: 42.99,
    proposedPrice: 29.99,
    changePercent: -30.2,
    priority: 'high',
    createdMs: now - 1000 * 60 * 90,
    createdBy: 'Marcus T. (Marketing)',
    initiatingDept: 'marketing',
    overallStatus: 'blocked',
    departments: {
      marketing:     mkDept('approved',  'Jordan Lee',     'JL', false, [{ label: 'Campaign', value: 'Summer Clearance', status: 'good' }, { label: 'Inventory Age', value: '140 days', status: 'bad' }, { label: 'Markdown Goal', value: 'Clear 1,200 units', status: 'neutral' }], 'Summer clearance needed. Inventory is 140 days old.', now - 1000 * 60 * 88),
      finance:       mkDept('flagged',   'Rahul M.',       'RM', true,  [{ label: 'Gross Margin Before', value: '34.0%', status: 'good' }, { label: 'Gross Margin After', value: '6.1%', status: 'bad' }, { label: 'Margin Floor', value: '10% minimum', status: 'bad' }, { label: 'Exception Required', value: 'CFO Sign-off', status: 'warn' }], 'At $29.99, margin 6.1% is below 10% floor. CFO exception needed.', now - 1000 * 60 * 82),
      supply_chain:  mkDept('approved',  'Dana K.',        'DK', false, [{ label: 'Aging Inventory', value: '2,100 units 140d', status: 'bad' }, { label: 'Write-off Risk', value: '$84,000', status: 'bad' }, { label: 'Clearance Rec.', value: 'Recommended', status: 'good' }], 'Clearance justified. 2,100 units aging 140+ days.', now - 1000 * 60 * 80),
      legal:         mkDept('flagged',   'Alex R.',        'AR', true,  [{ label: 'MAP Min (Target)', value: '$31.00', status: 'bad' }, { label: 'Proposed Price', value: '$29.99', status: 'bad' }, { label: 'MAP Status', value: 'VIOLATION', status: 'bad' }, { label: 'Action Required', value: 'MAP waiver needed', status: 'warn' }], '$29.99 violates Target channel MAP of $31.00. BLOCKED.', now - 1000 * 60 * 78),
      category_mgmt: mkDept('reviewing', 'Tara B.',        'TB', false, [{ label: 'Price Anchor Risk', value: 'High', status: 'warn' }, { label: 'Alternative', value: 'Bundle offer?', status: 'neutral' }], 'Concerned this sets a low price anchor. Reviewing bundle alternatives.'),
    },
    notes: ['BLOCKED: Legal - MAP violation ($29.99 < $31.00 Target minimum).', 'FLAGGED: Finance - margin 6.1% below 10% floor.', 'Next: request MAP waiver from Target buyer (est. 3-5 business days).'],
  },
  {
    id: 'pcr-004',
    productId: 'BLK-BCK-0087',
    productName: 'Black Nylon Drawstring Backpack',
    productEmoji: '🎒',
    platformId: 'EBY',
    triggerType: 'inventory_push',
    triggerLabel: 'Supply chain: 612 units aging 180+ days, eBay liquidation recommended',
    currentPrice: 25.99,
    proposedPrice: 18.99,
    changePercent: -26.9,
    priority: 'normal',
    createdMs: now - 1000 * 60 * 180,
    createdBy: 'Dana K. (Supply Chain)',
    initiatingDept: 'supply_chain',
    overallStatus: 'in_review',
    departments: {
      marketing:     mkDept('na',           'N/A',            '-',  false, [{ label: 'Involvement', value: 'Not Required', status: 'neutral' }]),
      finance:       mkDept('pending',      'Rahul M.',       'RM', true,  [{ label: 'Gross Margin After', value: '15.2%', status: 'warn' }, { label: 'Recovery vs Write-off', value: '+$5,400', status: 'good' }]),
      supply_chain:  mkDept('approved',     'Dana K.',        'DK', false, [{ label: 'Aging Units', value: '612 at 180d+', status: 'bad' }, { label: 'Write-off Cost', value: '$9,100', status: 'bad' }, { label: 'Recovery Est.', value: '$11,600 via eBay', status: 'good' }], '612 units at 180+ days. eBay liquidation preferred over write-off.', now - 1000 * 60 * 178),
      legal:         mkDept('auto_approved','Compliance Bot', 'CB', true,  [{ label: 'MAP Status', value: 'Compliant', status: 'good' }, { label: 'Channel', value: 'eBay Allowed', status: 'good' }], '$18.99 above MAP of $13.00. eBay liquidation permitted.', now - 1000 * 60 * 175),
      category_mgmt: mkDept('approved',     'Tara B.',        'TB', false, [{ label: 'Channel Conflict', value: 'None (eBay only)', status: 'good' }, { label: 'Brand Risk', value: 'Low', status: 'good' }], 'eBay liquidation will not cannibalize premium channels.', now - 1000 * 60 * 160),
    },
    notes: ['Finance review pending - ETA 2 hours.', 'eBay listing draft ready to publish on Finance approval.'],
  },
  {
    id: 'pcr-005',
    productId: 'WHT-SNK-2201',
    productName: 'White Canvas Low-Top Sneakers',
    productEmoji: '👟',
    platformId: 'AMZ',
    triggerType: 'strategic',
    triggerLabel: 'Category Mgmt: proactive Prime Day pre-positioning (est. 5 weeks out)',
    currentPrice: 32.99,
    proposedPrice: 27.99,
    changePercent: -15.2,
    priority: 'normal',
    createdMs: now - 1000 * 60 * 380,
    createdBy: 'Tara B. (Category Mgmt)',
    initiatingDept: 'category_mgmt',
    overallStatus: 'live',
    departments: {
      marketing:     mkDept('approved',      'Jordan Lee',     'JL', false, [{ label: 'Campaign', value: 'Prime Day Prep', status: 'good' }, { label: 'Ad Spend', value: '+$600/day', status: 'neutral' }], 'Aligned with Prime Day teaser. On-platform ads scheduled.', now - 1000 * 60 * 370),
      finance:       mkDept('approved',      'Rahul M.',       'RM', true,  [{ label: 'Gross Margin After', value: '31.4%', status: 'good' }, { label: 'Volume Lift Est.', value: '+28%', status: 'good' }, { label: 'Net Revenue Delta', value: '+$1,800/wk', status: 'good' }], 'Margin 31.4% - above floor. Volume lift more than compensates.', now - 1000 * 60 * 360),
      supply_chain:  mkDept('approved',      'Dana K.',        'DK', false, [{ label: 'Current Stock', value: '2,200 units', status: 'good' }, { label: 'Days of Supply', value: '28 days', status: 'good' }], 'Stock 2,200 units. Sufficient for Prime Day surge.', now - 1000 * 60 * 355),
      legal:         mkDept('auto_approved', 'Compliance Bot', 'CB', true,  [{ label: 'MAP Status', value: 'Compliant', status: 'good' }], 'Compliant. Auto-approved.', now - 1000 * 60 * 375),
      category_mgmt: mkDept('approved',      'Tara B.',        'TB', false, [{ label: 'Prime Day Goal', value: 'Top 5 Footwear', status: 'good' }, { label: 'Category Impact', value: 'High', status: 'good' }], 'Prime Day positioning in footwear critical for Q3 share.', now - 1000 * 60 * 380),
    },
    notes: ['LIVE - Price updated on Amazon at 09:14 UTC.', 'Monitoring hourly. Strong early signal: +22% CTR in first 4 hours.'],
  },
]
