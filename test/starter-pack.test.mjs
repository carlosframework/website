import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'src/start/starter/v1');
const scratch = process.env.STARTER_SCRATCH || process.env.TMPDIR;
assert.ok(scratch && !/^\/tmp(?:\/|$)/.test(scratch), 'set STARTER_SCRATCH or disk TMPDIR');
const hash = b => createHash('sha256').update(b).digest('hex');
function python(body) {
 const dir = mkdtempSync(join(scratch, 'pack-'));
 try {
  const result = spawnSync('python3', ['-B', '-c', `import importlib.util, pathlib, sys, json, hashlib, gzip, tarfile, io, os, shutil\nspec=importlib.util.spec_from_file_location('packer', sys.argv[1])\np=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(p)\nsource=pathlib.Path(sys.argv[2])\nwork=pathlib.Path(sys.argv[3])\n${body}`, join(root, 'hack/pack-starter.py'), source, dir], { encoding:'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
 } finally { rmSync(dir, { recursive:true, force:true }); }
}

test('deterministic USTAR, exact inventory, metadata and published artifacts', () => {
 python(`
p.pack_starter(source, work/'one.gz')
p.pack_starter(source, work/'two.gz')
a=(work/'one.gz').read_bytes()
assert a == (work/'two.gz').read_bytes() == (source/'source.tar.gz').read_bytes()
assert a[3] == 0 and a[4:8] == bytes(4)
expected=['LICENSE.fiesta','go.mod','go.sum','main.go','static/fiesta-plain.css','static/fiesta-signal.css','static/fiesta.css','templates/index.html']
with tarfile.open(fileobj=io.BytesIO(a), mode='r:gz') as tar:
 members=tar.getmembers()
 assert [m.name for m in members] == sorted(expected + ['static','templates'])
 assert all(m.isfile() or m.isdir() for m in members)
 assert all(not m.pax_headers and not m.name.startswith(('./','/')) for m in members)
 assert all(m.uid == m.gid == m.mtime == 0 and m.uname == m.gname == '' for m in members)
 assert all(m.mode == (0o755 if m.isdir() else 0o644) for m in members)
 files=[{'path':m.name,'sha256':hashlib.sha256(tar.extractfile(m).read()).hexdigest()} for m in members if m.isfile()]
manifest=json.loads((source/'manifest.json').read_text())
assert manifest['schema'] == 1 and manifest['files'] == files
assert manifest['archiveSHA256'] == hashlib.sha256(a).hexdigest()
assert manifest['lockSHA256'] == 'a858eb184a5255068a4a56470e3549a2a7d4718635a90fe69f40e9faff3948c5'
assert len(manifest['platformCommit']) == 40
assert manifest['fiesta'] == {'version':'1.1.0','commit':'4ee76b5e651ff4fb5a4bae12d7508f55a2531eff'}
listing=json.loads((source/'source.json').read_text())
assert list(listing) == expected
assert all(listing[n].encode() == (source/n).read_bytes() for n in expected)
raw=gzip.decompress(a)
pos=0
while any(raw[pos:pos+512]):
 h=raw[pos:pos+512]
 assert h[156] in (ord('0'),ord('5')) and h[257:263] == b'ustar\\0'
 pos += 512 + ((int(h[124:136].strip(b'\\0 '),8)+511)//512)*512
assert len(raw[pos:]) >= 1024 and not any(raw[pos:])
`);
});

test('locked modules and three combined Fiesta assets retain pinned bytes', () => {
 for (const [file, digest] of Object.entries({
  'go.mod':'78a1f3d56026dc3efa3a9456dc7a39c63672bafcf0bb04944c075eac6e601180',
  'go.sum':'688bf53e93ba1ba280fc924446986ab2cf32fba7c4f16efaf80a8c6e36848b49',
  'static/fiesta.css':'141597a63cdc616bc33c7bec0ee6bcda47bd5d279726ed9f44fa6ddf3671b68a',
  'static/fiesta-plain.css':'47f6911af8efc962d268cb4f1bedeaf6ac921c2fef6a29cfa57be0ab0ce01b43',
  'static/fiesta-signal.css':'b8d5337117166c9156271762e39e0dec1f44bb8459ce98f9632dff31322a999a',
  'LICENSE.fiesta':'3f3d9e0024b1921b067d6f7f88deb4a60cbe7a78e76c64e3f1d7fc3b779b9d04',
 })) assert.equal(hash(readFileSync(join(source,file))), digest, file);
});

const fixture = `
s=work/'src'; shutil.copytree(source,s)
for n in ('static','templates'):
 shutil.rmtree(s/n); (s/n).mkdir()
for n in ('go.mod','go.sum','main.go','LICENSE.fiesta'): (s/n).write_bytes(b'')
def pack(): p.pack_starter(s,work/'out.gz')
def refused():
 try: pack()
 except (ValueError,OSError): return
 raise AssertionError('accepted forbidden input')
`;
for (const [name, code] of Object.entries({
 'file bytes': `(s/'static/a').write_bytes(bytes(2_000_000)); pack(); (s/'static/a').write_bytes(bytes(2_000_001)); refused()`,
 'expanded bytes': `for i in range(10): (s/f'static/{i}').write_bytes(bytes(2_000_000))\npack(); (s/'static/extra').write_bytes(b'x'); refused()`,
 'file count': `for i in range(252): (s/f'static/{i}').touch()\npack(); (s/'static/extra').touch(); refused()`,
 'directory count': `for i in range(254): (s/f'static/{i}').mkdir()\npack(); (s/'static/extra').mkdir(); refused()`,
 'compressed bytes': `p.check_compressed_size(5_000_000)\ntry: p.check_compressed_size(5_000_001)\nexcept ValueError: pass\nelse: raise AssertionError('compressed boundary accepted')\nfor i in range(3): (s/f'static/{i}').write_bytes(os.urandom(1_700_000))\nrefused()`,
})) test(`cap boundary: ${name}`, () => python(fixture + code));
for (const [name, code] of Object.entries({
 symlink: `(s/'static/link').symlink_to(s/'main.go'); refused()`,
 hardlink: `os.link(s/'main.go',s/'static/link'); refused()`,
 'linked directory': `(s/'static/link').symlink_to(s/'templates',target_is_directory=True); refused()`,
 'source link': `link=work/'linked'; link.symlink_to(s,target_is_directory=True); s=link; refused()`,
 'unsafe name': `(s/'static/bad\\\\name').touch(); refused()`,
 'control character': `(s/'static/bad\\nname').touch(); refused()`,
 'USTAR path limit': `(s/('static/'+'x'*101)).touch(); refused()`,
 'forbidden nested tree': `(s/'static/vendor').mkdir(); refused()`,
 'output inside source': `try: p.pack_starter(s,s/'output.gz')\nexcept ValueError: pass\nelse: raise AssertionError('output inside source accepted')`,
 'explicit inventory': `(s/'.git').mkdir(); (s/'.git/config').write_text('secret'); (s/'main_test.go').write_text('test'); (s/'shop.db').write_text('data'); (s/'credentials').write_text('secret'); pack()\nwith tarfile.open(work/'out.gz') as t: assert not any(m.name in ('.git','main_test.go','shop.db','credentials','manifest.json','source.json','source.tar.gz') for m in t.getmembers())`,
})) test(`inventory: ${name}`, () => python(fixture + code));
