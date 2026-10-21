'use strict';
const https = require('node:https');
const PRIVATE = /^\/(?:api|_internal|internal|admin|auth|login|logout|account|dashboard|setup|health|metrics|client-portal|reset-password|owner-recovery|\.well-known)(?:[/.]|$)/i;
function eligible(req) {
  if (req.method !== 'GET') return null;
  const headers = req.headers || {};
  if (headers.dnt === '1' || headers['sec-gpc'] === '1') return null;
  if (/prefetch|prerender/i.test(String(headers['sec-purpose'] || '')+' '+String(headers.purpose || ''))) return null;
  if (/bot\b|crawler|spider|headless|lighthouse|monitor|uptime|curl\/|wget\/|python-requests/i.test(String(headers['user-agent'] || ''))) return null;
  const path = String(req.originalUrl || req.url || '/').split('?')[0];
  if (path.length > 1000 || !path.startsWith('/') || path.startsWith('//') || /[#\\\x00-\x20\x7f]/.test(path)) return null;
  let decoded; try { decoded = decodeURIComponent(path); } catch { return null; }
  if (PRIVATE.test(decoded) || /[?#\\\x00-\x20\x7f]/.test(decoded) || decoded.split('/').some(p => p === '.' || p === '..')) return null;
  if (/\.[a-z0-9]+$/i.test(decoded) && !/\.html?$/i.test(decoded)) return null;
  return path;
}
function sendPageview(binding,payload,request=https.request) {
  const body = JSON.stringify(payload);
  const out = request({hostname:'swa-native-shadow-production.up.railway.app',port:443,method:'POST',path:'/api/internal/site-views',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),'X-SWA-Site-Views-Key':binding.key,'User-Agent':'SWA-Site-Views/1.0'}},res=>res.resume());
  out.on('error',()=>{}); out.setTimeout(3000,()=>out.destroy()); out.end(body);
}
/** Mount before public routes; only configured HTTP hosts and completed 200 HTML documents are recorded. */
function createSiteViewsSender({env=process.env,send=sendPageview}={}) {
  let bindings; try { bindings = JSON.parse(env.SWA_SITE_VIEWS_SENDERS || '[]'); } catch { throw new Error('Invalid site view sender configuration'); }
  if (!Array.isArray(bindings) || bindings.some(b => !b || !/^[a-f0-9-]{36}$/i.test(b.projectId || '') || typeof b.key !== 'string' || b.key.length < 48 || !Array.isArray(b.hosts) || !b.hosts.length || b.hosts.some(h => typeof h !== 'string' || /friendlypartyrental|friendly-party-rental|[\s/:@?#]/i.test(h)))) throw new Error('Invalid site view sender configuration');
  return function siteViewsSender(req,res,next=()=>{}) {
    const path = eligible(req);
    // HTTP authority, never caller-selected forwarded host headers.
    const host = String(req.headers?.host || '').toLowerCase().replace(/:(?:443|80)$/,'');
    const binding = path && bindings.find(b => b.hosts.includes(host) && (!b.paths || b.paths.includes(path)));
    if (binding) res.once('finish',()=>{
      if (res.statusCode !== 200 || !/^text\/html(?:;|$)/i.test(String(res.getHeader('Content-Type') || ''))) return;
      try { send(binding,{projectId:binding.projectId,host,path}); } catch { /* Analytics never blocks a website. */ }
    });
    next();
  };
}
module.exports = {createSiteViewsSender,eligible,sendPageview};
