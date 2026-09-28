const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env file if present
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envFile.split('\n')) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length && !process.env[key.trim()]) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  }
} catch { /* no .env file — rely on real env vars */ }

const BOB_API_KEY = process.env.BOB_API_KEY;
if (!BOB_API_KEY) {
  console.error('ERROR: BOB_API_KEY environment variable is not set.');
  process.exit(1);
}
const BOB_API_URL = process.env.BOB_API_URL || 'https://api.bob.ibm.com/v1/chat/completions';
const BOB_MODEL   = process.env.BOB_MODEL   || 'claude-sonnet-4-5';

console.log(`Using Bob API: ${BOB_API_URL}`);
console.log(`Using model:   ${BOB_MODEL}`);

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
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
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const claimSummary = payload.claim || '';

      const systemPrompt = `You are an expert insurance claims triage assistant. Analyse the claim summary provided and return a structured JSON response with exactly these fields:
{
  "priority": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "priority_reason": "brief explanation",
  "fraud_indicators": ["list", "of", "red flags"] or [],
  "fraud_risk": "HIGH" | "MEDIUM" | "LOW" | "NONE",
  "recommended_actions": ["action 1", "action 2", ...],
  "escalate": true | false,
  "escalation_reason": "reason if escalate is true, else null",
  "estimated_complexity": "SIMPLE" | "MODERATE" | "COMPLEX",
  "summary": "1-2 sentence triage summary"
}
Return ONLY valid JSON. No markdown, no code fences, no extra text.`;

      const requestBody = JSON.stringify({
        model: BOB_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Claim Summary:\n${claimSummary}` }
        ],
        max_tokens: 1024,
        temperature: 0.1
      });

      const urlObj = new URL(BOB_API_URL);
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${BOB_API_KEY}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const bobReq = https.request(options, (bobRes) => {
        let responseData = '';
        bobRes.on('data', chunk => { responseData += chunk; });
        bobRes.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            if (parsed.error) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: parsed.error.message || 'Bob API error', raw: responseData }));
              return;
            }
            const content = parsed.choices?.[0]?.message?.content || '';
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ result: content }));
          } catch {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to parse Bob response', raw: responseData }));
          }
        });
      });

      bobReq.on('error', (e) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });

      bobReq.write(requestBody);
      bobReq.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Claims Triage server running at http://localhost:${PORT}`);
});
