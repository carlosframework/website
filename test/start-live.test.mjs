// 🤖 Read-only acceptance checks. Importing this module never registers a live test.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { parseDocument } from 'htmlparser2';
import { renderMarkdown } from '../hack/build-start.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const browserAccept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';
const mixedAccept = 'text/markdown;q=0.5, text/html';
const varies = response => (response.headers.get('vary') || '').toLowerCase().split(',').map(s => s.trim()).includes('accept');
const htmlType = response => /^text\/html(?:;|$)/i.test(response.headers.get('content-type') || '');
const markdownType = response => /^text\/markdown;\s*charset=utf-8$/i.test(response.headers.get('content-type') || '');

function descendants(node) {
 return [node, ...(node.children || []).flatMap(descendants)];
}
function concealed(node) {
 const attrs = node.attribs || {};
 return ['script','style','template','noscript'].includes(node.name)
  || (node.name === 'details' && !Object.hasOwn(attrs,'open'))
  || Object.hasOwn(attrs,'hidden') || Object.hasOwn(attrs,'inert') || attrs['aria-hidden'] === 'true'
  || /(?:display\s*:\s*none|visibility\s*:\s*(?:hidden|collapse)|opacity\s*:\s*0(?:\s|;|$)|content-visibility\s*:\s*hidden)/i.test(attrs.style || '');
}
function completeVisibleSection(html, markdown) {
 const document = parseDocument(html, {withStartIndices:true,withEndIndices:true});
 const sections = descendants(document).filter(n => n.attribs?.id === 'for-your-agent');
 if (sections.length !== 1 || sections[0].name !== 'section') return false;
 const section = sections[0];
 for (let n = section; n; n = n.parent) if (concealed(n)) return false;
 if (descendants(section).some(concealed)) return false;
 const content = descendants(section).filter(n => n.attribs?.class?.split(/\s+/).includes('agent-content'));
 if (content.length !== 1) return false;
 const node = content[0];
 const inner = html.slice(html.indexOf('>',node.startIndex)+1,html.lastIndexOf('</',node.endIndex));
 return markdown.length > 0 && inner === `<!-- agent-content -->${renderMarkdown(markdown)}<!-- /agent-content -->`;
}

/** @typedef {{origin:string, version:string, markdownSHA256:string, starterSHA256:string, checks:Record<string,boolean>}} Verification */
/** @param {URL} origin @returns {Promise<Verification>} */
export async function verifyStartOrigin(origin) {
 assert.ok(origin instanceof URL, 'origin must be a URL');
 assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash && origin.pathname === '/', 'origin must have no credentials, path, query or fragment');
 assert.ok(origin.protocol === 'https:' || (origin.protocol === 'http:' && origin.hostname === '127.0.0.1'), 'HTTPS required except for loopback unit tests');
 const request = async (path, accept, method = 'GET') => {
  // No redirects beyond the explicitly inspected slash redirect; TLS uses fetch defaults.
  const response = await fetch(new URL(path,origin), {method,redirect:'manual',headers:{Accept:accept,'Accept-Encoding':'identity'},signal:AbortSignal.timeout(15_000)});
  return {status:response.status,headers:response.headers,bytes:Buffer.from(await response.arrayBuffer())};
 };
 const redirect = await request('/start',browserAccept);
 const slashRedirect = response => [301,302,307,308].includes(response.status)
  && response.headers.has('location') && new URL(response.headers.get('location'),origin).href === new URL('/start/',origin).href;
 const html = await request('/start/',browserAccept);
 const markdown = await request('/start/','text/markdown');
 const mixed = await request('/start/',mixedAccept);
 const twin = await request('/start/index.md','text/markdown');
 const text = markdown.bytes.toString('utf8');
 const checks = {
  slashRedirect:slashRedirect(redirect),
  browserHTML:html.status === 200 && htmlType(html),
  visibleAgentSection:completeVisibleSection(html.bytes.toString('utf8'),text),
  markdownType:markdown.status === 200 && markdownType(markdown),
  markdownTwin:twin.status === 200 && markdownType(twin) && markdown.bytes.equals(twin.bytes),
  htmlVary:varies(html), markdownVary:varies(markdown),
  mixedHTML:mixed.status === 200 && htmlType(mixed) && mixed.bytes.equals(html.bytes),
  mixedVary:varies(mixed),
 };
 for (const [name,path,accept,get] of [
  ['HTML','/start/',browserAccept,html], ['Markdown','/start/','text/markdown',markdown],
  ['Mixed','/start/',mixedAccept,mixed], ['Twin','/start/index.md','text/markdown',twin],
  ['Redirect','/start',browserAccept,redirect],
 ]) {
  const head = await request(path,accept,'HEAD');
  checks[`head${name}`] = head.status === get.status && head.bytes.length === 0
   // The edge's slash redirect sends Content-Length: 0 on GET and omits it on HEAD; both are valid for an empty body.
   && ['content-type','content-length','content-encoding','etag','vary','x-carlos-version','location']
    .filter(key => !(name === 'Redirect' && key === 'content-length'))
    .every(key => head.headers.get(key) === get.headers.get(key));
 }
 // Discover only a same-origin versioned starter link. Never visit console or app URLs.
 const links = [...text.matchAll(/\]\(([^\s)]+)\)/g)].map(m => m[1]);
 const archiveLinks = links.filter(link => {
  try { const u = new URL(link,origin); return u.origin === origin.origin && !u.username && !u.password && !u.search && !u.hash && /^\/start\/starter\/v\d+\/source\.tar\.gz$/.test(u.pathname); }
  catch { return false; }
 });
 checks.starterLink = archiveLinks.length === 1;
 let starterSHA256 = '';
 checks.starterArchive = checks.starterManifest = checks.starterDigest = checks.markdownDigest = false;
 if (checks.starterLink) {
  const archiveURL = new URL(archiveLinks[0],origin);
  const archive = await request(archiveURL.pathname,'application/gzip');
  const manifest = await request(new URL('manifest.json',archiveURL).pathname,'application/json');
  starterSHA256 = hash(archive.bytes);
  checks.starterArchive = archive.status === 200;
  let metadata;
  try { metadata = JSON.parse(manifest.bytes.toString('utf8')); } catch { /* Report invalid JSON as a failed check. */ }
  checks.starterManifest = manifest.status === 200 && /^[a-f0-9]{64}$/.test(metadata?.archiveSHA256 || '');
  checks.starterDigest = checks.starterArchive && checks.starterManifest && starterSHA256 === metadata.archiveSHA256;
  const quoted = [...text.matchAll(/```text\r?\n([a-f0-9]{64})\r?\n```/g)];
  checks.markdownDigest = quoted.length === 1 && quoted[0][1] === starterSHA256;
 }
 return {origin:origin.origin,version:html.headers.get('x-carlos-version') || '',markdownSHA256:hash(markdown.bytes),starterSHA256,checks};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 const origin = process.env.CARLOS_START_LIVE_ORIGIN;
 test('start origin live acceptance', {skip:origin ? false : 'CARLOS_START_LIVE_ORIGIN is unset; live acceptance was NOT RUN'}, async t => {
  const url = new URL(origin);
  assert.equal(url.protocol,'https:','live acceptance requires HTTPS');
  const verification = await verifyStartOrigin(url);
  t.diagnostic(JSON.stringify(verification));
  assert.deepEqual(Object.entries(verification.checks).filter(([,ok]) => !ok),[],'failed live checks');
 });
}
