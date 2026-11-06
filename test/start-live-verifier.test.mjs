import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildStart } from '../hack/build-start.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';
import { verifyStartOrigin } from './start-live.test.mjs';

let dir, html, markdown, archive, manifest;
before(async () => {
 const base = process.env.STARTER_SCRATCH || process.env.TMPDIR;
 assert.ok(base && !/^\/tmp(?:\/|$)/.test(base),'set STARTER_SCRATCH or disk TMPDIR');
 await mkdir(base,{recursive:true});
 dir = await mkdtemp(join(base,'start-verifier-'));
 await buildStart(dir,loadStartConfig({CARLOS_START_DEMO:'1',CARLOS_START_SITE_ORIGIN:'https://site.example.com',CARLOS_START_CONSOLE_ORIGIN:'https://console.example.com',CARLOS_START_ACCOUNT_URL:'https://console.example.com/'}));
 html = await readFile(join(dir,'start/index.html'),'utf8');
 markdown = await readFile(join(dir,'start/index.md'),'utf8');
 archive = await readFile(join(dir,'start/starter/v1/source.tar.gz'));
 manifest = await readFile(join(dir,'start/starter/v1/manifest.json'));
});
after(async () => { if (dir) await rm(dir,{recursive:true,force:true}); });

async function verify(t, mutate = () => {}, version = 'fixture-version') {
 const requests = [];
 const server = createServer((req,res) => {
  requests.push(`${req.method} ${req.url}`);
  const isMarkdown = req.headers.accept === 'text/markdown';
  const origin = `http://127.0.0.1:${server.address().port}`;
  const route = req.url === '/start/' ? (isMarkdown ? 'markdown' : 'html') : req.url;
  const response = {status:200,headers:{'Content-Type':'text/html; charset=utf-8'},body:html.replaceAll('https://site.example.com',origin)};
  if (version) response.headers['X-Carlos-Version'] = version;
  if (req.url === '/start/') response.headers.Vary = 'Accept-Encoding, Accept';
  if (route === 'markdown' || route === '/start/index.md') {
   response.headers['Content-Type'] = 'text/markdown; charset=utf-8';
   response.body = markdown.replaceAll('https://site.example.com',origin);
  } else if (route === '/start') {
   response.status = 308; response.headers.Location = '/start/'; response.body = '';
  } else if (route === '/start/starter/v1/source.tar.gz') {
   response.headers['Content-Type'] = 'application/gzip'; response.body = archive;
  } else if (route === '/start/starter/v1/manifest.json') {
   response.headers['Content-Type'] = 'application/json'; response.body = manifest;
  } else if (route !== 'html') {
   response.status = 404; response.body = '';
  }
  mutate(response,{route,method:req.method,accept:req.headers.accept});
  response.body = Buffer.from(response.body);
  if (!Object.hasOwn(response.headers,'Content-Length')) response.headers['Content-Length'] = response.body.length;
  res.writeHead(response.status,response.headers);
  res.end(req.method === 'HEAD' ? undefined : response.body);
 });
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 try {
  const result = await verifyStartOrigin(new URL(`http://127.0.0.1:${server.address().port}`));
  assert.ok(requests.every(r => /^(?:GET|HEAD) \/start(?:\/|$)/.test(r)));
  return result;
 } finally {
  const closed = new Promise((resolve,reject) => server.close(err => err ? reject(err) : resolve()));
  server.closeAllConnections();
  await closed;
 }
}

test('correct origin: real fetch, complete built instructions, negotiated GET/HEAD and digests',async t => {
 const result = await verify(t);
 assert.ok(Object.values(result.checks).every(Boolean),JSON.stringify(result.checks));
 assert.equal(result.version,'fixture-version');
 assert.match(result.markdownSHA256,/^[a-f0-9]{64}$/);
 assert.equal(result.starterSHA256,JSON.parse(manifest).archiveSHA256);
});
test('static routes without X-Carlos-Version record an empty version and still pass',async t => {
 const result = await verify(t,undefined,'');
 assert.equal(result.version,'');
 assert.ok(Object.values(result.checks).every(Boolean));
});

const cases = [
 ['missing redirect','slashRedirect',(r,c) => {if(c.route === '/start') r.status = 200;}],
 ['wrong redirect destination','slashRedirect',(r,c) => {if(c.route === '/start') r.headers.Location = '/elsewhere/';}],
 ['Markdown served to browsers','browserHTML',(r,c) => {if(c.route === 'html') r.headers['Content-Type'] = 'text/markdown; charset=utf-8';}],
 ['missing agent section','visibleAgentSection',(r,c) => {if(c.route === 'html') r.body = r.body.replace('id="for-your-agent"','id="missing"');}],
 ['incomplete agent instructions','visibleAgentSection',(r,c) => {if(c.route === 'html') r.body = r.body.replace('<!-- agent-content -->','<!-- agent-content -->missing');}],
 ['hidden agent section','visibleAgentSection',(r,c) => {if(c.route === 'html') r.body = r.body.replace('id="for-your-agent"','hidden id="for-your-agent"');}],
 ['hidden ancestor','visibleAgentSection',(r,c) => {if(c.route === 'html') r.body = r.body.replace('<main','<main style="display:none"');}],
 ['collapsed instructions','visibleAgentSection',(r,c) => {if(c.route === 'html') r.body = r.body.replace('<div class="agent-content">','<details><div class="agent-content">').replace('<!-- /agent-content --></div>','<!-- /agent-content --></div></details>');}],
 ['commented-out instructions','visibleAgentSection',(r,c) => {if(c.route === 'html') r.body = r.body.replace('<section class="inner-section" id="for-your-agent">','<!-- <section class="inner-section" id="for-your-agent">');}],
 ['wrong Markdown type','markdownType',(r,c) => {if(c.route === 'markdown') r.headers['Content-Type'] = 'text/plain';}],
 ['wrong Markdown status','markdownType',(r,c) => {if(c.route === 'markdown') r.status = 404;}],
 ['different Markdown twin bytes','markdownTwin',(r,c) => {if(c.route === '/start/index.md') r.body += '\n';}],
 ['missing HTML Vary','htmlVary',(r,c) => {if(c.route === 'html') delete r.headers.Vary;}],
 ['wrong Markdown Vary','markdownVary',(r,c) => {if(c.route === 'markdown') r.headers.Vary = 'Accept-Encoding';}],
 ['mixed Accept gets Markdown','mixedHTML',(r,c) => {if(c.accept.includes('text/markdown;q=')) r.headers['Content-Type'] = 'text/markdown; charset=utf-8';}],
 ['mixed Accept Vary missing','mixedVary',(r,c) => {if(c.accept.includes('text/markdown;q=')) delete r.headers.Vary;}],
 ['HEAD HTML disagrees','headHTML',(r,c) => {if(c.method === 'HEAD' && c.route === 'html') r.headers['Content-Type'] = 'text/plain';}],
 ['HEAD Markdown disagrees','headMarkdown',(r,c) => {if(c.method === 'HEAD' && c.route === 'markdown') r.headers['Content-Length'] = 1;}],
 ['HEAD mixed disagrees','headMixed',(r,c) => {if(c.method === 'HEAD' && c.accept.includes('text/markdown;q=')) r.status = 404;}],
 ['HEAD twin disagrees','headTwin',(r,c) => {if(c.method === 'HEAD' && c.route === '/start/index.md') r.headers['X-Carlos-Version'] = 'wrong';}],
 ['HEAD redirect disagrees','headRedirect',(r,c) => {if(c.method === 'HEAD' && c.route === '/start') r.headers.Location = '/wrong';}],
 ['off-origin archive link','starterLink',(r,c) => {if(c.route === 'markdown') r.body = r.body.replace(/http:\/\/127\.0\.0\.1:\d+\/start\/starter\/v1\/source.tar.gz/,'https://example.com/start/starter/v1/source.tar.gz');}],
 ['archive unavailable','starterArchive',(r,c) => {if(c.route.endsWith('/source.tar.gz')) r.status = 404;}],
 ['invalid manifest','starterManifest',(r,c) => {if(c.route.endsWith('/manifest.json')) r.body = '{}';}],
 ['manifest hash mismatch','starterDigest',(r,c) => {if(c.route.endsWith('/manifest.json')) r.body = JSON.stringify({archiveSHA256:'0'.repeat(64)});}],
 ['archive bytes mismatch','starterDigest',(r,c) => {if(c.route.endsWith('/source.tar.gz')) r.body = Buffer.concat([archive,Buffer.from('changed')]);}],
 ['quoted Markdown hash mismatch','markdownDigest',(r,c) => {if(c.route === 'markdown') r.body = r.body.replace(JSON.parse(manifest).archiveSHA256,'0'.repeat(64));}],
];
for (const [name,check,mutate] of cases) test(`rejects ${name}`,async t => {
 const result = await verify(t,mutate);
 assert.equal(result.checks[check],false,JSON.stringify(result.checks));
});
test('invalid origins fail before any request',async () => {
 for (const origin of ['http://example.com','https://user:secret@example.com','https://example.com/path','https://example.com/?query','https://example.com/#fragment']) await assert.rejects(verifyStartOrigin(new URL(origin)));
});
