import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.CRM_DATA_FILE || path.join(__dirname, 'data', 'contracts.json');
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.AUROM_API_KEY || 'change-me-aurom-key';

function loadDb() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': process.env.CORS_ORIGIN || '*',
    'access-control-allow-headers': 'content-type, x-api-key',
    'access-control-allow-methods': 'GET, OPTIONS',
    'cache-control': 'no-store'
  });
  res.end(JSON.stringify(body));
}
function authorized(req) {
  const received = String(req.headers['x-api-key'] || '');
  const a = Buffer.from(received); const b = Buffer.from(API_KEY);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function mapForAurom(c) {
  return {
    id: c.contract_id,
    crm_contract_id: c.contract_id,
    crm_client_id: c.client_id,
    client_name: c.client_name,
    contract_number: c.contract_number,
    product: c.product,
    status: c.status === 'active' ? 'active' : c.status,
    metal_type: /silver|ag/i.test(`${c.product} ${c.commodity}`) ? 'silver' : 'gold',
    principal_grams: Number(c.principal_grams || 0),
    bonus_grams: Number(c.bonus_grams || 0),
    principal_czk: Number(c.principal_czk || 0),
    interest_rate: c.interest_rate,
    start_date: c.start_date,
    maturity_date: c.maturity_date,
    auto_renewal: Boolean(c.auto_renewal),
    version: c.version,
    updated_at: c.updated_at,
    review_flags: c.review_flags || []
  };
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/aurom/health') {
    const db = loadDb();
    return json(res, 200, { ok: true, service: 'crm-aurom-api', contracts: db.contracts.length, generated_at: db.meta.generated_at });
  }
  if (!url.pathname.startsWith('/api/aurom/')) return json(res, 404, { error: 'not_found' });
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
  const db = loadDb();
  if (url.pathname === '/api/aurom/contracts') {
    const status = url.searchParams.get('status');
    const cursor = Number(url.searchParams.get('cursor') || 0);
    const limit = Math.min(Number(url.searchParams.get('limit') || 500), 1000);
    let items = db.contracts.filter(c => !c.deleted);
    if (status) items = items.filter(c => c.status === status);
    const page = items.slice(cursor, cursor + limit).map(mapForAurom);
    return json(res, 200, { items: page, next_cursor: cursor + page.length < items.length ? String(cursor + page.length) : null, has_more: cursor + page.length < items.length, total: items.length });
  }
  if (url.pathname === '/api/aurom/changes') {
    const since = url.searchParams.get('since');
    const items = db.contracts.filter(c => !since || c.updated_at > since).map(mapForAurom);
    return json(res, 200, { items, next_sync_at: new Date().toISOString(), has_more: false });
  }
  const match = url.pathname.match(/^\/api\/aurom\/contracts\/([^/]+)$/);
  if (match) {
    const c = db.contracts.find(x => x.contract_id === decodeURIComponent(match[1]));
    return c ? json(res, 200, mapForAurom(c)) : json(res, 404, { error: 'contract_not_found' });
  }
  return json(res, 404, { error: 'not_found' });
});
server.listen(PORT, () => console.log(`CRM Aurom API listening on http://localhost:${PORT}`));
