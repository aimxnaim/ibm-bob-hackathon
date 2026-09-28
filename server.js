const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Mock triage logic — no external API needed
function mockTriage(claim) {
  const text = claim.toLowerCase();

  const isFraud =
    text.includes('no police') ||
    text.includes('no receipt') ||
    text.includes('third claim') ||
    text.includes('third theft') ||
    text.includes('no signs') ||
    text.includes('forgot') ||
    text.includes('cash') && text.includes('jewel');

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

  let priority, fraud_risk, escalate, fraud_indicators, recommended_actions, summary, priority_reason, escalation_reason, estimated_complexity;

  if (isFraud) {
    priority = 'HIGH';
    fraud_risk = 'HIGH';
    escalate = true;
    estimated_complexity = 'COMPLEX';
    fraud_indicators = [
      'Multiple prior claims of similar nature detected',
      'No police report filed despite significant loss',
      'Claimant reported at home on alleged date of incident',
      'High-value cash and jewellery claimed without receipts',
    ];
    recommended_actions = [
      'Escalate to Special Investigations Unit (SIU) immediately',
      'Do not settle until full investigation is complete',
      'Cross-reference prior claim history across all policies',
      'Interview neighbours and witnesses independently',
      'Request original receipts and valuations for all claimed items',
    ];
    priority_reason = 'Multiple fraud red flags identified including prior claim history and inconsistent statements';
    escalation_reason = 'Suspected fraudulent claim requires SIU review before any payment is made';
    summary = 'This claim presents multiple serious fraud indicators including inconsistent claimant statements, no police report, and a pattern of prior theft claims. Immediate escalation to the Special Investigations Unit is recommended before any settlement is considered.';
  } else if (isUrgent) {
    priority = 'CRITICAL';
    fraud_risk = 'NONE';
    escalate = true;
    estimated_complexity = 'MODERATE';
    fraud_indicators = [];
    recommended_actions = [
      'Grant emergency pre-authorisation within 2 hours',
      'Assign dedicated case manager to liaise with hospital',
      'Verify policy coverage limits and applicable exclusions',
      'Contact treating physician for clinical summary',
      'Initiate discharge planning and rehabilitation coverage review',
    ];
    priority_reason = 'Life-threatening medical emergency requiring immediate authorisation to avoid treatment delays';
    escalation_reason = 'Critical medical case — pre-authorisation required before scheduled surgical procedure';
    summary = 'This is a critical medical claim involving emergency hospitalisation for a life-threatening condition. Immediate pre-authorisation is required to avoid delaying urgent medical treatment. Policy limits appear sufficient to cover the procedure.';
  } else if (isMedium) {
    priority = 'MEDIUM';
    fraud_risk = 'LOW';
    escalate = false;
    estimated_complexity = 'MODERATE';
    fraud_indicators = [];
    recommended_actions = [
      'Assign to claims officer within 24 hours',
      'Request supporting documentation: photos, police report, contractor estimates',
      'Verify policy coverage for reported damage types',
      'Arrange independent loss assessor if claim exceeds $15,000',
      'Confirm business interruption coverage dates and limits',
    ];
    priority_reason = 'Moderate property or asset damage claim requiring standard assessment';
    escalation_reason = null;
    summary = 'A moderate priority claim for property or asset damage. No fraud indicators detected. Standard assessment and documentation collection process should be followed within normal SLA timelines.';
  } else {
    priority = 'LOW';
    fraud_risk = 'NONE';
    escalate = false;
    estimated_complexity = 'SIMPLE';
    fraud_indicators = [];
    recommended_actions = [
      'Acknowledge claim receipt within 24 hours',
      'Request photos and supporting documentation from claimant',
      'Arrange repair assessment or approved repairer referral',
      'Process settlement within standard 5-business-day SLA',
    ];
    priority_reason = 'Routine low-value claim with no risk indicators — standard processing applies';
    escalation_reason = null;
    summary = 'This appears to be a routine, low-complexity claim with no fraud indicators and no injuries. Standard processing applies and the claim should be resolved within normal SLA timelines.';
  }

  return { priority, priority_reason, fraud_indicators, fraud_risk, recommended_actions, escalate, escalation_reason, estimated_complexity, summary };
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/triage') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let payload;
      try { payload = JSON.parse(body); } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const claim = (payload.claim || '').trim();
      if (!claim) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'claim field is required' }));
        return;
      }

      console.log(`[TRIAGE] Processing claim (${claim.length} chars)`);
      const result = mockTriage(claim);
      console.log(`[TRIAGE] Result: priority=${result.priority} fraud=${result.fraud_risk} escalate=${result.escalate}`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result: JSON.stringify(result) }));
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`ClaimsTriage running at http://localhost:${PORT}`);
  console.log('Mode: MOCK (no external API required)');
});
