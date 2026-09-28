export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const claim = (req.body?.claim || '').trim();
  if (!claim) { res.status(400).json({ error: 'claim field is required' }); return; }

  const result = mockTriage(claim);
  res.status(200).json({ result: JSON.stringify(result) });
}

function mockTriage(claim) {
  const text = claim.toLowerCase();

  const isFraud =
    text.includes('no police') ||
    text.includes('no receipt') ||
    text.includes('third claim') ||
    text.includes('third theft') ||
    text.includes('no signs') ||
    text.includes('forgot') ||
    (text.includes('cash') && text.includes('jewel'));

  const isUrgent =
    text.includes('icu') ||
    text.includes('emergency') ||
    text.includes('surgery') ||
    text.includes('heart') ||
    text.includes('critical') ||
    text.includes('urgent') ||
    text.includes('hospitalisation') ||
    text.includes('hospitalization');

  const isMedium =
    text.includes('storm') ||
    text.includes('flood') ||
    text.includes('property') ||
    text.includes('burglary') ||
    text.includes('theft') ||
    text.includes('fire');

  if (isFraud) return {
    priority: 'HIGH', priority_reason: 'Multiple fraud red flags identified including prior claim history and inconsistent statements',
    fraud_indicators: ['Multiple prior claims of similar nature detected', 'No police report filed despite significant loss', 'Claimant reported at home on alleged date of incident', 'High-value cash and jewellery claimed without receipts'],
    fraud_risk: 'HIGH',
    recommended_actions: ['Escalate to Special Investigations Unit (SIU) immediately', 'Do not settle until full investigation is complete', 'Cross-reference prior claim history across all policies', 'Interview neighbours and witnesses independently', 'Request original receipts and valuations for all claimed items'],
    escalate: true, escalation_reason: 'Suspected fraudulent claim requires SIU review before any payment is made',
    estimated_complexity: 'COMPLEX',
    summary: 'This claim presents multiple serious fraud indicators including inconsistent claimant statements, no police report, and a pattern of prior theft claims. Immediate escalation to the Special Investigations Unit is recommended before any settlement is considered.'
  };

  if (isUrgent) return {
    priority: 'CRITICAL', priority_reason: 'Life-threatening medical emergency requiring immediate authorisation to avoid treatment delays',
    fraud_indicators: [], fraud_risk: 'NONE',
    recommended_actions: ['Grant emergency pre-authorisation within 2 hours', 'Assign dedicated case manager to liaise with hospital', 'Verify policy coverage limits and applicable exclusions', 'Contact treating physician for clinical summary', 'Initiate discharge planning and rehabilitation coverage review'],
    escalate: true, escalation_reason: 'Critical medical case — pre-authorisation required before scheduled surgical procedure',
    estimated_complexity: 'MODERATE',
    summary: 'This is a critical medical claim involving emergency hospitalisation for a life-threatening condition. Immediate pre-authorisation is required to avoid delaying urgent medical treatment. Policy limits appear sufficient to cover the procedure.'
  };

  if (isMedium) return {
    priority: 'MEDIUM', priority_reason: 'Moderate property or asset damage claim requiring standard assessment',
    fraud_indicators: [], fraud_risk: 'LOW',
    recommended_actions: ['Assign to claims officer within 24 hours', 'Request supporting documentation: photos, police report, contractor estimates', 'Verify policy coverage for reported damage types', 'Arrange independent loss assessor if claim exceeds $15,000', 'Confirm business interruption coverage dates and limits'],
    escalate: false, escalation_reason: null,
    estimated_complexity: 'MODERATE',
    summary: 'A moderate priority claim for property or asset damage. No fraud indicators detected. Standard assessment and documentation collection process should be followed within normal SLA timelines.'
  };

  return {
    priority: 'LOW', priority_reason: 'Routine low-value claim with no risk indicators — standard processing applies',
    fraud_indicators: [], fraud_risk: 'NONE',
    recommended_actions: ['Acknowledge claim receipt within 24 hours', 'Request photos and supporting documentation from claimant', 'Arrange repair assessment or approved repairer referral', 'Process settlement within standard 5-business-day SLA'],
    escalate: false, escalation_reason: null,
    estimated_complexity: 'SIMPLE',
    summary: 'This appears to be a routine, low-complexity claim with no fraud indicators and no injuries. Standard processing applies and the claim should be resolved within normal SLA timelines.'
  };
}
