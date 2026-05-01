import http from 'node:http';
import crypto from 'node:crypto';
import open from 'open';

const META_APP_ID = process.env.EASY4U_META_APP_ID || '__SET_AT_BUILD__';
const META_APP_SECRET = process.env.EASY4U_META_APP_SECRET || '';
const REDIRECT_PORT = 3456;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;
const SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
  'instagram_basic',
];

export async function startOAuth({ devMode = false } = {}) {
  if (devMode || META_APP_ID === '__SET_AT_BUILD__') {
    return {
      accessToken: 'DEV_TOKEN_' + crypto.randomBytes(8).toString('hex'),
      adAccountId: 'act_1234567890',
      businessName: 'Pizzaria do João (DEV)',
      pageId: '1234567890',
      expiresIn: 60 * 60 * 24 * 60,
      dev: true,
    };
  }

  const state = crypto.randomBytes(16).toString('hex');
  const url =
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES.join(','))}` +
    `&response_type=code` +
    `&state=${state}`;

  const code = await listenForCode(state);
  const token = await exchangeCodeForToken(code);
  return token;
}

function listenForCode(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, `http://localhost:${REDIRECT_PORT}`);
      if (u.pathname !== '/callback') {
        res.writeHead(404).end('not found');
        return;
      }
      const code = u.searchParams.get('code');
      const state = u.searchParams.get('state');
      const err = u.searchParams.get('error_description');

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Easy4u Tráfego AI</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#0b1220,#1e1b4b);color:#fff;text-align:center}.box{padding:48px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);max-width:420px}h1{margin:0 0 12px;font-size:28px}p{color:#cbd5e1;margin:0}</style>
</head><body><div class="box">${
        err
          ? `<h1>Erro na autenticação</h1><p>${escapeHtml(err)}</p>`
          : `<h1>Tudo certo!</h1><p>Pode fechar esta aba e voltar para o terminal.</p>`
      }</div></body></html>`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);

      server.close();
      if (err) return reject(new Error(err));
      if (state !== expectedState) return reject(new Error('state mismatch'));
      if (!code) return reject(new Error('sem code'));
      resolve(code);
    });
    server.listen(REDIRECT_PORT, () => open(buildAuthUrl(expectedState)));
    setTimeout(() => {
      server.close();
      reject(new Error('timeout — autenticação Meta levou mais de 5 min'));
    }, 5 * 60 * 1000);
  });
}

function buildAuthUrl(state) {
  return (
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPES.join(','))}` +
    `&response_type=code` +
    `&state=${state}`
  );
}

async function exchangeCodeForToken(code) {
  const url =
    `https://graph.facebook.com/v19.0/oauth/access_token` +
    `?client_id=${META_APP_ID}` +
    `&client_secret=${META_APP_SECRET}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&code=${code}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`token exchange falhou: http ${res.status}`);
  const j = await res.json();
  return {
    accessToken: j.access_token,
    expiresIn: j.expires_in,
    tokenType: j.token_type,
  };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export async function listAdAccounts(accessToken) {
  if (accessToken?.startsWith('DEV_TOKEN_')) {
    return [
      { id: 'act_1234567890', name: 'Pizzaria do João', currency: 'BRL', balance: '847.30' },
      { id: 'act_9876543210', name: 'Açaí da Praça',     currency: 'BRL', balance: '210.00' },
    ];
  }
  const url = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,balance&access_token=${accessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`graph error: http ${res.status}`);
  const j = await res.json();
  return j.data || [];
}
